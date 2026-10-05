import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** App pages need a session: Scopely login or demo mode. */
export const sessionGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).mode()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
