import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_MSF_CONFIG as CONFIG } from '../config/msf-config';
import { ApiMsfDataSource } from '../data/api/api-msf-data-source';
import { provideMsfData } from '../data/provide-msf-data';
import { AuthService } from './auth.service';

const API = CONFIG.apiBaseUrl;

@Component({ template: '' })
class Blank {}

function seedTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }) {
  localStorage.setItem('msf.auth.tokens', JSON.stringify(tokens));
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: Blank }]),
      provideMsfData(),
      provideHttpClientTesting(),
    ],
  });
  return {
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService + msfApiInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('exchanges the authorization code with the PKCE verifier', async () => {
    sessionStorage.setItem(
      'msf.auth.pending',
      JSON.stringify({ verifier: 'v123', state: 's1', returnUrl: '/roster' }),
    );
    const { auth, httpMock } = setup();

    const done = auth.completeLogin({ code: 'abc', state: 's1' });
    const req = httpMock.expectOne(CONFIG.tokenUrl);
    const body = new URLSearchParams(req.request.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('abc');
    expect(body.get('code_verifier')).toBe('v123');
    expect(body.get('client_id')).toBe(CONFIG.clientId);
    expect(req.request.headers.has('x-api-key')).toBe(false);
    req.flush({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 });

    expect(await done).toBe('/roster');
    expect(auth.mode()).toBe('api');
  });

  it('rejects a callback with a mismatched state', async () => {
    sessionStorage.setItem(
      'msf.auth.pending',
      JSON.stringify({ verifier: 'v', state: 'expected', returnUrl: '/' }),
    );
    const { auth } = setup();
    await expect(auth.completeLogin({ code: 'abc', state: 'forged' })).rejects.toThrow();
    expect(auth.mode()).toBeNull();
  });

  it('adds x-api-key and bearer token to API calls only', () => {
    seedTokens({ accessToken: 'AT', refreshToken: 'RT', expiresAt: Date.now() + 3_600_000 });
    const { http, httpMock } = setup();

    http.get(`${API}/player/v1/card`).subscribe();
    http.get('https://example.com/other').subscribe();

    const apiReq = httpMock.expectOne(`${API}/player/v1/card`);
    expect(apiReq.request.headers.get('x-api-key')).toBe(CONFIG.apiKey);
    expect(apiReq.request.headers.get('Authorization')).toBe('Bearer AT');
    const otherReq = httpMock.expectOne('https://example.com/other');
    expect(otherReq.request.headers.has('x-api-key')).toBe(false);
    expect(otherReq.request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes an expired token once via gatedRefresh before calling the API', () => {
    seedTokens({ accessToken: 'OLD', refreshToken: 'RT1', expiresAt: Date.now() - 1000 });
    const { http, httpMock, auth } = setup();

    http.get(`${API}/player/v1/card`).subscribe();
    http.get(`${API}/player/v1/roster`).subscribe();

    const refresh = httpMock.expectOne(`${API}/util/v1/gatedRefresh`);
    expect(refresh.request.headers.get('x-api-key')).toBe(CONFIG.apiKey);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(new URLSearchParams(refresh.request.body).get('refresh_token')).toBe('RT1');
    refresh.flush({ access_token: 'NEW', refresh_token: 'RT2', expires_in: 3600 });

    for (const path of ['/player/v1/card', '/player/v1/roster']) {
      expect(httpMock.expectOne(`${API}${path}`).request.headers.get('Authorization')).toBe(
        'Bearer NEW',
      );
    }
    expect(JSON.parse(localStorage.getItem('msf.auth.tokens')!).refreshToken).toBe('RT2');
    expect(auth.mode()).toBe('api');
  });

  it('ends the session on 401', () => {
    seedTokens({ accessToken: 'AT', expiresAt: Date.now() + 3_600_000 });
    const { http, httpMock, auth } = setup();

    http.get(`${API}/player/v1/card`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/player/v1/card`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.mode()).toBeNull();
    expect(localStorage.getItem('msf.auth.tokens')).toBeNull();
  });

  it('ApiMsfDataSource unwraps `data` and trims the characters query', async () => {
    seedTokens({ accessToken: 'AT', expiresAt: Date.now() + 3_600_000 });
    const { httpMock } = setup();
    const api = TestBed.inject(ApiMsfDataSource);

    const result = firstValueFrom(api.getCharacters());
    await new Promise((resolve) => setTimeout(resolve)); // cache lookup is async
    const req = httpMock.expectOne((r) => r.url === `${API}/game/v1/characters`);
    expect(req.request.params.get('status')).toBe('playable');
    expect(req.request.params.get('abilityKits')).toBe('none');
    expect(req.request.params.get('starItems')).toBe('full');
    req.flush({ data: [{ id: 'Storm' }], meta: { version: 1 } });

    expect(await result).toEqual([{ id: 'Storm' }]);
  });
});
