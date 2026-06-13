import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './review-queue.component.html',
  styleUrl: './review-queue.component.scss'
})
export class ReviewQueueComponent {
  readonly store = inject(SiteBuilderStore);
  readonly pendingProjects = this.store.pendingProjects;

  approve(siteId: string, days: number): void {
    this.store.approvePublication(siteId, days);
  }
}
