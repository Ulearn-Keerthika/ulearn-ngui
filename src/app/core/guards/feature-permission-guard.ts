import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requires sign-in and a staff/student label permission (e.g. crt.access). */
export const featurePermissionGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await auth.ensureSessionChecked();
  if (!isAuthenticated) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const permission = route.data?.['permission'] as string | undefined;
  if (!permission || auth.hasPermission(permission)) return true;
  return router.createUrlTree(['/']);
};
