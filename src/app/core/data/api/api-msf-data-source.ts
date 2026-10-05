import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MSF_CONFIG } from '../../config/msf-config';
import { ApiResponse, CharacterInfo, CharacterInstance, EventInfo, PlayerCard } from '../../models';
import { MsfDataSource } from '../msf-data-source';

type QueryParams = Record<string, string>;

/** Real MSF API. Auth headers are added by `msfApiInterceptor`. */
@Injectable({ providedIn: 'root' })
export class ApiMsfDataSource extends MsfDataSource {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(MSF_CONFIG).apiBaseUrl;

  getPlayerCard(): Observable<PlayerCard> {
    return this.get<PlayerCard>('/player/v1/card');
  }

  getRoster(): Observable<CharacterInstance[]> {
    return this.get<CharacterInstance[]>('/player/v1/roster');
  }

  getCharacters(): Observable<CharacterInfo[]> {
    // Trim the payload to what the UI uses; a full response risks 472 RESPONSE_TOO_LARGE.
    return this.get<CharacterInfo[]>('/game/v1/characters', {
      status: 'playable',
      itemFormat: 'id',
      costumes: 'none',
      abilityKits: 'none',
      gearTiers: 'none',
      pieceInfo: 'none',
      starItems: 'none',
    });
  }

  getEvents(): Observable<EventInfo[]> {
    return this.get<EventInfo[]>('/player/v1/events', { itemFormat: 'id', pieceInfo: 'none' });
  }

  private get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params })
      .pipe(map((response) => response.data));
  }
}
