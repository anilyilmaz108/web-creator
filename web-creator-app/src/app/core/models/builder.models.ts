export type SiteStatus = 'draft' | 'pending' | 'published';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type BlockType = 'hero' | 'text' | 'features' | 'table' | 'image' | 'cta';

export interface ThemeConfig {
  name: string;
  fontFamily: string;
  headingFontFamily: string;
  surface: string;
  background: string;
  foreground: string;
  accent: string;
  cardRadius: number;
}

export interface TableRow {
  label: string;
  value: string;
}

export interface BlockBase {
  id: string;
  type: BlockType;
  title: string;
  layout: 'stack' | 'split' | 'grid-2' | 'grid-3';
}

export interface HeroBlock extends BlockBase {
  type: 'hero';
  eyebrow: string;
  heading: string;
  body: string;
  primaryAction: string;
  secondaryAction: string;
  imageUrl: string;
}

export interface TextBlock extends BlockBase {
  type: 'text';
  body: string;
}

export interface FeaturesBlock extends BlockBase {
  type: 'features';
  items: Array<{ title: string; body: string }>;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  columns: string[];
  rows: TableRow[];
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  imageUrl: string;
  caption: string;
}

export interface CtaBlock extends BlockBase {
  type: 'cta';
  heading: string;
  body: string;
  actionLabel: string;
}

export type PageBlock =
  | HeroBlock
  | TextBlock
  | FeaturesBlock
  | TableBlock
  | ImageBlock
  | CtaBlock;

export interface SitePage {
  id: string;
  name: string;
  slug: string;
  blocks: PageBlock[];
}

export interface PublicationSettings {
  requestedAt?: string;
  approvedAt?: string;
  approvedUntil?: string;
}

export interface SiteProject {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: SiteStatus;
  theme: ThemeConfig;
  pages: SitePage[];
  selectedPageId: string;
  publication: PublicationSettings;
}
