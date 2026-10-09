import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { MSF_CONFIG } from '../config/msf-config';
import { AuthService } from './auth.service';

/**
 * Adds `x-api-key` to every MSF API call and `Authorization: Bearer` to all but `/util/*`
 * (gatedRefresh authenticates with the refresh token in its body). On 401 the token is
 * refreshed and the call retried once; only a second rejection ends the session.
 */
export const msfApiInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(MSF_CONFIG);
  if (!req.url.startsWith(config.apiBaseUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const withKey = req.clone({ setHeaders: { 'x-api-key': config.apiKey } });

  if (req.url.startsWith(`${config.apiBaseUrl}/util/`)) return next(withKey);

  const send = (token: string | null) => next(withToken(withKey, token));
  const toLogin = () => void router.navigate(['/login'], { queryParams: { expired: 1 } });
  const isUnauthorized = (error: unknown) =>
    error instanceof HttpErrorResponse && error.status === 401;

  return auth.accessToken().pipe(
    switchMap(send),
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) return throwError(() => error);
      // The token may have been revoked or expired early: refresh once and retry.
      return auth.accessToken(true).pipe(
        switchMap((token) => {
          if (!token) {
            toLogin();
            return throwError(() => error);
          }
          return send(token);
        }),
        catchError((retryError: unknown) => {
          if (isUnauthorized(retryError)) {
            auth.endSession('API odrzuca token (401) także po odświeżeniu');
            toLogin();
          }
          return throwError(() => retryError);
        }),
      );
    }),
  );
};

function withToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
