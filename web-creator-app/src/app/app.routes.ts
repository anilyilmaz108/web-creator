import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'builder/:siteId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/builder/builder.component').then((m) => m.BuilderComponent)
  },
  {
    path: 'preview/:siteId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/preview/preview.component').then((m) => m.PreviewComponent)
  },
  {
    path: 'demo/:siteId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/demo/demo.component').then((m) => m.DemoComponent)
  },
  {
    path: 'review-queue',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['superadmin'] },
    loadComponent: () =>
      import('./features/review-queue/review-queue.component').then((m) => m.ReviewQueueComponent)
  },
  {
    path: 'sites/:slug',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
