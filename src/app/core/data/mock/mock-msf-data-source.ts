import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CharacterInfo, CharacterInstance, EventInfo, PlayerCard } from '../../models';
import { MsfDataSource } from '../msf-data-source';
import { MOCK_CHARACTERS } from './mock-characters';
import { mockEvents } from './mock-events';
import { MOCK_PLAYER } from './mock-player';
import { MOCK_ROSTER } from './mock-roster';

/** Simulated network latency so loading states are visible during development. */
const LATENCY_MS = 250;

@Injectable()
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
}
