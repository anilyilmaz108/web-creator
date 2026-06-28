import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MockAuthService } from '../../core/services/mock-auth.service';
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
  private readonly auth = inject(MockAuthService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly site = this.store.findBySlug(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly currentUser = this.auth.currentUser;

  constructor() {
    if (!this.site) {
      return;
    }

    this.title.setTitle(this.site.seo.title || this.site.name);
    this.meta.updateTag({ name: 'description', content: this.site.seo.description });
    this.meta.updateTag({ name: 'keywords', content: this.site.seo.keywords });
    this.meta.updateTag({ property: 'og:title', content: this.site.seo.title || this.site.name });
    this.meta.updateTag({ property: 'og:description', content: this.site.seo.description });
    this.meta.updateTag({ property: 'og:image', content: this.site.seo.ogImage });
    this.meta.updateTag({ name: 'robots', content: this.site.seo.noIndex ? 'noindex,nofollow' : 'index,follow' });
  }

  get isAvailable(): boolean {
    if (!this.site || this.site.status !== 'published') {
      return false;
    }

    if (!this.site.publication.approvedUntil) {
      return true;
    }

    return new Date(this.site.publication.approvedUntil).getTime() > Date.now();
  }

  get canView(): boolean {
    if (!this.site || !this.isAvailable) {
      return false;
    }

    return this.site.access.mode === 'public' || !!this.currentUser();
  }
}
