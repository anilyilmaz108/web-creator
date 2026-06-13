import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-public-site',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteRendererComponent],
  templateUrl: './public-site.component.html',
  styleUrl: './public-site.component.scss'
})
export class PublicSiteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SiteBuilderStore);

  readonly site = this.store.findBySlug(this.route.snapshot.paramMap.get('slug') ?? '');

  get isAvailable(): boolean {
    if (!this.site || this.site.status !== 'published') {
      return false;
    }

    if (!this.site.publication.approvedUntil) {
      return true;
    }

    return new Date(this.site.publication.approvedUntil).getTime() > Date.now();
  }
}
