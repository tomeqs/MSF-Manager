import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  CharacterInfo,
  CharacterInstance,
  CharacterKit,
  CharacterPotential,
  EventInfo,
  ItemQuantity,
  PlayerCard,
  PotentialTarget,
  ShardDrops,
  SquadsInfo,
  TeamOrder,
  TeamTab,
  UpgradeData,
} from '../models';
import { ApiMsfDataSource } from './api/api-msf-data-source';
import { MockMsfDataSource } from './mock/mock-msf-data-source';
import { MsfDataSource } from './msf-data-source';

/** Routes each call to the real API when logged in, otherwise to mock (demo) data. */
@Injectable()
export class SessionMsfDataSource extends MsfDataSource {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiMsfDataSource);
  private readonly mock = inject(MockMsfDataSource);

  private get source(): MsfDataSource {
    return this.auth.mode() === 'api' ? this.api : this.mock;
  }

  getPlayerCard(): Observable<PlayerCard> {
    return this.source.getPlayerCard();
  }

  getRoster(): Observable<CharacterInstance[]> {
    return this.source.getRoster();
  }

  getCharacters(): Observable<CharacterInfo[]> {
    return this.source.getCharacters();
  }

  getAbilityKits(): Observable<CharacterKit[]> {
    return this.source.getAbilityKits();
  }

  getSquads(): Observable<SquadsInfo> {
    return this.source.getSquads();
  }

  getEvents(): Observable<EventInfo[]> {
    return this.source.getEvents();
  }

  getGameEvents(): Observable<EventInfo[]> {
    return this.source.getGameEvents();
  }

  getShardDrops(): Observable<ShardDrops> {
    return this.source.getShardDrops();
  }

  getInventory(): Observable<ItemQuantity[]> {
    return this.source.getInventory();
  }

  getUpgradeData(): Observable<UpgradeData> {
    return this.source.getUpgradeData();
  }

  getLevelCaps(): Observable<CharacterInstance[]> {
    return this.source.getLevelCaps();
  }

  getTeamOrder(tab: TeamTab): Observable<TeamOrder[]> {
    return this.source.getTeamOrder(tab);
  }

  getPotential(characterId: string, target: PotentialTarget): Observable<CharacterPotential> {
    return this.source.getPotential(characterId, target);
  }
}
