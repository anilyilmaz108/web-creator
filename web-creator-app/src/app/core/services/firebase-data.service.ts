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

  saveProjects(projects: SiteProject[]): void {
    if (!this.enabled) {
      return;
    }

    void this.withFirestore(async (firestore, firestoreApi) => {
      await Promise.allSettled(
        projects.map((project) =>
          firestoreApi.setDoc(
            firestoreApi.doc(firestore, 'sites', project.id),
            this.projectForFirestore(project),
            { merge: true }
          )
        )
      );
    }, 'Firebase project sync failed');
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
            log as unknown as Record<string, unknown>,
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
      return snapshot.docs.map((item) => item.data() as T);
    } catch (error) {
      console.warn(errorMessage, error);
      return [];
    }
  }

  private get runtimeConfig(): FirebaseRuntimeConfig {
    return globalThis.window?.webCreatorFirebaseConfig ?? {};
  }

  private projectForFirestore(project: SiteProject): Record<string, unknown> {
    return {
      ...project,
      ownerUid: project.ownerUid ?? project.ownerId
    } as unknown as Record<string, unknown>;
  }

  private userForFirestore(user: UserProfile): Record<string, unknown> {
    const { password: _password, ...profile } = user;
    return {
      ...profile,
      password: ''
    };
  }
}
