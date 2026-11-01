import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService, SessionMode } from '../auth/auth.service';
import { MsfDataSource } from '../data/msf-data-source';
import { FarmingStore } from './farming.store';

describe('FarmingStore goals', () => {
  beforeEach(() => localStorage.clear());

  it('keeps demo and account goals apart, following the current mode', () => {
    const mode = signal<SessionMode>('api');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { mode } },
        { provide: MsfDataSource, useValue: {} },
      ],
    });
    const store = TestBed.inject(FarmingStore);
    const goal = {
      characterId: 'A',
      targetYellow: 7,
      targetAbilities: { basic: 1, special: 1, ultimate: 1, passive: 1 },
    };
    store.saveGoal(goal);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('msf.farming.goals.api')!)).toEqual([goal]);

    // The session ends and the player tries the demo: the account's goals stay out of it.
    mode.set('demo');
    TestBed.tick();
    expect(store.goals()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('msf.farming.goals.api')!)).toEqual([goal]);

    mode.set('api');
    expect(store.goals()).toEqual([goal]);
  });
});
