import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ViewportMode } from '../../core/models/builder.models';
import { SiteBuilderStore } from '../../core/services/site-builder.store';
import { SiteRendererComponent } from '../../shared/components/site-renderer/site-renderer.component';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteRendererComponent],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss'
})
export class PreviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SiteBuilderStore);

  readonly site = this.store.findById(this.route.snapshot.paramMap.get('siteId') ?? '');
  readonly viewports: ViewportMode[] = ['desktop', 'tablet', 'mobile'];
}
