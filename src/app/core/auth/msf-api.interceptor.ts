import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { MSF_CONFIG } from '../config/msf-config';
import { AuthService } from './auth.service';

/**
 * Adds `x-api-key` to every MSF API call and `Authorization: Bearer` to all but `/util/*`
 * (gatedRefresh authenticates with the refresh token in its body). A 401 ends the session.
 */
export const msfApiInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(MSF_CONFIG);
  if (!req.url.startsWith(config.apiBaseUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const withKey = req.clone({ setHeaders: { 'x-api-key': config.apiKey } });

  if (req.url.startsWith(`${config.apiBaseUrl}/util/`)) return next(withKey);

  return auth.accessToken().pipe(
    switchMap((token) =>
      next(token ? withKey.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : withKey),
    ),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        void router.navigate(['/login'], { queryParams: { expired: 1 } });
      }
      return throwError(() => error);
    }),
  );
};
