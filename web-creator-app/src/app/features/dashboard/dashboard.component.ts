import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { UserRole } from '../../core/models/auth.models';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { SiteBuilderStore } from '../../core/services/site-builder.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly auth = inject(MockAuthService);
  private readonly router = inject(Router);
  private readonly builderStore = inject(SiteBuilderStore);

  readonly currentUser = this.auth.currentUser;
  readonly users = this.auth.users;
  readonly projects = this.builderStore.projects;
  readonly pendingProjects = this.builderStore.pendingProjects;
  readonly canManageUsers = computed(() => ['superadmin', 'admin'].includes(this.currentUser()?.role ?? ''));
  readonly roles: UserRole[] = ['visitor', 'moderator', 'admin'];

  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'visitor' as UserRole
  };

  openBuilder(siteId: string): void {
    this.builderStore.selectSite(siteId);
    this.router.navigate(['/builder', siteId]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  createUser(): void {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
      return;
    }

    this.auth.createUser(this.newUser);
    this.newUser = { name: '', email: '', password: '', role: 'visitor' };
  }

  updateRole(userId: string, role: UserRole): void {
    this.auth.updateUserRole(userId, role);
  }
}
