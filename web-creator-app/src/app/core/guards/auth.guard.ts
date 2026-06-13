import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { MockAuthService } from '../services/mock-auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(MockAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
