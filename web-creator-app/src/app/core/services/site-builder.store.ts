import { Injectable, computed, inject, signal } from '@angular/core';

import { componentCatalog } from '../data/component-catalog';
import { demoProjects, themePresets } from '../data/demo-data';
import {
  ActionButton,
  AuditLogEntry,
  AuditLogLevel,
  BlockType,
  ChecklistStatus,
  CostAlert,
  CtaBlock,
  DeployStrategy,
  FeaturesBlock,
  FormSubmission,
  HostingProvider,
  HostingTarget,
  HeroBlock,
  ImageBlock,
  LanguageConfig,
  LayoutMode,
  MediaAsset,
  PageBlock,
  PublicationChecklistItem,
  SeoSettings,
  SitePage,
  SiteAccessSettings,
  SiteCostPolicy,
  SiteMetrics,
  SiteProject,
  SiteVersionSnapshot,
  TableBlock,
  ThemeConfig,
  TextBlock,
  ViewportMode,
  WidgetBlock,
  WidgetKind
} from '../models/builder.models';
import { AuditLogService } from './audit-log.service';
import { FirebaseDataService } from './firebase-data.service';
import { MockAuthService } from './mock-auth.service';

const PROJECTS_KEY = 'web-creator-projects';
const CUSTOM_THEMES_KEY = 'web-creator-custom-themes';
const SIMULATION_KEY = 'web-creator-simulation-site-id';
const FAVORITE_WIDGETS_KEY = 'web-creator-favorite-widgets';
const RECENT_WIDGETS_KEY = 'web-creator-recent-widgets';

interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  blocks: Array<{ type: BlockType; widgetKind?: WidgetKind }>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'info';

interface SaveStatus {
  state: SaveState;
  message: string;
  at?: string;
}

@Injectable({ providedIn: 'root' })
export class SiteBuilderStore {
  private readonly auth = inject(MockAuthService);
  private readonly auditLog = inject(AuditLogService);
  private readonly firebaseData = inject(FirebaseDataService);
  private readonly projectsSignal = signal<SiteProject[]>(this.loadProjects());
  private readonly customThemesSignal = signal<ThemeConfig[]>(this.loadCustomThemes());
  private readonly selectedSiteIdSignal = signal<string>(this.projectsSignal()[0]?.id ?? '');
  private readonly selectedBlockIdSignal = signal<string | null>(null);
  private readonly viewportSignal = signal<ViewportMode>('desktop');
  private readonly simulatedSiteIdSignal = signal<string | null>(this.loadSimulationSiteId());
  private readonly favoriteWidgetKindsSignal = signal<WidgetKind[]>(this.loadWidgetKinds(FAVORITE_WIDGETS_KEY));
  private readonly recentWidgetKindsSignal = signal<WidgetKind[]>(this.loadWidgetKinds(RECENT_WIDGETS_KEY));
  private readonly undoStackSignal = signal<string[]>([]);
  private readonly redoStackSignal = signal<string[]>([]);
  private readonly lastSavedAtSignal = signal<string | null>(null);
  private readonly saveStatusSignal = signal<SaveStatus>({ state: 'idle', message: '' });

  readonly projects = computed(() => this.projectsSignal());
  readonly auditLogs = this.auditLog.logs;
  readonly themePresets = themePresets;
  readonly customThemes = computed(() => this.customThemesSignal());
  readonly availableThemes = computed(() => [...themePresets, ...this.customThemesSignal()]);
  readonly componentCatalog = componentCatalog;
  readonly selectedSiteId = computed(() => this.selectedSiteIdSignal());
  readonly selectedBlockId = computed(() => this.selectedBlockIdSignal());
  readonly viewport = computed(() => this.viewportSignal());
  readonly favoriteWidgetKinds = computed(() => this.favoriteWidgetKindsSignal());
  readonly recentWidgetKinds = computed(() => this.recentWidgetKindsSignal());
  readonly canUndo = computed(() => this.undoStackSignal().length > 0);
  readonly canRedo = computed(() => this.redoStackSignal().length > 0);
  readonly lastSavedAt = computed(() => this.lastSavedAtSignal());
  readonly saveStatus = computed(() => this.saveStatusSignal());
  readonly sectionTemplates: SectionTemplate[] = [
    {
      id: 'landing-core',
      name: 'Landing Core',
      description: 'Hero, fayda kartlari ve CTA bloklari',
      blocks: [{ type: 'hero' }, { type: 'features' }, { type: 'cta' }]
    },
    {
      id: 'content-trust',
      name: 'Guven ve Icerik',
      description: 'Metin, tablo ve sik sorulan alanlari',
      blocks: [{ type: 'text' }, { type: 'table' }, { type: 'widget', widgetKind: 'accordion' }]
    },
    {
      id: 'lead-capture',
      name: 'Lead Capture',
      description: 'Form, sosyal kanit ve final aksiyon',
      blocks: [{ type: 'widget', widgetKind: 'forms' }, { type: 'widget', widgetKind: 'rating' }, { type: 'cta' }]
    },
    {
      id: 'blog-page',
      name: 'Blog Sayfasi',
      description: 'Yazi vitrini, kategori kartlari ve bulten formu',
      blocks: [
        { type: 'hero' },
        { type: 'widget', widgetKind: 'card' },
        { type: 'widget', widgetKind: 'list-group' },
        { type: 'widget', widgetKind: 'forms' }
      ]
    },
    {
      id: 'cafe-page',
      name: 'Kafe Sayfasi',
      description: 'Atmosfer, menu, galeri ve rezervasyon',
      blocks: [
        { type: 'hero' },
        { type: 'widget', widgetKind: 'gallery' },
        { type: 'table' },
        { type: 'widget', widgetKind: 'forms' }
      ]
    },
    {
      id: 'restaurant-home',
      name: 'Restoran Ana Sayfasi',
      description: 'Lezzet vitrini, one cikanlar, menu ve rezervasyon',
      blocks: [
        { type: 'hero' },
        { type: 'features' },
        { type: 'table' },
        { type: 'widget', widgetKind: 'gallery' },
        { type: 'cta' }
      ]
    },
    {
      id: 'clinic-landing',
      name: 'Klinik Landing',
      description: 'Uzmanliklar, guven, randevu ve SSS',
      blocks: [
        { type: 'hero' },
        { type: 'features' },
        { type: 'widget', widgetKind: 'forms' },
        { type: 'widget', widgetKind: 'accordion' },
        { type: 'cta' }
      ]
    },
    {
      id: 'portfolio-page',
      name: 'Portfolyo',
      description: 'Proje vitrini, surec ve iletisim aksiyonu',
      blocks: [
        { type: 'hero' },
        { type: 'widget', widgetKind: 'gallery' },
        { type: 'widget', widgetKind: 'timeline' },
        { type: 'cta' }
      ]
    },
    {
      id: 'saas-page',
      name: 'SaaS',
      description: 'Urun faydalari, metrikler, fiyatlama ve demo formu',
      blocks: [
        { type: 'hero' },
        { type: 'features' },
        { type: 'widget', widgetKind: 'charts' },
        { type: 'table' },
        { type: 'widget', widgetKind: 'forms' }
      ]
    }
  ];
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
  readonly publishedProjects = computed(() =>
    this.projectsSignal().filter((project) => project.status === 'published')
  );
  readonly hostingTargets = computed(() =>
    this.projectsSignal().flatMap((project) =>
      project.hostingTargets.map((target) => ({ ...target, projectId: project.id, projectName: project.name }))
    )
  );
  readonly simulatedSiteId = computed(() => this.simulatedSiteIdSignal());
  readonly isSimulating = computed(() => !!this.simulatedSiteIdSignal());
  readonly simulatedSite = computed(() =>
    this.projectsSignal().find((project) => project.id === this.simulatedSiteIdSignal()) ?? null
  );
  readonly siteSummaries = computed(() =>
    this.projectsSignal().map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      ownerId: project.ownerId,
      status: project.status,
      pageCount: project.pages.length,
      blockCount: project.pages.reduce((total, page) => total + page.blocks.length, 0),
      languageCount: project.languages.filter((language) => language.enabled).length,
      mediaCount: project.mediaAssets.length,
      leadCount: project.formSubmissions.length,
      hostingCount: project.hostingTargets.length,
      activeHostingCount: project.hostingTargets.filter((target) => target.status === 'active').length,
      checklistScore: this.publicationChecklist(project).filter((item) => item.status === 'pass').length
    }))
  );

  constructor() {
    this.hydrateFromFirebase();
  }

  createProject(ownerId: string, name: string): SiteProject {
    const safeName = name.trim() || 'Yeni Site';
    const slug = this.uniqueSlug(this.slugify(safeName) || 'site');
    const theme = themePresets[0];
    const pageId = `page-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const project: SiteProject = {
      id: `site-${crypto.randomUUID()}`,
      name: safeName,
      slug,
      ownerId,
      ownerUid: ownerId,
      status: 'draft',
      theme,
      access: this.defaultAccessSettings(),
      seo: this.defaultSeoSettings(safeName, slug),
      mediaAssets: [],
      formSubmissions: this.defaultFormSubmissions(safeName),
      metrics: { ...this.defaultMetrics(), updatedAt: now },
      costPolicy: this.defaultCostPolicy(),
      versionHistory: [],
      languages: this.defaultLanguages(),
      hostingTargets: [this.createHostingTarget(slug, 'Production', 'firebase', '', slug, 'draft')],
      selectedPageId: pageId,
      publication: { requestStatus: 'none' },
      updatedAt: now,
      pages: [
        {
          id: pageId,
          name: 'Home',
          slug: 'home',
          localizedSlugs: { tr: 'anasayfa', en: 'home' },
          blocks: [
            {
              ...this.createBase('hero', 'Hero', 'split'),
              id: `block-${crypto.randomUUID()}`,
              eyebrow: 'Yeni site',
              heading: `${safeName} icin modern bir giris alani`,
              body: 'Bu alani builder icinden metin, gorsel, renk ve aksiyonlarla ozellestirin.',
              buttons: [this.createActionButton('Basla', '', 'solid')],
              primaryAction: 'Basla',
              secondaryAction: '',
              imageUrl:
                'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'
            } as HeroBlock
          ]
        }
      ]
    };

    this.projectsSignal.update((projects) => [project, ...projects]);
    this.selectedSiteIdSignal.set(project.id);
    this.persist([project]);
    this.saveVersionSnapshot('Ilk taslak', 'Site olusturuldu.');
    this.logAction('site.created', 'success', project.id, `${project.name} sitesi olusturuldu.`);
    return this.normalizeProject({ ...project, hostingTargets: project.hostingTargets.map((target) => ({ ...target, createdAt: now })) });
  }

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
      localizedSlugs: this.defaultLocalizedSlugs(name),
      blocks: []
    };
    this.patchSelectedSite((site) => ({
      ...site,
      pages: [...site.pages, page],
      selectedPageId: page.id
    }));
    this.logAction('page.created', 'success', undefined, `${name} sayfasi olusturuldu.`);
  }

  updatePageMeta(pageId: string, patch: Partial<Pick<SitePage, 'name' | 'slug'>>): void {
    this.patchSelectedSite((site) => ({
      ...site,
      pages: site.pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page))
    }));
    this.logAction('page.updated', 'info', undefined, 'Sayfa bilgileri guncellendi.');
  }

  updatePageLocalizedSlug(pageId: string, languageCode: string, slug: string): void {
    this.patchSelectedSite((site) => ({
      ...site,
      pages: site.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              localizedSlugs: {
                ...page.localizedSlugs,
                [languageCode]: this.slugify(slug) || slug.trim()
              }
            }
          : page
      )
    }));
    this.logAction('page.localized_slug.updated', 'info', undefined, `${languageCode} path guncellendi.`);
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
    this.logAction('page.removed', 'warning', undefined, 'Sayfa silindi.');
  }

  addBlock(type: BlockType): void {
    const nextBlock = this.createBlock(type);
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, nextBlock] }));
    this.selectedBlockIdSignal.set(nextBlock.id);
    this.logAction('block.created', 'success', undefined, `${nextBlock.title} block eklendi.`);
  }

  addWidget(widgetKind: WidgetKind): void {
    const nextBlock = this.createWidget(widgetKind);
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, nextBlock] }));
    this.selectedBlockIdSignal.set(nextBlock.id);
    this.recentWidgetKindsSignal.update((items) => [widgetKind, ...items.filter((item) => item !== widgetKind)].slice(0, 8));
    this.persistWidgetKinds(RECENT_WIDGETS_KEY, this.recentWidgetKindsSignal());
    this.logAction('widget.created', 'success', undefined, `${nextBlock.title} component eklendi.`);
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
    this.logAction('block.removed', 'warning', undefined, 'Block silindi.');
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
    this.logAction('block.moved', 'info', undefined, `Block ${direction === 'up' ? 'yukari' : 'asagi'} tasindi.`);
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
    this.logAction('block.reordered', 'info', undefined, 'Block sirasi surukle-birak ile degisti.');
  }

  updateBlock(blockId: string, patch: Partial<PageBlock>): void {
    this.patchSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === blockId ? ({ ...block, ...patch } as PageBlock) : block
      )
    }));
    this.logAction('block.updated', 'info', undefined, 'Block ayarlari guncellendi.');
  }

  applyTheme(theme: ThemeConfig): void {
    this.patchSelectedSite((site) => ({ ...site, theme }));
    this.logAction('theme.applied', 'info', undefined, `${theme.name} temasi uygulandi.`);
  }

  updateTheme(patch: Partial<ThemeConfig>): void {
    this.patchSelectedSite((site) => ({ ...site, theme: { ...site.theme, ...patch } }));
    this.logAction('theme.updated', 'info', undefined, 'Tema ayarlari guncellendi.');
  }

  saveCurrentTheme(name: string): boolean {
    const site = this.selectedSite();
    const trimmedName = name.trim();
    if (!site || !trimmedName) {
      return false;
    }

    const theme = this.normalizeTheme({
      ...site.theme,
      name: trimmedName
    });

    this.customThemesSignal.update((themes) => {
      const existingIndex = themes.findIndex((item) => item.name.toLowerCase() === trimmedName.toLowerCase());
      if (existingIndex >= 0) {
        return themes.map((item, index) => (index === existingIndex ? theme : item));
      }

      return [theme, ...themes];
    });

    this.patchSelectedSite((currentSite) => ({
      ...currentSite,
      theme
    }));
    this.persistCustomThemes();
    this.logAction('theme.saved', 'success', undefined, `${trimmedName} custom temasi kaydedildi.`);
    return true;
  }

  deleteCustomTheme(name: string): void {
    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName) {
      return;
    }

    this.customThemesSignal.update((themes) =>
      themes.filter((theme) => theme.name.trim().toLowerCase() !== trimmedName)
    );
    this.persistCustomThemes();
    this.logAction('theme.deleted', 'warning', undefined, `${name} custom temasi silindi.`);
  }

  updateSiteMeta(patch: Partial<Pick<SiteProject, 'name' | 'slug'>>): void {
    this.patchSelectedSite((site) => ({ ...site, ...patch }));
    this.logAction('site.updated', 'info', undefined, 'Site bilgileri guncellendi.');
  }

  updateSiteAccess(patch: Partial<SiteAccessSettings>): void {
    this.patchSelectedSite((site) => ({
      ...site,
      access: { ...site.access, ...patch }
    }));
    this.logAction('site.access.updated', 'info', undefined, 'Site erisim ayarlari guncellendi.');
  }

  addLanguage(language: Pick<LanguageConfig, 'code' | 'label' | 'pathPrefix'>): void {
    const code = language.code.trim().toLowerCase();
    if (!code) {
      return;
    }

    this.patchSelectedSite((site) => {
      if (site.languages.some((item) => item.code.toLowerCase() === code)) {
        return site;
      }

      const nextLanguage: LanguageConfig = {
        id: `language-${crypto.randomUUID()}`,
        code,
        label: language.label.trim() || code.toUpperCase(),
        pathPrefix: this.slugify(language.pathPrefix || code) || code,
        enabled: true,
        isDefault: site.languages.length === 0
      };

      return {
        ...site,
        languages: [...site.languages, nextLanguage],
        pages: site.pages.map((page) => ({
          ...page,
          localizedSlugs: {
            ...page.localizedSlugs,
            [code]: page.slug
          }
        }))
      };
    });
    this.logAction('language.created', 'success', undefined, `${code} dili eklendi.`);
  }

  updateLanguage(languageId: string, patch: Partial<Omit<LanguageConfig, 'id'>>): void {
    this.patchSelectedSite((site) => {
      const nextLanguages = site.languages.map((language) =>
        language.id === languageId
          ? {
              ...language,
              ...patch,
              code: patch.code ? patch.code.trim().toLowerCase() : language.code,
              pathPrefix: patch.pathPrefix ? this.slugify(patch.pathPrefix) || language.pathPrefix : language.pathPrefix
            }
          : language
      );

      return { ...site, languages: this.ensureDefaultLanguage(nextLanguages) };
    });
    this.logAction('language.updated', 'info', undefined, 'Dil ayarlari guncellendi.');
  }

  setDefaultLanguage(languageId: string): void {
    this.patchSelectedSite((site) => ({
      ...site,
      languages: site.languages.map((language) => ({
        ...language,
        enabled: language.id === languageId ? true : language.enabled,
        isDefault: language.id === languageId
      }))
    }));
    this.logAction('language.default.updated', 'info', undefined, 'Varsayilan dil degisti.');
  }

  removeLanguage(languageId: string): void {
    this.patchSelectedSite((site) => {
      if (site.languages.length <= 1) {
        return site;
      }

      const removed = site.languages.find((language) => language.id === languageId);
      const nextLanguages = this.ensureDefaultLanguage(site.languages.filter((language) => language.id !== languageId));

      return {
        ...site,
        languages: nextLanguages,
        pages: site.pages.map((page) => {
          if (!removed) {
            return page;
          }

          const { [removed.code]: _removedSlug, ...localizedSlugs } = page.localizedSlugs;
          return { ...page, localizedSlugs };
        })
      };
    });
    this.logAction('language.removed', 'warning', undefined, 'Dil silindi.');
  }

  addHostingTarget(name: string, provider: HostingProvider, firebaseProjectId: string, firebaseSiteId: string): void {
    const site = this.selectedSite();
    if (site?.costPolicy.deployStrategy === 'shared-route' && site.hostingTargets.length >= 1) {
      this.logAction(
        'cost.hosting.blocked',
        'warning',
        site.id,
        'Shared-route modunda ek hosting hedefi engellendi. Dedicated hosting icin maliyet politikasini degistirin.'
      );
      return;
    }

    this.patchSelectedSite((site) => ({
      ...site,
      hostingTargets: [
        ...site.hostingTargets,
        this.createHostingTarget(site.slug, name || 'Production', provider, firebaseProjectId, firebaseSiteId, 'draft')
      ]
    }));
    this.logAction('hosting.created', 'success', undefined, `${name || 'Production'} hosting hedefi eklendi.`);
  }

  updateHostingTarget(hostingTargetId: string, patch: Partial<Omit<HostingTarget, 'id' | 'createdAt'>>): void {
    this.patchSelectedSite((site) => ({
      ...site,
      hostingTargets: site.hostingTargets.map((target) =>
        target.id === hostingTargetId
          ? {
              ...target,
              ...patch,
              firebaseSiteId: patch.firebaseSiteId ? this.slugify(patch.firebaseSiteId) || target.firebaseSiteId : target.firebaseSiteId,
              domainStatus:
                patch.customDomain && patch.customDomain !== target.customDomain
                  ? 'pending-dns'
                  : target.domainStatus,
              dnsInstructions:
                patch.customDomain && patch.customDomain !== target.customDomain
                  ? `DNS CNAME veya A kayitlarini Firebase Hosting yonlendirmelerine gore ${patch.customDomain} icin dogrulayin.`
                  : target.dnsInstructions
            }
          : target
      )
    }));
    this.logAction('hosting.updated', 'info', undefined, 'Hosting hedefi guncellendi.');
  }

  removeHostingTarget(hostingTargetId: string): void {
    this.patchSelectedSite((site) => {
      if (site.hostingTargets.length <= 1) {
        return site;
      }

      return {
        ...site,
        hostingTargets: site.hostingTargets.filter((target) => target.id !== hostingTargetId),
        publication:
          site.publication.hostingTargetId === hostingTargetId
            ? {
                ...site.publication,
                hostingTargetId: site.hostingTargets.find((target) => target.id !== hostingTargetId)?.id
              }
            : site.publication
      };
    });
    this.logAction('hosting.removed', 'warning', undefined, 'Hosting hedefi silindi.');
  }

  setViewport(viewport: ViewportMode): void {
    this.viewportSignal.set(viewport);
  }

  requestPublication(hostingTargetId?: string, requestedBy?: string): void {
    const site = this.selectedSite();
    const blockingCostAlerts = site ? this.blockingCostAlerts(site) : [];
    if (site && blockingCostAlerts.length) {
      this.logAction(
        'publication.blocked.cost',
        'danger',
        site.id,
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle yayin talebi engellendi.`
      );
      this.updateSaveStatus(
        'error',
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle yayin talebi gonderilemedi.`
      );
      return;
    }

    const failedChecks = site ? this.publicationChecklist(site).filter((item) => item.status === 'fail') : [];
    const changedSite = this.patchSelectedSite((site) => ({
      ...site,
      status: 'pending',
      publication: {
        ...site.publication,
        requestStatus: 'pending',
        requestedAt: new Date().toISOString(),
        requestedBy,
        rejectedAt: undefined,
        rejectionReason: undefined,
        hostingTargetId: hostingTargetId ?? site.publication.hostingTargetId ?? site.hostingTargets[0]?.id
      }
    }));
    if (failedChecks.length) {
      this.logAction('publication.checklist.warning', 'warning', undefined, `${failedChecks.length} yayin kontrolu eksik.`);
    }
    this.logAction('publication.requested', 'warning', undefined, 'Site yayin onayina gonderildi.');
    if (changedSite) {
      this.syncBackendAction(
        'requestPublication',
        { siteId: changedSite.id, hostingTargetId: changedSite.publication.hostingTargetId ?? null },
        changedSite.id,
        'Yayin talebi Firebase onay kuyruguna gonderildi.',
        'Yayin talebi yerelde kaydedildi ancak backend kuyruguna gonderilemedi'
      );
    }
  }

  approvePublication(siteId: string, days: number, approvedBy?: string): void {
    const project = this.findById(siteId);
    const blockingCostAlerts = project ? this.blockingCostAlerts(project) : [];
    if (project && blockingCostAlerts.length) {
      this.logAction(
        'publication.approval.blocked.cost',
        'danger',
        siteId,
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle onay engellendi.`
      );
      this.updateSaveStatus(
        'error',
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle yayin onaylanamadi.`
      );
      return;
    }

    const now = new Date();
    const approvedUntil = new Date(now);
    approvedUntil.setDate(now.getDate() + days);
    let changedProject: SiteProject | null = null;

    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== siteId) {
          return project;
        }

        const hostingTargetId = project.publication.hostingTargetId ?? project.hostingTargets[0]?.id;
        const hostingTargets = this.activateHostingTarget(project, hostingTargetId, now.toISOString());
        const publishedUrl = this.resolvePublishedUrl(hostingTargets.find((target) => target.id === hostingTargetId));

        changedProject = this.touchProject({
          ...project,
          status: 'published',
          hostingTargets,
          publication: {
            ...project.publication,
            requestStatus: 'approved',
            approvedAt: now.toISOString(),
            approvedBy,
            approvedUntil: approvedUntil.toISOString(),
            hostingTargetId,
            publishedUrl
          }
        }, now.toISOString());
        return changedProject;
      })
    );
    this.persist(changedProject ? [changedProject] : undefined);
    this.logAction('publication.approved', 'success', siteId, `${days} gunluk yayin onayi verildi.`);
    this.syncBackendAction(
      'approvePublication',
      { siteId, days },
      siteId,
      'Yayin onayi backend tarafinda tamamlandi.',
      'Yayin onayi yerelde kaydedildi ancak backend onayi tamamlanamadi'
    );
  }

  rejectPublication(siteId: string, reason: string, rejectedBy?: string): void {
    const now = new Date().toISOString();
    let changedProject: SiteProject | null = null;
    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === siteId
          ? (changedProject = this.touchProject({
              ...project,
              status: 'draft',
              publication: {
                ...project.publication,
                requestStatus: 'rejected',
                rejectedAt: now,
                rejectedBy,
                rejectionReason: reason || 'Yayin talebi reddedildi.'
              }
            }, now))
          : project
      )
    );
    this.persist(changedProject ? [changedProject] : undefined);
    this.logAction('publication.rejected', 'danger', siteId, reason || 'Yayin talebi reddedildi.');
    this.syncBackendAction(
      'rejectPublication',
      { siteId, reason },
      siteId,
      'Yayin reddi backend tarafinda tamamlandi.',
      'Yayin reddi yerelde kaydedildi ancak backend reddi tamamlanamadi'
    );
  }

  publishToActiveHosting(siteId: string): void {
    const project = this.findById(siteId);
    const blockingCostAlerts = project ? this.blockingCostAlerts(project) : [];
    if (project && blockingCostAlerts.length) {
      this.logAction(
        'publication.update.blocked.cost',
        'danger',
        siteId,
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle yayin guncelleme engellendi.`
      );
      this.updateSaveStatus(
        'error',
        `${blockingCostAlerts.length} bloklayici maliyet/kota uyarisi nedeniyle yayin guncellenemedi.`
      );
      return;
    }

    const now = new Date().toISOString();
    let changedProject: SiteProject | null = null;
    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== siteId) {
          return project;
        }

        const activeTarget = project.hostingTargets.find((target) => target.status === 'active') ?? project.hostingTargets[0];
        const hostingTargets = this.activateHostingTarget(project, activeTarget?.id, now);

        changedProject = this.touchProject({
          ...project,
          status: 'published',
          hostingTargets,
          publication: {
            ...project.publication,
            requestStatus: 'approved',
            approvedAt: project.publication.approvedAt ?? now,
            hostingTargetId: activeTarget?.id,
            publishedUrl: this.resolvePublishedUrl(activeTarget)
          }
        }, now);
        return changedProject;
      })
    );
    this.persist(changedProject ? [changedProject] : undefined);
    this.logAction('publication.updated', 'success', siteId, 'Aktif hosting uzerinden yayin guncellendi.');
  }

  stopPublication(siteId: string, reason = 'Yayin site yoneticisi tarafindan durduruldu.', stoppedBy?: string): void {
    const now = new Date().toISOString();
    let changedProject: SiteProject | null = null;

    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === siteId
          ? (changedProject = this.touchProject({
              ...project,
              status: 'draft',
              hostingTargets: project.hostingTargets.map((target) =>
                target.status === 'active' ? { ...target, status: 'paused' } : target
              ),
              publication: {
                ...project.publication,
                requestStatus: 'none',
                stoppedAt: now,
                stoppedBy,
                stopReason: reason,
                publishedUrl: undefined
              }
            }, now))
          : project
      )
    );
    this.persist(changedProject ? [changedProject] : undefined);
    this.logAction('publication.stopped', 'danger', siteId, reason);
    this.syncBackendAction(
      'stopPublication',
      { siteId, reason },
      siteId,
      'Yayin backend tarafinda durduruldu.',
      'Yayin durdurma yerelde kaydedildi ancak backend durdurma tamamlanamadi'
    );
  }

  startSimulation(siteId: string): void {
    this.simulatedSiteIdSignal.set(siteId);
    globalThis.localStorage?.setItem(SIMULATION_KEY, siteId);
    this.selectSite(siteId);
    this.logAction('simulation.started', 'warning', siteId, 'Superadmin site yoneticisi gibi goruntulemeye basladi.');
  }

  stopSimulation(): void {
    const siteId = this.simulatedSiteIdSignal();
    this.simulatedSiteIdSignal.set(null);
    globalThis.localStorage?.removeItem(SIMULATION_KEY);
    this.logAction('simulation.stopped', 'info', siteId ?? undefined, 'Superadmin simulasyondan cikti.');
  }

  logsForSite(siteId: string): AuditLogEntry[] {
    return this.auditLog.logsForSite(siteId);
  }

  recordAuditLog(action: string, level: AuditLogLevel, details: string, siteId?: string): void {
    this.logAction(action, level, siteId, details);
  }

  findById(siteId: string): SiteProject | null {
    return this.projectsSignal().find((project) => project.id === siteId) ?? null;
  }

  findBySlug(slug: string): SiteProject | null {
    return this.projectsSignal().find((project) => project.slug === slug) ?? null;
  }

  undoSelectedSite(): void {
    const current = this.selectedSite();
    const previous = this.undoStackSignal()[0];
    if (!current || !previous) {
      return;
    }

    this.redoStackSignal.update((stack) => [this.snapshotSite(current), ...stack].slice(0, 25));
    this.undoStackSignal.update((stack) => stack.slice(1));
    this.replaceSiteFromSnapshot(previous);
    this.logAction('history.undo', 'info', current.id, 'Son degisiklik geri alindi.');
  }

  redoSelectedSite(): void {
    const current = this.selectedSite();
    const next = this.redoStackSignal()[0];
    if (!current || !next) {
      return;
    }

    this.undoStackSignal.update((stack) => [this.snapshotSite(current), ...stack].slice(0, 25));
    this.redoStackSignal.update((stack) => stack.slice(1));
    this.replaceSiteFromSnapshot(next);
    this.logAction('history.redo', 'info', current.id, 'Geri alinan degisiklik yeniden uygulandi.');
  }

  saveVersionSnapshot(name: string, reason = 'Manuel snapshot'): void {
    const site = this.selectedSite();
    const actor = this.auth.currentUser();
    if (!site) {
      return;
    }

    const snapshot: SiteVersionSnapshot = {
      id: `version-${crypto.randomUUID()}`,
      name: name.trim() || `Snapshot ${site.versionHistory.length + 1}`,
      createdAt: new Date().toISOString(),
      actorId: actor?.id ?? 'anonymous',
      reason,
      snapshot: this.snapshotSite(site)
    };

    this.patchSelectedSite(
      (currentSite) => ({
        ...currentSite,
        versionHistory: [snapshot, ...currentSite.versionHistory].slice(0, 20)
      }),
      { skipUndo: true }
    );
    this.logAction('version.snapshot.created', 'success', site.id, `${snapshot.name} kaydedildi.`);
  }

  restoreVersionSnapshot(snapshotId: string): void {
    const site = this.selectedSite();
    const snapshot = site?.versionHistory.find((item) => item.id === snapshotId);
    if (!site || !snapshot) {
      return;
    }

    this.captureUndoState(site);
    const restored = this.touchProject(this.normalizeProject(JSON.parse(snapshot.snapshot) as SiteProject));
    let changedProject: SiteProject | null = null;
    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== site.id) {
          return project;
        }

        changedProject = {
          ...restored,
          id: site.id,
          versionHistory: site.versionHistory
        };
        return changedProject;
      })
    );
    this.persist(changedProject ? [changedProject] : undefined);
    this.logAction('version.snapshot.restored', 'warning', site.id, `${snapshot.name} snapshot geri yuklendi.`);
  }

  addSectionTemplate(templateId: string): void {
    const template = this.sectionTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const blocks = template.blocks.map((item, index) => this.createSectionTemplateBlock(template.id, item, index));
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, ...blocks] }));
    this.selectedBlockIdSignal.set(blocks[0]?.id ?? this.selectedBlockIdSignal());
    this.logAction('section.template.added', 'success', undefined, `${template.name} section seti eklendi.`);
  }

  private createSectionTemplateBlock(
    templateId: string,
    item: { type: BlockType; widgetKind?: WidgetKind },
    index: number
  ): PageBlock {
    const block = item.type === 'widget' && item.widgetKind ? this.createWidget(item.widgetKind) : this.createBlock(item.type);
    return this.customizeSectionTemplateBlock(templateId, block, index);
  }

  private customizeSectionTemplateBlock(templateId: string, block: PageBlock, index: number): PageBlock {
    const copy = { ...block };

    if (templateId === 'blog-page') {
      return this.customizeBlogTemplate(copy, index);
    }

    if (templateId === 'cafe-page') {
      return this.customizeCafeTemplate(copy, index);
    }

    if (templateId === 'restaurant-home') {
      return this.customizeRestaurantTemplate(copy, index);
    }

    if (templateId === 'clinic-landing') {
      return this.customizeClinicTemplate(copy, index);
    }

    if (templateId === 'portfolio-page') {
      return this.customizePortfolioTemplate(copy, index);
    }

    if (templateId === 'saas-page') {
      return this.customizeSaasTemplate(copy, index);
    }

    return copy;
  }

  private customizeBlogTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'Blog Hero',
        eyebrow: 'Blog',
        heading: 'Guncel yazilar, rehberler ve ilham veren fikirler',
        body: 'Okuyuculariniz icin kategori bazli yazilar, one cikan icerikler ve bulten akisi hazirlayin.',
        buttons: [this.createActionButton('Yazilari Kesfet', '#blog', 'solid')],
        imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'card') {
      return {
        ...block,
        title: 'One Cikan Yazilar',
        subtitle: 'Editorden secilenler',
        body: 'En cok okunan veya yeni yayinlanan icerikleri kartlar halinde sunun.',
        items: ['Rehber Yazisi', 'Trend Analizi', 'Basari Hikayesi'],
        detailItems: [
          'Adim adim anlatimli uzun form icerik.',
          'Sektordeki yeni egilimleri ozetleyen analiz.',
          'Musteri veya topluluk hikayesini anlatan yazi.'
        ],
        linkUrls: ['/blog/rehber', '/blog/trend-analizi', '/blog/basari-hikayesi']
      } as WidgetBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'list-group') {
      return {
        ...block,
        title: 'Kategoriler',
        subtitle: 'Icerik haritasi',
        body: 'Blog okuyucularinin konu basliklarina hizli ulasmasini saglayin.',
        items: ['Pazarlama', 'Tasarim', 'Teknoloji', 'Girisimcilik'],
        detailItems: ['Buyume notlari', 'UI/UX rehberleri', 'Urun ve yazilim', 'Is kurma pratikleri'],
        linkUrls: ['/blog/pazarlama', '/blog/tasarim', '/blog/teknoloji', '/blog/girisimcilik']
      } as WidgetBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'forms') {
      return {
        ...block,
        title: 'Bultene Katil',
        subtitle: 'Haftalik ozet',
        body: 'Yeni yazilari ve kaynaklari e-posta kutunuza alin.',
        actionLabel: 'Abone Ol',
        items: ['Ad Soyad', 'E-posta', 'Ilgi Alani'],
        detailItems: ['text', 'email', 'select'],
        linkUrls: ['Adinizi girin', 'ornek@site.com', 'Kategori secin'],
        mediaUrls: ['', '', 'Pazarlama,Tasarim,Teknoloji']
      } as WidgetBlock;
    }

    return { ...block, title: `Blog Bolumu ${index + 1}` };
  }

  private customizeCafeTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'Kafe Hero',
        eyebrow: 'Mahalle kafesi',
        heading: 'Taze kahve, sicak atmosfer ve gunluk tatlilar',
        body: 'Menunuzu, calisma saatlerinizi ve rezervasyon akisinizi tek sayfada modern bir sekilde sunun.',
        buttons: [this.createActionButton('Menuyu Gor', '#menu', 'solid'), this.createActionButton('Rezervasyon', '#rezervasyon', 'outline')],
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'gallery') {
      return {
        ...block,
        title: 'Kafe Atmosferi',
        subtitle: 'Galeri',
        body: 'Mekan, kahve ve tatli gorsellerinizi vitrine cikarin.',
        items: ['Barista bar', 'Tatlilar', 'Calisma kosesi'],
        detailItems: ['Gunluk kahve hazirligi', 'Vitrin lezzetleri', 'Sessiz calisma alani'],
        mediaUrls: [
          'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80'
        ]
      } as WidgetBlock;
    }

    if (block.type === 'table') {
      return {
        ...block,
        title: 'Kafe Menusu',
        columns: ['Urun', 'Icerik', 'Fiyat'],
        rows: [
          { cells: ['Flat White', 'Cift shot espresso, sut', '120 TL'] },
          { cells: ['Cold Brew', '18 saat demleme', '135 TL'] },
          { cells: ['San Sebastian', 'Gunluk tatli', '165 TL'] }
        ]
      } as TableBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'forms') {
      return {
        ...block,
        title: 'Rezervasyon Al',
        subtitle: 'Masa ayir',
        actionLabel: 'Rezervasyon Gonder',
        items: ['Ad Soyad', 'Telefon', 'Tarih', 'Saat'],
        detailItems: ['text', 'phone', 'date', 'time'],
        linkUrls: ['Adinizi girin', '05xx xxx xx xx', '', '']
      } as WidgetBlock;
    }

    return { ...block, title: `Kafe Bolumu ${index + 1}` };
  }

  private customizeRestaurantTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'Restoran Hero',
        eyebrow: 'Fine casual restoran',
        heading: 'Mevsimsel lezzetler ve unutulmaz aksam yemekleri',
        body: 'Restoraninizin imza tabaklarini, menulerini ve rezervasyon aksiyonunu guclu bir ana sayfada toplayin.',
        buttons: [this.createActionButton('Rezervasyon Yap', '#rezervasyon', 'solid'), this.createActionButton('Menuyu Incele', '#menu', 'outline')],
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'features') {
      return {
        ...block,
        title: 'One Cikan Deneyimler',
        items: [
          {
            title: 'Sezon Menusu',
            body: 'Yerel ureticilerden gelen taze urunlerle hazirlanan menuler.',
            imageUrl: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#menu',
            linkTarget: '_self'
          },
          {
            title: 'Ozel Davetler',
            body: 'Dogum gunu, is yemegi ve kutlamalar icin ayrilabilir alanlar.',
            imageUrl: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#iletisim',
            linkTarget: '_self'
          },
          {
            title: 'Sommelier Secimi',
            body: 'Yemeklerle eslesen icecek onerileri ve tadim akislari.',
            imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#menu',
            linkTarget: '_self'
          }
        ]
      } as FeaturesBlock;
    }

    if (block.type === 'table') {
      return {
        ...block,
        title: 'Imza Menu',
        columns: ['Tabak', 'Aciklama', 'Fiyat'],
        rows: [
          { cells: ['Deniz Levregi', 'Narenciye, rezene, ot yagi', '620 TL'] },
          { cells: ['Dana Yanak', 'Kok sebzeler, jus sos', '740 TL'] },
          { cells: ['Tiramisu', 'Mascarpone, espresso, kakao', '280 TL'] }
        ]
      } as TableBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'gallery') {
      return {
        ...block,
        title: 'Mutfaktan Kareler',
        subtitle: 'Galeri',
        items: ['Imza tabak', 'Salon', 'Tatli'],
        mediaUrls: [
          'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80'
        ]
      } as WidgetBlock;
    }

    if (block.type === 'cta') {
      return {
        ...block,
        title: 'Rezervasyon CTA',
        heading: 'Bu aksam icin masanizi ayirin.',
        body: 'Ekibimiz uygun saatleri onaylamak icin sizinle iletisime gececek.',
        actionLabel: 'Rezervasyon Yap',
        actionUrl: '#rezervasyon'
      } as CtaBlock;
    }

    return { ...block, title: `Restoran Bolumu ${index + 1}` };
  }

  private customizeClinicTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'Klinik Hero',
        eyebrow: 'Saglik ve guven',
        heading: 'Uzman ekip ile kolay randevu ve net bilgilendirme',
        body: 'Hizmetlerinizi, doktor ekibinizi ve randevu akisinizi sade bir landing sayfasinda anlatin.',
        buttons: [this.createActionButton('Randevu Al', '#randevu', 'solid'), this.createActionButton('Hizmetleri Gor', '#hizmetler', 'outline')],
        imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'features') {
      return {
        ...block,
        title: 'Klinik Hizmetleri',
        items: [
          {
            title: 'Muayene',
            body: 'Ilk degerlendirme ve tedavi planlama.',
            imageUrl: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#randevu',
            linkTarget: '_self'
          },
          {
            title: 'Kontrol',
            body: 'Tedavi surecini takip eden planli kontroller.',
            imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#randevu',
            linkTarget: '_self'
          },
          {
            title: 'Danismanlik',
            body: 'Online veya yuz yuze bilgilendirme gorusmeleri.',
            imageUrl: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#iletisim',
            linkTarget: '_self'
          }
        ]
      } as FeaturesBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'forms') {
      return {
        ...block,
        title: 'Randevu Talebi',
        subtitle: 'Hizli basvuru',
        actionLabel: 'Randevu Talebi Gonder',
        items: ['Ad Soyad', 'Telefon', 'Brans', 'Uygun Tarih'],
        detailItems: ['text', 'phone', 'select', 'date'],
        mediaUrls: ['', '', 'Genel Muayene,Kontrol,Danismanlik', '']
      } as WidgetBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'accordion') {
      return {
        ...block,
        title: 'Sik Sorulan Sorular',
        subtitle: 'Hasta bilgilendirme',
        items: ['Randevu nasil alinir?', 'Online gorusme var mi?', 'Sonuclar ne zaman paylasilir?'],
        detailItems: [
          'Formu doldurduktan sonra ekip uygun saatler icin sizinle iletisime gecer.',
          'Uygun hizmetler icin online gorusme planlanabilir.',
          'Tetkik ve sonuc sureleri hizmete gore degisir, ekip tarafindan bilgilendirme yapilir.'
        ]
      } as WidgetBlock;
    }

    if (block.type === 'cta') {
      return {
        ...block,
        title: 'Klinik CTA',
        heading: 'Size uygun randevu saatini birlikte planlayalim.',
        body: 'Formu doldurun, hasta danismani en kisa surede donus yapsin.',
        actionLabel: 'Randevu Al',
        actionUrl: '#randevu'
      } as CtaBlock;
    }

    return { ...block, title: `Klinik Bolumu ${index + 1}` };
  }

  private customizePortfolioTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'Portfolyo Hero',
        eyebrow: 'Selected works',
        heading: 'Projeleri, sureci ve yaratici yaklasimi tek vitrinde toplayin',
        body: 'Tasarim, yazilim veya kreatif islerinizi kategori ve vaka calismalariyla sunun.',
        buttons: [this.createActionButton('Projeleri Gor', '#projeler', 'solid')],
        imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'gallery') {
      return {
        ...block,
        title: 'Proje Vitrini',
        subtitle: 'Portfolyo',
        items: ['Branding', 'Web App', 'Landing Page'],
        detailItems: ['Kimlik tasarimi', 'Urun arayuzu', 'Kampanya sayfasi'],
        mediaUrls: [
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1200&q=80'
        ],
        linkUrls: ['/portfolio/branding', '/portfolio/web-app', '/portfolio/landing']
      } as WidgetBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'timeline') {
      return {
        ...block,
        title: 'Calisma Sureci',
        subtitle: 'Workflow',
        items: ['Kesif', 'Tasarim', 'Teslim'],
        detailItems: [
          'Hedef, hedef kitle ve kapsam netlestirilir.',
          'Wireframe, gorsel dil ve prototip hazirlanir.',
          'Yayin, dokumantasyon ve son kontroller tamamlanir.'
        ]
      } as WidgetBlock;
    }

    if (block.type === 'cta') {
      return {
        ...block,
        title: 'Portfolyo CTA',
        heading: 'Yeni proje icin birlikte calisalim.',
        body: 'Kisa bir brief gonderin, size en uygun is akisini planlayalim.',
        actionLabel: 'Brief Gonder',
        actionUrl: 'mailto:hello@example.com'
      } as CtaBlock;
    }

    return { ...block, title: `Portfolyo Bolumu ${index + 1}` };
  }

  private customizeSaasTemplate(block: PageBlock, index: number): PageBlock {
    if (block.type === 'hero') {
      return {
        ...block,
        title: 'SaaS Hero',
        eyebrow: 'B2B SaaS',
        heading: 'Ekiplerin operasyonunu tek panelden hizlandirin',
        body: 'Urun faydalarini, metrikleri, fiyatlamayi ve demo talebini modern bir SaaS sayfasinda sunun.',
        buttons: [this.createActionButton('Demo Talep Et', '#demo', 'solid'), this.createActionButton('Fiyatlari Gor', '#pricing', 'outline')],
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'
      } as HeroBlock;
    }

    if (block.type === 'features') {
      return {
        ...block,
        title: 'Urun Faydalari',
        items: [
          {
            title: 'Otomasyon',
            body: 'Tekrarlayan operasyonlari standart akislara baglayin.',
            imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#features',
            linkTarget: '_self'
          },
          {
            title: 'Analitik',
            body: 'Ekip performansi ve is sonuclarini tek ekranda izleyin.',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#metrics',
            linkTarget: '_self'
          },
          {
            title: 'Guvenlik',
            body: 'Rol bazli yetki ve islem gecmisiyle kontrolu koruyun.',
            imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80',
            linkUrl: '#security',
            linkTarget: '_self'
          }
        ]
      } as FeaturesBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'charts') {
      return {
        ...block,
        title: 'Performans Metrikleri',
        subtitle: 'Growth dashboard',
        body: 'Urun etkisini sayilarla gosterin.',
        items: ['Aktivasyon', 'Retention', 'Donusum'],
        detailItems: ['Ilk hafta aktivasyon', 'Aylik geri donus', 'Demo-dan satis donusumu'],
        numericValues: [68, 74, 42],
        variant: 'bar'
      } as WidgetBlock;
    }

    if (block.type === 'table') {
      return {
        ...block,
        title: 'Fiyatlama',
        columns: ['Plan', 'Kimler icin', 'Aylik'],
        rows: [
          { cells: ['Starter', 'Kucuk ekipler', '29 USD'] },
          { cells: ['Growth', 'Buyuyen ekipler', '79 USD'] },
          { cells: ['Scale', 'Kurumsal operasyon', 'Custom'] }
        ]
      } as TableBlock;
    }

    if (block.type === 'widget' && block.widgetKind === 'forms') {
      return {
        ...block,
        title: 'Demo Talebi',
        subtitle: 'Satis ekibi',
        actionLabel: 'Demo Planla',
        items: ['Ad Soyad', 'Is e-postasi', 'Sirket', 'Ekip buyuklugu'],
        detailItems: ['text', 'email', 'text', 'select'],
        mediaUrls: ['', '', '', '1-10,11-50,51-250,250+']
      } as WidgetBlock;
    }

    return { ...block, title: `SaaS Bolumu ${index + 1}` };
  }

  toggleFavoriteWidget(kind: WidgetKind): void {
    this.favoriteWidgetKindsSignal.update((items) =>
      items.includes(kind) ? items.filter((item) => item !== kind) : [kind, ...items].slice(0, 20)
    );
    this.persistWidgetKinds(FAVORITE_WIDGETS_KEY, this.favoriteWidgetKindsSignal());
    this.logAction('builder.favorite.updated', 'info', undefined, `${kind} favori listesi guncellendi.`);
  }

  updateSeo(patch: Partial<SeoSettings>): void {
    this.patchSelectedSite((site) => ({
      ...site,
      seo: {
        ...site.seo,
        ...patch
      }
    }));
    this.logAction('seo.updated', 'info', undefined, 'SEO ayarlari guncellendi.');
  }

  addMediaAsset(asset: Omit<MediaAsset, 'id' | 'createdAt' | 'optimized'>): void {
    const site = this.selectedSite();
    const nextMediaMb = site ? this.mediaUsageMb(site) + asset.sizeKb / 1024 : 0;
    if (site && nextMediaMb > site.costPolicy.mediaLimitMb) {
      this.logAction(
        'cost.media.quota.blocked',
        'danger',
        site.id,
        `Medya kotasi asildigi icin ${asset.name} eklenmedi. Limit: ${site.costPolicy.mediaLimitMb} MB.`
      );
      return;
    }

    const nextAsset: MediaAsset = {
      id: `media-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      optimized: asset.type === 'image',
      ...asset
    };

    this.patchSelectedSite((site) => ({
      ...site,
      mediaAssets: [nextAsset, ...site.mediaAssets].slice(0, 200)
    }));
    this.logAction('media.created', 'success', undefined, `${nextAsset.name} medya kutuphanesine eklendi.`);
  }

  removeMediaAsset(assetId: string): void {
    this.patchSelectedSite((site) => ({
      ...site,
      mediaAssets: site.mediaAssets.filter((asset) => asset.id !== assetId)
    }));
    this.logAction('media.removed', 'warning', undefined, 'Medya kutuphanesinden dosya silindi.');
  }

  updateFormSubmissionStatus(submissionId: string, status: FormSubmission['status']): void {
    this.patchSelectedSite((site) => ({
      ...site,
      formSubmissions: site.formSubmissions.map((submission) =>
        submission.id === submissionId ? { ...submission, status } : submission
      )
    }));
    this.logAction('lead.status.updated', 'info', undefined, `Lead durumu ${status} olarak guncellendi.`);
  }

  updateCostPolicy(patch: Partial<SiteCostPolicy>): void {
    this.patchSelectedSite((site) => ({
      ...site,
      costPolicy: {
        ...site.costPolicy,
        ...patch
      }
    }));
    const site = this.selectedSite();
    const alerts = site ? this.costAlerts(site).filter((alert) => alert.severity !== 'info') : [];
    this.logAction(
      alerts.some((alert) => alert.blocking) ? 'cost.policy.alert' : 'cost.policy.updated',
      alerts.some((alert) => alert.blocking) ? 'danger' : 'warning',
      site?.id,
      alerts.length ? `${alerts.length} maliyet/kota uyarisi olustu.` : 'Maliyet politikasi guncellendi.'
    );
  }

  publicationChecklist(project: SiteProject): PublicationChecklistItem[] {
    const enabledLanguages = project.languages.filter((language) => language.enabled);
    const pages = project.pages;
    const blocks = pages.flatMap((page) => page.blocks);
    const externalLinks = this.collectLinks(project).filter((url) => url && !url.startsWith('/') && !url.startsWith('#'));
    const mediaTotalMb = project.mediaAssets.reduce((total, asset) => total + asset.sizeKb, 0) / 1024;

    return [
      this.checklistItem('identity', 'Site adi ve slug', project.name.trim() && project.slug.trim(), 'Site adi ve URL slug bos olmamali.'),
      this.checklistItem('pages', 'En az bir sayfa', pages.length > 0, 'Yayina cikmak icin en az bir sayfa gerekir.'),
      this.checklistItem('content', 'Bos ana icerik kontrolu', blocks.every((block) => this.blockHasContent(block)), 'Baslik, metin veya aksiyon alanlari bos kalmamalidir.'),
      this.checklistItem('seo-title', 'SEO basligi', project.seo.title.trim().length >= 12, 'SEO basligi en az 12 karakter olmali.'),
      this.checklistItem('seo-description', 'SEO aciklamasi', project.seo.description.trim().length >= 40, 'SEO aciklamasi arama ve sosyal paylasimlar icin doldurulmali.'),
      this.checklistItem('languages', 'Dil pathleri', enabledLanguages.every((language) => pages.every((page) => !!page.localizedSlugs[language.code])), 'Aktif her dil icin sayfa pathi girilmeli.'),
      this.checklistItem('links', 'Link formati', externalLinks.every((url) => /^https?:\/\//.test(url)), 'Harici linkler http veya https ile baslamali.'),
      this.checklistItem('media-budget', 'Medya kotasi', mediaTotalMb <= project.costPolicy.mediaLimitMb, `Medya kullanimi ${project.costPolicy.mediaLimitMb} MB limitini asmamali.`),
      this.checklistItem('hosting-strategy', 'Yayin stratejisi', project.costPolicy.deployStrategy === 'shared-route' || project.hostingTargets.length > 0, 'Dedicated hosting secildiyse hosting hedefi tanimli olmali.'),
      this.checklistItem('forms', 'Form/lead hazirligi', blocks.some((block) => block.type === 'widget' && block.widgetKind === 'forms') || project.access.mode === 'public', 'Uyelikli akislarda lead veya form kurgusu onerilir.', 'warning')
    ];
  }

  costAlerts(project: SiteProject): CostAlert[] {
    const alerts: CostAlert[] = [];
    const mediaMb = this.mediaUsageMb(project);
    const mediaRatio = project.costPolicy.mediaLimitMb > 0 ? mediaMb / project.costPolicy.mediaLimitMb : 0;
    const activeHostingCount = project.hostingTargets.filter((target) => target.status === 'active').length;
    const estimatedFunctionEvents = this.estimatedMonthlyFunctionEvents(project);
    const functionEventLimit = Math.max(50, project.costPolicy.monthlyFunctionBudget * 100);

    if (mediaMb > project.costPolicy.mediaLimitMb) {
      alerts.push({
        id: `${project.id}-media-block`,
        siteId: project.id,
        siteName: project.name,
        severity: 'danger',
        title: 'Medya kotasi asildi',
        details: `${mediaMb.toFixed(1)} MB kullaniliyor, limit ${project.costPolicy.mediaLimitMb} MB.`,
        blocking: true
      });
    } else if (mediaRatio >= 0.8) {
      alerts.push({
        id: `${project.id}-media-warning`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Medya kotasi yaklasiyor',
        details: `${mediaMb.toFixed(1)} MB kullaniliyor, limit ${project.costPolicy.mediaLimitMb} MB.`,
        blocking: false
      });
    }

    if (project.costPolicy.deployStrategy === 'shared-route' && project.hostingTargets.length > 1) {
      alerts.push({
        id: `${project.id}-shared-hosting-block`,
        siteId: project.id,
        siteName: project.name,
        severity: 'danger',
        title: 'Shared-route ile fazla hosting hedefi',
        details: 'Shared-route maliyet modu tek hosting hedefiyle calismali. Ek hedefler icin dedicated-hosting secin.',
        blocking: true
      });
    }

    if (project.costPolicy.deployStrategy === 'dedicated-hosting' && project.hostingTargets.length > 1) {
      alerts.push({
        id: `${project.id}-dedicated-cost`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Dedicated hosting maliyeti',
        details: `${project.hostingTargets.length} hosting hedefi var. Her hedef ek operasyon maliyeti yaratabilir.`,
        blocking: false
      });
    }

    if (activeHostingCount > 1) {
      alerts.push({
        id: `${project.id}-active-hosting`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Birden fazla aktif hosting',
        details: `${activeHostingCount} aktif hedef var. Gereksiz hedefleri paused yapin.`,
        blocking: false
      });
    }

    if (project.costPolicy.auditRetentionDays > 180) {
      alerts.push({
        id: `${project.id}-retention`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Uzun log saklama',
        details: `${project.costPolicy.auditRetentionDays} gun log saklama Firestore okuma/yazma ve depolama maliyetini artirabilir.`,
        blocking: false
      });
    }

    if (!project.costPolicy.summaryFirstReads) {
      alerts.push({
        id: `${project.id}-summary-first`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Ozet veri onceligi kapali',
        details: 'Dashboardlar detay dokuman okumaya kayabilir. Ozet veri onceligi maliyeti dusurur.',
        blocking: false
      });
    }

    if (estimatedFunctionEvents > functionEventLimit) {
      alerts.push({
        id: `${project.id}-function-budget`,
        siteId: project.id,
        siteName: project.name,
        severity: 'warning',
        title: 'Function butcesi alarmi',
        details: `Tahmini aylik olay ${estimatedFunctionEvents}, takip limiti ${functionEventLimit}.`,
        blocking: false
      });
    }

    return alerts;
  }

  private patchSelectedSite(
    updater: (site: SiteProject) => SiteProject,
    options: { skipUndo?: boolean } = {}
  ): SiteProject | null {
    const currentId = this.selectedSiteIdSignal();
    const currentSite = this.projectsSignal().find((project) => project.id === currentId);
    if (currentSite && !options.skipUndo) {
      this.captureUndoState(currentSite);
    }
    let changedSite: SiteProject | null = null;
    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== currentId) {
          return project;
        }

        changedSite = this.touchProject(updater(project));
        return changedSite;
      })
    );
    if (!options.skipUndo) {
      this.redoStackSignal.set([]);
    }
    this.persist(changedSite ? [changedSite] : undefined);
    return changedSite;
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

  private loadCustomThemes(): ThemeConfig[] {
    const raw = globalThis.localStorage?.getItem(CUSTOM_THEMES_KEY);
    if (!raw) {
      return [];
    }

    return (JSON.parse(raw) as ThemeConfig[]).map((theme) => this.normalizeTheme(theme));
  }

  private loadSimulationSiteId(): string | null {
    return globalThis.localStorage?.getItem(SIMULATION_KEY) ?? null;
  }

  private loadWidgetKinds(key: string): WidgetKind[] {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) {
      return [];
    }

    return (JSON.parse(raw) as WidgetKind[]).filter(Boolean);
  }

  private persistWidgetKinds(key: string, values: WidgetKind[]): void {
    globalThis.localStorage?.setItem(key, JSON.stringify(values));
  }

  private captureUndoState(site: SiteProject): void {
    this.undoStackSignal.update((stack) => [this.snapshotSite(site), ...stack].slice(0, 25));
  }

  private snapshotSite(site: SiteProject): string {
    const { versionHistory: _versionHistory, ...snapshot } = site;
    return JSON.stringify({ ...snapshot, versionHistory: [] });
  }

  private replaceSiteFromSnapshot(snapshot: string): void {
    const restored = this.touchProject(this.normalizeProject(JSON.parse(snapshot) as SiteProject));
    let changedProject: SiteProject | null = null;
    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== restored.id) {
          return project;
        }

        changedProject = { ...restored, versionHistory: project.versionHistory };
        return changedProject;
      })
    );
    this.persist(changedProject ? [changedProject] : undefined);
  }

  private normalizeProject(project: SiteProject): SiteProject {
    const theme = this.normalizeTheme(project.theme);
    const languages = this.ensureDefaultLanguage(
      (project.languages?.length ? project.languages : this.defaultLanguages()).map((language) =>
        this.normalizeLanguage(language)
      )
    );
    const access = this.normalizeAccess(project.access);
    const seo = this.normalizeSeo(project.seo, project.name, project.slug);
    const hostingTargets = (project.hostingTargets?.length
      ? project.hostingTargets
      : [this.createHostingTarget(project.slug, 'Production', 'firebase', '', project.slug, 'draft')]
    ).map((target) => this.normalizeHostingTarget(target, project.slug));
    const metrics = this.normalizeMetrics(project.metrics, project);
    const updatedAt = project.updatedAt ?? metrics.updatedAt ?? new Date().toISOString();

    return {
      ...project,
      ownerUid: project.ownerUid ?? project.ownerId,
      theme,
      access,
      seo,
      mediaAssets: (project.mediaAssets ?? []).map((asset) => this.normalizeMediaAsset(asset)),
      formSubmissions: project.formSubmissions ?? this.defaultFormSubmissions(project.name),
      metrics,
      costPolicy: this.normalizeCostPolicy(project.costPolicy),
      versionHistory: project.versionHistory ?? [],
      languages,
      hostingTargets,
      publication: {
        ...(project.publication ?? {}),
        requestStatus: project.publication?.requestStatus ?? 'none'
      },
      updatedAt,
      pages: project.pages.map((page) => ({
        ...page,
        localizedSlugs: this.normalizeLocalizedSlugs(page, languages),
        blocks: page.blocks.map((block) => this.normalizeBlock(block, theme))
      }))
    };
  }

  private normalizeTheme(theme: ThemeConfig): ThemeConfig {
    return {
      ...themePresets[0],
      ...theme,
      buttonStyle: theme.buttonStyle ?? 'rounded',
      cardStyle: theme.cardStyle ?? 'elevated',
      spacingScale: theme.spacingScale ?? 'comfortable'
    };
  }

  private defaultAccessSettings(): SiteAccessSettings {
    return {
      mode: 'public',
      allowSelfRegistration: true,
      loginTitle: 'Uye alani',
      gatedMessage: 'Bu siteye devam etmek icin lutfen giris yapin.'
    };
  }

  private normalizeAccess(access?: SiteAccessSettings): SiteAccessSettings {
    return {
      ...this.defaultAccessSettings(),
      ...access
    };
  }

  private defaultSeoSettings(siteName: string, slug: string): SeoSettings {
    const safeName = siteName.trim() || 'Yeni Site';

    return {
      title: `${safeName} | Web Creator`,
      description: `${safeName} icin hazirlanan modern, responsive ve kolay yonetilebilir web sitesi.`,
      keywords: `${safeName}, web sitesi, landing page`,
      ogImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      canonicalUrl: `https://web-creator-anilyilmaz.web.app/sites/${slug}`,
      noIndex: false
    };
  }

  private normalizeSeo(seo: SeoSettings | undefined, siteName: string, slug: string): SeoSettings {
    return {
      ...this.defaultSeoSettings(siteName, slug),
      ...seo
    };
  }

  private normalizeMediaAsset(asset: MediaAsset): MediaAsset {
    return {
      id: asset.id || `media-${crypto.randomUUID()}`,
      name: asset.name?.trim() || 'Medya',
      url: asset.url || '',
      altText: asset.altText || asset.name || 'Medya',
      type: asset.type || 'image',
      sizeKb: Math.max(0, Number(asset.sizeKb) || 0),
      width: asset.width,
      height: asset.height,
      optimized: asset.optimized ?? asset.type === 'image',
      createdAt: asset.createdAt || new Date().toISOString()
    };
  }

  private defaultFormSubmissions(siteName: string): FormSubmission[] {
    return [
      {
        id: `lead-${crypto.randomUUID()}`,
        formName: 'Iletisim Formu',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        status: 'new',
        values: {
          Ad: 'Demo Lead',
          'E-posta': 'lead@example.com',
          Site: siteName
        }
      },
      {
        id: `lead-${crypto.randomUUID()}`,
        formName: 'Teklif Formu',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        status: 'contacted',
        values: {
          Ad: 'Ornek Musteri',
          'E-posta': 'musteri@example.com',
          Not: 'Kurumsal site paketi ile ilgileniyor.'
        }
      }
    ];
  }

  private defaultMetrics(): SiteMetrics {
    return {
      views: 1240,
      visitors: 860,
      leads: 42,
      conversionRate: 4.8,
      updatedAt: new Date().toISOString()
    };
  }

  private normalizeMetrics(metrics: SiteMetrics | undefined, project: SiteProject): SiteMetrics {
    const blockCount = project.pages.reduce((total, page) => total + page.blocks.length, 0);
    const fallback = this.defaultMetrics();

    return {
      views: metrics?.views ?? Math.max(240, project.pages.length * 180 + blockCount * 35),
      visitors: metrics?.visitors ?? Math.max(120, project.pages.length * 120 + blockCount * 18),
      leads: metrics?.leads ?? project.formSubmissions?.length ?? fallback.leads,
      conversionRate: metrics?.conversionRate ?? fallback.conversionRate,
      updatedAt: metrics?.updatedAt ?? new Date().toISOString()
    };
  }

  private defaultCostPolicy(): SiteCostPolicy {
    return {
      deployStrategy: 'shared-route',
      mediaLimitMb: 50,
      auditRetentionDays: 90,
      monthlyFunctionBudget: 10,
      summaryFirstReads: true
    };
  }

  private normalizeCostPolicy(policy: SiteCostPolicy | undefined): SiteCostPolicy {
    return {
      ...this.defaultCostPolicy(),
      ...policy,
      mediaLimitMb: Math.max(5, Number(policy?.mediaLimitMb ?? 50)),
      auditRetentionDays: Math.max(7, Number(policy?.auditRetentionDays ?? 90)),
      monthlyFunctionBudget: Math.max(1, Number(policy?.monthlyFunctionBudget ?? 10))
    };
  }

  private defaultLanguages(): LanguageConfig[] {
    return [
      {
        id: `language-${crypto.randomUUID()}`,
        code: 'tr',
        label: 'Turkce',
        pathPrefix: 'tr',
        enabled: true,
        isDefault: true
      },
      {
        id: `language-${crypto.randomUUID()}`,
        code: 'en',
        label: 'English',
        pathPrefix: 'en',
        enabled: true,
        isDefault: false
      }
    ];
  }

  private normalizeLanguage(language: LanguageConfig): LanguageConfig {
    const code = language.code?.trim().toLowerCase() || 'tr';

    return {
      id: language.id || `language-${crypto.randomUUID()}`,
      code,
      label: language.label?.trim() || code.toUpperCase(),
      pathPrefix: this.slugify(language.pathPrefix || code) || code,
      enabled: language.enabled ?? true,
      isDefault: language.isDefault ?? false
    };
  }

  private ensureDefaultLanguage(languages: LanguageConfig[]): LanguageConfig[] {
    if (!languages.length) {
      return this.defaultLanguages();
    }

    const defaultIndex = languages.findIndex((language) => language.isDefault);
    const fallbackIndex = defaultIndex >= 0 ? defaultIndex : 0;

    return languages.map((language, index) => ({
      ...language,
      enabled: index === fallbackIndex ? true : language.enabled,
      isDefault: index === fallbackIndex
    }));
  }

  private defaultLocalizedSlugs(name: string): Record<string, string> {
    const slug = this.slugify(name) || 'page';
    const languages = this.selectedSite()?.languages ?? this.defaultLanguages();

    return languages.reduce<Record<string, string>>((acc, language) => {
      acc[language.code] = slug;
      return acc;
    }, {});
  }

  private normalizeLocalizedSlugs(page: SitePage, languages: LanguageConfig[]): Record<string, string> {
    return languages.reduce<Record<string, string>>((acc, language) => {
      acc[language.code] = page.localizedSlugs?.[language.code] || page.slug;
      return acc;
    }, {});
  }

  private createHostingTarget(
    siteSlug: string,
    name: string,
    provider: HostingProvider,
    firebaseProjectId: string,
    firebaseSiteId: string,
    status: HostingTarget['status']
  ): HostingTarget {
    const safeSiteId = this.slugify(firebaseSiteId || siteSlug) || siteSlug;

    return {
      id: `hosting-${crypto.randomUUID()}`,
      name: name.trim() || 'Production',
      provider,
      firebaseProjectId: firebaseProjectId.trim(),
      firebaseSiteId: safeSiteId,
      defaultUrl: provider === 'firebase' ? `https://${safeSiteId}.web.app` : '',
      customDomain: '',
      status,
      createdAt: new Date().toISOString(),
      domainStatus: 'not-started',
      dnsInstructions: ''
    };
  }

  private normalizeHostingTarget(target: HostingTarget, siteSlug: string): HostingTarget {
    const firebaseSiteId = this.slugify(target.firebaseSiteId || siteSlug) || siteSlug;

    return {
      id: target.id || `hosting-${crypto.randomUUID()}`,
      name: target.name || 'Production',
      provider: target.provider || 'firebase',
      firebaseProjectId: target.firebaseProjectId || '',
      firebaseSiteId,
      defaultUrl: target.defaultUrl || `https://${firebaseSiteId}.web.app`,
      customDomain: target.customDomain || '',
      status: target.status || 'draft',
      createdAt: target.createdAt || new Date().toISOString(),
      lastPublishedAt: target.lastPublishedAt,
      domainStatus: target.domainStatus ?? (target.customDomain ? 'pending-dns' : 'not-started'),
      dnsInstructions:
        target.dnsInstructions ??
        (target.customDomain
          ? `DNS CNAME veya A kayitlarini Firebase Hosting yonlendirmelerine gore ${target.customDomain} icin dogrulayin.`
          : '')
    };
  }

  private activateHostingTarget(project: SiteProject, hostingTargetId: string | undefined, publishedAt: string): HostingTarget[] {
    const targetId = hostingTargetId ?? project.hostingTargets[0]?.id;

    return project.hostingTargets.map((target) =>
      target.id === targetId
        ? {
            ...target,
            status: 'active',
            lastPublishedAt: publishedAt,
            defaultUrl: target.defaultUrl || `https://${target.firebaseSiteId || project.slug}.web.app`
          }
        : target
    );
  }

  private resolvePublishedUrl(target: HostingTarget | undefined): string {
    if (!target) {
      return '';
    }

    return target.customDomain || target.defaultUrl || `https://${target.firebaseSiteId}.web.app`;
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

  private touchProject(project: SiteProject, at = new Date().toISOString()): SiteProject {
    const normalized = this.normalizeProject({
      ...project,
      updatedAt: at,
      metrics: {
        ...project.metrics,
        updatedAt: at
      }
    });

    return {
      ...normalized,
      updatedAt: at,
      metrics: {
        ...normalized.metrics,
        updatedAt: at
      }
    };
  }

  private projectTimestamp(project: SiteProject): number {
    const rawTimestamp = project.updatedAt ?? project.metrics?.updatedAt;
    return rawTimestamp ? new Date(rawTimestamp).getTime() || 0 : 0;
  }

  private mergeProjects(localProjects: SiteProject[], remoteProjects: SiteProject[]): SiteProject[] {
    const merged = new Map<string, SiteProject>();

    for (const project of remoteProjects) {
      const normalized = this.normalizeProject(project);
      merged.set(normalized.id, normalized);
    }

    for (const project of localProjects) {
      const normalized = this.normalizeProject(project);
      const remote = merged.get(normalized.id);

      if (!remote || this.projectTimestamp(normalized) >= this.projectTimestamp(remote)) {
        merged.set(normalized.id, normalized);
      }
    }

    return Array.from(merged.values()).sort((a, b) => this.projectTimestamp(b) - this.projectTimestamp(a));
  }

  private updateSaveStatus(state: SaveState, message: string, at = new Date().toISOString()): void {
    this.saveStatusSignal.set({ state, message, at });
  }

  private syncBackendAction(
    functionName: 'requestPublication' | 'approvePublication' | 'rejectPublication' | 'stopPublication',
    payload: Record<string, unknown>,
    siteId: string,
    successMessage: string,
    failurePrefix: string
  ): void {
    if (!this.firebaseData.enabled) {
      return;
    }

    this.updateSaveStatus('saving', 'Backend yayin islemi baslatildi...');
    void (async () => {
      const project = this.findById(siteId);
      if (project) {
        const synced = await this.firebaseData.saveProject(project);
        if (!synced) {
          throw new Error('Site dokumani Firebase uzerine yazilamadi.');
        }
      }

      await this.firebaseData.callFunctionStrict(functionName, payload);
    })()
      .then(() => {
        this.updateSaveStatus('saved', successMessage);
      })
      .catch((error) => {
        const details = `${failurePrefix}: ${this.firebaseErrorMessage(error)}`;
        this.updateSaveStatus('error', details);
        this.logAction(`${functionName}.backend_failed`, 'danger', siteId, details);
      });
  }

  private firebaseErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const candidate = error as { code?: string; message?: string };
      return [candidate.code, candidate.message].filter(Boolean).join(' - ') || 'Bilinmeyen Firebase hatasi.';
    }

    return String(error || 'Bilinmeyen Firebase hatasi.');
  }

  private persist(remoteProjects?: SiteProject[]): void {
    const projects = this.projectsSignal();
    globalThis.localStorage?.setItem(PROJECTS_KEY, JSON.stringify(projects));
    const savedAt = new Date().toISOString();
    const projectsToSync = remoteProjects ?? projects;
    this.lastSavedAtSignal.set(savedAt);

    if (!this.firebaseData.enabled) {
      this.updateSaveStatus('saved', 'Degisiklikler bu tarayicida kaydedildi.', savedAt);
      return;
    }

    if (!projectsToSync.length) {
      this.updateSaveStatus('saved', 'Degisiklikler kaydedildi.', savedAt);
      return;
    }

    this.updateSaveStatus('saving', 'Firebase kaydi yapiliyor...', savedAt);
    void this.firebaseData
      .saveProjects(projectsToSync)
      .then((result) => {
        if (result.failed > 0) {
          this.updateSaveStatus(
            'error',
            'Degisiklikler bu tarayicida kaydedildi ancak Firebase kaydi tamamlanamadi. Oturum/yetki veya baglanti kontrol edilmeli.'
          );
          return;
        }

        this.updateSaveStatus('saved', 'Degisiklikler Firebase ile kaydedildi.');
      })
      .catch((error) => {
        this.updateSaveStatus(
          'error',
          `Degisiklikler bu tarayicida kaydedildi ancak Firebase kaydi tamamlanamadi: ${this.firebaseErrorMessage(error)}`
        );
      });
  }

  private blockingCostAlerts(project: SiteProject): CostAlert[] {
    return this.costAlerts(project).filter((alert) => alert.blocking);
  }

  private mediaUsageMb(project: SiteProject): number {
    return project.mediaAssets.reduce((total, asset) => total + asset.sizeKb, 0) / 1024;
  }

  private estimatedMonthlyFunctionEvents(project: SiteProject): number {
    const siteLogs = this.auditLog.logsForSite(project.id).length;
    const leadEvents = project.formSubmissions.length * 2;
    const hostingEvents = project.hostingTargets.length * 8;
    return siteLogs + leadEvents + hostingEvents;
  }

  private collectLinks(project: SiteProject): string[] {
    return project.pages.flatMap((page) =>
      page.blocks.flatMap((block) => {
        const links = [block.linkUrl];

        if (block.type === 'hero') {
          links.push(...block.buttons.map((button) => button.url));
        }

        if (block.type === 'features') {
          links.push(...block.items.map((item) => item.linkUrl));
        }

        if (block.type === 'cta') {
          links.push(block.actionUrl);
        }

        if (block.type === 'widget') {
          links.push(block.actionUrl, ...block.linkUrls);
        }

        if (block.type === 'image') {
          links.push(block.linkUrl);
        }

        return links.filter(Boolean);
      })
    );
  }

  private blockHasContent(block: PageBlock): boolean {
    if (block.type === 'hero') {
      return !!(block.heading.trim() || block.body.trim() || block.buttons.some((button) => button.label.trim()));
    }

    if (block.type === 'text') {
      return !!block.body.trim();
    }

    if (block.type === 'features') {
      return block.items.some((item) => item.title.trim() || item.body.trim());
    }

    if (block.type === 'table') {
      return block.columns.length > 0 && block.rows.some((row) => row.cells.some((cell) => cell.trim()));
    }

    if (block.type === 'image') {
      return !!(block.imageUrl.trim() || block.altText.trim());
    }

    if (block.type === 'cta') {
      return !!(block.heading.trim() || block.body.trim() || block.actionLabel.trim());
    }

    return !!(
      block.title.trim() ||
      block.subtitle.trim() ||
      block.body.trim() ||
      block.items.some((item) => item.trim())
    );
  }

  private checklistItem(
    id: string,
    label: string,
    condition: unknown,
    details: string,
    fallbackStatus: Exclude<ChecklistStatus, 'pass'> = 'fail'
  ): PublicationChecklistItem {
    return {
      id,
      label,
      status: condition ? 'pass' : fallbackStatus,
      details
    };
  }

  private persistCustomThemes(): void {
    globalThis.localStorage?.setItem(CUSTOM_THEMES_KEY, JSON.stringify(this.customThemesSignal()));
  }

  private logAction(action: string, level: AuditLogLevel, siteId: string | undefined, details: string): void {
    const site = siteId ? this.findById(siteId) : this.selectedSite();
    const actor = this.auth.currentUser();
    this.auditLog.record(action, level, details, { actor, site });
  }

  private hydrateFromFirebase(): void {
    if (!this.firebaseData.enabled) {
      return;
    }

    void this.firebaseData.loadProjects().then((projects) => {
      if (!projects.length) {
        return;
      }

      const mergedProjects = this.mergeProjects(this.projectsSignal(), projects);
      this.projectsSignal.set(mergedProjects);

      if (!mergedProjects.some((project) => project.id === this.selectedSiteIdSignal())) {
        this.selectedSiteIdSignal.set(mergedProjects[0]?.id ?? '');
      }

      globalThis.localStorage?.setItem(PROJECTS_KEY, JSON.stringify(mergedProjects));
    });

  }

  private uniqueSlug(baseSlug: string): string {
    const existingSlugs = new Set(this.projectsSignal().map((project) => project.slug));
    let slug = baseSlug;
    let index = 2;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }

    return slug;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
