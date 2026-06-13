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
    background: '#f3ecdf',
    foreground: '#1f2937',
    accent: '#d97706',
    cardRadius: 24
  },
  {
    name: 'Ocean Board',
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    headingFontFamily: '"Sora", "Segoe UI", sans-serif',
    surface: '#f4fbff',
    background: '#d8eef8',
    foreground: '#102a43',
    accent: '#0f766e',
    cardRadius: 20
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
    publication: {},
    pages: [
      {
        id: 'page-home',
        name: 'Home',
        slug: 'home',
        blocks: [
          {
            id: 'block-hero',
            type: 'hero',
            title: 'Hero',
            layout: 'split',
            eyebrow: 'Creative website builder',
            heading: 'Markanıza özel siteleri sürükle-bırak mantığıyla oluşturun.',
            body: 'Admin panelinden bileşenleri seçin, sıralayın, temayı değiştirin ve web, tablet, mobil önizlemeleri canlı görün.',
            primaryAction: 'Projeyi İncele',
            secondaryAction: 'Demo İste',
            imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
          },
          {
            id: 'block-features',
            type: 'features',
            title: 'Highlights',
            layout: 'grid-3',
            items: [
              {
                title: 'Generic component library',
                body: 'Yeni component tiplerini ileride sisteme kolayca ekleyebileceğiniz yapı.'
              },
              {
                title: 'Theme presets',
                body: 'Hazır tema seçin veya renk, font ve radius değerlerini özelleştirin.'
              },
              {
                title: 'Publication review',
                body: 'Admin yayına gönderir, superadmin belirli süreyle yayına alır.'
              }
            ]
          },
          {
            id: 'block-pricing',
            type: 'table',
            title: 'Pricing Table',
            layout: 'stack',
            columns: ['Plan', 'Aylık', 'Destek'],
            rows: [
              { label: 'Starter', value: '499 TL / E-posta' },
              { label: 'Growth', value: '899 TL / Öncelikli' },
              { label: 'Scale', value: '1499 TL / Özel kanal' }
            ]
          },
          {
            id: 'block-cta',
            type: 'cta',
            title: 'CTA',
            layout: 'stack',
            heading: 'Sitenizi dakikalar içinde tasarlamaya başlayın.',
            body: 'Tüm bileşenleri panelden yönetin, düzeni değiştirin ve yayın öncesi onaya gönderin.',
            actionLabel: "Builder'i Ac"
          }
        ]
      },
      {
        id: 'page-services',
        name: 'Services',
        slug: 'services',
        blocks: [
          {
            id: 'block-text-services',
            type: 'text',
            title: 'Service Intro',
            layout: 'stack',
            body: 'Bu sayfa, kullanıcıların yeni route oluşturup farklı içerikleri farklı sayfalara dağıtabildiğini göstermek için eklendi.'
          }
        ]
      }
    ]
  }
];
