import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { ApiCache } from '../../cache/api-cache.service';
import { MSF_CONFIG } from '../../config/msf-config';
import {
  ApiResponse,
  CharacterInfo,
  CharacterInstance,
  CharacterPotential,
  EventInfo,
  IndexedCosts,
  ItemQuantity,
  PlayerCard,
  PotentialTarget,
  TeamOrder,
  TeamTab,
  UpgradeData,
} from '../../models';
import { MsfDataSource } from '../msf-data-source';

type QueryParams = Record<string, string>;

/** The spec documents one TeamOrder per tab here; accept arrays too. */
type AllTeamOrders = Partial<Record<TeamTab, TeamOrder | TeamOrder[]>>;

/** Keeps each page well under the API's 472 kB response limit. */
const PAGE_SIZE = 100;

/** Real MSF API. Auth headers are added by `msfApiInterceptor`, caching by `ApiCache`. */
@Injectable({ providedIn: 'root' })
export class ApiMsfDataSource extends MsfDataSource {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);
  private readonly baseUrl = inject(MSF_CONFIG).apiBaseUrl;

  getPlayerCard(): Observable<PlayerCard> {
    return this.envelope<PlayerCard>('/player/v1/card').pipe(
      tap((res) => this.cache.noteMeta(res.meta)),
      map(({ data, meta }) => ({
        ...data,
        icon: resolveImg(data.icon, meta?.baseImgUrl),
        frame: resolveImg(data.frame, meta?.baseImgUrl),
      })),
    );
  }

  getRoster(): Observable<CharacterInstance[]> {
    return this.cache.playerData('roster', (since) =>
      this.envelope<CharacterInstance[]>('/player/v1/roster', withSince({}, since)),
    );
  }

  getCharacters(): Observable<CharacterInfo[]> {
    // Trimmed to what the UI uses, and paged: all ~400 characters in one response exceed
    // the 472 kB limit (472 RESPONSE_TOO_LARGE).
    return this.cache.gameData('characters', 'chars', () =>
      this.pagedEnvelope<CharacterInfo>('/game/v1/characters', {
        status: 'playable',
        itemFormat: 'id',
        costumes: 'none',
        abilityKits: 'none',
        gearTiers: 'none',
        pieceInfo: 'none',
        starItems: 'full',
      }).pipe(
        map(({ data, meta }) => ({
          meta,
          data: data.map((c) => ({ ...c, portrait: resolveImg(c.portrait, meta?.baseImgUrl) })),
        })),
      ),
    );
  }

  getEvents(): Observable<EventInfo[]> {
    return this.data<EventInfo[]>('/player/v1/events', { itemFormat: 'id', pieceInfo: 'none' });
  }

  getInventory(): Observable<ItemQuantity[]> {
    return this.cache.playerData('inventory', (since) =>
      this.envelope<ItemQuantity[]>('/player/v1/inventory', withSince({ itemFormat: 'id' }, since)),
    );
  }

  getUpgradeData(): Observable<UpgradeData> {
    // Only the fields the calculator uses, one request each (the whole object is large).
    // Item objects (names, icons) are kept so costs can be labelled; sub-pieces are not needed.
    const params = {
      pieceInfo: 'full',
      pieceDirectCost: 'none',
      pieceFlatCost: 'none',
      subPieceInfo: 'none',
    };
    const field = <K extends keyof UpgradeData>(id: K) =>
      this.envelope<UpgradeData[K]>(`/game/v1/upgradeData/${id}`, params);

    return this.cache.gameData('upgradeData', 'chars', () =>
      forkJoin({
        shards: field('yellowStarTotalShards'),
        stars: field('yellowStarTotalCosts'),
        abilities: field('abilityUpgradeCosts'),
      }).pipe(
        map(({ shards, stars, abilities }): ApiResponse<UpgradeData> => {
          const base = shards.meta?.baseImgUrl;
          return {
            meta: shards.meta,
            data: {
              yellowStarTotalShards: shards.data,
              yellowStarTotalCosts: resolveCostIcons(stars.data, base),
              abilityUpgradeCosts: abilities.data
                ? Object.fromEntries(
                    Object.entries(abilities.data).map(([k, v]) => [k, resolveCostIcons(v, base)]),
                  )
                : undefined,
            },
          };
        }),
      ),
    );
  }

  getTeamOrder(tab: TeamTab): Observable<TeamOrder[]> {
    // No meta hash tracks this analysis, so it is cached by age only (empty results never).
    // The per-tab route has been seen returning 500 for every tab; on a server error try the
    // all-tabs route, and if that has nothing for this tab either, surface the original error.
    return this.cache
      .gameData(
        `teamOrder:v2:${tab}`,
        null,
        () => this.envelope<TeamOrder[]>(`/game/v1/analysis/teamOrder/${tab}`),
        (orders) => toTeamOrders(orders).length > 0,
      )
      .pipe(
        map(toTeamOrders),
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse && error.status >= 500)) {
            return throwError(() => error);
          }
          return this.cache
            .gameData(
              'teamOrder:v2:all',
              null,
              () => this.envelope<AllTeamOrders>('/game/v1/analysis/teamOrder'),
              (all) => Object.values(all ?? {}).some((v) => toTeamOrders(v).length > 0),
            )
            .pipe(
              map((all) => toTeamOrders(all?.[tab])),
              switchMap((orders) => (orders.length ? of(orders) : throwError(() => error))),
              catchError(() => throwError(() => error)),
            );
        }),
      );
  }

  getPotential(characterId: string, target: PotentialTarget): Observable<CharacterPotential> {
    // Omitted params default to the max for the level: gear tier, then ability levels.
    const params: QueryParams = {
      yellow: String(target.yellow ?? 7),
      red: String(target.red),
      lang: 'none',
      statsFormat: 'csv',
      itemFormat: 'id',
      traitFormat: 'id',
      charInfo: 'none',
      abilityKits: 'none',
      gearTiers: 'none',
    };
    if (target.level) params['level'] = String(target.level);
    if (target.isoClass) params['iso8'] = `${target.isoClass},max`;
    const yellow = target.yellow && target.yellow !== 7 ? `:y${target.yellow}` : '';
    const key = `potential:v1:${characterId}:${target.level ?? 'cap'}:${target.red}:${target.isoClass ?? '-'}${yellow}`;

    return this.cache
      .gameData(
        key,
        'chars',
        () =>
          this.envelope<CharacterInstance | CharacterInstance[]>(
            `/game/v1/characterInstances/${encodeURIComponent(characterId)}`,
            params,
          ),
        (data) => (toInstance(data)?.power ?? 0) > 0,
      )
      .pipe(
        map((data) => {
          const instance = toInstance(data);
          return {
            power: instance?.power ?? 0,
            level: instance?.level,
            gearTier: instance?.gearTier,
            abilities: {
              basic: instance?.basic ?? 0,
              special: instance?.special ?? 0,
              ultimate: instance?.ultimate ?? 0,
              passive: instance?.passive ?? 0,
            },
          };
        }),
      );
  }

  private data<T>(path: string, params?: QueryParams): Observable<T> {
    return this.envelope<T>(path, params).pipe(
      tap((res) => this.cache.noteMeta(res.meta)),
      map((res) => res.data),
    );
  }

  /** Fetches page 1, then the remaining pages (from `meta.perTotal`) in parallel. */
  private pagedEnvelope<T>(path: string, params: QueryParams): Observable<ApiResponse<T[]>> {
    const page = (n: number) =>
      this.envelope<T[]>(path, { ...params, page: String(n), perPage: String(PAGE_SIZE) });
    return page(1).pipe(
      switchMap((first) => {
        const pages = Math.ceil((first.meta?.perTotal ?? 0) / PAGE_SIZE);
        if (pages <= 1) return of(first);
        const rest = Array.from({ length: pages - 1 }, (_, i) => page(i + 2));
        return forkJoin(rest).pipe(
          map((more) => ({
            meta: first.meta,
            data: [first.data, ...more.map((r) => r.data)].flat(),
          })),
        );
      }),
    );
  }

  private envelope<T>(path: string, params?: QueryParams): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params });
  }
}

function withSince(params: QueryParams, since?: string): QueryParams {
  return since ? { ...params, since } : params;
}

/** Prefixes relative image paths with `meta.baseImgUrl`; absolute URLs pass through. */
export function resolveImg(path: string | undefined, base: string | undefined): string | undefined {
  if (!path || !base || /^https?:\/\//.test(path)) return path;
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

function resolveCostIcons(costs: IndexedCosts | undefined, base: string | undefined) {
  if (!costs) return costs;
  return Object.fromEntries(
    Object.entries(costs).map(([level, list]) => [
      level,
      list.map((cost) =>
        typeof cost.item === 'object'
          ? { ...cost, item: { ...cost.item, icon: resolveImg(cost.item.icon, base) } }
          : cost,
      ),
    ]),
  );
}

/** Accepts one TeamOrder or a list and drops entries without a squad. */
function toTeamOrders(value: TeamOrder | TeamOrder[] | null | undefined): TeamOrder[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter((o) => Array.isArray(o?.squad) && o.squad.length > 0);
}

/** The instance route returns an array only when a param is "all", which is never sent here. */
function toInstance(data: CharacterInstance | CharacterInstance[] | undefined) {
  return Array.isArray(data) ? data[0] : data;
}
