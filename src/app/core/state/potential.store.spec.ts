import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { CharacterPotential } from '../models';
import { PotentialStore } from './potential.store';
import { toRosterEntry } from './roster.mapper';

const entry = (id: string) => toRosterEntry({ id, name: id }, { id, level: 50, activeRed: 8 });
const value = (power: number): CharacterPotential => ({
  power,
  abilities: { basic: 1, special: 1, ultimate: 1, passive: 1 },
});

describe('PotentialStore', () => {
  it('runs at most 4 requests at once, dedupes and retries failures later', () => {
    const pending: Subject<CharacterPotential>[] = [];
    let fail = true;
    const getPotential = vi.fn((id: string) => {
      if (id === 'BAD' && fail) return throwError(() => new Error('boom'));
      const s = new Subject<CharacterPotential>();
      pending.push(s);
      return s;
    });
    TestBed.configureTestingModule({
      providers: [{ provide: MsfDataSource, useValue: { getPotential } }],
    });
    const store = TestBed.inject(PotentialStore);
    const entries = ['BAD', 'A', 'B', 'C', 'D', 'E'].map(entry);

    store.ensure(entries, 90);
    store.ensure(entries, 90);
    // BAD fails immediately and frees its slot; A-D fill the 4 slots; E waits.
    expect(getPotential).toHaveBeenCalledTimes(5);
    expect(getPotential.mock.calls[1]).toEqual(['A', { level: 90, red: 8, isoClass: undefined }]);

    pending[0].next(value(123));
    pending[0].complete();
    expect(store.get(entries[1], 90)?.power).toBe(123);
    expect(getPotential).toHaveBeenCalledTimes(6); // E started

    fail = false;
    store.ensure(entries, 90); // BAD is queued again but all 4 slots are busy
    expect(getPotential).toHaveBeenCalledTimes(6);
    pending[1].complete(); // B finishes → BAD retried
    expect(getPotential.mock.calls.at(-1)?.[0]).toBe('BAD');
  });
});
