import { RosterEntry, UpgradeData } from '../models';
import { FarmingGoal, planGoal, promotions } from './farming-calc';
import { KeyCharacterRow } from './key-characters';
import { toRosterEntry } from './roster.mapper';
import { todayItems } from './today';

const T1 = { id: 'T1', name: 'Tier 1' };

const upgrade: UpgradeData = {
  yellowStarTotalShards: { '1': 10, '2': 25, '3': 50, '4': 100, '7': 400 },
  abilityUpgradeCosts: { basic: { '2': [{ item: T1, quantity: 5 }] } },
};

function owned(id: string, yellow: number, basic = 1): RosterEntry {
  return {
    ...toRosterEntry({ id, name: `Hero ${id}` }, { id, level: 50, activeYellow: yellow, basic }),
    shardItemId: `SHARD_${id}`,
  };
}

const goal = (id: string, targetYellow: number, basic = 1): FarmingGoal => ({
  characterId: id,
  targetYellow,
  targetAbilities: { basic, special: 0, ultimate: 0, passive: 0 },
});

const inventory = new Map([
  ['SHARD_A', 30], // 2★ → 3★ needs 25: promote now
  ['SHARD_B', 40], // 3★ → 4★ needs 50: close (80%)
  ['SHARD_C', 10], // 3★ → 4★ needs 50: too far (20%)
  ['SHARD_D', 30], // not a goal, but can be promoted
  ['T1', 5],
]);

const [a, b, c, d, h, e] = [
  owned('A', 2),
  owned('B', 3),
  owned('C', 3),
  owned('D', 2),
  owned('H', 7),
  toRosterEntry({ id: 'E', name: 'Hero E' }),
];

const plans = [
  planGoal(goal('C', 7), c, upgrade, inventory),
  planGoal(goal('B', 7), b, upgrade, inventory),
  planGoal(goal('A', 7), a, upgrade, inventory),
  planGoal(goal('H', 7, 2), h, upgrade, inventory), // abilities only, all materials owned
];

const keyRow = (entry: RosterEntry, priority: number): KeyCharacterRow => ({
  key: { name: entry.name, modes: ['war'], why: '', source: '' },
  entry,
  teams: [],
  modes: ['war'],
  status: entry.unlocked ? 'developing' : 'locked',
  priority,
});

describe('today', () => {
  const promos = promotions([a, b, c, d, h], upgrade, inventory);
  const keys = [keyRow(b, 8), keyRow(e, 5), keyRow(c, 0)];

  it('orders promote → goal ready → close → key, one item per character', () => {
    const items = todayItems(plans, promos, keys);
    expect(items.map((i) => [i.kind, i.characterId])).toEqual([
      ['promote', 'A'],
      ['promote', 'D'],
      ['goal-ready', 'H'],
      ['close', 'B'],
      ['key', 'E'],
    ]);
    expect(items[0].link).toEqual(['/farming']);
    expect(items[1].link).toEqual(['/roster', 'D']);
    expect(items[3].text).toContain('Brakuje 10 shardów do 4★');
    expect(items[4].text).toContain('zacznij zbierać shardy');
  });

  it('respects the limit', () => {
    expect(todayItems(plans, promos, keys, 2)).toHaveLength(2);
  });
});
