import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FormSubmission, PageBlock, SiteProject } from '../../core/models/builder.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-site-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './site-admin-dashboard.component.html',
  styleUrl: './site-admin-dashboard.component.scss'
})
export class SiteAdminDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(MockAuthService);
  private readonly store = inject(SiteBuilderStore);

  readonly site = computed(() => this.store.findById(this.route.snapshot.paramMap.get('siteId') ?? ''));
  readonly currentUser = this.auth.currentUser;
  readonly isSimulating = this.store.isSimulating;
  readonly logs = computed(() => {
    const site = this.site();
    return site ? this.store.logsForSite(site.id).slice(0, 14) : [];
  });
  readonly stats = computed(() => {
    const site = this.site();
    if (!site) {
      return [];
    }

    const blockCount = site.pages.reduce((total, page) => total + page.blocks.length, 0);

    return [
      { label: 'Goruntulenme', value: site.metrics.views },
      { label: 'Ziyaretci', value: site.metrics.visitors },
      { label: 'Lead', value: site.formSubmissions.length || site.metrics.leads },
      { label: 'Donusum', value: `${site.metrics.conversionRate}%` },
      { label: 'Yayin hazirligi', value: `${this.checklistScore(site)}%` },
      { label: 'Block', value: blockCount }
    ];
  });
  readonly chart = computed(() => {
    const site = this.site();
    const base = site ? Math.max(site.pages.length * 24 + this.blocks(site).length * 8, 20) : 20;
    return Array.from({ length: 7 }, (_, index) => ({
      label: ['Pzt', 'Sali', 'Cars', 'Pers', 'Cuma', 'Cmt', 'Paz'][index],
      value: base + index * 7 + (index % 2 === 0 ? 18 : 4)
    }));
  });
  readonly componentRows = computed(() => {
    const site = this.site();
    if (!site) {
      return [];
    }

    const counts = this.blocks(site).reduce<Record<string, number>>((acc, block) => {
      const key = block.type === 'widget' ? block.widgetKind : block.type;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  });

  openBuilder(siteId: string): void {
    this.store.selectSite(siteId);
    this.router.navigate(['/builder', siteId]);
  }

  stopPublication(site: SiteProject): void {
    this.store.stopPublication(site.id, 'Site admin panelinden yayin durduruldu.', this.currentUser()?.id);
  }

  requestPublication(site: SiteProject): void {
    this.store.selectSite(site.id);
    this.store.requestPublication(site.publication.hostingTargetId, this.currentUser()?.id);
  }

  updateSubmissionStatus(site: SiteProject, submission: FormSubmission, status: FormSubmission['status']): void {
    this.store.selectSite(site.id);
    this.store.updateFormSubmissionStatus(submission.id, status);
  }

  stopSimulation(): void {
    this.store.stopSimulation();
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

  maxChartValue(): number {
    return Math.max(...this.chart().map((item) => item.value), 1);
  }

  barHeight(value: number): number {
    return Math.max(12, (value / this.maxChartValue()) * 100);
  }

  checklistScore(site: SiteProject): number {
    const checks = this.store.publicationChecklist(site);
    if (!checks.length) {
      return 0;
    }

    return Math.round((checks.filter((item) => item.status === 'pass').length / checks.length) * 100);
  }

  mediaUsage(site: SiteProject): string {
    const mb = site.mediaAssets.reduce((total, asset) => total + asset.sizeKb, 0) / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  private blocks(site: SiteProject): PageBlock[] {
    return site.pages.flatMap((page) => page.blocks);
  }
}
