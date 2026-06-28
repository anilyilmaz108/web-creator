import { SiteProject, ThemeConfig } from '../models/builder.models';
import { UserProfile } from '../models/auth.models';

export const demoUsers: UserProfile[] = [
  {
    id: 'user-superadmin',
    name: 'Platform Owner',
    email: 'owner@webcreator.dev',
    password: 'Owner123!',
    role: 'superadmin'
  },
  {
    id: 'user-admin',
    name: 'Studio Admin',
    email: 'admin@webcreator.dev',
    password: 'Admin123!',
    role: 'admin'
  },
  {
    id: 'user-moderator',
    name: 'Content Moderator',
    email: 'moderator@webcreator.dev',
    password: 'Mod123!',
    role: 'moderator'
  },
  {
    id: 'user-visitor',
    name: 'Read Only Visitor',
    email: 'visitor@webcreator.dev',
    password: 'Visitor123!',
    role: 'visitor'
  }
];

export const themePresets: ThemeConfig[] = [
  {
    name: 'Editorial Sand',
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    headingFontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    surface: '#fffdf8',
    surfaceAlt: '#f6efe0',
    background: '#f3ecdf',
    foreground: '#1f2937',
    muted: '#6b7280',
    accent: '#d97706',
    accentSoft: '#f8d7a7',
    border: '#ead7bc',
    cardRadius: 24,
    pageWidth: 1200,
    sectionGap: 24,
    shadowStyle: 'soft'
  },
  {
    name: 'Ocean Board',
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    headingFontFamily: '"Sora", "Segoe UI", sans-serif',
    surface: '#f4fbff',
    surfaceAlt: '#dff4fb',
    background: '#d8eef8',
    foreground: '#102a43',
    muted: '#486581',
    accent: '#0f766e',
    accentSoft: '#b8f1eb',
    border: '#b8d8e5',
    cardRadius: 20,
    pageWidth: 1200,
    sectionGap: 24,
    shadowStyle: 'medium'
  },
  {
    name: 'Neon Slate',
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    headingFontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    surface: '#111827',
    surfaceAlt: '#1f2937',
    background: '#020617',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    accent: '#38bdf8',
    accentSoft: '#1e3a5f',
    border: '#334155',
    cardRadius: 26,
    pageWidth: 1280,
    sectionGap: 28,
    shadowStyle: 'strong'
  }
];

export const demoProjects: SiteProject[] = [
  {
    id: 'site-studio',
    name: 'Northwind Studio',
    slug: 'northwind-studio',
    ownerId: 'user-admin',
    status: 'draft',
    theme: themePresets[0],
    selectedPageId: 'page-home',
    access: {
      mode: 'public',
      allowSelfRegistration: true,
      loginTitle: 'Northwind Studio uyelik alani',
      gatedMessage: 'Bu siteye devam etmek icin lutfen giris yapin.'
    },
    seo: {
      title: 'Northwind Studio | Creative Website Builder',
      description: 'Northwind Studio icin hazirlanan responsive, cok dilli ve kolay yonetilebilir demo web sitesi.',
      keywords: 'website builder, northwind studio, landing page, firebase hosting',
      ogImage: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      canonicalUrl: 'https://web-creator-anilyilmaz.web.app/sites/northwind-studio',
      noIndex: false
    },
    mediaAssets: [
      {
        id: 'media-demo-hero',
        name: 'Hero ofis gorseli',
        url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        altText: 'Modern ofis ortaminda calisan ekip',
        type: 'image',
        sizeKb: 420,
        width: 1200,
        height: 800,
        optimized: true,
        createdAt: '2026-06-01T09:00:00.000Z'
      }
    ],
    formSubmissions: [
      {
        id: 'lead-demo-1',
        formName: 'Iletisim Formu',
        createdAt: '2026-06-12T10:30:00.000Z',
        status: 'new',
        values: {
          Ad: 'Ayse Demir',
          'E-posta': 'ayse@example.com',
          Mesaj: 'Kurumsal site paketi hakkinda bilgi almak istiyorum.'
        }
      },
      {
        id: 'lead-demo-2',
        formName: 'Teklif Formu',
        createdAt: '2026-06-10T14:15:00.000Z',
        status: 'contacted',
        values: {
          Ad: 'Mehmet Kaya',
          'E-posta': 'mehmet@example.com',
          Plan: 'Growth'
        }
      }
    ],
    metrics: {
      views: 1840,
      visitors: 1190,
      leads: 54,
      conversionRate: 4.5,
      updatedAt: '2026-06-15T08:00:00.000Z'
    },
    costPolicy: {
      deployStrategy: 'shared-route',
      mediaLimitMb: 50,
      auditRetentionDays: 90,
      monthlyFunctionBudget: 10,
      summaryFirstReads: true
    },
    versionHistory: [],
    languages: [
      {
        id: 'language-tr',
        code: 'tr',
        label: 'Turkce',
        pathPrefix: 'tr',
        enabled: true,
        isDefault: true
      },
      {
        id: 'language-en',
        code: 'en',
        label: 'English',
        pathPrefix: 'en',
        enabled: true,
        isDefault: false
      }
    ],
    hostingTargets: [
      {
        id: 'hosting-northwind-production',
        name: 'Production',
        provider: 'firebase',
        firebaseProjectId: 'webcreator-demo',
        firebaseSiteId: 'northwind-studio',
        defaultUrl: 'https://northwind-studio.web.app',
        customDomain: '',
        status: 'draft',
        createdAt: '2026-06-01T09:00:00.000Z'
      }
    ],
    publication: { requestStatus: 'none' },
    pages: [
      {
        id: 'page-home',
        name: 'Home',
        slug: 'home',
        localizedSlugs: {
          tr: 'anasayfa',
          en: 'home'
        },
        blocks: [
          {
            id: 'block-hero',
            type: 'hero',
            title: 'Hero',
            layout: 'split',
            animation: 'fade-up',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: 'Demo Talep Et',
            linkUrl: 'https://example.com/demo',
            linkTarget: '_blank',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'full',
            minHeight: 0,
            eyebrow: 'Creative website builder',
            heading: 'Markaniza ozel siteleri surukle-birak mantigiyla olusturun.',
            body: 'Admin panelinden bilesenleri secin, siralayin, temayi degistirin ve web, tablet, mobil onizlemeleri canli gorun.',
            buttons: [
              {
                id: 'hero-btn-1',
                label: 'Projeyi Incele',
                url: 'https://example.com/start',
                target: '_blank',
                style: 'solid'
              },
              {
                id: 'hero-btn-2',
                label: 'Demo Iste',
                url: 'https://example.com/demo',
                target: '_blank',
                style: 'outline'
              }
            ],
            primaryAction: 'Projeyi Incele',
            secondaryAction: 'Demo Iste',
            imageUrl:
              'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
          },
          {
            id: 'block-features',
            type: 'features',
            title: 'Highlights',
            layout: 'grid-3',
            animation: 'fade-in',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: '',
            linkUrl: '',
            linkTarget: '_self',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'full',
            minHeight: 0,
            items: [
              {
                title: 'Generic component library',
                body: 'Yeni component tiplerini ileride sisteme kolayca ekleyebileceginiz yapi.',
                imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
                linkUrl: '/component-library',
                linkTarget: '_self'
              },
              {
                title: 'Theme presets',
                body: 'Hazir tema secin veya renk, font, golge ve radius degerlerini ozellestirin.',
                imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
                linkUrl: '/themes',
                linkTarget: '_self'
              },
              {
                title: 'Publication review',
                body: 'Admin yayina gonderir, superadmin belirli sureyle yayina alir.',
                imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
                linkUrl: '/review-flow',
                linkTarget: '_self'
              }
            ]
          },
          {
            id: 'block-widget-accordion',
            type: 'widget',
            title: 'SSS Accordion',
            layout: 'stack',
            animation: 'fade-up',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: 'Tum sorular',
            linkUrl: 'https://example.com/faq',
            linkTarget: '_blank',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'medium',
            minHeight: 0,
            widgetKind: 'accordion',
            subtitle: 'Sik sorulan sorular',
            body: 'Yayinlama, tema ozellestirme ve mobil gorunum gibi konulari acilir paneller icinde sunun.',
            actionLabel: 'Detay',
            actionUrl: '',
            actionStyle: 'outline',
            menuOpenMode: 'click',
            menuRadius: 18,
            imageUrl: '',
            items: ['Yayin sureci nasil isliyor?', 'Yeni componentleri nasil eklerim?', 'Firebase nasil baglanir?'],
            detailItems: [
              'Admin, projeyi superadmin onayina gonderir ve belirlenen sure boyunca yayinda kalir.',
              'Katalog yapisina yeni widget tanimi eklenerek sistem buyutulebilir.',
              'Firebase Auth, Firestore ve Storage sonraki asamada dogrudan baglanabilir.'
            ],
            numericValues: [72, 64, 90],
            mediaUrls: [],
            linkUrls: ['', '', ''],
            value: 72,
            variant: 'single'
          },
          {
            id: 'block-widget-form',
            type: 'widget',
            title: 'Iletisim Formu',
            layout: 'grid-2',
            animation: 'slide-left',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: 'Destek ekibi',
            linkUrl: 'mailto:hello@example.com',
            linkTarget: '_self',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'full',
            minHeight: 0,
            widgetKind: 'forms',
            subtitle: 'Lead toplama alani',
            body: 'Input, select, textarea, checkbox ve dosya yukleme alanlarini formlar kategorisiyle ekleyin.',
            actionLabel: 'Teklif Al',
            actionUrl: 'https://example.com/offer',
            actionStyle: 'solid',
            menuOpenMode: 'click',
            menuRadius: 18,
            imageUrl: '',
            items: ['Ad Soyad', 'E-posta', 'Sektor', 'Mesaj'],
            detailItems: ['text', 'email', 'select', 'textarea'],
            numericValues: [25, 50, 75, 100],
            mediaUrls: [],
            linkUrls: ['Adinizi girin', 'ornek@site.com', 'Sektor secin', 'Mesajinizi yazin'],
            value: 48,
            variant: 'stacked'
          },
          {
            id: 'block-pricing',
            type: 'table',
            title: 'Pricing Table',
            layout: 'stack',
            animation: 'zoom-in',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: '',
            linkUrl: '',
            linkTarget: '_self',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'full',
            minHeight: 0,
            columns: ['Plan', 'Aylik', 'Destek'],
            rows: [
              { cells: ['Starter', '499 TL', 'E-posta'] },
              { cells: ['Growth', '899 TL', 'Oncelikli'] },
              { cells: ['Scale', '1499 TL', 'Ozel kanal'] }
            ]
          },
          {
            id: 'block-cta',
            type: 'cta',
            title: 'CTA',
            layout: 'stack',
            animation: 'fade-up',
            fontStyle: 'bold',
            textAlign: 'center',
            linkLabel: 'Builderi Ac',
            linkUrl: 'https://example.com/start',
            linkTarget: '_blank',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'medium',
            minHeight: 0,
            heading: 'Sitenizi dakikalar icinde tasarlamaya baslayin.',
            body: 'Tum bilesenleri panelden yonetin, duzeni degistirin ve yayin oncesi onaya gonderin.',
            actionLabel: "Builder'i Ac",
            actionUrl: 'https://example.com/start',
            actionTarget: '_blank',
            actionStyle: 'solid'
          }
        ]
      },
      {
        id: 'page-services',
        name: 'Services',
        slug: 'services',
        localizedSlugs: {
          tr: 'hizmetler',
          en: 'services'
        },
        blocks: [
          {
            id: 'block-text-services',
            type: 'text',
            title: 'Service Intro',
            layout: 'stack',
            animation: 'fade-in',
            fontStyle: 'italic',
            textAlign: 'left',
            linkLabel: 'Portfoyu Gor',
            linkUrl: 'https://example.com/portfolio',
            linkTarget: '_blank',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'medium',
            minHeight: 0,
            body: 'Bu sayfa, kullanicilarin yeni route olusturup farkli icerikleri farkli sayfalara dagitabildigini gostermek icin eklendi.'
          },
          {
            id: 'block-widget-gallery',
            type: 'widget',
            title: 'Proje Galerisi',
            layout: 'grid-3',
            animation: 'zoom-in',
            fontStyle: 'normal',
            textAlign: 'left',
            linkLabel: 'Tum galeriyi ac',
            linkUrl: 'https://example.com/gallery',
            linkTarget: '_blank',
            backgroundColor: '#fffdf8',
            textColor: '#1f2937',
            accentColor: '#d97706',
            widthPreset: 'full',
            minHeight: 0,
            widgetKind: 'gallery',
            subtitle: 'Referanslar',
            body: 'Galeriler, carouseller ve image componentleri ile projelerinizi vitrine cikarabilirsiniz.',
            actionLabel: 'Detay',
            actionUrl: '',
            actionStyle: 'outline',
            menuOpenMode: 'click',
            menuRadius: 18,
            imageUrl:
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
            items: ['Kurumsal Site', 'Landing Page', 'Etkinlik Sayfasi'],
            detailItems: ['Kurumsal paket', 'Kampanya paketi', 'Etkinlik paketi'],
            numericValues: [24, 48, 72],
            mediaUrls: [
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80'
            ],
            linkUrls: ['/kurumsal-site', '/landing-page', '/etkinlik-sayfasi'],
            value: 84,
            variant: 'masonry'
          }
        ]
      }
    ]
  }
];
