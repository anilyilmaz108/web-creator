import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

import {
  ActionButton,
  PageBlock,
  SitePage,
  ThemeConfig,
  ViewportMode,
  WidgetBlock,
  WidgetKind
} from '../../../core/models/builder.models';

@Component({
  selector: 'app-site-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-renderer.component.html',
  styleUrl: './site-renderer.component.scss'
})
export class SiteRendererComponent {
  @Input({ required: true }) page!: SitePage;
  @Input({ required: true }) theme!: ThemeConfig;
  @Input() viewport: ViewportMode = 'desktop';
  @Input() interactive = false;
  @Input() selectedBlockId: string | null = null;
  @Input() mode: 'builder' | 'demo' | 'public' = 'builder';

  private readonly widgetState = signal<Record<string, number>>({});
  private readonly modalState = signal<Record<string, boolean>>({});

  trackByBlockId(_index: number, block: PageBlock): string {
    return block.id;
  }

  featureGridClass(layout: PageBlock['layout']): string {
    switch (layout) {
      case 'grid-4':
        return this.viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
      case 'grid-3':
        return this.viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
      case 'grid-2':
        return this.viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
      default:
        return 'grid-cols-1';
    }
  }

  heroLayoutClass(layout: PageBlock['layout']): string {
    if (layout !== 'split' || this.viewport === 'mobile') {
      return 'grid-cols-1';
    }

    return 'grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]';
  }

  textAlignClass(value: PageBlock['textAlign']): string {
    return {
      left: 'text-left items-start',
      center: 'text-center items-center',
      right: 'text-right items-end'
    }[value];
  }

  fontStyleClass(value: PageBlock['fontStyle']): string {
    return {
      normal: 'font-normal not-italic',
      bold: 'font-bold not-italic',
      italic: 'font-normal italic',
      'bold-italic': 'font-bold italic'
    }[value];
  }

  animationClass(value: PageBlock['animation']): string {
    return {
      none: '',
      'fade-up': 'animate-[fadeUp_.55s_ease-out]',
      'fade-in': 'animate-[fadeIn_.45s_ease-out]',
      'zoom-in': 'animate-[zoomIn_.45s_ease-out]',
      'slide-left': 'animate-[slideLeft_.5s_ease-out]'
    }[value];
  }

  animationDuration(block: PageBlock): string | null {
    const value = block.animationDuration ?? 550;
    return value > 0 ? `${value}ms` : null;
  }

  animationDelay(block: PageBlock): string | null {
    const value = block.animationDelay ?? 0;
    return value > 0 ? `${value}ms` : null;
  }

  hoverEffectClass(block: PageBlock): string {
    return {
      none: '',
      lift: 'block-hover-lift',
      grow: 'block-hover-grow',
      glow: 'block-hover-glow',
      tilt: 'block-hover-tilt'
    }[block.hoverEffect ?? 'lift'];
  }

  contentAnimationClass(block: PageBlock): string {
    return this.animationClass(block.contentAnimation ?? 'none');
  }

  mediaAnimationClass(block: PageBlock): string {
    return this.animationClass(block.mediaAnimation ?? 'none');
  }

  backgroundImageStyle(block: PageBlock): string | null {
    if (!block.backgroundImageUrl) {
      return null;
    }

    const overlayOpacity = Math.max(0, Math.min(90, block.backgroundOverlay ?? 18)) / 100;
    return `linear-gradient(rgba(15,23,42,${overlayOpacity}), rgba(15,23,42,${overlayOpacity})), url(${block.backgroundImageUrl})`;
  }

  widgetMode(kind: WidgetKind): 'content' | 'form' | 'media' | 'navigation' | 'feedback' | 'data' | 'utility' {
    if (
      [
        'forms',
        'input-field',
        'file-input',
        'search-input',
        'number-input',
        'phone-input',
        'select',
        'textarea',
        'timepicker',
        'datepicker',
        'checkbox',
        'radio',
        'toggle',
        'range',
        'floating-label'
      ].includes(kind)
    ) {
      return 'form';
    }

    if (['gallery', 'carousel', 'device-mockups', 'video', 'images', 'avatar'].includes(kind)) {
      return 'media';
    }

    if (
      [
        'navbar',
        'sidebar',
        'bottom-navigation',
        'breadcrumb',
        'mega-menu',
        'drawer',
        'dropdowns',
        'pagination',
        'tabs',
        'stepper'
      ].includes(kind)
    ) {
      return 'navigation';
    }

    if (
      [
        'alerts',
        'banner',
        'toast',
        'badge',
        'progress',
        'rating',
        'spinner',
        'skeleton',
        'popover',
        'tooltips',
        'modal',
        'speed-dial',
        'indicators'
      ].includes(kind)
    ) {
      return 'feedback';
    }

    if (['charts', 'datatables', 'tables', 'timeline', 'qr-code'].includes(kind)) {
      return 'data';
    }

    if (['clipboard', 'kbd', 'links', 'hr'].includes(kind)) {
      return 'utility';
    }

    return 'content';
  }

  qrMatrix(): number[] {
    return Array.from({ length: 49 }, (_, index) => index);
  }

  isQrActive(index: number): boolean {
    return [0, 1, 2, 5, 7, 8, 12, 14, 18, 20, 21, 24, 28, 30, 31, 35, 36, 40, 42, 45, 48].includes(index);
  }

  widgetLink(block: PageBlock): string {
    return block.linkLabel || 'Detay';
  }

  actionButtonClasses(button: ActionButton): string {
    return {
      solid: 'text-white shadow-lg',
      outline: 'border bg-transparent',
      ghost: 'bg-transparent'
    }[button.style];
  }

  widgetFieldType(block: WidgetBlock, index: number): string {
    if (block.detailItems[index]) {
      return block.detailItems[index];
    }

    switch (block.widgetKind) {
      case 'forms':
      case 'input-field':
      case 'search-input':
        return 'text';
      case 'number-input':
        return 'number';
      case 'phone-input':
        return 'phone';
      case 'select':
        return 'select';
      case 'textarea':
        return 'textarea';
      case 'timepicker':
        return 'time';
      case 'datepicker':
        return 'date';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'toggle':
        return 'checkbox';
      case 'range':
        return 'range';
      case 'file-input':
        return 'file';
      default:
        return 'text';
    }
  }

  widgetPlaceholder(block: WidgetBlock, index: number): string {
    return block.linkUrls[index] || block.items[index] || 'Deger girin';
  }

  widgetChoices(block: WidgetBlock, index: number): string[] {
    const raw = block.mediaUrls[index] ?? '';
    const parsed = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return parsed.length ? parsed : [block.items[index] || 'Secenek 1'];
  }

  widgetMenuChildren(block: WidgetBlock, index: number): Array<{ label: string; url: string }> {
    const raw = block.mediaUrls[index] ?? '';
    const parsed = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url = ''] = line.split('::');
        return { label: label.trim(), url: url.trim() };
      })
      .filter((item) => item.label);

    return parsed;
  }

  menuRadius(block: WidgetBlock): number {
    return Math.max(0, block.menuRadius || this.theme.cardRadius || 18);
  }

  menuSubRadius(block: WidgetBlock): number {
    return Math.max(0, this.menuRadius(block) - 6);
  }

  menuInnerRadius(block: WidgetBlock, offset = 0): number {
    return Math.max(0, this.menuSubRadius(block) + offset);
  }

  menuUsesHover(block: WidgetBlock): boolean {
    return block.menuOpenMode === 'hover';
  }

  isMenuOpen(block: WidgetBlock, index: number): boolean {
    return this.widgetState()[block.id] === index;
  }

  openMenu(block: WidgetBlock, index: number): void {
    if (!this.interactive) {
      return;
    }

    if (this.menuUsesHover(block)) {
      this.setIndex(block.id, index);
      return;
    }

    const current = this.widgetState()[block.id];
    this.widgetState.update((state) => ({ ...state, [block.id]: current === index ? -1 : index }));
  }

  hoverMenu(block: WidgetBlock, index: number): void {
    if (!this.interactive || !this.menuUsesHover(block)) {
      return;
    }

    this.setIndex(block.id, index);
  }

  closeHoverMenu(block: WidgetBlock): void {
    if (!this.interactive || !this.menuUsesHover(block)) {
      return;
    }

    this.setIndex(block.id, -1);
  }

  widgetMediaUrl(block: WidgetBlock, index: number): string {
    return block.mediaUrls[index] || block.imageUrl;
  }

  ratingStars(value: number): string {
    const stars = Math.max(1, Math.min(5, Math.round(value / 20)));
    return '★'.repeat(stars);
  }

  chartValue(block: WidgetBlock, index: number): number {
    return Math.max(0, Math.min(100, block.numericValues[index] ?? 0));
  }

  chartHeight(block: WidgetBlock, index: number): number {
    return Math.max(this.chartValue(block, index), 8);
  }

  chartPointX(index: number, total: number): number {
    if (total <= 1) {
      return 50;
    }

    return 10 + (index * 80) / (total - 1);
  }

  chartPointY(value: number): number {
    return 92 - Math.max(0, Math.min(100, value)) * 0.74;
  }

  chartPolyline(block: WidgetBlock): string {
    const total = Math.max(block.items.length, 1);
    return block.items
      .map((_, index) => `${this.chartPointX(index, total)},${this.chartPointY(this.chartValue(block, index))}`)
      .join(' ');
  }

  chartArea(block: WidgetBlock): string {
    const total = Math.max(block.items.length, 1);
    const line = this.chartPolyline(block);
    return `10,92 ${line} ${this.chartPointX(total - 1, total)},92`;
  }

  currentIndex(blockId: string): number {
    return this.widgetState()[blockId] ?? 0;
  }

  toggleIndex(blockId: string, index: number): void {
    const current = this.currentIndex(blockId);
    this.widgetState.update((state) => ({ ...state, [blockId]: current === index ? -1 : index }));
  }

  setIndex(blockId: string, index: number): void {
    this.widgetState.update((state) => ({ ...state, [blockId]: index }));
  }

  nextIndex(blockId: string, length: number): void {
    const next = (this.currentIndex(blockId) + 1) % Math.max(length, 1);
    this.setIndex(blockId, next);
  }

  previousIndex(blockId: string, length: number): void {
    const safeLength = Math.max(length, 1);
    const next = (this.currentIndex(blockId) - 1 + safeLength) % safeLength;
    this.setIndex(blockId, next);
  }

  isModalOpen(blockId: string): boolean {
    return this.modalState()[blockId] ?? false;
  }

  toggleModal(blockId: string, value?: boolean): void {
    const next = value ?? !this.isModalOpen(blockId);
    this.modalState.update((state) => ({ ...state, [blockId]: next }));
  }

  asWidget(block: PageBlock): WidgetBlock {
    return block as WidgetBlock;
  }

  widthClass(value: PageBlock['widthPreset']): string {
    return {
      full: 'w-full',
      wide: 'w-full lg:w-[88%] lg:mx-auto',
      medium: 'w-full lg:w-[72%] lg:mx-auto',
      narrow: 'w-full lg:w-[56%] lg:mx-auto'
    }[value];
  }
}
