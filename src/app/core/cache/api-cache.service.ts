import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';
import { ApiResponse, Meta } from '../models';
import { KvStore } from './kv-store';

type HashName = keyof NonNullable<Meta['hashes']>;

interface GameEntry<T> {
  data: T;
  hash?: string;
  savedAt: number;
}

interface PlayerEntry<T> {
  data: T;
  asOf: string;
}

/** Game data without a known current hash is trusted for this long. */
const GAME_TTL_MS = 12 * 60 * 60 * 1000;
const GAME_PREFIX = 'game:';
const PLAYER_PREFIX = 'player:';

/**
 * Caching policy for MSF API responses.
 *
 * - Game data is reused while `meta.hashes[hashName]` (seen on any response this session)
 *   still matches the hash it was saved with; with no hash seen yet (or `hashName` null),
 *   a TTL applies.
 * - Player data is re-requested with `since=<meta.asOf>`; 344 UNCHANGED serves the cache.
 */
@Injectable({ providedIn: 'root' })
export class ApiCache {
  private readonly kv = inject(KvStore);
  private readonly knownHashes: Partial<Record<HashName, string>> = {};

  /** Records hashes from any API response so cached game data can be validated. */
  noteMeta(meta: Meta | undefined): void {
    Object.assign(this.knownHashes, meta?.hashes ?? {});
  }

  gameData<T>(
    key: string,
    hashName: HashName | null,
    fetch: () => Observable<ApiResponse<T>>,
  ): Observable<T> {
    const cacheKey = GAME_PREFIX + key;
    return from(this.kv.get<GameEntry<T>>(cacheKey)).pipe(
      switchMap((entry) => {
        if (entry && this.isFresh(entry, hashName)) return of(entry.data);
        return fetch().pipe(
          tap((res) => {
            this.noteMeta(res.meta);
            void this.kv.set(cacheKey, {
              data: res.data,
              hash: hashName ? res.meta?.hashes?.[hashName] : undefined,
              savedAt: Date.now(),
            } satisfies GameEntry<T>);
          }),
          map((res) => res.data),
        );
      }),
    );
  }

  playerData<T>(key: string, fetch: (since?: string) => Observable<ApiResponse<T>>): Observable<T> {
    const cacheKey = PLAYER_PREFIX + key;
    return from(this.kv.get<PlayerEntry<T>>(cacheKey)).pipe(
      switchMap((entry) =>
        fetch(entry?.asOf).pipe(
          tap((res) => {
            this.noteMeta(res.meta);
            if (res.meta?.asOf) {
              void this.kv.set(cacheKey, {
                data: res.data,
                asOf: res.meta.asOf,
              } satisfies PlayerEntry<T>);
            }
          }),
          map((res) => res.data),
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 344 && entry) {
              this.noteMeta(error.error?.meta);
              return of(entry.data);
            }
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  /** Call on login/logout so one account never sees another's cached data. */
  clearPlayerData(): Promise<void> {
    return this.kv.deletePrefix(PLAYER_PREFIX);
  }

  private isFresh(entry: GameEntry<unknown>, hashName: HashName | null): boolean {
    const known = hashName ? this.knownHashes[hashName] : undefined;
    if (known) return entry.hash === known;
    return Date.now() - entry.savedAt < GAME_TTL_MS;
  }
}
