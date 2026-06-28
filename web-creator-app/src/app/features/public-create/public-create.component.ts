import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-public-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-create.component.html',
  styleUrl: './public-create.component.scss'
})
export class PublicCreateComponent {
  private readonly auth = inject(MockAuthService);
  private readonly store = inject(SiteBuilderStore);
  private readonly router = inject(Router);

  creatorName = '';
  siteName = '';
  readonly isCreating = signal(false);

  async createSite(): Promise<void> {
    if (!this.siteName.trim()) {
      return;
    }

    this.isCreating.set(true);
    const user = await this.auth.startGuestCreatorSession(this.creatorName.trim() || 'Public Creator');
    const project = this.store.createProject(user.id, this.siteName.trim());
    this.isCreating.set(false);
    this.router.navigate(['/builder', project.id]);
  }
}
