import { Observable } from 'rxjs';
import { CharacterInfo, CharacterInstance, EventInfo, PlayerCard } from '../models';

/**
 * Single seam between the app and the MSF API.
 *
 * Stores depend only on this abstraction. Today it is backed by `MockMsfDataSource`;
 * an `ApiMsfDataSource` (HttpClient + OAuth) can replace it in `provideMsfData()`
 * without touching stores or components. Method names map 1:1 to API routes.
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
}
