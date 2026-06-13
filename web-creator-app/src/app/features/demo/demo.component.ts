import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ViewportMode } from '../../core/models/builder.models';
import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteRendererComponent],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss'
})
export class DemoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SiteBuilderStore);

  readonly site = this.store.findById(this.route.snapshot.paramMap.get('siteId') ?? '');
  readonly viewport = signal<ViewportMode>('desktop');
  readonly currentPageId = signal(this.site?.selectedPageId ?? this.site?.pages[0]?.id ?? '');

  readonly viewports: Array<{ value: ViewportMode; label: string }> = [
    { value: 'desktop', label: 'Web' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'mobile', label: 'Mobil' }
  ];

  get currentPage() {
    return this.site?.pages.find((page) => page.id === this.currentPageId()) ?? this.site?.pages[0] ?? null;
  }

  selectPage(pageId: string): void {
    this.currentPageId.set(pageId);
  }
}
