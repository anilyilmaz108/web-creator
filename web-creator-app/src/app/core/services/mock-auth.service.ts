import { Injectable, computed, inject, signal } from '@angular/core';

import { demoUsers } from '../data/demo-data';
import { UserProfile, UserRole } from '../models/auth.models';
import { AuditLogService } from './audit-log.service';
import { FirebaseDataService } from './firebase-data.service';

const USERS_KEY = 'web-creator-users';
const SESSION_KEY = 'web-creator-session';

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private readonly auditLog = inject(AuditLogService);
  private readonly firebaseData = inject(FirebaseDataService);
  private readonly usersSignal = signal<UserProfile[]>(this.loadUsers());
  private readonly sessionUserId = signal<string | null>(this.loadSessionUserId());

  readonly users = computed(() => this.usersSignal());
  readonly currentUser = computed(
    () => this.usersSignal().find((user) => user.id === this.sessionUserId()) ?? null
  );
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.hydrateUsersFromFirebase();
    this.hydrateAuthStateFromFirebase();
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.firebaseData.enabled) {
      const user = this.findLocalUser(email, password);
      if (!user) {
        this.recordAuthFailure(email);
        return false;
      }

      this.setActiveUser(user);
      this.recordAuthSuccess(user);
      return true;
    }

    try {
      const authApi = await import('firebase/auth');
      const auth = await this.firebaseData.getAuth();
      const credential = await authApi.signInWithEmailAndPassword(auth, email, password);
      const user = await this.resolveFirebaseUser(credential.user, password);
      this.setActiveUser(user);
      this.refreshFirebaseUsersForAdmin(user);
      this.recordAuthSuccess(user);
      return true;
    } catch (error) {
      console.warn('Firebase login failed', error);
      this.recordAuthFailure(email);
      return false;
    }
  }

  logout(): void {
    const user = this.currentUser();
    if (user) {
      this.auditLog.record('auth.logout', 'info', `${user.email} cikis yapti.`, { actor: user });
    }

    this.sessionUserId.set(null);
    this.persistSession(null);

    if (!this.firebaseData.enabled) {
      return;
    }

    void this.firebaseData.getAuth().then(async (auth) => {
      const authApi = await import('firebase/auth');
      await authApi.signOut(auth);
    });
  }

  async createUser(payload: Pick<UserProfile, 'name' | 'email' | 'password' | 'role'>): Promise<UserProfile> {
    if (!this.firebaseData.enabled) {
      return this.createLocalUser(payload);
    }

    const backendUser = await this.firebaseData.callFunction<UserProfile>('createPlatformUser', payload);
    if (backendUser) {
      this.upsertUser({ ...backendUser, password: '' });
      return { ...backendUser, password: '' };
    }

    const appApi = await import('firebase/app');
    const authApi = await import('firebase/auth');
    const secondaryApp = appApi.initializeApp(
      this.firebaseData.getFirebaseOptions(),
      `admin-create-user-${crypto.randomUUID()}`
    );

    try {
      const secondaryAuth = authApi.getAuth(secondaryApp);
      const credential = await authApi.createUserWithEmailAndPassword(
        secondaryAuth,
        payload.email,
        payload.password
      );
      await authApi.updateProfile(credential.user, { displayName: payload.name });

      const user: UserProfile = {
        id: credential.user.uid,
        name: payload.name,
        email: payload.email,
        password: '',
        role: payload.role
      };

      await this.firebaseData.saveUser(user);
      this.upsertUser(user);
      this.auditLog.record('user.created', 'success', `${user.email} kullanicisi ${user.role} roluyle olusturuldu.`, {
        actor: this.currentUser()
      });
      return user;
    } finally {
      await appApi.deleteApp(secondaryApp);
    }
  }

  async startGuestCreatorSession(name = 'Public Creator'): Promise<UserProfile> {
    if (!this.firebaseData.enabled) {
      return this.startLocalGuestCreatorSession(name);
    }

    try {
      const authApi = await import('firebase/auth');
      const auth = await this.firebaseData.getAuth();
      const credential = await authApi.signInAnonymously(auth);
      await authApi.updateProfile(credential.user, { displayName: name });

      const user: UserProfile = {
        id: credential.user.uid,
        name,
        email: credential.user.email ?? `guest-${credential.user.uid}@public.webcreator.local`,
        password: '',
        role: 'visitor'
      };

      await this.firebaseData.saveUser(user);
      this.setActiveUser(user);
      this.auditLog.record('auth.guest.started', 'info', `${name} public creator oturumu baslatti.`, {
        actor: user
      });
      return user;
    } catch (error) {
      console.warn('Firebase anonymous session failed, local guest session started', error);
      return this.startLocalGuestCreatorSession(name);
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const existing = this.usersSignal().find((user) => user.id === userId);
    const previousRole = existing?.role ?? 'unknown';

    if (this.firebaseData.enabled) {
      const backendUser = await this.firebaseData.callFunction<UserProfile>('updatePlatformUserRole', { userId, role });
      if (backendUser) {
        this.upsertUser({ ...backendUser, password: '' });
        return;
      }
    }

    const nextUsers = this.usersSignal().map((user) => (user.id === userId ? { ...user, role } : user));
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);

    if (this.firebaseData.enabled && existing) {
      await this.firebaseData.saveUser({ ...existing, role });
    }

    this.auditLog.record(
      'user.role.updated',
      'warning',
      `${existing?.email ?? userId} rolu ${previousRole} -> ${role} olarak guncellendi.`,
      { actor: this.currentUser() }
    );
  }

  private findLocalUser(email: string, password: string): UserProfile | null {
    return this.usersSignal().find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    ) ?? null;
  }

  private createLocalUser(payload: Pick<UserProfile, 'name' | 'email' | 'password' | 'role'>): UserProfile {
    const nextUser: UserProfile = {
      id: `user-${crypto.randomUUID()}`,
      ...payload
    };
    const nextUsers = [...this.usersSignal(), nextUser];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
    this.auditLog.record(
      'user.created',
      'success',
      `${nextUser.email} kullanicisi ${nextUser.role} roluyle olusturuldu.`,
      { actor: this.currentUser() }
    );
    return nextUser;
  }

  private startLocalGuestCreatorSession(name = 'Public Creator'): UserProfile {
    const email = `creator-${crypto.randomUUID()}@public.webcreator.local`;
    const user: UserProfile = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      password: '',
      role: 'visitor'
    };

    this.upsertUser(user);
    this.setActiveUser(user);
    this.auditLog.record('auth.guest.started', 'info', `${name} public creator oturumu baslatti.`, {
      actor: user
    });
    return user;
  }

  private async resolveFirebaseUser(
    firebaseUser: import('firebase/auth').User,
    password = ''
  ): Promise<UserProfile> {
    const existing = await this.firebaseData.loadUser(firebaseUser.uid);
    if (existing) {
      return {
        ...existing,
        password: ''
      };
    }

    const user: UserProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email || 'Firebase User',
      email: firebaseUser.email || `user-${firebaseUser.uid}@firebase.local`,
      password,
      role: 'visitor'
    };

    await this.firebaseData.saveUser(user);
    return { ...user, password: '' };
  }

  private hydrateUsersFromFirebase(): void {
    if (!this.firebaseData.enabled) {
      return;
    }

    void this.firebaseData.loadUsers().then((users) => {
      if (!users.length) {
        return;
      }

      const localUsers = this.usersSignal();
      const merged = [
        ...localUsers.filter((localUser) => !users.some((firebaseUser) => firebaseUser.id === localUser.id)),
        ...users.map((user) => ({ ...user, password: '' }))
      ];
      this.usersSignal.set(merged);
      this.persistUsers(merged);
    });
  }

  private hydrateAuthStateFromFirebase(): void {
    if (!this.firebaseData.enabled) {
      return;
    }

    void this.firebaseData.getAuth().then(async (auth) => {
      const authApi = await import('firebase/auth');
      authApi.onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          return;
        }

        void this.resolveFirebaseUser(firebaseUser).then((user) => {
          this.setActiveUser(user);
          this.refreshFirebaseUsersForAdmin(user);
        });
      });
    });
  }

  private refreshFirebaseUsersForAdmin(user: UserProfile): void {
    if (!['admin', 'superadmin'].includes(user.role)) {
      return;
    }

    void this.firebaseData.loadUsers().then((users) => {
      if (!users.length) {
        return;
      }

      const merged = [
        ...this.usersSignal().filter((localUser) => !users.some((firebaseUser) => firebaseUser.id === localUser.id)),
        ...users.map((firebaseUser) => ({ ...firebaseUser, password: '' }))
      ];
      this.usersSignal.set(merged);
      this.persistUsers(merged);
    });
  }

  private upsertUser(user: UserProfile): void {
    const nextUsers = [
      ...this.usersSignal().filter((item) => item.id !== user.id),
      {
        ...user,
        password: user.password ?? ''
      }
    ];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
  }

  private setActiveUser(user: UserProfile): void {
    this.upsertUser(user);
    this.sessionUserId.set(user.id);
    this.persistSession(user.id);
  }

  private recordAuthSuccess(user: UserProfile): void {
    this.auditLog.record('auth.login', 'success', `${user.email} giris yapti.`, { actor: user });
  }

  private recordAuthFailure(email: string): void {
    this.auditLog.record('auth.login.failed', 'warning', `${email} icin basarisiz giris denemesi.`);
  }

  private loadUsers(): UserProfile[] {
    const raw = globalThis.localStorage?.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as UserProfile[]) : demoUsers;
  }

  private loadSessionUserId(): string | null {
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? 'user-admin';
  }

  private persistUsers(users: UserProfile[]): void {
    globalThis.localStorage?.setItem(USERS_KEY, JSON.stringify(users));
  }

  private persistSession(userId: string | null): void {
    if (userId) {
      globalThis.localStorage?.setItem(SESSION_KEY, userId);
      return;
    }

    globalThis.localStorage?.removeItem(SESSION_KEY);
  }
}
