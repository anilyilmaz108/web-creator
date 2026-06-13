import { Injectable, computed, signal } from '@angular/core';

import { demoProjects, themePresets } from '../data/demo-data';
import {
  BlockType,
  PageBlock,
  SitePage,
  SiteProject,
  ThemeConfig,
  ViewportMode
} from '../models/builder.models';

const PROJECTS_KEY = 'web-creator-projects';

@Injectable({ providedIn: 'root' })
export class SiteBuilderStore {
  private readonly projectsSignal = signal<SiteProject[]>(this.loadProjects());
  private readonly selectedSiteIdSignal = signal<string>(this.projectsSignal()[0]?.id ?? '');
  private readonly selectedBlockIdSignal = signal<string | null>(null);
  private readonly viewportSignal = signal<ViewportMode>('desktop');

  readonly projects = computed(() => this.projectsSignal());
  readonly themePresets = themePresets;
  readonly selectedSiteId = computed(() => this.selectedSiteIdSignal());
  readonly selectedBlockId = computed(() => this.selectedBlockIdSignal());
  readonly viewport = computed(() => this.viewportSignal());
  readonly selectedSite = computed(
    () => this.projectsSignal().find((project) => project.id === this.selectedSiteIdSignal()) ?? null
  );
  readonly selectedPage = computed(() => {
    const site = this.selectedSite();
    if (!site) {
      return null;
    }

    return site.pages.find((page) => page.id === site.selectedPageId) ?? site.pages[0] ?? null;
  });
  readonly selectedBlock = computed(() => {
    const page = this.selectedPage();
    if (!page) {
      return null;
    }

    return page.blocks.find((block) => block.id === this.selectedBlockIdSignal()) ?? null;
  });
  readonly pendingProjects = computed(() =>
    this.projectsSignal().filter((project) => project.status === 'pending')
  );

  selectSite(siteId: string): void {
    this.selectedSiteIdSignal.set(siteId);
    this.selectedBlockIdSignal.set(null);
  }

  selectPage(pageId: string): void {
    this.patchSelectedSite((site) => ({ ...site, selectedPageId: pageId }));
    this.selectedBlockIdSignal.set(null);
  }

  createPage(name: string): void {
    const page: SitePage = {
      id: `page-${crypto.randomUUID()}`,
      name,
      slug: this.slugify(name),
      blocks: []
    };
    this.patchSelectedSite((site) => ({
      ...site,
      pages: [...site.pages, page],
      selectedPageId: page.id
    }));
  }

  renamePage(pageId: string, name: string): void {
    this.patchSelectedSite((site) => ({
      ...site,
      pages: site.pages.map((page) =>
        page.id === pageId ? { ...page, name, slug: this.slugify(name) } : page
      )
    }));
  }

  addBlock(type: BlockType): void {
    const nextBlock = this.createBlock(type);
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, nextBlock] }));
    this.selectedBlockIdSignal.set(nextBlock.id);
  }

  selectBlock(blockId: string): void {
    this.selectedBlockIdSignal.set(blockId);
  }

  removeBlock(blockId: string): void {
    this.patchSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId)
    }));
    if (this.selectedBlockIdSignal() === blockId) {
      this.selectedBlockIdSignal.set(null);
    }
  }

  moveBlock(blockId: string, direction: 'up' | 'down'): void {
    this.patchSelectedPage((page) => {
      const index = page.blocks.findIndex((block) => block.id === blockId);
      if (index < 0) {
        return page;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= page.blocks.length) {
        return page;
      }

      const blocks = [...page.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(targetIndex, 0, block);
      return { ...page, blocks };
    });
  }

  updateBlock(blockId: string, patch: Partial<PageBlock>): void {
    this.patchSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? ({ ...block, ...patch } as PageBlock) : block
      )
    }));
  }

  applyTheme(theme: ThemeConfig): void {
    this.patchSelectedSite((site) => ({ ...site, theme }));
  }

  updateTheme(patch: Partial<ThemeConfig>): void {
    this.patchSelectedSite((site) => ({ ...site, theme: { ...site.theme, ...patch } }));
  }

  updateSiteMeta(patch: Partial<Pick<SiteProject, 'name' | 'slug'>>): void {
    this.patchSelectedSite((site) => ({ ...site, ...patch }));
  }

  setViewport(viewport: ViewportMode): void {
    this.viewportSignal.set(viewport);
  }

  requestPublication(): void {
    this.patchSelectedSite((site) => ({
      ...site,
      status: 'pending',
      publication: { ...site.publication, requestedAt: new Date().toISOString() }
    }));
  }

  approvePublication(siteId: string, days: number): void {
    const now = new Date();
    const approvedUntil = new Date(now);
    approvedUntil.setDate(now.getDate() + days);

    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === siteId
          ? {
              ...project,
              status: 'published',
              publication: {
                ...project.publication,
                approvedAt: now.toISOString(),
                approvedUntil: approvedUntil.toISOString()
              }
            }
          : project
      )
    );
    this.persist();
  }

  findById(siteId: string): SiteProject | null {
    return this.projectsSignal().find((project) => project.id === siteId) ?? null;
  }

  findBySlug(slug: string): SiteProject | null {
    return this.projectsSignal().find((project) => project.slug === slug) ?? null;
  }

  private patchSelectedSite(updater: (site: SiteProject) => SiteProject): void {
    const currentId = this.selectedSiteIdSignal();
    this.projectsSignal.update((projects) =>
      projects.map((project) => (project.id === currentId ? updater(project) : project))
    );
    this.persist();
  }

  private patchSelectedPage(updater: (page: SitePage) => SitePage): void {
    this.patchSelectedSite((site) => ({
      ...site,
      pages: site.pages.map((page) => (page.id === site.selectedPageId ? updater(page) : page))
    }));
  }

  private createBlock(type: BlockType): PageBlock {
    const base = {
      id: `block-${crypto.randomUUID()}`,
      type,
      title: `${type.toUpperCase()} Block`,
      layout: 'stack' as const
    };

    switch (type) {
      case 'hero':
        return {
          ...base,
          type,
          layout: 'split',
          eyebrow: 'New section',
          heading: 'Yeni bir hero alanı',
          body: 'Metinlerinizi, butonlarınızı ve görselinizi bu bölümden yönetin.',
          primaryAction: 'Birincil Aksiyon',
          secondaryAction: 'İkincil Aksiyon',
          imageUrl:
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'
        };
      case 'features':
        return {
          ...base,
          type,
          layout: 'grid-3',
          items: [
            { title: 'Kart 1', body: 'Açıklama' },
            { title: 'Kart 2', body: 'Açıklama' },
            { title: 'Kart 3', body: 'Açıklama' }
          ]
        };
      case 'table':
        return {
          ...base,
          type,
          columns: ['Başlık', 'Değer'],
          rows: [
            { label: 'Satır 1', value: 'İçerik' },
            { label: 'Satır 2', value: 'İçerik' }
          ]
        };
      case 'image':
        return {
          ...base,
          type,
          imageUrl:
            'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
          caption: 'Görsel açıklaması'
        };
      case 'cta':
        return {
          ...base,
          type,
          heading: 'Harekete geçirici alan',
          body: 'Kullanıcıyı aksiyona yönlendiren kısa metin.',
          actionLabel: 'Buton'
        };
      case 'text':
      default:
        return {
          ...base,
          type: 'text',
          body: 'Bu alana istediğiniz metni, açıklamayı veya içerik bloklarını ekleyebilirsiniz.'
        };
    }
  }

  private loadProjects(): SiteProject[] {
    const raw = globalThis.localStorage?.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as SiteProject[]) : demoProjects;
  }

  private persist(): void {
    globalThis.localStorage?.setItem(PROJECTS_KEY, JSON.stringify(this.projectsSignal()));
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
