import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { UserRole } from '../../core/models/auth.models';
import { AuditLogLevel, CostAlert, SiteProject } from '../../core/models/builder.models';
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
  private readonly filterVersionSignal = signal(0);
  private readonly comparisonVersionSignal = signal(0);

  readonly currentUser = this.auth.currentUser;
  readonly users = this.auth.users;
  readonly projects = this.builderStore.projects;
  readonly pendingProjects = this.builderStore.pendingProjects;
  readonly publishedProjects = this.builderStore.publishedProjects;
  readonly hostingTargets = this.builderStore.hostingTargets;
  readonly auditLogs = this.builderStore.auditLogs;
  readonly saveStatus = this.builderStore.saveStatus;
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
  readonly totalLeadCount = computed(() =>
    this.visibleProjects().reduce((total, project) => total + project.formSubmissions.length, 0)
  );
  readonly mediaAssetCount = computed(() =>
    this.visibleProjects().reduce((total, project) => total + project.mediaAssets.length, 0)
  );
  readonly sharedRouteCount = computed(
    () => this.visibleProjects().filter((project) => project.costPolicy.deployStrategy === 'shared-route').length
  );
  readonly averageChecklistScore = computed(() => {
    const projects = this.visibleProjects();
    if (!projects.length) {
      return 0;
    }

    const total = projects.reduce((score, project) => score + this.checklistScore(project), 0);
    return Math.round(total / projects.length);
  });
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
  readonly logLevelOptions: Array<AuditLogLevel | 'all'> = ['all', 'info', 'success', 'warning', 'danger'];
  readonly scopedAuditLogs = computed(() => {
    const simulatedSiteId = this.builderStore.simulatedSiteId();
    const logs = this.auditLogs();
    return simulatedSiteId ? logs.filter((log) => log.siteId === simulatedSiteId) : logs;
  });
  readonly filteredLogs = computed(() => {
    this.filterVersionSignal();
    const search = this.logFilter.search.trim().toLowerCase();

    return this.scopedAuditLogs().filter((log) => {
      const levelMatch = this.logFilter.level === 'all' || log.level === this.logFilter.level;
      const siteMatch = this.logFilter.siteId === 'all' || log.siteId === this.logFilter.siteId;
      const actorMatch = this.logFilter.actorId === 'all' || log.actorId === this.logFilter.actorId;
      const searchMatch =
        !search ||
        log.action.toLowerCase().includes(search) ||
        log.details.toLowerCase().includes(search) ||
        log.actorName.toLowerCase().includes(search) ||
        (log.siteName ?? '').toLowerCase().includes(search);

      return levelMatch && siteMatch && actorMatch && searchMatch;
    });
  });
  readonly recentLogs = computed(() => this.filteredLogs().slice(0, 12));
  readonly costAlerts = computed(() =>
    this.visibleProjects().flatMap((project) => this.builderStore.costAlerts(project))
  );
  readonly blockingCostAlertCount = computed(() => this.costAlerts().filter((alert) => alert.blocking).length);
  readonly userActivityRows = computed(() => {
    const grouped = this.scopedAuditLogs().reduce<
      Record<string, { actorId: string; actorName: string; total: number; warnings: number; danger: number; lastAt: string }>
    >((acc, log) => {
      const key = log.actorId || log.actorName || 'unknown';
      const current = acc[key] ?? {
        actorId: log.actorId,
        actorName: log.actorName,
        total: 0,
        warnings: 0,
        danger: 0,
        lastAt: log.createdAt
      };

      current.total += 1;
      current.warnings += log.level === 'warning' ? 1 : 0;
      current.danger += log.level === 'danger' ? 1 : 0;
      current.lastAt = new Date(log.createdAt).getTime() > new Date(current.lastAt).getTime() ? log.createdAt : current.lastAt;
      acc[key] = current;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 8);
  });
  readonly comparisonSites = computed(() => {
    this.comparisonVersionSignal();
    const projects = this.visibleProjects();
    const first = projects.find((project) => project.id === this.comparisonAId) ?? projects[0] ?? null;
    const second =
      projects.find((project) => project.id === this.comparisonBId) ??
      projects.find((project) => project.id !== first?.id) ??
      null;
    return { first, second };
  });
  readonly comparisonRows = computed(() => {
    const { first, second } = this.comparisonSites();
    if (!first || !second) {
      return [];
    }

    return [
      { label: 'Durum', first: first.status, second: second.status },
      { label: 'Sayfa', first: first.pages.length, second: second.pages.length },
      { label: 'Block', first: this.blockCount(first), second: this.blockCount(second) },
      { label: 'Dil', first: first.languages.filter((language) => language.enabled).length, second: second.languages.filter((language) => language.enabled).length },
      { label: 'Lead', first: first.formSubmissions.length, second: second.formSubmissions.length },
      { label: 'Medya', first: this.mediaUsage(first), second: this.mediaUsage(second) },
      { label: 'Hazirlik', first: `${this.checklistScore(first)}%`, second: `${this.checklistScore(second)}%` },
      { label: 'Hosting', first: first.hostingTargets.length, second: second.hostingTargets.length },
      { label: 'Maliyet modu', first: first.costPolicy.deployStrategy, second: second.costPolicy.deployStrategy },
      { label: 'Maliyet alarmi', first: this.builderStore.costAlerts(first).length, second: this.builderStore.costAlerts(second).length },
      { label: 'Log', first: this.builderStore.logsForSite(first.id).length, second: this.builderStore.logsForSite(second.id).length }
    ];
  });
  readonly criticalLogCount = computed(
    () => this.auditLogs().filter((log) => log.level === 'warning' || log.level === 'danger').length
  );
  readonly authLogCount = computed(() => this.auditLogs().filter((log) => log.action.startsWith('auth.')).length);

  newProjectName = '';
  rejectionReason = 'Yayin onay kriterleri tamamlanmadi.';
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'visitor' as UserRole
  };
  logFilter = {
    level: 'all' as AuditLogLevel | 'all',
    siteId: 'all',
    actorId: 'all',
    search: ''
  };
  comparisonAId = '';
  comparisonBId = '';

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
    this.newUser = { name: '', email: '', password: '', role: 'visitor' };
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.auth.updateUserRole(userId, role);
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

  checklistScore(project: SiteProject): number {
    const checks = this.builderStore.publicationChecklist(project);
    if (!checks.length) {
      return 0;
    }

    return Math.round((checks.filter((item) => item.status === 'pass').length / checks.length) * 100);
  }

  mediaUsage(project: SiteProject): string {
    const mb = project.mediaAssets.reduce((total, asset) => total + asset.sizeKb, 0) / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  blockCount(project: SiteProject): number {
    return project.pages.reduce((total, page) => total + page.blocks.length, 0);
  }

  clearLogFilters(): void {
    this.logFilter = {
      level: 'all',
      siteId: 'all',
      actorId: 'all',
      search: ''
    };
    this.filterVersionSignal.update((value) => value + 1);
  }

  updateLogFilter(field: 'level' | 'siteId' | 'actorId' | 'search', value: string): void {
    if (field === 'level') {
      this.logFilter = { ...this.logFilter, level: value as AuditLogLevel | 'all' };
    } else if (field === 'siteId') {
      this.logFilter = { ...this.logFilter, siteId: value };
    } else if (field === 'actorId') {
      this.logFilter = { ...this.logFilter, actorId: value };
    } else {
      this.logFilter = { ...this.logFilter, search: value };
    }
    this.filterVersionSignal.update((current) => current + 1);
  }

  updateComparison(which: 'first' | 'second', siteId: string): void {
    if (which === 'first') {
      this.comparisonAId = siteId;
    } else {
      this.comparisonBId = siteId;
    }
    this.comparisonVersionSignal.update((current) => current + 1);
  }

  exportFilteredLogs(): void {
    const rows = this.filteredLogs();
    const header = ['createdAt', 'level', 'action', 'actorName', 'siteName', 'details'];
    const csv = [
      header.join(','),
      ...rows.map((log) =>
        [
          log.createdAt,
          log.level,
          log.action,
          log.actorName,
          log.siteName ?? 'Platform',
          log.details
        ].map((value) => this.csvCell(value)).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `web-creator-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  alertClass(alert: CostAlert): string {
    if (alert.severity === 'danger') {
      return 'alert-card--danger';
    }

    if (alert.severity === 'warning') {
      return 'alert-card--warning';
    }

    return 'alert-card--info';
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

  logScope(siteName?: string): string {
    return siteName ? `Site: ${siteName}` : 'Platform';
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
