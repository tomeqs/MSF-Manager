import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { ApiResponse } from '../models';
import { ApiCache } from './api-cache.service';

function response<T>(data: T, meta: ApiResponse<T>['meta']): Observable<ApiResponse<T>> {
  return of({ data, meta });
}

describe('ApiCache', () => {
  let cache: ApiCache;

  beforeEach(() => {
    TestBed.resetTestingModule();
    cache = TestBed.inject(ApiCache);
  });

  it('reuses game data while the hash matches and refetches when it changes', async () => {
    let calls = 0;
    const fetch = () => {
      calls++;
      return response(`v${calls}`, { version: 1, hashes: { chars: calls === 1 ? 'h1' : 'h2' } });
    };

    expect(await firstValueFrom(cache.gameData('chars', 'chars', fetch))).toBe('v1');
    expect(await firstValueFrom(cache.gameData('chars', 'chars', fetch))).toBe('v1');
    expect(calls).toBe(1);

    cache.noteMeta({ version: 1, hashes: { chars: 'h2' } });
    expect(await firstValueFrom(cache.gameData('chars', 'chars', fetch))).toBe('v2');
    expect(calls).toBe(2);
  });

  it('sends `since` for player data and serves the cache on 344 UNCHANGED', async () => {
    const sinceSeen: (string | undefined)[] = [];
    const first = (since?: string) => {
      sinceSeen.push(since);
      return response(['roster-1'], { version: 1, asOf: 'as-1' });
    };
    const unchanged = (since?: string) => {
      sinceSeen.push(since);
      return throwError(() => new HttpErrorResponse({ status: 344, error: { meta: {} } }));
    };

    expect(await firstValueFrom(cache.playerData('roster', first))).toEqual(['roster-1']);
    expect(await firstValueFrom(cache.playerData('roster', unchanged))).toEqual(['roster-1']);
    expect(sinceSeen).toEqual([undefined, 'as-1']);
  });

  it('forgets player data on clearPlayerData', async () => {
    const sinceSeen: (string | undefined)[] = [];
    const fetch = (since?: string) => {
      sinceSeen.push(since);
      return response([], { version: 1, asOf: 'as-1' });
    };
    await firstValueFrom(cache.playerData('inventory', fetch));
    await cache.clearPlayerData();
    await firstValueFrom(cache.playerData('inventory', fetch));
    expect(sinceSeen).toEqual([undefined, undefined]);
  });

  it('does not cache results rejected by isUsable', async () => {
    let calls = 0;
    const fetch = () => {
      calls++;
      return response<string[]>(calls === 1 ? [] : ['team'], { version: 1 });
    };
    const notEmpty = (d: string[]) => d.length > 0;

    expect(await firstValueFrom(cache.gameData('t', null, fetch, notEmpty))).toEqual([]);
    expect(await firstValueFrom(cache.gameData('t', null, fetch, notEmpty))).toEqual(['team']);
    expect(await firstValueFrom(cache.gameData('t', null, fetch, notEmpty))).toEqual(['team']);
    expect(calls).toBe(2);
  });
});
