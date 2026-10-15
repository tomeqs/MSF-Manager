import { CHARACTER_SOURCES, CharacterSource } from '../data/character-sources';
import { KnownTeam } from '../data/known-meta';
import { RosterEntry, UpgradeData } from '../models';
import { advise, recommend } from './advisor';
import { toRosterEntry } from './roster.mapper';
import { isObtainableNow, sourceLookup } from './sources';
import { teamPlans, teamWeight } from './team-plans';

const src = (name: string, status: CharacterSource['status']): CharacterSource => ({
  name,
  teams: '',
  status,
  source: 'x',
  confidence: 'OFF',
});

const owned = (id: string, power = 500_000): RosterEntry => ({
  ...toRosterEntry({ id, name: id }, { id, level: 90, activeYellow: 7, gearTier: 16, power }),
  shardItemId: `SHARD_${id}`,
});
const locked = (id: string): RosterEntry => ({
  ...toRosterEntry({ id, name: id, unlockStars: 3 }),
  shardItemId: `SHARD_${id}`,
});

const team = (name: string, members: string[], modes: KnownTeam['modes']): KnownTeam => ({
  name,
  modes,
  members,
  source: '',
});

describe('character sources', () => {
  it('has one valid entry per character', () => {
    const names = CHARACTER_SOURCES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(CHARACTER_SOURCES.length).toBeGreaterThan(100);
    for (const s of CHARACTER_SOURCES) {
      expect(s.source.length).toBeGreaterThan(0);
      if (s.url) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it('finds a source by name ignoring case and punctuation', () => {
    const of = sourceLookup([src('Spider-Man (Miles)', 'permanent')]);
    expect(of(owned('spiderman miles'))?.status).toBe('permanent');
    expect(of(owned('Nobody'))).toBeUndefined();
    expect(isObtainableNow(src('A', 'event'))).toBe(true);
    expect(isObtainableNow(src('A', 'paid'))).toBe(false);
    expect(isObtainableNow(undefined)).toBe(true);
  });

  it('prices shards by how open the source is now; a live event wins', () => {
    const upgrade: UpgradeData = { yellowStarTotalShards: { '3': 50, '7': 410 } };
    const roster = [owned('A'), owned('B'), owned('C'), owned('D'), locked('X')];
    const run = (status: CharacterSource['status'], live = false) =>
      recommend({
        roster,
        known: [team('Squad', ['A', 'B', 'C', 'D', 'X'], ['raids'])],
        keys: [],
        potentialOf: () => undefined,
        potentialAtStarsOf: () => undefined,
        upgrade,
        inventory: new Map(),
        sourceOf: (e) => (e.id === 'X' ? src('X', status) : undefined),
        offers: live
          ? new Map([
              [
                'SHARD_X',
                [
                  {
                    event: { id: 'e', type: 'milestone', startTime: 0, endTime: 9e12 },
                    itemId: 'SHARD_X',
                    guaranteed: 0,
                    premium: 0,
                    possible: 0,
                    live: true,
                  },
                ],
              ],
            ])
          : undefined,
      }).find((r) => r.id === 'X:unlock')!;

    expect(run('permanent').source?.status).toBe('permanent');
    expect(run('event').effort).toBeLessThan(run('permanent').effort);
    expect(run('orb').effort).toBeGreaterThan(run('permanent').effort);
    expect(run('unavailable').effort).toBeGreaterThan(run('paid').effort);
    expect(run('unavailable', true).effort).toBeCloseTo(run('event').effort);
  });
});

describe('advisor focus with sources', () => {
  it('still focuses a team whose closed-source member can be unlocked with owned shards', () => {
    const roster = ['A', 'B', 'C', 'D'].map((id) => owned(id, 900_000)).concat([locked('X')]);
    const plansWith = (shards: number) =>
      advise({
        roster,
        known: [team('Squad', ['A', 'B', 'C', 'D', 'X'], ['raids'])],
        keys: [],
        potentialOf: () => undefined,
        potentialAtStarsOf: () => undefined,
        upgrade: { yellowStarTotalShards: { '3': 50, '7': 410 } },
        inventory: new Map([['SHARD_X', shards]]),
        sourceOf: (e) => (e.id === 'X' ? src('X', 'unavailable') : undefined),
      }).plans[0];
    expect(plansWith(10)).toMatchObject({ blocked: true, focus: false });
    expect(plansWith(50)).toMatchObject({ blocked: false, focus: true });
  });
});

describe('team plans with sources and modes', () => {
  const roster = ['a', 'b', 'c', 'd'].map((id) => owned(id, 1)).concat([locked('x')]);
  const stateOf = () => ({ share: 0.9, done: false });

  it('does not focus on a team whose missing member cannot be obtained now', () => {
    const plans = teamPlans(
      [team('Stuck', ['a', 'b', 'c', 'd', 'x'], ['war'])],
      roster,
      stateOf,
      (e) => e.id !== 'x',
    );
    expect(plans[0]).toMatchObject({ blocked: true, focus: false });
  });

  it('weighs a team by what its best mode pays (Arena only gives Training Modules)', () => {
    expect(teamWeight(team('Raid', [], ['raids']))).toBeCloseTo(0.75);
    expect(teamWeight(team('Arena', [], ['arena']))).toBeCloseTo(0.75 * 0.6);
    expect(teamWeight(team('Both', [], ['arena', 'war']))).toBeCloseTo(0.75 * 1.15);
  });
});
