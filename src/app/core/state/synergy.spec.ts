import { CharacterKit, RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { buildSynergy, cohesion, tokens } from './synergy';

const hero = { id: 'Hero', name: 'Hero' };
const sym = { id: 'Symbiote', name: 'Symbiote' };
const spider = { id: 'SpiderVerse', name: 'Spider-Verse' };

const entry = (id: string, traits = [hero]): RosterEntry =>
  toRosterEntry({ id, name: id, traits }, { id, level: 90, activeYellow: 7, power: 1 });
const kit = (id: string, passive: string): CharacterKit => ({ id, traits: [], texts: { passive } });

// Hero is common (6 of 8), Symbiote and Spider-Verse rare (2 each).
const roster = [
  entry('Venom', [hero, sym]),
  entry('Carnage', [hero, sym]),
  entry('Miles', [hero, spider]),
  entry('Gwen', [hero, spider]),
  entry('Steve'),
  entry('Thor'),
  entry('Loner', []),
  entry('Other', []),
];

describe('synergy', () => {
  it('links a kit to the characters with the traits and names it boosts', () => {
    const s = buildSynergy(roster, [
      kit('Venom', 'Symbiote allies gain Offense Up. When Spider-Man (Miles) is an ally…'),
      kit('Miles', 'Deal bonus damage to Symbiote enemies. Hero allies gain Speed Up.'),
      kit('Gwen', 'Non-Symbiote allies gain Evade.'),
      kit('Thor', 'Gain Counter while Steve is an ally.'),
    ]);
    expect(s.fromKits).toBe(true);
    const venomCarnage = s.links('Venom', 'Carnage');
    expect(venomCarnage.map((l) => [l.kind, l.via])).toEqual([
      ['trait', 'Symbiote'],
      ['shared', 'Symbiote'],
    ]);
    // Enemy and "non-…" mentions do not link; the generic Hero trait is ignored.
    expect(s.pair('Miles', 'Carnage')).toBe(0);
    expect(s.pair('Gwen', 'Venom')).toBe(0);
    expect(s.pair('Miles', 'Steve')).toBe(0);
    expect(s.links('Venom', 'Miles')[0]).toMatchObject({ kind: 'name', via: 'Miles' });
    expect(s.links('Thor', 'Steve')[0]).toMatchObject({ kind: 'name', from: 'Thor', weight: 1.5 });
  });

  it('falls back to shared rare traits without kits', () => {
    const s = buildSynergy(roster, []);
    expect(s.fromKits).toBe(false);
    expect(s.links('Miles', 'Gwen').map((l) => l.kind)).toEqual(['shared']);
    expect(s.pair('Steve', 'Thor')).toBe(0); // Hero is too common to count
    expect(cohesion(['Miles', 'Gwen'], s)).toBeGreaterThan(cohesion(['Miles', 'Steve'], s));
  });

  it('reads plain words from kit markup', () => {
    expect(tokens('<b>Spider-Verse</b> allies gain +10% Speed.')).toEqual([
      'spider',
      'verse',
      'allies',
      'gain',
      '10',
      'speed',
    ]);
  });
});
