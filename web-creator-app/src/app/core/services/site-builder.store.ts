import { Injectable, computed, signal } from '@angular/core';

import { componentCatalog } from '../data/component-catalog';
import { demoProjects, themePresets } from '../data/demo-data';
import {
  ActionButton,
  BlockType,
  CtaBlock,
  FeaturesBlock,
  HeroBlock,
  ImageBlock,
  LayoutMode,
  PageBlock,
  SitePage,
  SiteProject,
  TableBlock,
  ThemeConfig,
  TextBlock,
  ViewportMode,
  WidgetBlock,
  WidgetKind
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
  readonly componentCatalog = componentCatalog;
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

  removePage(pageId: string): void {
    this.patchSelectedSite((site) => {
      if (site.pages.length <= 1) {
        return site;
      }

      const nextPages = site.pages.filter((page) => page.id !== pageId);
      const nextSelectedId =
        site.selectedPageId === pageId ? nextPages[0]?.id ?? site.selectedPageId : site.selectedPageId;

      return {
        ...site,
        pages: nextPages,
        selectedPageId: nextSelectedId
      };
    });
    this.selectedBlockIdSignal.set(null);
  }

  addBlock(type: BlockType): void {
    const nextBlock = this.createBlock(type);
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, nextBlock] }));
    this.selectedBlockIdSignal.set(nextBlock.id);
  }

  addWidget(widgetKind: WidgetKind): void {
    const nextBlock = this.createWidget(widgetKind);
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

  moveBlockToIndex(blockId: string, targetIndex: number): void {
    this.patchSelectedPage((page) => {
      const index = page.blocks.findIndex((block) => block.id === blockId);
      if (index < 0 || targetIndex < 0 || targetIndex >= page.blocks.length || index === targetIndex) {
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

  private createBase<T extends BlockType>(type: T, title: string, layout: LayoutMode = 'stack') {
    const theme = this.selectedSite()?.theme ?? themePresets[0];

    return {
      id: `block-${crypto.randomUUID()}`,
      type,
      title,
      layout,
      animation: 'fade-up' as const,
      animationDuration: 550,
      animationDelay: 0,
      hoverEffect: 'lift' as const,
      contentAnimation: 'fade-in' as const,
      mediaAnimation: 'zoom-in' as const,
      fontStyle: 'normal' as const,
      textAlign: 'left' as const,
      linkLabel: '',
      linkUrl: '',
      linkTarget: '_self' as const,
      backgroundColor: theme.surface,
      backgroundImageUrl: '',
      backgroundOverlay: 18,
      textColor: theme.foreground,
      accentColor: theme.accent,
      widthPreset: 'full' as const,
      minHeight: 0
    };
  }

  private createBlock(type: BlockType): PageBlock {
    switch (type) {
      case 'hero':
        return {
          ...this.createBase(type, 'Hero', 'split'),
          eyebrow: 'New section',
          heading: 'Yeni bir hero alani',
          body: 'Metinlerinizi, butonlarinizi ve gorselinizi bu bolumden yonetin.',
          buttons: [
            this.createActionButton('Birincil Aksiyon', 'https://example.com', 'solid'),
            this.createActionButton('Ikincil Aksiyon', '', 'outline')
          ],
          primaryAction: 'Birincil Aksiyon',
          secondaryAction: 'Ikincil Aksiyon',
          imageUrl:
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'
        } as HeroBlock;
      case 'features':
        return {
          ...this.createBase(type, 'Cards', 'grid-3'),
          items: [
            {
              title: 'Kart 1',
              body: 'Aciklama',
              imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
              linkUrl: '',
              linkTarget: '_self'
            },
            {
              title: 'Kart 2',
              body: 'Aciklama',
              imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
              linkUrl: '',
              linkTarget: '_self'
            },
            {
              title: 'Kart 3',
              body: 'Aciklama',
              imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
              linkUrl: '',
              linkTarget: '_self'
            }
          ]
        } as FeaturesBlock;
      case 'table':
        return {
          ...this.createBase(type, 'Table', 'stack'),
          columns: ['Baslik', 'Deger'],
          rows: [
            { cells: ['Satir 1', 'Icerik'] },
            { cells: ['Satir 2', 'Icerik'] }
          ]
        } as TableBlock;
      case 'image':
        return {
          ...this.createBase(type, 'Image', 'stack'),
          imageUrl:
            'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
          caption: 'Gorsel aciklamasi',
          altText: 'Ornek gorsel'
        } as ImageBlock;
      case 'cta':
        return {
          ...this.createBase(type, 'CTA', 'stack'),
          heading: 'Harekete gecirici alan',
          body: 'Kullaniciyi aksiyona yonlendiren kisa metin.',
          actionLabel: 'Buton',
          actionUrl: 'https://example.com/start',
          actionTarget: '_blank',
          actionStyle: 'solid'
        } as CtaBlock;
      case 'widget':
        return this.createWidget('card');
      case 'text':
      default:
        return {
          ...this.createBase('text', 'Text', 'stack'),
          body: 'Bu alana istediginiz metni, aciklamayi veya icerik bloklarini ekleyebilirsiniz.'
        } as TextBlock;
    }
  }

  private createWidget(widgetKind: WidgetKind): WidgetBlock {
    const meta = componentCatalog.find((item) => item.kind === widgetKind);
    const title = meta?.label ?? 'Widget';

    return {
      ...this.createBase('widget', title, this.defaultLayout(widgetKind)),
      widgetKind,
      subtitle: meta?.category ?? 'Widget',
      body: meta?.hint ?? 'Bu widget icin iceriklerinizi inspector tarafindan girebilirsiniz.',
      actionLabel: widgetKind === 'forms' ? 'Formu Gonder' : 'Aksiyon',
      actionUrl: widgetKind === 'forms' ? 'https://example.com/form-submit' : '',
      actionStyle: 'solid',
      menuOpenMode: 'click',
      menuRadius: 18,
      imageUrl:
        widgetKind === 'gallery' || widgetKind === 'video' || widgetKind === 'images'
          ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'
          : '',
      items: this.defaultItems(widgetKind),
      detailItems: this.defaultDetailItems(widgetKind),
      numericValues: this.defaultNumericValues(widgetKind),
      mediaUrls: this.defaultMediaUrls(widgetKind),
      linkUrls: this.defaultLinkUrls(widgetKind),
      value: 72,
      variant: this.defaultVariant(widgetKind)
    };
  }

  private defaultVariant(widgetKind: WidgetKind): string {
    switch (widgetKind) {
      case 'accordion':
        return 'single';
      case 'charts':
        return 'bar';
      case 'gallery':
      case 'carousel':
        return 'masonry';
      case 'tabs':
        return 'underline';
      case 'forms':
        return 'stacked';
      case 'modal':
        return 'centered';
      default:
        return 'default';
    }
  }

  private defaultLayout(widgetKind: WidgetKind): LayoutMode {
    if (['gallery', 'card', 'avatar', 'badge', 'images'].includes(widgetKind)) {
      return 'grid-3';
    }
    if (['forms', 'input-field', 'select', 'textarea', 'checkbox', 'radio'].includes(widgetKind)) {
      return 'grid-2';
    }
    return 'stack';
  }

  private defaultItems(widgetKind: WidgetKind): string[] {
    switch (widgetKind) {
      case 'accordion':
        return ['Soru 1', 'Soru 2', 'Soru 3'];
      case 'tabs':
      case 'breadcrumb':
      case 'pagination':
      case 'stepper':
      case 'bottom-navigation':
      case 'navbar':
      case 'mega-menu':
      case 'dropdowns':
      case 'sidebar':
        return ['Overview', 'Pricing', 'FAQ'];
      case 'datatables':
      case 'tables':
        return ['Ad', 'Durum', 'Plan'];
      case 'timeline':
        return ['Kesif', 'Tasarim', 'Yayin'];
      case 'buttons':
      case 'button-group':
        return ['Basla', 'Demo Al', 'Fiyatlari Gor'];
      case 'qr-code':
        return ['Siteye Git'];
      case 'forms':
      case 'input-field':
      case 'select':
      case 'textarea':
      case 'checkbox':
      case 'radio':
      case 'toggle':
        return ['Ad Soyad', 'E-posta', 'Mesaj'];
      case 'gallery':
      case 'carousel':
      case 'images':
        return ['Gorsel 1', 'Gorsel 2', 'Gorsel 3'];
      case 'charts':
      case 'progress':
      case 'rating':
        return ['Ocak', 'Subat', 'Mart'];
      default:
        return ['Eleman 1', 'Eleman 2', 'Eleman 3'];
    }
  }

  private defaultDetailItems(widgetKind: WidgetKind): string[] {
    switch (widgetKind) {
      case 'accordion':
        return ['Icerik 1', 'Icerik 2', 'Icerik 3'];
      case 'tabs':
        return ['Tab 1 icerigi', 'Tab 2 icerigi', 'Tab 3 icerigi'];
      case 'charts':
        return ['Veri noktasi 1', 'Veri noktasi 2', 'Veri noktasi 3'];
      case 'datatables':
      case 'tables':
        return ['Anil Yilmaz', 'Aktif', 'Growth'];
      case 'timeline':
        return ['Ihtiyac analizi tamamlandi.', 'Arayuz ve tema kararlandi.', 'Yayin ve son kontroller yapildi.'];
      case 'dropdowns':
      case 'mega-menu':
      case 'navbar':
      case 'sidebar':
        return ['Genel bakis', 'Paket detaylari', 'Sik sorulan sorular'];
      default:
        return [];
    }
  }

  private defaultNumericValues(widgetKind: WidgetKind): number[] {
    switch (widgetKind) {
      case 'charts':
      case 'progress':
      case 'rating':
        return [35, 60, 85];
      default:
        return [];
    }
  }

  private defaultMediaUrls(widgetKind: WidgetKind): string[] {
    switch (widgetKind) {
      case 'gallery':
      case 'carousel':
      case 'images':
      case 'avatar':
      case 'device-mockups':
        return [
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80'
        ];
      case 'video':
        return ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'];
      default:
        return [];
    }
  }

  private defaultLinkUrls(widgetKind: WidgetKind): string[] {
    switch (widgetKind) {
      case 'forms':
        return ['Adinizi girin', 'ornek@site.com', 'Mesajinizi yazin'];
      case 'accordion':
      case 'tabs':
        return ['', '', ''];
      case 'gallery':
      case 'carousel':
      case 'images':
      case 'navbar':
      case 'sidebar':
      case 'bottom-navigation':
      case 'breadcrumb':
      case 'dropdowns':
      case 'mega-menu':
      case 'pagination':
      case 'stepper':
        return ['/ornek-1', '/ornek-2', '/ornek-3'];
      case 'buttons':
      case 'button-group':
        return ['https://example.com/start', 'https://example.com/demo', 'https://example.com/pricing'];
      case 'timeline':
        return ['/kesif', '/tasarim', '/yayin'];
      case 'datatables':
      case 'tables':
        return ['Yonetici', 'Canli', 'Aylik'];
      case 'qr-code':
        return ['https://example.com/qr-destination'];
      default:
        return [];
    }
  }

  private createActionButton(
    label: string,
    url = '',
    style: ActionButton['style'] = 'solid',
    target: ActionButton['target'] = '_self'
  ): ActionButton {
    return {
      id: `action-${crypto.randomUUID()}`,
      label,
      url,
      style,
      target
    };
  }

  private loadProjects(): SiteProject[] {
    const raw = globalThis.localStorage?.getItem(PROJECTS_KEY);
    const source = raw ? (JSON.parse(raw) as SiteProject[]) : demoProjects;
    return source.map((project) => this.normalizeProject(project));
  }

  private normalizeProject(project: SiteProject): SiteProject {
    const theme = this.normalizeTheme(project.theme);

    return {
      ...project,
      theme,
      pages: project.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) => this.normalizeBlock(block, theme))
      }))
    };
  }

  private normalizeTheme(theme: ThemeConfig): ThemeConfig {
    return {
      ...themePresets[0],
      ...theme
    };
  }

  private normalizeBlock(block: PageBlock, theme: ThemeConfig): PageBlock {
    const baseDefaults = {
      animation: 'fade-up' as const,
      animationDuration: 550,
      animationDelay: 0,
      hoverEffect: 'lift' as const,
      contentAnimation: 'fade-in' as const,
      mediaAnimation: 'zoom-in' as const,
      fontStyle: 'normal' as const,
      textAlign: 'left' as const,
      linkLabel: '',
      linkUrl: '',
      linkTarget: '_self' as const,
      backgroundColor: theme.surface,
      backgroundImageUrl: '',
      backgroundOverlay: 18,
      textColor: theme.foreground,
      accentColor: theme.accent
    };

    if (block.type === 'widget') {
      const widget = block as WidgetBlock;

      return {
        ...baseDefaults,
        ...widget,
        subtitle: widget.subtitle ?? '',
        body: widget.body ?? '',
        actionLabel: widget.actionLabel ?? (widget.widgetKind === 'forms' ? 'Formu Gonder' : 'Aksiyon'),
        actionUrl: widget.actionUrl ?? '',
        actionStyle: widget.actionStyle ?? 'solid',
        menuOpenMode: widget.menuOpenMode ?? 'click',
        menuRadius: widget.menuRadius ?? 18,
        imageUrl: widget.imageUrl ?? '',
        items: widget.items ?? [],
        detailItems: widget.detailItems ?? [],
        numericValues: widget.numericValues ?? [],
        mediaUrls: widget.mediaUrls ?? [],
        linkUrls: widget.linkUrls ?? [],
        value: widget.value ?? 72,
        variant: widget.variant ?? this.defaultVariant(widget.widgetKind),
        widthPreset: widget.widthPreset ?? 'full',
        minHeight: widget.minHeight ?? 0
      } as WidgetBlock;
    }

    if (block.type === 'hero') {
      const hero = block as HeroBlock;
      const legacyButtons = [
        hero.primaryAction ? this.createActionButton(hero.primaryAction, hero.linkUrl ?? '', 'solid', hero.linkTarget ?? '_self') : null,
        hero.secondaryAction ? this.createActionButton(hero.secondaryAction, '', 'outline', '_self') : null
      ].filter(Boolean) as ActionButton[];

      return {
        ...baseDefaults,
        ...hero,
        buttons:
          hero.buttons?.map((button, index) => ({
            id: button.id ?? `action-${hero.id}-${index}`,
            label: button.label ?? `Buton ${index + 1}`,
            url: button.url ?? '',
            target: button.target ?? '_self',
            style: button.style ?? (index === 0 ? 'solid' : 'outline')
          })) ?? legacyButtons,
        widthPreset: (hero as HeroBlock & { widthPreset?: string }).widthPreset ?? 'full',
        minHeight: (hero as HeroBlock & { minHeight?: number }).minHeight ?? 0
      } as HeroBlock;
    }

    if (block.type === 'image') {
      const image = block as ImageBlock;

      return {
        ...baseDefaults,
        ...image,
        altText: image.altText ?? image.caption ?? image.title,
        widthPreset: (image as ImageBlock & { widthPreset?: string }).widthPreset ?? 'full',
        minHeight: (image as ImageBlock & { minHeight?: number }).minHeight ?? 0
      } as ImageBlock;
    }

    if (block.type === 'cta') {
      const cta = block as CtaBlock;

      return {
        ...baseDefaults,
        ...cta,
        actionUrl: cta.actionUrl ?? cta.linkUrl ?? '',
        actionTarget: cta.actionTarget ?? cta.linkTarget ?? '_self',
        actionStyle: cta.actionStyle ?? 'solid',
        widthPreset: (cta as CtaBlock & { widthPreset?: string }).widthPreset ?? 'full',
        minHeight: (cta as CtaBlock & { minHeight?: number }).minHeight ?? 0
      } as CtaBlock;
    }

    if (block.type === 'features') {
      const features = block as FeaturesBlock;

      return {
        ...baseDefaults,
        ...features,
        items: (features.items ?? []).map((item) => ({
          title: item.title ?? 'Kart',
          body: item.body ?? '',
          imageUrl: item.imageUrl ?? '',
          linkUrl: item.linkUrl ?? '',
          linkTarget: item.linkTarget ?? '_self'
        })),
        widthPreset: (features as FeaturesBlock & { widthPreset?: string }).widthPreset ?? 'full',
        minHeight: (features as FeaturesBlock & { minHeight?: number }).minHeight ?? 0
      } as FeaturesBlock;
    }

    if (block.type === 'table') {
      const table = block as TableBlock & {
        rows?: Array<{ label?: string; value?: string; cells?: string[] }>;
      };
      const columns = table.columns?.length ? table.columns : ['Baslik', 'Deger'];

      return {
        ...baseDefaults,
        ...table,
        columns,
        rows: (table.rows ?? []).map((row) => {
          const legacyRow = row as { label?: string; value?: string; cells?: string[] };
          const legacyCells = legacyRow.cells ?? [legacyRow.label ?? '', legacyRow.value ?? ''];
          const cells = Array.from({ length: columns.length }, (_, index) => legacyCells[index] ?? '');

          return { cells };
        }),
        widthPreset: (table as TableBlock & { widthPreset?: string }).widthPreset ?? 'full',
        minHeight: (table as TableBlock & { minHeight?: number }).minHeight ?? 0
      } as TableBlock;
    }

    return {
      ...baseDefaults,
      ...block,
      widthPreset: (block as PageBlock & { widthPreset?: string }).widthPreset ?? 'full',
      minHeight: (block as PageBlock & { minHeight?: number }).minHeight ?? 0
    } as PageBlock;
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
