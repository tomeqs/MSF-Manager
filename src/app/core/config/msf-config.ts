import { InjectionToken } from '@angular/core';

export interface MsfConfig {
  apiBaseUrl: string;
  /** Public key published in the MSF API docs (sent as `x-api-key`). */
  apiKey: string;
  /** SPA client registered in the MSF Developer Portal (public, no secret). */
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  /** Path registered as "OAuth2 Redirect" in the portal; origin is taken from the browser. */
  redirectPath: string;
  scopes: string[];
}

export const DEFAULT_MSF_CONFIG: MsfConfig = {
  apiBaseUrl: 'https://api.marvelstrikeforce.com',
  apiKey: '17wMKJLRxy3pYDCKG5ciP7VSU45OVumB2biCzzgw',
  clientId: 'cc73949e-3077-434a-895e-716745f5bc48',
  authorizeUrl: 'https://hydra-public.prod.m3.scopelypv.com/oauth2/auth',
  tokenUrl: 'https://hydra-public.prod.m3.scopelypv.com/oauth2/token',
  redirectPath: '/auth/callback',
  scopes: [
    'm3p.f.pr.pro',
    'm3p.f.pr.ros',
    'm3p.f.pr.inv',
    'm3p.f.pr.act',
    'm3p.f.ar.pro',
    'openid',
    'offline',
  ],
};

export const MSF_CONFIG = new InjectionToken<MsfConfig>('MSF_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_MSF_CONFIG,
});
