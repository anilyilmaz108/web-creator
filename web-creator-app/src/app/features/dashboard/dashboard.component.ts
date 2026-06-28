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
  readonly canManageUsers = computed(() => ['superadmin', 'admin'].includes(this.currentUser()?.role ?? ''));
  readonly canReviewPublications = computed(() => this.currentUser()?.role === 'superadmin');
  readonly visibleProjects = computed(() => {
    const user = this.currentUser();
    const projects = this.projects();

    if (!user) {
      return [];
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
    () => this.hostingTargets().filter((target) => target.status === 'active').length
  );
  readonly expiringSoonCount = computed(() => {
    const now = Date.now();
    const windowMs = 1000 * 60 * 60 * 24 * 14;

    return this.publishedProjects().filter((project) => {
      if (!project.publication.approvedUntil) {
        return false;
      }

      const expiresAt = new Date(project.publication.approvedUntil).getTime();
      return expiresAt > now && expiresAt - now <= windowMs;
    }).length;
  });
  readonly roles: UserRole[] = ['visitor', 'moderator', 'admin'];

  newProjectName = '';
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

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  createUser(): void {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
      return;
    }

    this.auth.createUser(this.newUser);
    this.newUser = { name: '', email: '', password: '', role: 'visitor' };
  }

  updateRole(userId: string, role: UserRole): void {
    this.auth.updateUserRole(userId, role);
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
