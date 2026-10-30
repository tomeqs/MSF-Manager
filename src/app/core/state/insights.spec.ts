import { CharacterKit, CharacterPotential, IsoClass, RosterEntry } from '../models';
import { abilityOrder, isoAdvice, isoLagging, potentialSummary } from './insights';
import { toRosterEntry } from './roster.mapper';

const entry = (
  id: string,
  power: number,
  yellow = 7,
  iso?: { active: IsoClass; level: number },
  abilities = { basic: 8, special: 8, ultimate: 8, passive: 6 },
): RosterEntry =>
  toRosterEntry(
    { id, name: id },
    {
      id,
      level: 90,
      power,
      activeYellow: yellow,
      ...abilities,
      iso8: iso ? { active: iso.active, [iso.active]: iso.level } : undefined,
    },
  );
const potential = (power: number): CharacterPotential => ({
  power,
  abilities: { basic: 8, special: 8, ultimate: 8, passive: 6 },
});

describe('insights', () => {
  it('splits the remaining power into upgrades and stars', () => {
    const seven = entry('Seven', 800);
    const five = entry('Five', 500, 5);
    const loading = entry('Loading', 300, 4);
    const max: Record<string, number> = { Seven: 1000, Five: 1000, Loading: 900 };
    const summary = potentialSummary(
      [seven, five, loading],
      (e) => potential(max[e.id]),
      (e) => (e.id === 'Five' ? potential(700) : undefined),
    );
    expect(summary).toMatchObject({ loaded: 2, total: 3, current: 1300, max: 2000 });
    const byId = new Map(summary.rows.map((r) => [r.entry.id, r]));
    expect(byId.get('Seven')).toMatchObject({ withoutShards: 200, fromStars: 0, share: 0.8 });
    expect(byId.get('Five')).toMatchObject({ withoutShards: 200, fromStars: 300 });
    expect(summary.withoutShards).toBe(400);
  });

  it('suggests the ISO-8 class a clear majority of players picks', () => {
    const kits = new Map<string, CharacterKit>([
      ['A', { id: 'A', traits: [], texts: {}, isoAdoption: { raider: 0.7, striker: 0.2 } }],
      ['B', { id: 'B', traits: [], texts: {}, isoAdoption: { raider: 0.45, striker: 0.4 } }],
      ['C', { id: 'C', traits: [], texts: {}, isoAdoption: { healer: 0.8 } }],
      ['D', { id: 'D', traits: [], texts: {}, isoAdoption: { raider: 0.55, striker: 0.35 } }],
    ]);
    const advice = isoAdvice(
      [
        entry('A', 9, 7, { active: 'striker', level: 10 }),
        entry('B', 8, 7, { active: 'striker', level: 10 }), // no clear majority
        entry('C', 7), // no class set
        entry('D', 6, 7, { active: 'striker', level: 10 }), // 35% is still a common choice
      ],
      (id) => kits.get(id),
    );
    expect(advice.map((a) => [a.entry.id, a.current, a.best])).toEqual([
      ['A', 'striker', 'raider'],
      ['C', undefined, 'healer'],
    ]);
  });

  it('flags ISO-8 levels well below the usual one', () => {
    const pool = [10, 11, 12, 6, 12].map((level, i) =>
      entry(`I${i}`, 100 - i, 7, { active: 'striker', level }),
    );
    expect(isoLagging(pool).map((e) => e.id)).toEqual(['I3']);
  });

  it('orders abilities the way players develop them', () => {
    const kit: CharacterKit = {
      id: 'X',
      traits: [],
      texts: {},
      t4Adoption: { passive: 0.9, ultimate: 0.7, special: 0.5, basic: 0.2 },
    };
    const max = { basic: 8, special: 8, ultimate: 8, passive: 6 };
    const x = entry('X', 1, 7, undefined, { basic: 8, special: 7, ultimate: 8, passive: 4 });
    const order = abilityOrder(x, kit, max)!;
    expect(order.steps.map((s) => s.key)).toEqual(['passive', 'ultimate', 'special', 'basic']);
    expect(order.next).toMatchObject({ key: 'passive', level: 4, max: 6 });
    expect(order.offOrder).toBe(true); // basic is maxed before the passive
    const done = entry('Y', 1);
    expect(abilityOrder(done, kit, max)).toBeUndefined();
  });
});
