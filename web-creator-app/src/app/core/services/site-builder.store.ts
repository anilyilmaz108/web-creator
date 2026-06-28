import { Injectable, computed, inject, signal } from '@angular/core';

import { componentCatalog } from '../data/component-catalog';
import { demoProjects, themePresets } from '../data/demo-data';
import {
  ActionButton,
  AuditLogEntry,
  AuditLogLevel,
  BlockType,
  ChecklistStatus,
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
      metrics: this.defaultMetrics(),
      costPolicy: this.defaultCostPolicy(),
      versionHistory: [],
      languages: this.defaultLanguages(),
      hostingTargets: [this.createHostingTarget(slug, 'Production', 'firebase', '', slug, 'draft')],
      selectedPageId: pageId,
      publication: { requestStatus: 'none' },
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
    this.persist();
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
    const failedChecks = site ? this.publicationChecklist(site).filter((item) => item.status === 'fail') : [];
    this.patchSelectedSite((site) => ({
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
  }

  approvePublication(siteId: string, days: number, approvedBy?: string): void {
    const now = new Date();
    const approvedUntil = new Date(now);
    approvedUntil.setDate(now.getDate() + days);

    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== siteId) {
          return project;
        }

        const hostingTargetId = project.publication.hostingTargetId ?? project.hostingTargets[0]?.id;
        const hostingTargets = this.activateHostingTarget(project, hostingTargetId, now.toISOString());
        const publishedUrl = this.resolvePublishedUrl(hostingTargets.find((target) => target.id === hostingTargetId));

        return {
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
        };
      })
    );
    this.persist();
    this.logAction('publication.approved', 'success', siteId, `${days} gunluk yayin onayi verildi.`);
  }

  rejectPublication(siteId: string, reason: string, rejectedBy?: string): void {
    const now = new Date().toISOString();
    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === siteId
          ? {
              ...project,
              status: 'draft',
              publication: {
                ...project.publication,
                requestStatus: 'rejected',
                rejectedAt: now,
                rejectedBy,
                rejectionReason: reason || 'Yayin talebi reddedildi.'
              }
            }
          : project
      )
    );
    this.persist();
    this.logAction('publication.rejected', 'danger', siteId, reason || 'Yayin talebi reddedildi.');
  }

  publishToActiveHosting(siteId: string): void {
    const now = new Date().toISOString();
    this.projectsSignal.update((projects) =>
      projects.map((project) => {
        if (project.id !== siteId) {
          return project;
        }

        const activeTarget = project.hostingTargets.find((target) => target.status === 'active') ?? project.hostingTargets[0];
        const hostingTargets = this.activateHostingTarget(project, activeTarget?.id, now);

        return {
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
        };
      })
    );
    this.persist();
    this.logAction('publication.updated', 'success', siteId, 'Aktif hosting uzerinden yayin guncellendi.');
  }

  stopPublication(siteId: string, reason = 'Yayin site yoneticisi tarafindan durduruldu.', stoppedBy?: string): void {
    const now = new Date().toISOString();

    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === siteId
          ? {
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
            }
          : project
      )
    );
    this.persist();
    this.logAction('publication.stopped', 'danger', siteId, reason);
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
    const restored = this.normalizeProject(JSON.parse(snapshot.snapshot) as SiteProject);
    this.projectsSignal.update((projects) =>
      projects.map((project) =>
        project.id === site.id
          ? {
              ...restored,
              id: site.id,
              versionHistory: site.versionHistory
            }
          : project
      )
    );
    this.persist();
    this.logAction('version.snapshot.restored', 'warning', site.id, `${snapshot.name} snapshot geri yuklendi.`);
  }

  addSectionTemplate(templateId: string): void {
    const template = this.sectionTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const blocks = template.blocks.map((item) =>
      item.type === 'widget' && item.widgetKind ? this.createWidget(item.widgetKind) : this.createBlock(item.type)
    );
    this.patchSelectedPage((page) => ({ ...page, blocks: [...page.blocks, ...blocks] }));
    this.selectedBlockIdSignal.set(blocks[0]?.id ?? this.selectedBlockIdSignal());
    this.logAction('section.template.added', 'success', undefined, `${template.name} section seti eklendi.`);
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
    this.logAction('cost.policy.updated', 'warning', undefined, 'Maliyet politikasi guncellendi.');
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

  private patchSelectedSite(updater: (site: SiteProject) => SiteProject, options: { skipUndo?: boolean } = {}): void {
    const currentId = this.selectedSiteIdSignal();
    const currentSite = this.projectsSignal().find((project) => project.id === currentId);
    if (currentSite && !options.skipUndo) {
      this.captureUndoState(currentSite);
    }
    this.projectsSignal.update((projects) =>
      projects.map((project) => (project.id === currentId ? updater(project) : project))
    );
    if (!options.skipUndo) {
      this.redoStackSignal.set([]);
    }
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
    const restored = this.normalizeProject(JSON.parse(snapshot) as SiteProject);
    this.projectsSignal.update((projects) =>
      projects.map((project) => (project.id === restored.id ? { ...restored, versionHistory: project.versionHistory } : project))
    );
    this.persist();
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

    return {
      ...project,
      ownerUid: project.ownerUid ?? project.ownerId,
      theme,
      access,
      seo,
      mediaAssets: (project.mediaAssets ?? []).map((asset) => this.normalizeMediaAsset(asset)),
      formSubmissions: project.formSubmissions ?? this.defaultFormSubmissions(project.name),
      metrics: this.normalizeMetrics(project.metrics, project),
      costPolicy: this.normalizeCostPolicy(project.costPolicy),
      versionHistory: project.versionHistory ?? [],
      languages,
      hostingTargets,
      publication: {
        ...(project.publication ?? {}),
        requestStatus: project.publication?.requestStatus ?? 'none'
      },
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

  private persist(): void {
    const projects = this.projectsSignal();
    globalThis.localStorage?.setItem(PROJECTS_KEY, JSON.stringify(projects));
    this.firebaseData.saveProjects(projects);
    this.lastSavedAtSignal.set(new Date().toISOString());
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

      this.projectsSignal.set(projects.map((project) => this.normalizeProject(project)));
      this.selectedSiteIdSignal.set(this.projectsSignal()[0]?.id ?? '');
      globalThis.localStorage?.setItem(PROJECTS_KEY, JSON.stringify(this.projectsSignal()));
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
