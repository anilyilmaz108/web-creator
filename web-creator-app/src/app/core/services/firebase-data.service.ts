import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuditLogEntry, SiteProject } from '../models/builder.models';

type FirebaseFirestore = Awaited<ReturnType<typeof import('firebase/firestore').getFirestore>>;
type FirebaseApp = Awaited<ReturnType<typeof import('firebase/app').initializeApp>>;

@Injectable({ providedIn: 'root' })
export class FirebaseDataService {
  readonly enabled = environment.firebaseEnabled;

  private app: FirebaseApp | null = null;
  private firestore: FirebaseFirestore | null = null;

  saveProjects(projects: SiteProject[]): void {
    if (!this.enabled) {
      return;
    }

    void this.withFirestore(async (firestore, firestoreApi) => {
      const batch = firestoreApi.writeBatch(firestore);
      projects.forEach((project) => {
        batch.set(firestoreApi.doc(firestore, 'sites', project.id), project as unknown as Record<string, unknown>, {
          merge: true
        });
      });
      await batch.commit();
    }, 'Firebase project sync failed');
  }

  saveAuditLogs(logs: AuditLogEntry[]): void {
    if (!this.enabled) {
      return;
    }

    void this.withFirestore(async (firestore, firestoreApi) => {
      const batch = firestoreApi.writeBatch(firestore);
      logs.slice(0, 50).forEach((log) => {
        batch.set(firestoreApi.doc(firestore, 'auditLogs', log.id), log as unknown as Record<string, unknown>, {
          merge: true
        });
      });
      await batch.commit();
    }, 'Firebase audit log sync failed');
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

  private async getFirestore(): Promise<FirebaseFirestore> {
    if (this.firestore) {
      return this.firestore;
    }

    const appApi = await import('firebase/app');
    const firestoreApi = await import('firebase/firestore');
    this.app = this.app ?? appApi.initializeApp(environment.firebase);
    this.firestore = firestoreApi.getFirestore(this.app);
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
}
