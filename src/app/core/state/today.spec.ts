import { RosterEntry, UpgradeData } from '../models';
import { Recommendation } from './advisor';
import { FarmingGoal, planGoal, promotions } from './farming-calc';
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
  ['SHARD_A', 30], // goal, 2★ → 3★ needs 25: promote now
  ['SHARD_D', 30], // not a goal, ranked: promote now
  ['SHARD_N', 30], // not a goal, not ranked: not worth mentioning
  ['T1', 5],
]);

const [a, b, d, h, n, r] = [
  owned('A', 2),
  owned('B', 3),
  owned('D', 2),
  owned('H', 7),
  owned('N', 2),
  owned('R', 7),
];

const plans = [
  planGoal(goal('B', 7), b, upgrade, inventory),
  planGoal(goal('A', 7), a, upgrade, inventory),
  planGoal(goal('H', 7, 2), h, upgrade, inventory), // abilities only, all materials owned
];

const rec = (entry: RosterEntry, kind: Recommendation['kind'], rank: number): Recommendation => ({
  id: `${entry.id}:${kind}`,
  entry,
  kind,
  rank,
  score: 1 / rank,
  relative: 1 / rank,
  value: 1,
  gain: 0.2,
  effort: 2,
  teams: [
    {
      name: 'Squad',
      modes: ['arena'],
      others: 4,
      ownedOthers: 4,
      optimalOthers: 1,
      readiness: 0.8,
    },
  ],
  modes: ['arena'],
  key: false,
  shardsMissing: kind === 'upgrade' ? 0 : 120,
  upgrades: kind === 'upgrade' ? ['G17→G20'] : [],
  estimated: false,
});

describe('today', () => {
  const promos = promotions([a, b, d, h, n, r], upgrade, inventory);
  const ranking = [
    rec(r, 'upgrade', 1),
    rec(d, 'upgrade', 2),
    rec(b, 'upgrade', 3),
    rec(r, 'stars', 4),
  ];

  it('orders free promotions → ready goals → ranking, one item per character', () => {
    const items = todayItems(plans, promos, ranking);
    expect(items.map((i) => [i.kind, i.characterId])).toEqual([
      ['promote', 'D'],
      ['promote', 'A'],
      ['goal-ready', 'H'],
      ['upgrade', 'R'],
      ['upgrade', 'B'],
    ]);
    expect(items[0].link).toEqual(['/roster', 'D']);
    expect(items[1].link).toEqual(['/farming']);
    expect(items[3]).toMatchObject({ text: 'G17→G20', why: 'Squad (reszta gotowa)' });
  });

  it('respects the limit', () => {
    expect(todayItems(plans, promos, ranking, 2)).toHaveLength(2);
  });
});
