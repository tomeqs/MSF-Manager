import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { AbilityKey, CharacterPotential, RosterEntry, UpgradeData } from '../models';
import {
  AdvisorInput,
  actionSummary,
  advise,
  advisorCandidates,
  bestByCharacter,
  completableTeams,
  recommend,
  teamsSummary,
} from './advisor';
import { toRosterEntry } from './roster.mapper';

const MAX_ABILITIES = { basic: 8, special: 8, ultimate: 8, passive: 6 };

function owned(
  id: string,
  yellow: number,
  power: number,
  gearTier: number,
  abilities: Record<AbilityKey, number> = MAX_ABILITIES,
): RosterEntry {
  return {
    ...toRosterEntry(
      { id, name: id },
      { id, level: 90, activeYellow: yellow, gearTier, power, ...abilities },
    ),
    shardItemId: `SHARD_${id}`,
  };
}

function locked(id: string, unlockStars?: number): RosterEntry {
  return { ...toRosterEntry({ id, name: id, unlockStars }), shardItemId: `SHARD_${id}` };
}

const potential = (power: number, gearTier = 20): CharacterPotential => ({
  power,
  level: 90,
  gearTier,
  abilities: MAX_ABILITIES,
});

const team = (name: string, members: string[]): KnownTeam => ({
  name,
  modes: ['arena'],
  members,
  source: '',
});

const keyChar = (name: string): KeyCharacter => ({ name, modes: ['war'], why: '', source: '' });

// Gear: most of the best characters have G16 (frontier), one has G17/G18 (hard), none G19.
// Squad: A 7★ G16 80%, B 5★ G15 60% (85% reachable at 5★), C locked, D optimal, E maxed.
const roster = [
  owned('A', 7, 800_000, 16),
  owned('B', 5, 600_000, 15),
  locked('C', 3),
  owned('D', 7, 980_000, 16),
  owned('E', 7, 1_000_000, 18),
  owned('F', 7, 500_000, 16),
  locked('G'),
  locked('H'),
  owned('K', 7, 700_000, 14),
  owned('Z', 7, 100_000, 12),
];
const max: Record<string, number> = {
  A: 1_000_000,
  B: 1_000_000,
  D: 1_000_000,
  E: 1_000_000,
  F: 1_000_000,
  K: 1_000_000,
};
const upgrade: UpgradeData = { yellowStarTotalShards: { '3': 50, '5': 155, '7': 410 } };

function input(overrides: Partial<AdvisorInput> = {}): AdvisorInput {
  return {
    roster,
    known: [team('Squad', ['A', 'B', 'C', 'D', 'E']), team('Far', ['F', 'G', 'H'])],
    keys: [keyChar('K')],
    potentialOf: (e) => (max[e.id] ? potential(max[e.id]) : undefined),
    potentialAtStarsOf: (e) => (e.id === 'B' ? potential(850_000) : undefined),
    upgrade,
    inventory: new Map(),
    ...overrides,
  };
}

describe('advisor', () => {
  it('ranks completing the focus team, then cheap upgrades; hard gear and big shard costs last', () => {
    const ranking = recommend(input());
    expect(ranking.map((r) => r.id)).toEqual([
      'C:unlock', // completes the focus team
      'K:upgrade', // G14→G16: cheap tiers
      'B:upgrade', // G15→G16
      'G:unlock', // 410 shards, team barely owned
      'H:unlock',
      'A:upgrade', // G16→G17: a tier only 1 of 7 best characters has
      'B:stars', // 255 shards for 15% more power
    ]);
    expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ranking[0].relative).toBe(1);
  });

  it('aims gear at the player frontier first, then one hard tier past it', () => {
    const best = bestByCharacter(recommend(input()));
    expect(advise(input()).progression).toMatchObject({ frontier: 16, top: 18 });
    expect(best.get('B')!.upgrades).toEqual(['G15→G16']);
    expect(best.get('A')!.upgrades).toEqual(['G16→G17 (G17: trudny)']);
    expect(best.get('A')!.gearDifficulty).toBe('hard');
    // Only one of four remaining tiers is aimed for, so only part of the gap counts.
    expect(best.get('A')!.gain).toBeCloseTo(0.2 * 0.25);
  });

  it('splits upgrade and star gains using the max power at the current stars', () => {
    const b = recommend(input()).filter((r) => r.entry.id === 'B');
    expect(b.map((r) => r.kind)).toEqual(['upgrade', 'stars']);
    expect(b[0].gain).toBeCloseTo(0.25 * 0.2); // one of five gear tiers to the cap
    expect(b[1].gain).toBeCloseTo(0.15);
    expect(b[1].shardsMissing).toBe(255);
  });

  it('weights teams by tier, focus and how ready the other members are', () => {
    const ranking = recommend(input());
    const c = ranking.find((r) => r.id === 'C:unlock')!;
    expect(c.teams[0]).toMatchObject({
      name: 'Squad',
      focus: true,
      completes: true,
      doneOthers: 2,
      readiness: 0.875,
      weight: 1.5, // tier A 0.75 × focus 2
    });
    expect(c.value).toBeCloseTo(1.5 * (0.875 ** 2 + 1.5 * 0.875));
    const g = ranking.find((r) => r.id === 'G:unlock')!;
    expect(g.teams[0]).toMatchObject({ focus: false, nearlyCompletes: true, weight: 0.75 });
    expect(g.value).toBeCloseTo(0.75 * (0.375 ** 2 + 0.5 * 0.375));
  });

  it('skips characters with nothing realistic left to farm and teams the player barely has', () => {
    const ids = new Set(recommend(input()).map((r) => r.entry.id));
    for (const id of ['D', 'E', 'F', 'Z']) expect(ids.has(id)).toBe(false);

    // X is at 85% of its max, but already one tier past the G16 frontier: done for now.
    const squad = ['P', 'Q', 'R', 'S', 'T', 'U'].map((id) => owned(id, 7, 500_000, 16));
    const x = owned('X', 7, 850_000, 17);
    const ranking = recommend(
      input({
        roster: [...squad, x],
        known: [
          team(
            'Seven',
            [...squad, x].map((e) => e.id),
          ),
        ],
        keys: [],
        potentialOf: () => potential(1_000_000),
      }),
    );
    expect(ranking.some((r) => r.entry.id === 'X')).toBe(false);
    expect(ranking.find((r) => r.entry.id === 'P')?.upgrades).toEqual(['G16→G17 (G17: trudny)']);
  });

  it('prices abilities by the materials in the inventory', () => {
    const T4 = { id: 'T4', name: 'T4' };
    const l = owned('L', 7, 900_000, 16, { ...MAX_ABILITIES, basic: 6 });
    const withCosts: UpgradeData = {
      ...upgrade,
      abilityUpgradeCosts: {
        basic: { '7': [{ item: T4, quantity: 10 }], '8': [{ item: T4, quantity: 10 }] },
      },
    };
    const run = (t4: number) =>
      recommend(
        input({
          roster: [l],
          known: [],
          keys: [keyChar('L')],
          potentialOf: () => potential(1_000_000, 16),
          upgrade: withCosts,
          inventory: new Map([['T4', t4]]),
        }),
      )[0];

    expect(run(20)).toMatchObject({ upgrades: ['umiejętności +2'] });
    expect(run(20).effort).toBeCloseTo(1 + 2 * 0.05);
    expect(run(10)).toMatchObject({ upgrades: ['umiejętności +2 (brakuje materiałów)'] });
    expect(run(10).effort).toBeCloseTo(1 + 2 * 0.05 + 0.5 * 10);
  });

  it('counts shards already in the inventory', () => {
    const ranking = recommend(input({ inventory: new Map([['SHARD_C', 400]]) }));
    expect(ranking[0]).toMatchObject({ id: 'C:unlock', shardsMissing: 10 });
    expect(actionSummary(ranking[0])).toBe('Masz shardy na odblokowanie (3★), potem 10 do 7★');
  });

  it('estimates gains while potentials are loading', () => {
    const ranking = recommend(
      input({ potentialOf: () => undefined, potentialAtStarsOf: () => undefined }),
    );
    const byId = new Map(ranking.map((r) => [r.id, r]));
    expect(byId.get('K:upgrade')?.estimated).toBe(true);
    expect(byId.get('B:stars')?.estimated).toBe(true);
  });

  it('describes the action and the teams behind it', () => {
    const ranking = recommend(input());
    const best = bestByCharacter(ranking);
    expect(actionSummary(best.get('B')!)).toBe('G15→G16 — bez shardów');
    expect(actionSummary(ranking.find((r) => r.id === 'B:stars')!)).toBe(
      'Brakuje 255 shardów do 7★',
    );
    expect(actionSummary(best.get('C')!)).toBe(
      'Do odblokowania (3★) brakuje 50 shardów, potem 360 do 7★',
    );
    expect(actionSummary(best.get('G')!)).toBe('Do odblokowania (7★) brakuje 410 shardów');
    expect(teamsSummary(best.get('C')!)).toBe('Fokus · skompletuje Squad');
    expect(teamsSummary(best.get('B')!)).toBe('Fokus · Squad (masz 3/4 pozostałych)');
    expect(teamsSummary(best.get('G')!)).toBe('Far (po nim brakuje jeszcze 1)');
    expect(teamsSummary(best.get('K')!)).toBe('postać kluczowa');
  });

  it('lists owned team members and key characters as potential candidates', () => {
    const ids = advisorCandidates(input().known, input().keys, roster).map((e) => e.id);
    expect(ids.sort()).toEqual(['A', 'B', 'D', 'E', 'F', 'K']);
  });

  it('lists teams one or two unlocks away from complete, cheapest first', () => {
    const known = [
      team('Far', ['F', 'G', 'H']),
      team('Squad', ['A', 'B', 'C', 'D', 'E']),
      team('Misspelled', ['A', 'B', 'D', 'Nobody']),
    ];
    const powerOf = (e: RosterEntry) =>
      ({ D: { status: 'optimal' }, E: { status: 'maxed' } })[e.id] as never;

    const teams = completableTeams(known, roster, upgrade, new Map(), powerOf);
    expect(teams.map((t) => [t.team.name, t.shardsMissing, t.readyNow])).toEqual([
      ['Squad', 50, false],
      ['Far', 820, false],
    ]);
    expect(teams[0].missing[0]).toMatchObject({ stars: 3, needed: 50, owned: 0, missing: 50 });
    expect(teams[0].optimalMembers).toBe(2);

    const withShards = completableTeams(
      known,
      roster,
      upgrade,
      new Map([
        ['SHARD_G', 410],
        ['SHARD_H', 500],
      ]),
    );
    expect(withShards.map((t) => [t.team.name, t.readyNow])).toEqual([
      ['Far', true],
      ['Squad', false],
    ]);
  });
});
