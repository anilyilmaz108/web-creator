import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../models/auth.models';
import { MockAuthService } from '../services/mock-auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(MockAuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const user = auth.currentUser();

  if (user && roles.includes(user.role)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
