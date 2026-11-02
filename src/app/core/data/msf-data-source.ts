import { Observable } from 'rxjs';
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

  /** GET /game/v1/characters?abilityKits=max — ability descriptions (for synergies). */
  abstract getAbilityKits(): Observable<CharacterKit[]>;

  /** GET /player/v1/squads — the player's saved squads per game mode. */
  abstract getSquads(): Observable<SquadsInfo>;

  /** GET /player/v1/events */
  abstract getEvents(): Observable<EventInfo[]>;

  /** GET /game/v1/events — scheduled and running events for everyone, not only the player's. */
  abstract getGameEvents(): Observable<EventInfo[]>;

  /**
   * Where shards drop: campaign nodes, nodes of event campaigns that events link to, and orbs
   * found in those rewards (`/game/v1/episodics/…`, `/game/v1/orbRewards/{id}`).
   */
  abstract getShardDrops(): Observable<ShardDrops>;

  /** GET /player/v1/inventory */
  abstract getInventory(): Observable<ItemQuantity[]>;

  /** GET /game/v1/upgradeData */
  abstract getUpgradeData(): Observable<UpgradeData>;

  /** GET /game/v1/characterInstanceCaps — max gear tier and ability levels per character level. */
  abstract getLevelCaps(): Observable<CharacterInstance[]>;

  /** GET /game/v1/analysis/teamOrder/{tab} — most common saved squads across players. */
  abstract getTeamOrder(tab: TeamTab): Observable<TeamOrder[]>;

  /** GET /game/v1/characterInstances/{id} — power at 7★ with max gear/abilities for the level. */
  abstract getPotential(
    characterId: string,
    target: PotentialTarget,
  ): Observable<CharacterPotential>;
}
