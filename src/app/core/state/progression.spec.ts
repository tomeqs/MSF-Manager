import { RosterEntry } from '../models';
import { gearCost, gearDifficulty, gearTierCost, progression, realisticGear } from './progression';
import { toRosterEntry } from './roster.mapper';

const owned = (id: string, gearTier: number, power: number): RosterEntry =>
  toRosterEntry({ id, name: id }, { id, level: 90, activeYellow: 7, gearTier, power });

// 10 characters: 6 at G16, 1 at G17, 3 at G14; plus a weak G20 outside the top 10.
const roster = [
  ...[1, 2, 3, 4, 5, 6].map((i) => owned(`a${i}`, 16, 900_000 - i)),
  owned('b', 17, 950_000),
  ...[1, 2, 3].map((i) => owned(`c${i}`, 14, 500_000 - i)),
  owned('weak', 20, 1_000),
  toRosterEntry({ id: 'locked', name: 'locked' }),
];

describe('progression', () => {
  const p = progression(roster, 10);

  it('reads the frontier from the strongest owned characters', () => {
    expect(p.sample).toBe(10);
    expect(p.top).toBe(17);
    expect(p.reach[16]).toBeCloseTo(0.7);
    expect(p.reach[17]).toBeCloseTo(0.1);
    expect(p.frontier).toBe(16);
  });

  it('rates and prices tiers by how rare they are in the roster', () => {
    expect(gearDifficulty(p, 14)).toBe('easy');
    expect(gearDifficulty(p, 16)).toBe('easy');
    expect(gearDifficulty(p, 17)).toBe('hard');
    expect(gearDifficulty(p, 18)).toBe('extreme');
    expect(gearTierCost(p, 16)).toBeCloseTo(0.3 / 0.49);
    expect(gearTierCost(p, 17)).toBeCloseTo(30); // 0.3 / 0.1²
    expect(gearTierCost(p, 18)).toBe(60); // nobody has it: capped
    expect(gearCost(p, 15, 17)).toBeCloseTo(0.3 / 0.49 + 30);
  });

  it('aims for the frontier first, then one tier past it, within the level cap', () => {
    expect(realisticGear(p, 13, 20)).toBe(16);
    expect(realisticGear(p, 16, 20)).toBe(17);
    expect(realisticGear(p, 17, 20)).toBe(17);
    expect(realisticGear(p, 18, 20)).toBe(18);
    expect(realisticGear(p, 13, 15)).toBe(15);
  });
});
