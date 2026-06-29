import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SiteProject } from '../../core/models/builder.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './review-queue.component.html',
  styleUrl: './review-queue.component.scss'
})
export class ReviewQueueComponent {
  readonly store = inject(SiteBuilderStore);
  private readonly auth = inject(MockAuthService);
  readonly pendingProjects = this.store.pendingProjects;
  readonly currentUser = this.auth.currentUser;
  rejectionReason = 'Icerik veya hosting ayarlari onay kriterlerini karsilamiyor.';

  approve(siteId: string, days: number): void {
    this.store.approvePublication(siteId, days, this.currentUser()?.id);
  }

  reject(siteId: string): void {
    this.store.rejectPublication(siteId, this.rejectionReason, this.currentUser()?.id);
  }

  hostingUrl(siteId: string): string {
    const project = this.store.findById(siteId);
    if (project?.costPolicy.deployStrategy === 'shared-route') {
      return this.store.publicSiteUrl(project.slug);
    }

    const target =
      project?.hostingTargets.find((item) => item.id === project.publication.hostingTargetId) ??
      project?.hostingTargets[0];

    return target?.customDomain || target?.defaultUrl || target?.firebaseSiteId || 'Hosting secilmedi';
  }

  checklistScore(project: SiteProject): number {
    const checks = this.store.publicationChecklist(project);
    if (!checks.length) {
      return 0;
    }

    return Math.round((checks.filter((item) => item.status === 'pass').length / checks.length) * 100);
  }
}
