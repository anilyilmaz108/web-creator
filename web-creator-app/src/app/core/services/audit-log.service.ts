import { Injectable, computed, inject, signal } from '@angular/core';

import { UserProfile } from '../models/auth.models';
import { AuditLogEntry, AuditLogLevel, SiteProject } from '../models/builder.models';
import { FirebaseDataService } from './firebase-data.service';

const AUDIT_LOGS_KEY = 'web-creator-audit-logs';

type AuditSite = Pick<SiteProject, 'id' | 'name'>;

interface AuditOptions {
  actor?: UserProfile | null;
  site?: AuditSite | null;
  siteId?: string;
  siteName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly firebaseData = inject(FirebaseDataService);
  private readonly logsSignal = signal<AuditLogEntry[]>(this.loadAuditLogs());

  readonly logs = computed(() => this.logsSignal());

  constructor() {
    this.hydrateFromFirebase();
  }

  record(action: string, level: AuditLogLevel, details: string, options: AuditOptions = {}): void {
    const actor = options.actor ?? null;
    const log: AuditLogEntry = {
      id: `log-${crypto.randomUUID()}`,
      action,
      level,
      createdAt: new Date().toISOString(),
      actorId: actor?.id ?? 'anonymous',
      actorName: actor?.name ?? 'Anonim Kullanici',
      details
    };
    const siteId = options.site?.id ?? options.siteId;
    const siteName = options.site?.name ?? options.siteName;

    if (siteId) {
      log.siteId = siteId;
    }

    if (siteName) {
      log.siteName = siteName;
    }

    this.logsSignal.update((logs) => [log, ...logs].slice(0, 500));
    this.persist();
  }

  logsForSite(siteId: string): AuditLogEntry[] {
    return this.logsSignal().filter((log) => log.siteId === siteId);
  }

  private loadAuditLogs(): AuditLogEntry[] {
    const raw = globalThis.localStorage?.getItem(AUDIT_LOGS_KEY);
    if (!raw) {
      return [];
    }

    return (JSON.parse(raw) as AuditLogEntry[]).map((log) => ({
      ...log,
      level: log.level ?? 'info',
      details: log.details ?? ''
    }));
  }

  private persist(): void {
    const logs = this.logsSignal().slice(0, 500);
    globalThis.localStorage?.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
    this.firebaseData.saveAuditLogs(logs);
  }

  private hydrateFromFirebase(): void {
    if (!this.firebaseData.enabled) {
      return;
    }

    void this.firebaseData.loadAuditLogs().then((logs) => {
      if (!logs.length) {
        return;
      }

      this.logsSignal.set(logs.slice(0, 500));
      globalThis.localStorage?.setItem(AUDIT_LOGS_KEY, JSON.stringify(this.logsSignal()));
    });
  }
}
