import { CharacterKit, RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { arrange, assistantProposals, memberNeeds, planSquads } from './squad-assistant';
import { squadOptions } from './squads';
import { buildSynergy } from './synergy';

const t = (id: string) => ({ id, name: id });
const owned = (id: string, power: number, traits: string[] = []): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) }, { id, level: 90, power, activeYellow: 7 });

const roster: RosterEntry[] = [
  ...['S1', 'S2', 'S3', 'S4', 'S5'].map((id, i) => owned(id, 900 - i * 10, ['Sym'])),
  ...['W1', 'W2', 'W3'].map((id, i) => owned(id, 800 - i * 10, ['Wak'])),
  ...['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'].map((id, i) => owned(id, 300 - i)),
];
const synergy = buildSynergy(roster, []);
const options = squadOptions({
  tab: 'war',
  roster,
  known: [
    { name: 'Sym', modes: ['war'], tier: 'S', members: ['S1', 'S2', 'S3', 'S4', 'S5'], source: '' },
  ],
  community: [],
  saved: [],
  synergy,
});
const ids = (members: RosterEntry[]) => members.map((m) => m.id);

describe('squad assistant', () => {
  it('proposes known squads first, then kit squads, never repeating a character', () => {
    const proposals = assistantProposals({
      options,
      roster,
      taken: new Set(),
      skipped: new Set(),
      synergy,
    });
    expect(proposals[0].option.name).toBe('Sym');
    expect(ids(proposals[1].option.members).slice(0, 3).sort()).toEqual(['W1', 'W2', 'W3']);
    const all = proposals.flatMap((p) => ids(p.option.members));
    expect(new Set(all).size).toBe(all.length);
    // 15 characters: three full squads, never a partial one from the leftovers.
    expect(proposals.every((p) => p.option.members.length === 5)).toBe(true);
  });

  it('never proposes characters already in a saved squad', () => {
    const taken = new Set(['S1', 'W1']);
    const proposals = assistantProposals({ options, roster, taken, skipped: new Set(), synergy });
    const all = proposals.flatMap((p) => ids(p.option.members));
    expect(all).not.toContain('S1');
    expect(all).not.toContain('W1');
    expect(proposals.some((p) => p.option.name === 'Sym')).toBe(false); // S1 is in use
  });

  it('shows another proposal when one is skipped', () => {
    const first = assistantProposals({
      options,
      roster,
      taken: new Set(),
      skipped: new Set(),
      synergy,
    });
    const next = assistantProposals({
      options,
      roster,
      taken: new Set(),
      skipped: new Set([first[0].option.key]),
      synergy,
    });
    expect(next[0].option.key).not.toBe(first[0].option.key);
    expect(next.some((p) => p.option.key === first[0].option.key)).toBe(false);
  });

  it('puts a character acting on neighbours in the middle, next to its best partners', () => {
    const kits: CharacterKit[] = [
      { id: 'W1', traits: [], texts: { passive: 'Adjacent Wak allies gain Speed Up.' } },
    ];
    const s = buildSynergy(roster, kits);
    const squad = assistantProposals({
      options,
      roster,
      taken: new Set(['S1', 'S2', 'S3', 'S4', 'S5']),
      skipped: new Set(),
      synergy: s,
    })
      .map((p) => p.option)
      .find((o) => o.members.some((m) => m.id === 'W1'))!;
    const lineup = arrange(squad, s);
    expect(lineup.members[2].id).toBe('W1');
    expect([lineup.members[1].id, lineup.members[3].id].sort()).toEqual(['W2', 'W3']);
    expect(lineup.note).toContain('w środku');
    expect(arrange(options[0], synergy).note).toContain('ustaw dowolnie');
  });
});

describe('ready vs to-farm plans', () => {
  // A: a known team; A4 is 5★ (needs stars), A5 locked. W: a ready trait trio + fillers.
  const ownedAt = (id: string, power: number, yellow: number, traits: string[]) =>
    toRosterEntry(
      { id, name: id, traits: traits.map(t), unlockStars: 3 },
      { id, level: 90, power, activeYellow: yellow, gearTier: 16 },
    );
  const team: RosterEntry[] = [
    ...['A1', 'A2', 'A3'].map((id) => ownedAt(id, 700, 7, ['Av'])),
    ownedAt('A4', 650, 5, ['Av']),
    toRosterEntry({ id: 'A5', name: 'A5', traits: [t('Av')], unlockStars: 3 }),
    ...['W1', 'W2', 'W3', 'F1', 'F2'].map((id) =>
      ownedAt(id, 600, 7, id.startsWith('W') ? ['Wak'] : []),
    ),
  ];
  const s = buildSynergy(team, []);
  const opts = squadOptions({
    tab: 'war',
    roster: team,
    known: [
      {
        name: 'Avengers',
        modes: ['war'],
        tier: 'S',
        war: 'offense',
        members: ['A1', 'A2', 'A3', 'A4', 'A5'],
        source: '',
      },
    ],
    community: [],
    saved: [],
    synergy: s,
  });
  const ctx = {
    frontier: 16,
    upgrade: { yellowStarTotalShards: { '3': 50, '5': 155, '7': 410 } },
    inventory: new Map(),
  };
  const needsOf = (e: RosterEntry) => memberNeeds(e, ctx);

  it('says what each character still needs: unlock, stars, gear behind the stage', () => {
    expect(memberNeeds(team[3], ctx)).toEqual([
      expect.objectContaining({ kind: 'stars', text: '5★→7★, brakuje 255 shardów' }),
    ]);
    expect(memberNeeds(team[4], ctx)[0]).toMatchObject({
      kind: 'unlock',
      text: 'odblokuj — masz 0/50 shardów',
    });
    const behind = ownedAt('G', 1, 7, []);
    expect(memberNeeds({ ...behind, gearTier: 13 }, ctx)).toEqual([
      expect.objectContaining({ kind: 'gear', text: 'G13→G16' }),
    ]);
    expect(memberNeeds(team[0], ctx)).toEqual([]);
  });

  it('proposes only ready squads now and lists the known team that needs farming', () => {
    const plan = planSquads({
      options: opts,
      roster: team,
      taken: new Set(),
      skipped: new Set(),
      synergy: s,
      needsOf,
    });
    const readyIds = plan.ready.flatMap((p) => ids(p.option.members));
    expect(readyIds).not.toContain('A4'); // 5★: not ready
    expect(plan.toFarm[0].option.name).toBe('Avengers');
    expect(plan.toFarm[0].needs.map((n) => [n.name, n.kind])).toEqual([
      ['A4', 'stars'],
      ['A5', 'unlock'],
    ]);
  });

  it('keeps War teams to their side', () => {
    const defense = planSquads({
      options: opts,
      roster: team,
      taken: new Set(),
      skipped: new Set(),
      synergy: s,
      needsOf,
      allows: (o) => o.warRole !== 'offense',
    });
    expect(defense.toFarm.some((p) => p.option.name === 'Avengers')).toBe(false);
  });
});
