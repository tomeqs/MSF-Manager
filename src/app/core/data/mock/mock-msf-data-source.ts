import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
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
} from '../../models';
import { MsfDataSource } from '../msf-data-source';
import { MOCK_CHARACTERS } from './mock-characters';
import { mockEvents } from './mock-events';
import { MOCK_INVENTORY, MOCK_UPGRADE_DATA } from './mock-farming';
import { MOCK_PLAYER } from './mock-player';
import { MOCK_ROSTER } from './mock-roster';
import { mockPotential } from './mock-potential';
import { MOCK_TEAM_ORDER } from './mock-teams';

/** Simulated network latency so loading states are visible during development. */
const LATENCY_MS = 250;

@Injectable({ providedIn: 'root' })
export class MockMsfDataSource extends MsfDataSource {
  getPlayerCard(): Observable<PlayerCard> {
    return of(MOCK_PLAYER).pipe(delay(LATENCY_MS));
  }

  getRoster(): Observable<CharacterInstance[]> {
    return of(MOCK_ROSTER).pipe(delay(LATENCY_MS));
  }

  getCharacters(): Observable<CharacterInfo[]> {
    return of(MOCK_CHARACTERS).pipe(delay(LATENCY_MS));
  }

  getEvents(): Observable<EventInfo[]> {
    return of(mockEvents(Date.now())).pipe(delay(LATENCY_MS));
  }

  getInventory(): Observable<ItemQuantity[]> {
    return of(MOCK_INVENTORY).pipe(delay(LATENCY_MS));
  }

  getUpgradeData(): Observable<UpgradeData> {
    return of(MOCK_UPGRADE_DATA).pipe(delay(LATENCY_MS));
  }

  getTeamOrder(tab: TeamTab): Observable<TeamOrder[]> {
    return of(MOCK_TEAM_ORDER[tab] ?? []).pipe(delay(LATENCY_MS));
  }

  getPotential(characterId: string, target: PotentialTarget): Observable<CharacterPotential> {
    return of(mockPotential(characterId, target)).pipe(delay(LATENCY_MS));
  }
}
