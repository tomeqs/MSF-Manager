import { CharacterPotential } from '../models';
import { memberPower, teamPower } from './potential-calc';
import { toRosterEntry } from './roster.mapper';

const MAXED: CharacterPotential = {
  power: 1_000_000,
  level: 90,
  gearTier: 20,
  abilities: { basic: 8, special: 8, ultimate: 8, passive: 6 },
};

const owned = toRosterEntry(
  { id: 'A', name: 'A' },
  {
    id: 'A',
    level: 85,
    activeYellow: 5,
    gearTier: 18,
    basic: 8,
    special: 7,
    ultimate: 8,
    passive: 6,
    power: 700_000,
  },
);
const locked = toRosterEntry({ id: 'L', name: 'L' }, undefined);

describe('potential calc', () => {
  it('lists what an owned character is missing and the power gap', () => {
    expect(memberPower(owned, MAXED)).toEqual({
      entry: owned,
      current: 700_000,
      target: 1_000_000,
      gap: 300_000,
      upgrades: ['5★→7★', 'poz. 85→90', 'G18→G20', 'umiejętności'],
    });
  });

  it('counts a locked character fully and never reports negative gaps', () => {
    expect(memberPower(locked, MAXED)).toMatchObject({
      current: 0,
      gap: 1_000_000,
      upgrades: [],
    });
    const strong = { ...owned, power: 1_000_400 };
    expect(memberPower(strong, MAXED)).toMatchObject({ target: 1_000_400, gap: 0 });
  });

  it('sums a team and flags missing potentials as incomplete', () => {
    const power = teamPower([owned, locked], (e) => (e.id === 'A' ? MAXED : undefined));
    expect(power).toMatchObject({
      current: 700_000,
      target: 1_000_000,
      missing: 300_000,
      complete: false,
    });
  });
});
