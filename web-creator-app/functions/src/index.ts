import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const region = 'europe-west3';

type UserRole = 'superadmin' | 'admin' | 'moderator' | 'visitor';
type AuditLogLevel = 'info' | 'warning' | 'success' | 'danger';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface HostingTarget {
  id: string;
  name?: string;
  customDomain?: string;
  defaultUrl?: string;
  firebaseSiteId?: string;
  status?: string;
}

interface MediaAsset {
  sizeKb?: number;
}

interface SiteCostPolicy {
  deployStrategy?: 'shared-route' | 'dedicated-hosting';
  mediaLimitMb?: number;
}

interface SiteDocument {
  id: string;
  name: string;
  ownerId?: string;
  ownerUid?: string;
  status: string;
  publication?: Record<string, unknown>;
  hostingTargets?: HostingTarget[];
  mediaAssets?: MediaAsset[];
  costPolicy?: SiteCostPolicy;
}

const allowedRoles: UserRole[] = ['superadmin', 'admin', 'moderator', 'visitor'];
const allowedLogLevels: AuditLogLevel[] = ['info', 'warning', 'success', 'danger'];

export const createPlatformUser = onCall({ region }, async (request) => {
  const actor = await requirePlatformRole(request.auth?.uid, ['admin', 'superadmin']);
  const name = readString(request.data?.name, 'name');
  const email = readString(request.data?.email, 'email').toLowerCase();
  const password = readString(request.data?.password, 'password');
  const role = readRole(request.data?.role);

  if (role === 'superadmin' && actor.role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Superadmin kullanicisini sadece superadmin olusturabilir.');
  }

  const created = await getAuth().createUser({
    displayName: name,
    email,
    password
  });
  await getAuth().setCustomUserClaims(created.uid, { role });

  const profile: PlatformUser = {
    id: created.uid,
    name,
    email,
    password: '',
    role
  };

  await db.doc(`platformUsers/${created.uid}`).set(profile, { merge: true });
  await writeAuditLog({
    action: 'user.created',
    level: 'success',
    actor,
    details: `${email} kullanicisi ${role} roluyle backend tarafinda olusturuldu.`
  });

  return profile;
});

export const updatePlatformUserRole = onCall({ region }, async (request) => {
  const actor = await requirePlatformRole(request.auth?.uid, ['admin', 'superadmin']);
  const userId = readString(request.data?.userId, 'userId');
  const role = readRole(request.data?.role);
  const targetRef = db.doc(`platformUsers/${userId}`);
  const targetSnapshot = await targetRef.get();

  if (!targetSnapshot.exists) {
    throw new HttpsError('not-found', 'Kullanici profili bulunamadi.');
  }

  const target = targetSnapshot.data() as PlatformUser;
  if (actor.role !== 'superadmin' && (role === 'superadmin' || target.role === 'superadmin')) {
    throw new HttpsError('permission-denied', 'Superadmin rol degisikligini sadece superadmin yapabilir.');
  }

  await targetRef.set({ role }, { merge: true });
  await getAuth().setCustomUserClaims(userId, { role });
  await writeAuditLog({
    action: 'user.role.updated',
    level: 'warning',
    actor,
    details: `${target.email} rolu ${target.role} -> ${role} olarak backend tarafinda guncellendi.`
  });

  return { ...target, role, password: '' };
});

export const requestPublication = onCall({ region }, async (request) => {
  const actor = await requireSignedUser(request.auth?.uid);
  const siteId = readString(request.data?.siteId, 'siteId');
  const site = await requireManageableSite(siteId, actor);
  const blockingCostAlerts = blockingCostAlertsForSite(site);
  if (blockingCostAlerts.length) {
    await writeAuditLog({
      action: 'publication.blocked.cost',
      level: 'danger',
      actor,
      site,
      details: `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi: ${blockingCostAlerts.join(' | ')}`
    });
    throw new HttpsError('failed-precondition', 'Bloklayici maliyet/kota uyarilari cozulmeden yayin talebi olusturulamaz.');
  }

  const hostingTargetId = typeof request.data?.hostingTargetId === 'string'
    ? request.data.hostingTargetId
    : site.publication?.['hostingTargetId'] ?? site.hostingTargets?.[0]?.id;
  const requestedAt = new Date().toISOString();

  await db.doc(`sites/${siteId}`).set({
    status: 'pending',
    publication: {
      ...site.publication,
      requestStatus: 'pending',
      requestedAt,
      requestedBy: actor.id,
      hostingTargetId,
      rejectedAt: null,
      rejectionReason: null
    }
  }, { merge: true });

  await writeAuditLog({
    action: 'publication.requested',
    level: 'warning',
    actor,
    site,
    details: `${site.name} yayina alinmak uzere backend onay kuyruguna gonderildi.`
  });

  return { status: 'pending', requestedAt };
});

export const approvePublication = onCall({ region }, async (request) => {
  const actor = await requirePlatformRole(request.auth?.uid, ['admin', 'superadmin']);
  const siteId = readString(request.data?.siteId, 'siteId');
  const days = Math.max(Number(request.data?.days ?? 30), 1);
  const site = await requireSite(siteId);
  const blockingCostAlerts = blockingCostAlertsForSite(site);
  if (blockingCostAlerts.length) {
    await writeAuditLog({
      action: 'publication.approval.blocked.cost',
      level: 'danger',
      actor,
      site,
      details: `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi: ${blockingCostAlerts.join(' | ')}`
    });
    throw new HttpsError('failed-precondition', 'Bloklayici maliyet/kota uyarilari cozulmeden yayin onaylanamaz.');
  }

  const now = new Date();
  const approvedUntil = new Date(now);
  approvedUntil.setDate(now.getDate() + days);

  const hostingTargetId = String(site.publication?.['hostingTargetId'] ?? site.hostingTargets?.[0]?.id ?? '');
  const hostingTargets = activateHostingTarget(site, hostingTargetId, now.toISOString());
  const activeTarget = hostingTargets.find((target) => target.id === hostingTargetId) ?? hostingTargets[0];
  const publishedUrl = resolvePublishedUrl(activeTarget);

  await db.doc(`sites/${siteId}`).set({
    status: 'published',
    hostingTargets,
    publication: {
      ...site.publication,
      requestStatus: 'approved',
      approvedAt: now.toISOString(),
      approvedBy: actor.id,
      approvedUntil: approvedUntil.toISOString(),
      hostingTargetId,
      publishedUrl
    }
  }, { merge: true });

  await writeAuditLog({
    action: 'publication.approved',
    level: 'success',
    actor,
    site,
    details: `${site.name} ${days} gun icin backend tarafinda onaylandi.`
  });

  return { status: 'published', publishedUrl, approvedUntil: approvedUntil.toISOString() };
});

export const rejectPublication = onCall({ region }, async (request) => {
  const actor = await requirePlatformRole(request.auth?.uid, ['admin', 'superadmin']);
  const siteId = readString(request.data?.siteId, 'siteId');
  const reason = typeof request.data?.reason === 'string' && request.data.reason.trim()
    ? request.data.reason.trim()
    : 'Yayin talebi reddedildi.';
  const site = await requireSite(siteId);
  const rejectedAt = new Date().toISOString();

  await db.doc(`sites/${siteId}`).set({
    status: 'draft',
    publication: {
      ...site.publication,
      requestStatus: 'rejected',
      rejectedAt,
      rejectedBy: actor.id,
      rejectionReason: reason
    }
  }, { merge: true });

  await writeAuditLog({
    action: 'publication.rejected',
    level: 'danger',
    actor,
    site,
    details: reason
  });

  return { status: 'draft', rejectedAt };
});

export const stopPublication = onCall({ region }, async (request) => {
  const actor = await requireSignedUser(request.auth?.uid);
  const siteId = readString(request.data?.siteId, 'siteId');
  const reason = typeof request.data?.reason === 'string' && request.data.reason.trim()
    ? request.data.reason.trim()
    : 'Yayin site yoneticisi tarafindan durduruldu.';
  const site = await requireManageableSite(siteId, actor);
  const stoppedAt = new Date().toISOString();

  await db.doc(`sites/${siteId}`).set({
    status: 'draft',
    hostingTargets: (site.hostingTargets ?? []).map((target) =>
      target.status === 'active' ? { ...target, status: 'paused' } : target
    ),
    publication: {
      ...site.publication,
      requestStatus: 'none',
      stoppedAt,
      stoppedBy: actor.id,
      stopReason: reason,
      publishedUrl: null
    }
  }, { merge: true });

  await writeAuditLog({
    action: 'publication.stopped',
    level: 'danger',
    actor,
    site,
    details: reason
  });

  return { status: 'draft', stoppedAt };
});

export const writeClientAuditLog = onCall({ region }, async (request) => {
  const actor = await requireSignedUser(request.auth?.uid);
  const action = readString(request.data?.action, 'action');
  const details = readString(request.data?.details, 'details');
  const level = allowedLogLevels.includes(request.data?.level) ? request.data.level as AuditLogLevel : 'info';
  const siteId = typeof request.data?.siteId === 'string' ? request.data.siteId : undefined;
  const site = siteId ? await requireSite(siteId) : undefined;

  await writeAuditLog({ action, level, actor, site, details });
  return { ok: true };
});

async function requireSignedUser(uid: string | undefined): Promise<PlatformUser> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Bu islem icin oturum gerekir.');
  }

  const snapshot = await db.doc(`platformUsers/${uid}`).get();
  if (!snapshot.exists) {
    throw new HttpsError('permission-denied', 'Platform kullanici profili bulunamadi.');
  }

  return snapshot.data() as PlatformUser;
}

async function requirePlatformRole(uid: string | undefined, roles: UserRole[]): Promise<PlatformUser> {
  const actor = await requireSignedUser(uid);
  if (!roles.includes(actor.role)) {
    throw new HttpsError('permission-denied', 'Bu islem icin yetki yok.');
  }

  return actor;
}

async function requireSite(siteId: string): Promise<SiteDocument> {
  const snapshot = await db.doc(`sites/${siteId}`).get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Site bulunamadi.');
  }

  return { id: siteId, ...snapshot.data() } as SiteDocument;
}

async function requireManageableSite(siteId: string, actor: PlatformUser): Promise<SiteDocument> {
  const site = await requireSite(siteId);
  if (['admin', 'superadmin'].includes(actor.role) || site.ownerUid === actor.id || site.ownerId === actor.id) {
    return site;
  }

  const member = await db.doc(`siteMembers/${siteId}/members/${actor.id}`).get();
  if (member.exists && ['owner', 'admin'].includes(String(member.data()?.['role']))) {
    return site;
  }

  throw new HttpsError('permission-denied', 'Bu siteyi yonetme yetkiniz yok.');
}

async function writeAuditLog(payload: {
  action: string;
  level: AuditLogLevel;
  actor: PlatformUser;
  details: string;
  site?: Pick<SiteDocument, 'id' | 'name'>;
}): Promise<void> {
  const logRef = db.collection('auditLogs').doc();
  const log: Record<string, unknown> = {
    id: logRef.id,
    action: payload.action,
    level: payload.level,
    createdAt: new Date().toISOString(),
    actorId: payload.actor.id,
    actorName: payload.actor.name,
    details: payload.details
  };

  if (payload.site) {
    log['siteId'] = payload.site.id;
    log['siteName'] = payload.site.name;
  }

  await logRef.set(log);
}

function activateHostingTarget(site: SiteDocument, hostingTargetId: string, publishedAt: string): HostingTarget[] {
  const targets = site.hostingTargets ?? [];
  const targetId = hostingTargetId || targets[0]?.id;

  return targets.map((target) =>
    target.id === targetId
      ? {
          ...target,
          status: 'active',
          lastPublishedAt: publishedAt,
          defaultUrl: target.defaultUrl || `https://${target.firebaseSiteId || site.id}.web.app`
        }
      : target
  );
}

function resolvePublishedUrl(target: HostingTarget | undefined): string {
  if (!target) {
    return '';
  }

  return target.customDomain || target.defaultUrl || `https://${target.firebaseSiteId}.web.app`;
}

function blockingCostAlertsForSite(site: SiteDocument): string[] {
  const policy = {
    deployStrategy: site.costPolicy?.deployStrategy ?? 'shared-route',
    mediaLimitMb: Math.max(Number(site.costPolicy?.mediaLimitMb ?? 50), 5)
  };
  const mediaMb = (site.mediaAssets ?? []).reduce((total, asset) => total + Number(asset.sizeKb ?? 0), 0) / 1024;
  const hostingTargets = site.hostingTargets ?? [];
  const alerts: string[] = [];

  if (mediaMb > policy.mediaLimitMb) {
    alerts.push(`Medya kotasi asildi: ${mediaMb.toFixed(1)} MB / ${policy.mediaLimitMb} MB`);
  }

  if (policy.deployStrategy === 'shared-route' && hostingTargets.length > 1) {
    alerts.push('Shared-route maliyet modunda birden fazla hosting hedefi var');
  }

  if (policy.deployStrategy === 'dedicated-hosting' && hostingTargets.length === 0) {
    alerts.push('Dedicated hosting icin en az bir hosting hedefi gerekir');
  }

  return alerts;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${field} zorunlu.`);
  }

  return value.trim();
}

function readRole(value: unknown): UserRole {
  if (!allowedRoles.includes(value as UserRole)) {
    throw new HttpsError('invalid-argument', 'Gecersiz rol.');
  }

  return value as UserRole;
}
