import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { SitePage, SiteProject } from '../../core/models/builder.models';
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
export class PublicSiteComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SiteBuilderStore);
  private readonly auth = inject(MockAuthService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly routeSub: Subscription;

  readonly slug = signal('');
  readonly pageSlug = signal('');
  readonly site = signal<SiteProject | null>(null);
  readonly loading = signal(true);
  readonly currentUser = this.auth.currentUser;
  readonly currentPage = computed(() => {
    const site = this.site();
    if (!site) {
      return null;
    }

    const pageSlug = this.pageSlug();
    if (pageSlug) {
      return this.findPageBySlug(site.pages, pageSlug);
    }

    return site.pages.find((page) => page.id === site.selectedPageId) ?? site.pages[0] ?? null;
  });

  constructor() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug = this.resolveSiteSlug(params);
      this.slug.set(slug);
      this.pageSlug.set(params.get('pageSlug') ?? '');
      this.site.set(this.store.findBySlug(slug));
      this.applyMeta(this.site());
      this.loading.set(true);
      void this.loadSite(slug);
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  get isAvailable(): boolean {
    const site = this.site();
    if (!site || site.status !== 'published') {
      return false;
    }

    if (!site.publication.approvedUntil) {
      return true;
    }

    return new Date(site.publication.approvedUntil).getTime() > Date.now();
  }

  get canView(): boolean {
    const site = this.site();
    if (!site || !this.isAvailable) {
      return false;
    }

    return site.access.mode === 'public' || !!this.currentUser();
  }

  pageUrl(site: SiteProject, page: SitePage): string {
    return this.store.publicSiteUrl(site.slug, page.slug);
  }

  private async loadSite(slug: string): Promise<void> {
    if (!slug) {
      this.site.set(null);
      this.loading.set(false);
      return;
    }

    const site = await this.store.loadPublishedSiteBySlug(slug);
    this.site.set(site);
    this.applyMeta(site);
    this.loading.set(false);
  }

  private resolveSiteSlug(params: ParamMap): string {
    return params.get('slug') ?? params.get('tenantSlug') ?? this.tenantSlugFromHost() ?? '';
  }

  private tenantSlugFromHost(): string | null {
    const hostname = globalThis.location?.hostname ?? '';
    const config = globalThis.window?.webCreatorFirebaseConfig;
    const domainBase = config?.tenantDomainBase?.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const normalizedHost = hostname.toLowerCase();

    if (!config?.tenantDomainRoutingEnabled || !domainBase || !normalizedHost.endsWith(`.${domainBase}`)) {
      return null;
    }

    return normalizedHost.slice(0, -(domainBase.length + 1)) || null;
  }

  private findPageBySlug(pages: SitePage[], slug: string): SitePage | null {
    return pages.find((page) => page.slug === slug || Object.values(page.localizedSlugs ?? {}).includes(slug)) ?? null;
  }

  private applyMeta(site: SiteProject | null): void {
    if (!site) {
      return;
    }

    this.title.setTitle(site.seo.title || site.name);
    this.meta.updateTag({ name: 'description', content: site.seo.description });
    this.meta.updateTag({ name: 'keywords', content: site.seo.keywords });
    this.meta.updateTag({ property: 'og:title', content: site.seo.title || site.name });
    this.meta.updateTag({ property: 'og:description', content: site.seo.description });
    this.meta.updateTag({ property: 'og:image', content: site.seo.ogImage });
    this.meta.updateTag({ name: 'robots', content: site.seo.noIndex ? 'noindex,nofollow' : 'index,follow' });
  }
}
