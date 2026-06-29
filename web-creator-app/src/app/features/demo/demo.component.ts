import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { SitePage, ViewportMode } from '../../core/models/builder.models';
import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteRendererComponent],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss'
})
export class DemoComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SiteBuilderStore);
  private readonly siteId = this.route.snapshot.paramMap.get('siteId') ?? '';
  private readonly routeSub: Subscription;
  private readonly fragmentSub: Subscription;

  readonly site = computed(() => this.store.findById(this.siteId));
  readonly viewport = signal<ViewportMode>('desktop');
  readonly currentPageId = signal('');
  readonly pageSlug = signal(this.route.snapshot.paramMap.get('pageSlug') ?? '');
  readonly currentPage = computed(() => {
    const site = this.site();
    if (!site) {
      return null;
    }

    const slug = this.pageSlug();
    const routePage = slug ? this.findPageBySlug(site.pages, slug) : null;
    return routePage ?? site.pages.find((page) => page.id === this.currentPageId()) ?? site.pages[0] ?? null;
  });

  readonly viewports: Array<{ value: ViewportMode; label: string }> = [
    { value: 'desktop', label: 'Web' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'mobile', label: 'Mobil' }
  ];

  constructor() {
    const site = this.site();
    this.currentPageId.set(site?.selectedPageId ?? site?.pages[0]?.id ?? '');
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const pageSlug = params.get('pageSlug') ?? '';
      this.pageSlug.set(pageSlug);
      this.selectRoutePage(pageSlug);
    });
    this.fragmentSub = this.route.fragment.subscribe((fragment) => this.openBlockFragment(fragment));
    this.openBlockFragment(this.route.snapshot.fragment);
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
    this.fragmentSub.unsubscribe();
  }

  selectPage(pageId: string): void {
    this.currentPageId.set(pageId);
  }

  private selectRoutePage(pageSlug: string): void {
    const site = this.site();
    const page = site && pageSlug ? this.findPageBySlug(site.pages, pageSlug) : null;
    if (page) {
      this.currentPageId.set(page.id);
    }
  }

  private openBlockFragment(fragment: string | null): void {
    if (!fragment) {
      return;
    }

    const site = this.site();
    const page = site?.pages.find((item) => item.blocks.some((block) => block.id === fragment));
    if (page) {
      this.currentPageId.set(page.id);
    }

    globalThis.setTimeout(() => {
      globalThis.document?.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private findPageBySlug(pages: SitePage[], slug: string): SitePage | null {
    return pages.find((page) => page.slug === slug || Object.values(page.localizedSlugs ?? {}).includes(slug)) ?? null;
  }
}
