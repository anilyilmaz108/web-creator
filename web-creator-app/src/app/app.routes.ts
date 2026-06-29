import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

interface TenantRuntimeConfig {
  tenantDomainBase?: string;
  tenantDomainRoutingEnabled?: boolean;
}

function tenantPublicSiteMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  const runtimeConfig = globalThis.window?.webCreatorFirebaseConfig as TenantRuntimeConfig | undefined;
  const domainBase = normalizeDomain(runtimeConfig?.tenantDomainBase ?? '');
  const hostname = normalizeDomain(globalThis.location?.hostname ?? '');

  if (!runtimeConfig?.tenantDomainRoutingEnabled || !domainBase || hostname === domainBase) {
    return null;
  }

  if (!hostname.endsWith(`.${domainBase}`)) {
    return null;
  }

  const tenantSlug = hostname.slice(0, -(domainBase.length + 1));
  if (!tenantSlug || tenantSlug === 'www') {
    return null;
  }

  return {
    consumed: segments,
    posParams: {
      tenantSlug: new UrlSegment(tenantSlug, {}),
      pageSlug: segments[0] ?? new UrlSegment('', {})
    }
  };
}

function normalizeDomain(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

export const routes: Routes = [
  {
    matcher: tenantPublicSiteMatcher,
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent)
  },
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
    path: 'create-site',
    loadComponent: () =>
      import('./features/public-create/public-create.component').then((m) => m.PublicCreateComponent)
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
    path: 'demo/:siteId/:pageSlug',
    canActivate: [authGuard],
    loadComponent: () => import('./features/demo/demo.component').then((m) => m.DemoComponent)
  },
  {
    path: 'demo/:siteId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/demo/demo.component').then((m) => m.DemoComponent)
  },
  {
    path: 'site-admin/:siteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/site-admin-dashboard/site-admin-dashboard.component').then(
        (m) => m.SiteAdminDashboardComponent
      )
  },
  {
    path: 'review-queue',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['superadmin', 'admin'] },
    loadComponent: () =>
      import('./features/review-queue/review-queue.component').then((m) => m.ReviewQueueComponent)
  },
  {
    path: 'sites/:slug/:pageSlug',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent)
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
