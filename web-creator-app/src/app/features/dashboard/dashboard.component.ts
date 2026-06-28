import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { UserRole } from '../../core/models/auth.models';
import { SiteProject } from '../../core/models/builder.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly auth = inject(MockAuthService);
  private readonly router = inject(Router);
  private readonly builderStore = inject(SiteBuilderStore);

  readonly currentUser = this.auth.currentUser;
  readonly users = this.auth.users;
  readonly projects = this.builderStore.projects;
  readonly pendingProjects = this.builderStore.pendingProjects;
  readonly publishedProjects = this.builderStore.publishedProjects;
  readonly hostingTargets = this.builderStore.hostingTargets;
  readonly auditLogs = this.builderStore.auditLogs;
  readonly simulatedSite = this.builderStore.simulatedSite;
  readonly isSimulating = this.builderStore.isSimulating;
  readonly canManageUsers = computed(() => ['superadmin', 'admin'].includes(this.currentUser()?.role ?? ''));
  readonly canReviewPublications = computed(() => ['superadmin', 'admin'].includes(this.currentUser()?.role ?? ''));
  readonly visibleProjects = computed(() => {
    const user = this.currentUser();
    const projects = this.projects();
    const simulatedSiteId = this.builderStore.simulatedSiteId();

    if (!user) {
      return [];
    }

    if (user.role === 'superadmin' && simulatedSiteId) {
      return projects.filter((project) => project.id === simulatedSiteId);
    }

    if (user.role === 'superadmin') {
      return projects;
    }

    if (user.role === 'admin') {
      return projects.filter((project) => project.ownerId === user.id || project.ownerId === 'user-admin');
    }

    return projects.filter((project) => project.ownerId === user.id);
  });
  readonly activeHostingCount = computed(
    () => this.visibleHostingTargets().filter((target) => target.status === 'active').length
  );
  readonly visiblePendingProjects = computed(() => {
    const simulatedSiteId = this.builderStore.simulatedSiteId();
    return simulatedSiteId
      ? this.pendingProjects().filter((project) => project.id === simulatedSiteId)
      : this.pendingProjects();
  });
  readonly visibleHostingTargets = computed(() => {
    const simulatedSiteId = this.builderStore.simulatedSiteId();
    return simulatedSiteId
      ? this.hostingTargets().filter((target) => target.projectId === simulatedSiteId)
      : this.hostingTargets();
  });
  readonly expiringSoonCount = computed(() => {
    const now = Date.now();
    const windowMs = 1000 * 60 * 60 * 24 * 14;

    return this.visibleProjects().filter((project) => {
      if (!project.publication.approvedUntil) {
        return false;
      }

      const expiresAt = new Date(project.publication.approvedUntil).getTime();
      return expiresAt > now && expiresAt - now <= windowMs;
    }).length;
  });
  readonly roles: UserRole[] = ['visitor', 'moderator', 'admin'];
  readonly recentLogs = computed(() => {
    const simulatedSiteId = this.builderStore.simulatedSiteId();
    const logs = this.auditLogs();
    return (simulatedSiteId ? logs.filter((log) => log.siteId === simulatedSiteId) : logs).slice(0, 12);
  });

  newProjectName = '';
  rejectionReason = 'Yayin onay kriterleri tamamlanmadi.';
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'visitor' as UserRole
  };

  openBuilder(siteId: string): void {
    this.builderStore.selectSite(siteId);
    this.router.navigate(['/builder', siteId]);
  }

  createProject(): void {
    const user = this.currentUser();
    if (!user || !this.newProjectName.trim()) {
      return;
    }

    const project = this.builderStore.createProject(user.id, this.newProjectName);
    this.newProjectName = '';
    this.openBuilder(project.id);
  }

  requestPublication(project: SiteProject): void {
    this.builderStore.selectSite(project.id);
    this.builderStore.requestPublication(project.publication.hostingTargetId, this.currentUser()?.id);
  }

  publishToActiveHosting(project: SiteProject): void {
    this.builderStore.publishToActiveHosting(project.id);
  }

  stopPublication(project: SiteProject): void {
    this.builderStore.stopPublication(project.id, 'Dashboard uzerinden yayin durduruldu.', this.currentUser()?.id);
  }

  approvePublication(project: SiteProject, days: number): void {
    this.builderStore.approvePublication(project.id, days, this.currentUser()?.id);
  }

  rejectPublication(project: SiteProject): void {
    this.builderStore.rejectPublication(project.id, this.rejectionReason, this.currentUser()?.id);
  }

  openSiteAdmin(siteId: string): void {
    this.router.navigate(['/site-admin', siteId]);
  }

  startSimulation(project: SiteProject): void {
    this.builderStore.startSimulation(project.id);
  }

  stopSimulation(): void {
    this.builderStore.stopSimulation();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  async createUser(): Promise<void> {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
      return;
    }

    await this.auth.createUser(this.newUser);
    this.builderStore.recordAuditLog('user.created', 'success', `${this.newUser.email} kullanicisi olusturuldu.`);
    this.newUser = { name: '', email: '', password: '', role: 'visitor' };
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.auth.updateUserRole(userId, role);
    this.builderStore.recordAuditLog('user.role.updated', 'warning', `${this.ownerName(userId)} rolu ${role} olarak guncellendi.`);
  }

  ownerName(ownerId: string): string {
    return this.users().find((user) => user.id === ownerId)?.name ?? 'Bilinmeyen';
  }

  hostingUrl(project: SiteProject): string {
    const target =
      project.hostingTargets.find((item) => item.id === project.publication.hostingTargetId) ??
      project.hostingTargets.find((item) => item.status === 'active') ??
      project.hostingTargets[0];

    return target?.customDomain || target?.defaultUrl || 'URL bekliyor';
  }

  activeHosting(project: SiteProject): boolean {
    return project.hostingTargets.some((target) => target.status === 'active');
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }
}
