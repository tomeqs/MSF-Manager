import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CharacterInfo, CharacterInstance, EventInfo, PlayerCard } from '../models';
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

  getEvents(): Observable<EventInfo[]> {
    return this.source.getEvents();
  }
}
