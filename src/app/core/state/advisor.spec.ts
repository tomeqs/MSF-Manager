import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { CharacterPotential, RosterEntry, UpgradeData } from '../models';
import {
  AdvisorInput,
  actionSummary,
  advisorCandidates,
  bestByCharacter,
  recommend,
  teamsSummary,
} from './advisor';
import { toRosterEntry } from './roster.mapper';

const MAX_ABILITIES = { basic: 8, special: 8, ultimate: 8, passive: 6 };

function owned(id: string, yellow: number, power: number, gearTier = 18): RosterEntry {
  return {
    ...toRosterEntry(
      { id, name: id },
      { id, level: 90, activeYellow: yellow, gearTier, power, ...MAX_ABILITIES },
    ),
    shardItemId: `SHARD_${id}`,
  };
}

function locked(id: string): RosterEntry {
  return { ...toRosterEntry({ id, name: id }), shardItemId: `SHARD_${id}` };
}

const potential = (power: number): CharacterPotential => ({
  power,
  level: 90,
  gearTier: 20,
  abilities: MAX_ABILITIES,
});

const team = (name: string, members: string[]): KnownTeam => ({
  name,
  modes: ['arena'],
  members,
  source: '',
});

const keyChar = (name: string): KeyCharacter => ({ name, modes: ['war'], why: '', source: '' });

// Squad: A 7★ 80%, B 5★ 60% (85% reachable at 5★), C locked, D optimal, E maxed.
const roster = [
  owned('A', 7, 800_000),
  owned('B', 5, 600_000),
  locked('C'),
  owned('D', 7, 980_000),
  owned('E', 7, 1_000_000, 20),
  owned('F', 7, 500_000),
  locked('G'),
  locked('H'),
  owned('K', 7, 700_000),
  owned('Z', 7, 100_000),
];
const max: Record<string, number> = {
  A: 1_000_000,
  B: 1_000_000,
  D: 1_000_000,
  E: 1_000_000,
  F: 1_000_000,
  K: 1_000_000,
};
const upgrade: UpgradeData = { yellowStarTotalShards: { '5': 155, '7': 410 } };

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
  it('puts cheap upgrades before shards, and shard-heavy work last', () => {
    const ranking = recommend(input());
    expect(ranking.map((r) => r.id)).toEqual([
      'K:upgrade',
      'B:upgrade',
      'A:upgrade',
      'C:unlock',
      'G:unlock', // 410 shards for a team with only F owned
      'H:unlock',
      'B:stars', // 255 shards for 15% more power
    ]);
    expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ranking[0].relative).toBe(1);
  });

  it('splits upgrade and star gains using the max power at the current stars', () => {
    const b = recommend(input()).filter((r) => r.entry.id === 'B');
    expect(b.map((r) => [r.kind, r.gain])).toEqual([
      ['upgrade', 0.25],
      ['stars', 0.15],
    ]);
    expect(b[1].shardsMissing).toBe(255);
    expect(b[0].upgrades).toEqual(['G18→G20']);
  });

  it('values teams by how ready the other members are', () => {
    const [squadC] = recommend(input()).find((r) => r.id === 'C:unlock')!.teams;
    expect(squadC).toMatchObject({ others: 4, ownedOthers: 4, optimalOthers: 2, readiness: 0.875 });
    const [squadA] = recommend(input()).find((r) => r.id === 'A:upgrade')!.teams;
    expect(squadA).toMatchObject({ ownedOthers: 3, readiness: 0.6875 });
  });

  it('skips optimal/maxed characters and teams the player barely has', () => {
    const ids = new Set(recommend(input()).map((r) => r.entry.id));
    for (const id of ['D', 'E', 'F', 'Z']) expect(ids.has(id)).toBe(false);
  });

  it('counts shards already in the inventory', () => {
    const ranking = recommend(input({ inventory: new Map([['SHARD_C', 400]]) }));
    expect(ranking[0]).toMatchObject({ id: 'C:unlock', shardsMissing: 10 });
  });

  it('estimates gains while potentials are loading', () => {
    const ranking = recommend(
      input({
        roster: roster.map((e) => (e.id === 'A' ? owned('A', 7, 800_000, 10) : e)),
        potentialOf: () => undefined,
        potentialAtStarsOf: () => undefined,
      }),
    );
    const byId = new Map(ranking.map((r) => [r.id, r]));
    // A: 7★ G10 → estimated room to grow with gear. B: G18, full abilities → only stars left.
    expect(byId.get('A:upgrade')?.estimated).toBe(true);
    expect(byId.get('B:stars')?.estimated).toBe(true);
    expect(byId.has('B:upgrade')).toBe(false);
  });

  it('describes the action and the teams behind it', () => {
    const ranking = recommend(input());
    const best = bestByCharacter(ranking);
    expect(best.get('B')!.kind).toBe('upgrade');
    expect(actionSummary(best.get('B')!)).toBe('G18→G20 — bez shardów');
    expect(actionSummary(ranking.find((r) => r.id === 'B:stars')!)).toBe(
      'Brakuje 255 shardów do 7★',
    );
    expect(actionSummary(best.get('C')!)).toBe('Odblokuj i dobij do 7★: brakuje 410 shardów');
    expect(teamsSummary(best.get('C')!)).toBe('Squad (reszta gotowa)');
    expect(teamsSummary(best.get('A')!)).toBe('Squad (masz 3/4 pozostałych)');
    expect(teamsSummary(best.get('K')!)).toBe('postać kluczowa');
  });

  it('lists owned team members and key characters as potential candidates', () => {
    const ids = advisorCandidates(input().known, input().keys, roster).map((e) => e.id);
    expect(ids.sort()).toEqual(['A', 'B', 'D', 'E', 'F', 'K']);
  });
});
