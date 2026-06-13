import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageBlock, ThemeConfig, ViewportMode } from '../../core/models/builder.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SiteRendererComponent],
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
    {
      value: 'desktop' as ViewportMode,
      label: 'Web',
      size: '1440px',
      description: 'Tarayici gorunumu'
    },
    {
      value: 'tablet' as ViewportMode,
      label: 'Tablet',
      size: '820px',
      description: 'Tablet kasasi'
    },
    {
      value: 'mobile' as ViewportMode,
      label: 'Mobil',
      size: '390px',
      description: 'Telefon cercevesi'
    }
  ];
  readonly canRequestPublication = computed(() =>
    ['admin', 'moderator'].includes(this.currentUser()?.role ?? '')
  );

  readonly blockTypes = [
    { type: 'hero', label: 'Hero', hint: 'Kapak ve aksiyon alani' },
    { type: 'text', label: 'Text', hint: 'Paragraf ve aciklama' },
    { type: 'features', label: 'Cards', hint: '2li veya 3lu kartlar' },
    { type: 'table', label: 'Table', hint: 'Paket veya veri tablosu' },
    { type: 'image', label: 'Image', hint: 'Tekil gorsel sunumu' },
    { type: 'cta', label: 'CTA', hint: 'Donusum odakli alan' }
  ] as const;

  newPageName = '';

  constructor() {
    const siteId = this.route.snapshot.paramMap.get('siteId');
    if (siteId) {
      this.store.selectSite(siteId);
    }
  }

  updateBlockField(field: string, value: string): void {
    const block = this.selectedBlock();
    if (!block) {
      return;
    }

    this.store.updateBlock(block.id, { [field]: value } as Partial<PageBlock>);
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

  requestPublication(): void {
    this.store.requestPublication();
  }
}
