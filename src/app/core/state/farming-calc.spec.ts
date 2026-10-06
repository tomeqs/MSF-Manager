import { RosterEntry, UpgradeData } from '../models';
import {
  FarmingGoal,
  aggregateMaterials,
  cumulativeCostsBetween,
  goalFor,
  levelCostsBetween,
  nextStar,
  planGoal,
  promotions,
  shardsBetween,
  toInventory,
} from './farming-calc';
import { toRosterEntry } from './roster.mapper';

const GOLD = { id: 'GOLD', name: 'Złoto' };
const T1 = { id: 'T1', name: 'Tier 1' };

const upgrade: UpgradeData = {
  yellowStarTotalShards: { '1': 10, '2': 25, '3': 50, '7': 400 },
  yellowStarTotalCosts: {
    '2': [{ item: GOLD, quantity: 1000 }],
    '3': [{ item: GOLD, quantity: 3000 }],
  },
  abilityUpgradeCosts: {
    basic: { '2': [{ item: T1, quantity: 5 }], '3': [{ item: T1, quantity: 7 }] },
  },
};

function entry(yellow: number, basic: number, shardItemId = 'SHARD_X'): RosterEntry {
  return {
    ...toRosterEntry(
      { id: 'X', name: 'Hero X' },
      { id: 'X', level: 50, activeYellow: yellow, basic },
    ),
    shardItemId,
  };
}

const goal = (targetYellow: number, basic: number): FarmingGoal => ({
  characterId: 'X',
  targetYellow,
  targetAbilities: { basic, special: 0, ultimate: 0, passive: 0 },
});

describe('farming calc', () => {
  it('computes shards between cumulative totals, treating 0 stars as 0 shards', () => {
    expect(shardsBetween(upgrade.yellowStarTotalShards, 1, 3)).toBe(40);
    expect(shardsBetween(upgrade.yellowStarTotalShards, 0, 2)).toBe(25);
    expect(shardsBetween(upgrade.yellowStarTotalShards, 3, 3)).toBe(0);
  });

  it('subtracts cumulative costs and sums per-level costs', () => {
    expect(cumulativeCostsBetween(upgrade.yellowStarTotalCosts, 2, 3)).toEqual([
      { item: GOLD, quantity: 2000 },
    ]);
    expect(levelCostsBetween(upgrade.abilityUpgradeCosts!.basic, 1, 3)).toEqual([
      { item: T1, quantity: 12 },
    ]);
    expect(levelCostsBetween(upgrade.abilityUpgradeCosts!.basic, 3, 3)).toEqual([]);
  });

  it('plans a goal against the inventory', () => {
    const inventory = toInventory([
      { item: 'SHARD_X', quantity: 30 },
      { item: 'GOLD', quantity: 5000 },
      { item: 'T1', quantity: 3 },
    ]);
    const plan = planGoal(goal(3, 2), entry(1, 1), upgrade, inventory);

    expect(plan.shards).toEqual({ needed: 40, owned: 30, missing: 10, tracked: true });
    expect(plan.materials).toEqual([
      { itemId: 'T1', name: 'Tier 1', icon: undefined, needed: 5, owned: 3, missing: 2 },
      { itemId: 'GOLD', name: 'Złoto', icon: undefined, needed: 3000, owned: 5000, missing: 0 },
    ]);
    expect(plan.affordable).toBe(false);
    expect(plan.reached).toBe(false);
  });

  it('marks a goal already met as reached', () => {
    const plan = planGoal(goal(3, 1), entry(3, 1), upgrade, new Map());
    expect(plan.reached).toBe(true);
    expect(plan.affordable).toBe(true);
  });

  it('aggregates materials across goals against one inventory', () => {
    const inventory = toInventory([{ item: 'GOLD', quantity: 4000 }]);
    const plans = [
      planGoal(goal(3, 1), entry(2, 1), upgrade, inventory),
      planGoal(goal(3, 1), entry(2, 1), upgrade, inventory),
    ];
    // Each goal needs 2000 gold; the totals combine them against the same 4000.
    expect(aggregateMaterials(plans, inventory, upgrade)).toEqual([
      { itemId: 'GOLD', name: 'Złoto', icon: undefined, needed: 4000, owned: 4000, missing: 0 },
    ]);
  });

  it('finds the next star or unlock and whether owned shards cover it', () => {
    const inventory = new Map([['SHARD_X', 30]]);
    expect(nextStar(entry(2, 1), upgrade, inventory)).toEqual({
      stars: 3,
      needed: 25,
      owned: 30,
      ready: true,
    });
    expect(nextStar(entry(1, 1), upgrade, new Map())).toMatchObject({ needed: 15, ready: false });
    expect(nextStar(entry(7, 1), upgrade, inventory)).toBeUndefined();
    expect(nextStar(entry(2, 1), upgrade, inventory, 2)).toBeUndefined();
    expect(nextStar(entry(2, 1, ''), upgrade, inventory)).toBeUndefined();

    const locked = {
      ...toRosterEntry({ id: 'L', name: 'Locked', unlockStars: 2 }),
      shardItemId: 'SHARD_L',
    };
    expect(nextStar(locked, upgrade, new Map([['SHARD_L', 25]]))).toEqual({
      stars: 2,
      needed: 25,
      owned: 25,
      ready: true,
    });
    expect(promotions([entry(2, 1), locked], upgrade, inventory).map((p) => p.entry.id)).toEqual([
      'X',
    ]);
  });

  it('builds goals towards unlock or the max build', () => {
    const max = { basic: 8, special: 8, ultimate: 8, passive: 6 };
    expect(goalFor(entry(3, 2), max)).toEqual({
      characterId: 'X',
      targetYellow: 7,
      targetAbilities: max,
    });
    expect(goalFor(entry(3, 2), undefined, 5).targetYellow).toBe(5);
    expect(goalFor(toRosterEntry({ id: 'L', name: 'L', unlockStars: 3 }), max)).toEqual({
      characterId: 'L',
      targetYellow: 3,
      targetAbilities: { basic: 0, special: 0, ultimate: 0, passive: 0 },
    });
  });
});
