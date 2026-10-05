import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
  timer,
} from 'rxjs';
import { ApiCache } from '../cache/api-cache.service';
import { MSF_CONFIG } from '../config/msf-config';
import { codeChallenge, randomString } from './pkce';

/** `api` = logged in with Scopely, `demo` = mock data, `null` = not chosen yet. */
export type SessionMode = 'api' | 'demo' | null;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
  scope?: string;
}

interface PendingLogin {
  verifier: string;
  state: string;
  returnUrl: string;
}

export interface CallbackParams {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  error_description?: string | null;
}

const TOKENS_KEY = 'msf.auth.tokens';
const DEMO_KEY = 'msf.auth.demo';
const PENDING_KEY = 'msf.auth.pending';
/** Refresh this long before the access token actually expires. */
const EXPIRY_SKEW_MS = 60_000;
/** gatedRefresh answers 473 for 20 s while another caller uses the same refresh token. */
const GATED_RETRY_MS = 3_000;

const FORM_HEADERS = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | undefined, key: string, value: unknown): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.) — session lives in memory only.
  }
}

/**
 * OAuth2 Authorization Code + PKCE against Scopely's Hydra server (SPA client, no secret).
 *
 * Refresh tokens are single-use and reusing one revokes the whole chain, so refreshes are
 * de-duplicated within the tab and go through the API's `/util/v1/gatedRefresh`, which
 * rejects concurrent reuse (other tabs) with 473 instead of revoking.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(MSF_CONFIG);
  private readonly cache = inject(ApiCache);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly local = this.window?.localStorage;
  private readonly session = this.window?.sessionStorage;

  private readonly _tokens = signal<StoredTokens | null>(readJson(this.local, TOKENS_KEY));
  private readonly _demo = signal<boolean>(readJson<boolean>(this.local, DEMO_KEY) ?? false);
  private refreshInFlight$: Observable<string> | null = null;

  readonly isLoggedIn = computed(() => this._tokens() !== null);
  readonly mode = computed<SessionMode>(() =>
    this._tokens() ? 'api' : this._demo() ? 'demo' : null,
  );

  constructor() {
    // Keep tabs in sync when another tab logs in, refreshes or logs out.
    this.window?.addEventListener('storage', (event) => {
      if (event.key === TOKENS_KEY) this._tokens.set(readJson(this.local, TOKENS_KEY));
    });
  }

  get redirectUri(): string {
    return `${this.window?.location.origin ?? ''}${this.config.redirectPath}`;
  }

  /** Redirects the browser to the Scopely login/consent page. */
  async login(returnUrl = '/dashboard'): Promise<void> {
    const pending: PendingLogin = {
      verifier: randomString(64),
      state: randomString(32),
      returnUrl,
    };
    writeJson(this.session, PENDING_KEY, pending);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.redirectUri,
      scope: this.config.scopes.join(' '),
      state: pending.state,
      code_challenge: await codeChallenge(pending.verifier),
      code_challenge_method: 'S256',
    });
    this.window?.location.assign(`${this.config.authorizeUrl}?${params}`);
  }

  /** Handles the redirect back from Scopely. Resolves to the URL the user wanted to open. */
  async completeLogin(params: CallbackParams): Promise<string> {
    if (params.error) {
      throw new Error(params.error_description || params.error);
    }
    const pending = readJson<PendingLogin>(this.session, PENDING_KEY);
    writeJson(this.session, PENDING_KEY, null);
    if (!pending || !params.code || params.state !== pending.state) {
      throw new Error('Nieprawidłowa sesja logowania. Spróbuj zalogować się ponownie.');
    }

    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: this.redirectUri,
        client_id: this.config.clientId,
        code_verifier: pending.verifier,
      },
    });
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(this.config.tokenUrl, body.toString(), {
        headers: FORM_HEADERS,
      }),
    );
    // A different account may log in on this browser.
    await this.cache.clearPlayerData();
    this.storeTokens(response);
    this.setDemo(false);
    return pending.returnUrl;
  }

  startDemo(): void {
    this.setDemo(true);
  }

  /** Forgets tokens and demo mode locally. */
  async logout(): Promise<void> {
    this.setTokens(null);
    this.setDemo(false);
    await this.cache.clearPlayerData();
  }

  /** A valid access token, refreshing it first if needed; `null` when not logged in. */
  accessToken(): Observable<string | null> {
    const tokens = this._tokens();
    if (!tokens) return of(null);
    if (tokens.expiresAt - EXPIRY_SKEW_MS > Date.now()) return of(tokens.accessToken);
    if (!tokens.refreshToken) {
      this.setTokens(null);
      return of(null);
    }
    return this.refresh(tokens.refreshToken).pipe(
      catchError(() => {
        this.setTokens(null);
        return of(null);
      }),
    );
  }

  private refresh(refreshToken: string): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<TokenResponse>(
        `${this.config.apiBaseUrl}/util/v1/gatedRefresh`,
        new HttpParams({
          fromObject: {
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            redirect_uri: this.redirectUri,
            refresh_token: refreshToken,
          },
        }).toString(),
        { headers: FORM_HEADERS },
      )
      .pipe(
        map((response) => {
          this.storeTokens(response, refreshToken);
          return response.access_token;
        }),
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 473
            ? timer(GATED_RETRY_MS).pipe(
                switchMap(() => this.tokensFromOtherTab(refreshToken, error)),
              )
            : throwError(() => error),
        ),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1),
      );
    return this.refreshInFlight$;
  }

  /** After a 473, another tab should have stored the rotated tokens. */
  private tokensFromOtherTab(usedRefreshToken: string, error: unknown): Observable<string> {
    const latest = readJson<StoredTokens>(this.local, TOKENS_KEY);
    if (latest && latest.refreshToken !== usedRefreshToken) {
      this._tokens.set(latest);
      return of(latest.accessToken);
    }
    return throwError(() => error);
  }

  private storeTokens(response: TokenResponse, previousRefreshToken?: string): void {
    this.setTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? previousRefreshToken,
      expiresAt: Date.now() + response.expires_in * 1000,
      scope: response.scope,
    });
  }

  private setTokens(tokens: StoredTokens | null): void {
    this._tokens.set(tokens);
    writeJson(this.local, TOKENS_KEY, tokens);
  }

  private setDemo(demo: boolean): void {
    this._demo.set(demo);
    writeJson(this.local, DEMO_KEY, demo || null);
  }
}
