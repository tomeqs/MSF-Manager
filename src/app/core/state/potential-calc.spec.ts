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
      share: 0.7,
      status: 'developing',
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

  it('marks 7★ characters at ≥95% of max as optimal, and 100% as maxed', () => {
    const at = (power: number, yellow = 7) =>
      memberPower({ ...owned, yellowStars: yellow, power }, MAXED)!;
    expect(at(960_000).status).toBe('optimal');
    expect(at(960_000, 6).status).toBe('developing'); // shards still worth farming
    expect(at(940_000).status).toBe('developing');
    expect(at(999_500).status).toBe('maxed'); // gap below noise threshold
    expect(memberPower(locked, MAXED)!.status).toBe('locked');
  });

  it('reports the team as optimal only when every member is', () => {
    const optimalA = { ...owned, yellowStars: 7, power: 970_000 };
    const devB = { ...owned, id: 'B', yellowStars: 7, power: 800_000 };
    const potential = () => MAXED;

    expect(teamPower([optimalA], potential)).toMatchObject({ optimal: true, toOptimal: 0 });
    expect(teamPower([optimalA, devB], potential)).toMatchObject({
      optimal: false,
      toOptimal: 150_000, // 95% of 1M − 800k
    });
    expect(teamPower([optimalA, locked], potential).optimal).toBe(false);
  });
});
