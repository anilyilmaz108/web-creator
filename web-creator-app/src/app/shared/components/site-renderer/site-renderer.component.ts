import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PageBlock, SitePage, ThemeConfig, ViewportMode } from '../../../core/models/builder.models';

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

  trackByBlockId(_index: number, block: PageBlock): string {
    return block.id;
  }

  featureGridClass(layout: PageBlock['layout']): string {
    switch (layout) {
      case 'grid-3':
        return this.viewport === 'mobile'
          ? 'grid-cols-1'
          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
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
}
