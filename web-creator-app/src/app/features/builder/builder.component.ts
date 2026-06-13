import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CatalogItem } from '../../core/data/component-catalog';
import {
  ActionButtonStyle,
  AnimationPreset,
  FontStylePreset,
  LayoutMode,
  PageBlock,
  TextAlignPreset,
  ThemeConfig,
  ViewportMode,
  WidthPreset
} from '../../core/models/builder.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor/rich-text-editor.component';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SiteRendererComponent, RichTextEditorComponent],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss'
})
export class BuilderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(MockAuthService);

  readonly store = inject(SiteBuilderStore);
  readonly currentUser = this.auth.currentUser;
  readonly selectedSite = this.store.selectedSite;
  readonly selectedPage = this.store.selectedPage;
  readonly selectedBlock = this.store.selectedBlock;
  readonly viewport = this.store.viewport;
  readonly presetThemes = this.store.themePresets;
  readonly viewports: ViewportMode[] = ['desktop', 'tablet', 'mobile'];
  readonly viewportOptions = [
    { value: 'desktop' as ViewportMode, label: 'Web', size: '1440px', description: 'Tarayici gorunumu' },
    { value: 'tablet' as ViewportMode, label: 'Tablet', size: '820px', description: 'Tablet kasasi' },
    { value: 'mobile' as ViewportMode, label: 'Mobil', size: '390px', description: 'Telefon cercevesi' }
  ];
  readonly canRequestPublication = computed(() =>
    ['admin', 'moderator'].includes(this.currentUser()?.role ?? '')
  );

  readonly baseBlockTypes = [
    { type: 'hero', label: 'Hero', hint: 'Kapak ve aksiyon alani' },
    { type: 'text', label: 'Text', hint: 'Paragraf ve aciklama' },
    { type: 'features', label: 'Cards', hint: '2li veya 3lu kartlar' },
    { type: 'table', label: 'Table', hint: 'Paket veya veri tablosu' },
    { type: 'image', label: 'Image', hint: 'Tekil gorsel sunumu' },
    { type: 'cta', label: 'CTA', hint: 'Donusum odakli alan' }
  ] as const;

  readonly layoutOptions: LayoutMode[] = ['stack', 'split', 'grid-2', 'grid-3', 'grid-4'];
  readonly widthOptions: WidthPreset[] = ['full', 'wide', 'medium', 'narrow'];
  readonly animationOptions: AnimationPreset[] = ['none', 'fade-up', 'fade-in', 'zoom-in', 'slide-left'];
  readonly fontStyleOptions: FontStylePreset[] = ['normal', 'bold', 'italic', 'bold-italic'];
  readonly textAlignOptions: TextAlignPreset[] = ['left', 'center', 'right'];
  readonly buttonStyleOptions: ActionButtonStyle[] = ['solid', 'outline', 'ghost'];
  readonly formFieldOptions = [
    'text',
    'email',
    'select',
    'textarea',
    'checkbox',
    'radio',
    'number',
    'phone',
    'time',
    'date',
    'range'
  ];
  readonly colorPalette = ['#d97706', '#0f766e', '#38bdf8', '#f43f5e', '#8b5cf6', '#0f172a', '#f8fafc'];
  readonly widgetVariantOptions: Record<string, string[]> = {
    accordion: ['single', 'multiple', 'bordered'],
    charts: ['bar', 'line', 'area'],
    carousel: ['masonry', 'slider', 'cards'],
    gallery: ['masonry', 'grid', 'spotlight'],
    tabs: ['underline', 'pills', 'boxed'],
    forms: ['stacked', 'split', 'compact'],
    modal: ['centered', 'drawer', 'fullscreen'],
    navbar: ['pill', 'underline', 'filled'],
    sidebar: ['stacked', 'boxed', 'minimal'],
    'bottom-navigation': ['filled', 'outline', 'floating']
  };

  newPageName = '';
  catalogSearch = '';
  activeCatalogCategory = 'All';
  draggedBlockId: string | null = null;

  constructor() {
    const siteId = this.route.snapshot.paramMap.get('siteId');
    if (siteId) {
      this.store.selectSite(siteId);
    }
  }

  get catalogCategories(): string[] {
    return ['All', ...new Set(this.store.componentCatalog.map((item) => item.category))];
  }

  get filteredCatalog(): CatalogItem[] {
    const search = this.catalogSearch.trim().toLowerCase();

    return this.store.componentCatalog.filter((item) => {
      const categoryMatch = this.activeCatalogCategory === 'All' || item.category === this.activeCatalogCategory;
      const searchMatch =
        !search ||
        item.label.toLowerCase().includes(search) ||
        item.hint.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      return categoryMatch && searchMatch;
    });
  }

  get blockItemsText(): string {
    const block = this.selectedBlock();
    if (!block || !('items' in block)) {
      return '';
    }

    return block.items.join('\n');
  }

  get blockDetailItemsText(): string {
    const block = this.selectedBlock();
    if (!block || !('detailItems' in block)) {
      return '';
    }

    return block.detailItems.join('\n');
  }

  get blockNumericValuesText(): string {
    const block = this.selectedBlock();
    if (!block || !('numericValues' in block)) {
      return '';
    }

    return block.numericValues.join('\n');
  }

  updateBlockField(field: string, value: string): void {
    const block = this.selectedBlock();
    if (!block) {
      return;
    }

    this.store.updateBlock(block.id, { [field]: value } as Partial<PageBlock>);
  }

  updateBlockNumber(field: string, value: number): void {
    const block = this.selectedBlock();
    if (!block) {
      return;
    }

    this.store.updateBlock(block.id, { [field]: value } as Partial<PageBlock>);
  }

  updateBlockItems(value: string): void {
    const block = this.selectedBlock();
    if (!block || !('items' in block)) {
      return;
    }

    const items = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    this.store.updateBlock(block.id, { items } as Partial<PageBlock>);
  }

  updateBlockDetailItems(value: string): void {
    const block = this.selectedBlock();
    if (!block || !('detailItems' in block)) {
      return;
    }

    const detailItems = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    this.store.updateBlock(block.id, { detailItems } as Partial<PageBlock>);
  }

  updateBlockNumericValues(value: string): void {
    const block = this.selectedBlock();
    if (!block || !('numericValues' in block)) {
      return;
    }

    const numericValues = value
      .split('\n')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));

    this.store.updateBlock(block.id, { numericValues } as Partial<PageBlock>);
  }

  updateThemeField<K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]): void {
    this.store.updateTheme({ [field]: value } as Partial<ThemeConfig>);
  }

  addPage(): void {
    if (!this.newPageName.trim()) {
      return;
    }

    this.store.createPage(this.newPageName.trim());
    this.newPageName = '';
  }

  removePage(pageId: string): void {
    this.store.removePage(pageId);
  }

  requestPublication(): void {
    this.store.requestPublication();
  }

  selectCatalogCategory(category: string): void {
    this.activeCatalogCategory = category;
  }

  addWidget(kind: CatalogItem['kind']): void {
    this.store.addWidget(kind);
  }

  applyThemePalette(color: string): void {
    this.store.updateTheme({ accent: color, accentSoft: `${color}22` });
  }

  applyBlockAccent(color: string): void {
    const block = this.selectedBlock();
    if (!block) {
      return;
    }

    this.store.updateBlock(block.id, { accentColor: color } as Partial<PageBlock>);
  }

  applyBlockBackground(color: string): void {
    const block = this.selectedBlock();
    if (!block) {
      return;
    }

    this.store.updateBlock(block.id, { backgroundColor: color } as Partial<PageBlock>);
  }

  onDragStart(blockId: string): void {
    this.draggedBlockId = blockId;
  }

  onDropBlock(targetIndex: number): void {
    if (!this.draggedBlockId) {
      return;
    }

    this.store.moveBlockToIndex(this.draggedBlockId, targetIndex);
    this.draggedBlockId = null;
  }

  clearDrag(): void {
    this.draggedBlockId = null;
  }

  isWidgetKind(kind: string): boolean {
    const block = this.selectedBlock();
    return block?.type === 'widget' && block.widgetKind === kind;
  }

  widgetVariants(kind: string): string[] {
    return this.widgetVariantOptions[kind] ?? ['default'];
  }

  shouldShowWidgetImageField(kind: string): boolean {
    return ['gallery', 'carousel', 'images', 'video', 'avatar', 'device-mockups'].includes(kind);
  }

  isMediaWidget(kind: string): boolean {
    return ['gallery', 'carousel', 'images', 'video', 'avatar', 'device-mockups'].includes(kind);
  }

  isFormWidget(kind: string): boolean {
    return [
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
    ].includes(kind);
  }

  isNavigationWidget(kind: string): boolean {
    return ['navbar', 'sidebar', 'bottom-navigation', 'breadcrumb', 'dropdowns', 'pagination', 'stepper', 'tabs'].includes(
      kind
    );
  }

  isDataWidget(kind: string): boolean {
    return ['charts', 'datatables', 'tables'].includes(kind);
  }

  shouldShowGenericLinkFields(block: PageBlock): boolean {
    return block.type === 'text' || block.type === 'widget';
  }

  heroButtonIndexes(): number[] {
    const block = this.selectedBlock();
    if (!block || block.type !== 'hero') {
      return [];
    }

    return Array.from({ length: block.buttons.length }, (_, index) => index);
  }

  addHeroButton(): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'hero') {
      return;
    }

    const buttons = [
      ...block.buttons,
      {
        id: `hero-button-${crypto.randomUUID()}`,
        label: `Buton ${block.buttons.length + 1}`,
        url: '',
        target: '_self' as const,
        style: (block.buttons.length === 0 ? 'solid' : 'outline') as ActionButtonStyle
      }
    ];

    this.store.updateBlock(block.id, { buttons } as Partial<PageBlock>);
  }

  removeHeroButton(index: number): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'hero') {
      return;
    }

    const buttons = block.buttons.filter((_, buttonIndex) => buttonIndex !== index);
    this.store.updateBlock(block.id, { buttons } as Partial<PageBlock>);
  }

  updateHeroButtonField(index: number, field: 'label' | 'url' | 'target' | 'style', value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'hero') {
      return;
    }

    const buttons = block.buttons.map((button, buttonIndex) =>
      buttonIndex === index ? { ...button, [field]: value } : button
    );
    this.store.updateBlock(block.id, { buttons } as Partial<PageBlock>);
  }

  featureIndexes(): number[] {
    const block = this.selectedBlock();
    if (!block || block.type !== 'features') {
      return [];
    }

    return Array.from({ length: block.items.length }, (_, index) => index);
  }

  addFeatureItem(): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'features') {
      return;
    }

    const items = [...block.items, { title: `Kart ${block.items.length + 1}`, body: 'Aciklama' }];
    this.store.updateBlock(block.id, { items } as Partial<PageBlock>);
  }

  removeFeatureItem(index: number): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'features') {
      return;
    }

    const items = block.items.filter((_, itemIndex) => itemIndex !== index);
    this.store.updateBlock(block.id, { items } as Partial<PageBlock>);
  }

  updateFeatureItem(index: number, field: 'title' | 'body', value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'features') {
      return;
    }

    const items = block.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item));
    this.store.updateBlock(block.id, { items } as Partial<PageBlock>);
  }

  tableRowIndexes(): number[] {
    const block = this.selectedBlock();
    if (!block || block.type !== 'table') {
      return [];
    }

    return Array.from({ length: block.rows.length }, (_, index) => index);
  }

  addTableRow(): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'table') {
      return;
    }

    const rows = [...block.rows, { label: `Satir ${block.rows.length + 1}`, value: 'Icerik' }];
    this.store.updateBlock(block.id, { rows } as Partial<PageBlock>);
  }

  removeTableRow(index: number): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'table') {
      return;
    }

    const rows = block.rows.filter((_, rowIndex) => rowIndex !== index);
    this.store.updateBlock(block.id, { rows } as Partial<PageBlock>);
  }

  updateTableRow(index: number, field: 'label' | 'value', value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'table') {
      return;
    }

    const rows = block.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row));
    this.store.updateBlock(block.id, { rows } as Partial<PageBlock>);
  }

  updateTableColumn(index: number, value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'table') {
      return;
    }

    const columns = [...block.columns];
    columns[index] = value;
    this.store.updateBlock(block.id, { columns } as Partial<PageBlock>);
  }

  widgetRowIndexes(): number[] {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return [];
    }

    return Array.from({ length: block.items.length }, (_, index) => index);
  }

  updateWidgetRowTitle(index: number, value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    const items = [...block.items];
    items[index] = value;
    this.store.updateBlock(block.id, { items } as Partial<PageBlock>);
  }

  updateWidgetRowDetail(index: number, value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    const detailItems = [...block.detailItems];
    detailItems[index] = value;
    this.store.updateBlock(block.id, { detailItems } as Partial<PageBlock>);
  }

  updateWidgetRowValue(index: number, value: number): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    const numericValues = [...block.numericValues];
    numericValues[index] = value;
    this.store.updateBlock(block.id, { numericValues } as Partial<PageBlock>);
  }

  updateWidgetRowMediaUrl(index: number, value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    const mediaUrls = [...block.mediaUrls];
    mediaUrls[index] = value;
    this.store.updateBlock(block.id, { mediaUrls } as Partial<PageBlock>);
  }

  updateWidgetRowLinkUrl(index: number, value: string): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    const linkUrls = [...block.linkUrls];
    linkUrls[index] = value;
    this.store.updateBlock(block.id, { linkUrls } as Partial<PageBlock>);
  }

  addWidgetRow(): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    this.store.updateBlock(block.id, {
      items: [...block.items, `Eleman ${block.items.length + 1}`],
      detailItems: [...block.detailItems, ''],
      numericValues: [...block.numericValues, 0],
      mediaUrls: [...block.mediaUrls, ''],
      linkUrls: [...block.linkUrls, '']
    } as Partial<PageBlock>);
  }

  removeWidgetRow(index: number): void {
    const block = this.selectedBlock();
    if (!block || block.type !== 'widget') {
      return;
    }

    this.store.updateBlock(block.id, {
      items: block.items.filter((_, itemIndex) => itemIndex !== index),
      detailItems: block.detailItems.filter((_, itemIndex) => itemIndex !== index),
      numericValues: block.numericValues.filter((_, itemIndex) => itemIndex !== index),
      mediaUrls: block.mediaUrls.filter((_, itemIndex) => itemIndex !== index),
      linkUrls: block.linkUrls.filter((_, itemIndex) => itemIndex !== index)
    } as Partial<PageBlock>);
  }
}
