import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiCache } from '../../cache/api-cache.service';
import { MSF_CONFIG } from '../../config/msf-config';
import {
  ApiResponse,
  CharacterInfo,
  CharacterInstance,
  EventInfo,
  ItemQuantity,
  PlayerCard,
  UpgradeData,
} from '../../models';
import { MsfDataSource } from '../msf-data-source';

type QueryParams = Record<string, string>;

/** Real MSF API. Auth headers are added by `msfApiInterceptor`, caching by `ApiCache`. */
@Injectable({ providedIn: 'root' })
export class ApiMsfDataSource extends MsfDataSource {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);
  private readonly baseUrl = inject(MSF_CONFIG).apiBaseUrl;

  getPlayerCard(): Observable<PlayerCard> {
    return this.data<PlayerCard>('/player/v1/card');
  }

  getRoster(): Observable<CharacterInstance[]> {
    return this.cache.playerData('roster', (since) =>
      this.envelope<CharacterInstance[]>('/player/v1/roster', withSince({}, since)),
    );
  }

  getCharacters(): Observable<CharacterInfo[]> {
    // Trim the payload to what the UI uses; a full response risks 472 RESPONSE_TOO_LARGE.
    return this.cache.gameData('characters', 'chars', () =>
      this.envelope<CharacterInfo[]>('/game/v1/characters', {
        status: 'playable',
        itemFormat: 'id',
        costumes: 'none',
        abilityKits: 'none',
        gearTiers: 'none',
        pieceInfo: 'none',
        starItems: 'full',
      }),
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
    // Item objects (names, icons) are kept so costs can be labelled; sub-pieces are not needed.
    return this.cache.gameData('upgradeData', 'chars', () =>
      this.envelope<UpgradeData>('/game/v1/upgradeData', {
        pieceInfo: 'full',
        pieceDirectCost: 'none',
        pieceFlatCost: 'none',
        subPieceInfo: 'none',
      }),
    );
  }

  private data<T>(path: string, params?: QueryParams): Observable<T> {
    return this.envelope<T>(path, params).pipe(
      tap((res) => this.cache.noteMeta(res.meta)),
      map((res) => res.data),
    );
  }

  private envelope<T>(path: string, params?: QueryParams): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params });
  }
}

function withSince(params: QueryParams, since?: string): QueryParams {
  return since ? { ...params, since } : params;
}
