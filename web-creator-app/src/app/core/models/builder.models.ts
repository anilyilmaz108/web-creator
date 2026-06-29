export type SiteStatus = 'draft' | 'pending' | 'published' | 'paused' | 'expired';
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
export type SiteAccessMode = 'public' | 'login' | 'signup';
export type PublicationRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type HostingProvider = 'firebase' | 'external';
export type HostingStatus = 'draft' | 'provisioning' | 'active' | 'paused' | 'expired';
export type AuditLogLevel = 'info' | 'warning' | 'success' | 'danger';
export type ChecklistStatus = 'pass' | 'warning' | 'fail';
export type DeployStrategy = 'shared-route' | 'dedicated-hosting';

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
  buttonStyle?: 'rounded' | 'pill' | 'sharp';
  cardStyle?: 'flat' | 'outlined' | 'elevated';
  spacingScale?: 'compact' | 'comfortable' | 'spacious';
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
  localizedSlugs: Record<string, string>;
  blocks: PageBlock[];
}

export interface LanguageConfig {
  id: string;
  code: string;
  label: string;
  pathPrefix: string;
  enabled: boolean;
  isDefault: boolean;
}

export interface SiteAccessSettings {
  mode: SiteAccessMode;
  allowSelfRegistration: boolean;
  loginTitle: string;
  gatedMessage: string;
}

export interface HostingTarget {
  id: string;
  name: string;
  provider: HostingProvider;
  firebaseProjectId: string;
  firebaseSiteId: string;
  defaultUrl: string;
  customDomain: string;
  status: HostingStatus;
  createdAt: string;
  lastPublishedAt?: string;
  domainStatus?: 'not-started' | 'pending-dns' | 'verified' | 'failed';
  dnsInstructions?: string;
}

export interface PublicationSettings {
  requestStatus: PublicationRequestStatus;
  requestedAt?: string;
  requestedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedUntil?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  stoppedAt?: string;
  stoppedBy?: string;
  stopReason?: string;
  hostingTargetId?: string;
  publishedUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  level: AuditLogLevel;
  createdAt: string;
  actorId: string;
  actorName: string;
  siteId?: string;
  siteName?: string;
  details: string;
}

export interface SeoSettings {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  altText: string;
  type: 'image' | 'video' | 'document';
  sizeKb: number;
  width?: number;
  height?: number;
  optimized: boolean;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  formName: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'closed';
  values: Record<string, string>;
}

export interface SiteMetrics {
  views: number;
  visitors: number;
  leads: number;
  conversionRate: number;
  updatedAt: string;
}

export interface SiteCostPolicy {
  deployStrategy: DeployStrategy;
  mediaLimitMb: number;
  auditRetentionDays: number;
  monthlyFunctionBudget: number;
  summaryFirstReads: boolean;
}

export interface PublicationChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  details: string;
}

export interface CostAlert {
  id: string;
  siteId: string;
  siteName: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  details: string;
  blocking: boolean;
}

export interface SiteVersionSnapshot {
  id: string;
  name: string;
  createdAt: string;
  actorId: string;
  reason: string;
  snapshot: string;
}

export interface SiteProject {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerUid?: string;
  status: SiteStatus;
  theme: ThemeConfig;
  access: SiteAccessSettings;
  seo: SeoSettings;
  mediaAssets: MediaAsset[];
  formSubmissions: FormSubmission[];
  metrics: SiteMetrics;
  costPolicy: SiteCostPolicy;
  versionHistory: SiteVersionSnapshot[];
  languages: LanguageConfig[];
  hostingTargets: HostingTarget[];
  pages: SitePage[];
  selectedPageId: string;
  publication: PublicationSettings;
  updatedAt?: string;
}
