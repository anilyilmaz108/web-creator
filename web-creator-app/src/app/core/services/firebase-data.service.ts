import { Injectable } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';

import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/auth.models';
import { AuditLogEntry, SiteProject } from '../models/builder.models';

type FirebaseFirestore = Awaited<ReturnType<typeof import('firebase/firestore').getFirestore>>;
type FirebaseApp = Awaited<ReturnType<typeof import('firebase/app').initializeApp>>;
type FirebaseAuth = Awaited<ReturnType<typeof import('firebase/auth').getAuth>>;

interface FirebaseRuntimeConfig {
  firebaseEnabled?: boolean;
  firebaseProjectId?: string;
  firebaseHostingSite?: string;
  firebaseHostingUrl?: string;
  firebase?: FirebaseOptions;
}

declare global {
  interface Window {
    webCreatorFirebaseConfig?: FirebaseRuntimeConfig;
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseDataService {
  private app: FirebaseApp | null = null;
  private firestore: FirebaseFirestore | null = null;
  private auth: FirebaseAuth | null = null;

  get enabled(): boolean {
    return this.runtimeConfig.firebaseEnabled ?? environment.firebaseEnabled;
  }

  get projectId(): string {
    return this.runtimeConfig.firebaseProjectId ?? environment.firebaseProjectId;
  }

  get hostingSite(): string {
    return this.runtimeConfig.firebaseHostingSite ?? environment.firebaseHostingSite;
  }

  get hostingUrl(): string {
    return this.runtimeConfig.firebaseHostingUrl ?? environment.firebaseHostingUrl;
  }

  async saveProject(project: SiteProject): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    try {
      const firestoreApi = await import('firebase/firestore');
      const firestore = await this.getFirestore();
      await firestoreApi.setDoc(
        firestoreApi.doc(firestore, 'sites', project.id),
        this.projectForFirestore(project),
        { merge: true }
      );
      return true;
    } catch (error) {
      console.warn('Firebase project sync failed', error);
      return false;
    }
  }

  async saveProjects(projects: SiteProject[]): Promise<{ succeeded: number; failed: number }> {
    if (!this.enabled) {
      return { succeeded: projects.length, failed: 0 };
    }

    const results = await Promise.allSettled(projects.map((project) => this.saveProject(project)));
    const succeeded = results.filter((result) => result.status === 'fulfilled' && result.value).length;

    return {
      succeeded,
      failed: projects.length - succeeded
    };
  }

  saveAuditLogs(logs: AuditLogEntry[]): void {
    if (!this.enabled) {
      return;
    }

    void this.withFirestore(async (firestore, firestoreApi) => {
      await Promise.allSettled(
        logs.slice(0, 50).map((log) =>
          firestoreApi.setDoc(
            firestoreApi.doc(firestore, 'auditLogs', log.id),
            this.stripUndefined(log) as Record<string, unknown>,
            { merge: true }
          )
        )
      );
    }, 'Firebase audit log sync failed');
  }

  async saveUser(user: UserProfile): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.withFirestore(async (firestore, firestoreApi) => {
      await firestoreApi.setDoc(
        firestoreApi.doc(firestore, 'platformUsers', user.id),
        this.userForFirestore(user),
        { merge: true }
      );
    }, 'Firebase user sync failed');
  }

  async loadProjects(): Promise<SiteProject[]> {
    if (!this.enabled) {
      return [];
    }

    return this.readCollection<SiteProject>('sites', 'Firebase project load failed');
  }

  async loadAuditLogs(): Promise<AuditLogEntry[]> {
    if (!this.enabled) {
      return [];
    }

    const logs = await this.readCollection<AuditLogEntry>('auditLogs', 'Firebase audit log load failed');
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async loadUsers(): Promise<UserProfile[]> {
    if (!this.enabled) {
      return [];
    }

    return this.readCollection<UserProfile>('platformUsers', 'Firebase user load failed');
  }

  async loadUser(userId: string): Promise<UserProfile | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const firestoreApi = await import('firebase/firestore');
      const firestore = await this.getFirestore();
      const snapshot = await firestoreApi.getDoc(firestoreApi.doc(firestore, 'platformUsers', userId));
      return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
    } catch (error) {
      console.warn('Firebase user profile load failed', error);
      return null;
    }
  }

  async getAuth(): Promise<FirebaseAuth> {
    if (this.auth) {
      return this.auth;
    }

    const authApi = await import('firebase/auth');
    this.auth = authApi.getAuth(await this.getApp());
    return this.auth;
  }

  async callFunction<T>(name: string, payload: unknown): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      return await this.callFunctionStrict<T>(name, payload);
    } catch (error) {
      console.warn(`Firebase function ${name} failed`, error);
      return null;
    }
  }

  async callFunctionStrict<T>(name: string, payload: unknown): Promise<T> {
    if (!this.enabled) {
      throw new Error('Firebase aktif degil.');
    }

    const functionsApi = await import('firebase/functions');
    const callable = functionsApi.httpsCallable(
      functionsApi.getFunctions(await this.getApp(), 'europe-west3'),
      name
    );
    const response = await callable(payload);
    return response.data as T;
  }

  getFirebaseOptions(): FirebaseOptions {
    const config = this.runtimeConfig.firebase ?? environment.firebase;

    if (!config.apiKey || !config.projectId || !config.appId) {
      throw new Error(
        `${environment.firebaseRuntimeConfigPath} icinde Firebase web config bulunamadi. ` +
          'public/firebase-config.example.js dosyasini public/firebase-config.js olarak kopyalayip doldurun.'
      );
    }

    return config;
  }

  private async withFirestore(
    action: (
      firestore: FirebaseFirestore,
      firestoreApi: typeof import('firebase/firestore')
    ) => Promise<void>,
    errorMessage: string
  ): Promise<void> {
    try {
      const firestoreApi = await import('firebase/firestore');
      const firestore = await this.getFirestore();
      await action(firestore, firestoreApi);
    } catch (error) {
      console.warn(errorMessage, error);
    }
  }

  private async getApp(): Promise<FirebaseApp> {
    if (this.app) {
      return this.app;
    }

    const appApi = await import('firebase/app');
    this.app = appApi.initializeApp(this.getFirebaseOptions());
    return this.app;
  }

  private async getFirestore(): Promise<FirebaseFirestore> {
    if (this.firestore) {
      return this.firestore;
    }

    const firestoreApi = await import('firebase/firestore');
    this.firestore = firestoreApi.getFirestore(await this.getApp());
    return this.firestore;
  }

  private async readCollection<T>(collectionName: string, errorMessage: string): Promise<T[]> {
    try {
      const firestoreApi = await import('firebase/firestore');
      const firestore = await this.getFirestore();
      const snapshot = await firestoreApi.getDocs(firestoreApi.collection(firestore, collectionName));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
    } catch (error) {
      console.warn(errorMessage, error);
      return [];
    }
  }

  private get runtimeConfig(): FirebaseRuntimeConfig {
    return globalThis.window?.webCreatorFirebaseConfig ?? {};
  }

  private projectForFirestore(project: SiteProject): Record<string, unknown> {
    return this.stripUndefined({
      ...project,
      ownerUid: project.ownerUid ?? project.ownerId
    }) as Record<string, unknown>;
  }

  private userForFirestore(user: UserProfile): Record<string, unknown> {
    const { password: _password, ...profile } = user;
    return this.stripUndefined({
      ...profile,
      password: ''
    }) as Record<string, unknown>;
  }

  private stripUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripUndefined(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, this.stripUndefined(item)])
      );
    }

    return value;
  }
}
