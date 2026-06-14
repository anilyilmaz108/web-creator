export type SiteStatus = 'draft' | 'pending' | 'published';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type LayoutMode = 'stack' | 'split' | 'grid-2' | 'grid-3' | 'grid-4';
export type AnimationPreset = 'none' | 'fade-up' | 'fade-in' | 'zoom-in' | 'slide-left';
export type HoverEffectPreset = 'none' | 'lift' | 'grow' | 'glow' | 'tilt';
export type FontStylePreset = 'normal' | 'bold' | 'italic' | 'bold-italic';
export type TextAlignPreset = 'left' | 'center' | 'right';
export type WidthPreset = 'full' | 'wide' | 'medium' | 'narrow';
export type LinkTarget = '_self' | '_blank';
export type ActionButtonStyle = 'solid' | 'outline' | 'ghost';
export type MenuOpenMode = 'click' | 'hover';
export type BlockType = 'hero' | 'text' | 'features' | 'table' | 'image' | 'cta' | 'widget';

export type WidgetKind =
  | 'accordion'
  | 'alerts'
  | 'avatar'
  | 'badge'
  | 'banner'
  | 'bottom-navigation'
  | 'breadcrumb'
  | 'buttons'
  | 'button-group'
  | 'card'
  | 'carousel'
  | 'chat-bubble'
  | 'clipboard'
  | 'datepicker'
  | 'device-mockups'
  | 'drawer'
  | 'dropdowns'
  | 'footer'
  | 'forms'
  | 'gallery'
  | 'indicators'
  | 'jumbotron'
  | 'kbd'
  | 'list-group'
  | 'mega-menu'
  | 'modal'
  | 'navbar'
  | 'pagination'
  | 'popover'
  | 'progress'
  | 'rating'
  | 'sidebar'
  | 'skeleton'
  | 'speed-dial'
  | 'spinner'
  | 'stepper'
  | 'tables'
  | 'tabs'
  | 'timeline'
  | 'toast'
  | 'tooltips'
  | 'typography'
  | 'qr-code'
  | 'video'
  | 'input-field'
  | 'file-input'
  | 'search-input'
  | 'number-input'
  | 'phone-input'
  | 'select'
  | 'textarea'
  | 'timepicker'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'range'
  | 'floating-label'
  | 'headings'
  | 'paragraphs'
  | 'blockquote'
  | 'images'
  | 'lists'
  | 'links'
  | 'text'
  | 'hr'
  | 'charts'
  | 'datatables';

export interface ThemeConfig {
  name: string;
  fontFamily: string;
  headingFontFamily: string;
  surface: string;
  surfaceAlt: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  cardRadius: number;
  pageWidth: number;
  sectionGap: number;
  shadowStyle: 'soft' | 'medium' | 'strong';
}

export interface TableRow {
  cells: string[];
}

export interface ActionButton {
  id: string;
  label: string;
  url: string;
  target: LinkTarget;
  style: ActionButtonStyle;
}

export interface BlockBase {
  id: string;
  type: BlockType;
  title: string;
  layout: LayoutMode;
  animation: AnimationPreset;
  animationDuration?: number;
  animationDelay?: number;
  hoverEffect?: HoverEffectPreset;
  contentAnimation?: AnimationPreset;
  mediaAnimation?: AnimationPreset;
  fontStyle: FontStylePreset;
  textAlign: TextAlignPreset;
  linkLabel: string;
  linkUrl: string;
  linkTarget: LinkTarget;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundOverlay?: number;
  textColor: string;
  accentColor: string;
  widthPreset: WidthPreset;
  minHeight: number;
}

export interface HeroBlock extends BlockBase {
  type: 'hero';
  eyebrow: string;
  heading: string;
  body: string;
  buttons: ActionButton[];
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
  items: Array<{ title: string; body: string; imageUrl: string; linkUrl: string; linkTarget: LinkTarget }>;
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
  altText: string;
}

export interface CtaBlock extends BlockBase {
  type: 'cta';
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  actionTarget: LinkTarget;
  actionStyle: ActionButtonStyle;
}

export interface WidgetBlock extends BlockBase {
  type: 'widget';
  widgetKind: WidgetKind;
  subtitle: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  actionStyle: ActionButtonStyle;
  menuOpenMode: MenuOpenMode;
  menuRadius: number;
  imageUrl: string;
  items: string[];
  detailItems: string[];
  numericValues: number[];
  mediaUrls: string[];
  linkUrls: string[];
  value: number;
  variant: string;
}

export type PageBlock =
  | HeroBlock
  | TextBlock
  | FeaturesBlock
  | TableBlock
  | ImageBlock
  | CtaBlock
  | WidgetBlock;

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
