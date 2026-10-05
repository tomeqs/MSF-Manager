import { Observable } from 'rxjs';
import {
  CharacterInfo,
  CharacterInstance,
  CharacterPotential,
  EventInfo,
  ItemQuantity,
  PlayerCard,
  PotentialTarget,
  TeamOrder,
  TeamTab,
  UpgradeData,
} from '../models';

/**
 * Single seam between the app and the MSF API.
 *
 * Stores depend only on this abstraction; `SessionMsfDataSource` picks `ApiMsfDataSource`
 * (logged in) or `MockMsfDataSource` (demo). Method names map 1:1 to API routes.
 */
export abstract class MsfDataSource {
  /** GET /player/v1/card */
  abstract getPlayerCard(): Observable<PlayerCard>;

  /** GET /player/v1/roster */
  abstract getRoster(): Observable<CharacterInstance[]>;

  /** GET /game/v1/characters?status=playable */
  abstract getCharacters(): Observable<CharacterInfo[]>;

  /** GET /player/v1/events */
  abstract getEvents(): Observable<EventInfo[]>;

  /** GET /player/v1/inventory */
  abstract getInventory(): Observable<ItemQuantity[]>;

  /** GET /game/v1/upgradeData */
  abstract getUpgradeData(): Observable<UpgradeData>;

  /** GET /game/v1/analysis/teamOrder/{tab} — most common saved squads across players. */
  abstract getTeamOrder(tab: TeamTab): Observable<TeamOrder[]>;

  /** GET /game/v1/characterInstances/{id} — power at 7★ with max gear/abilities for the level. */
  abstract getPotential(
    characterId: string,
    target: PotentialTarget,
  ): Observable<CharacterPotential>;
}
