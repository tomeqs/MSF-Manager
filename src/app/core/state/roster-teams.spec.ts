import { KnownTeam } from '../data/known-meta';
import { CharacterKit, RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { rosterTeams } from './roster-teams';
import { arrange } from './squad-assistant';
import { synergySquad } from './squads';
import { buildSynergy } from './synergy';

const t = (id: string) => ({ id, name: id });
const owned = (id: string, power: number, traits: string[]): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) }, { id, level: 90, power, activeYellow: 7 });
const locked = (id: string, traits: string[]): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) });

// Hydra: seven owned (H6 a weaker healer), one locked. Trio: three owned. Fillers: strong loners.
const roster: RosterEntry[] = [
  ...[100, 99, 98, 97, 96].map((p, i) => owned(`H${i + 1}`, p * 10, ['Hydra', 'Villain'])),
  owned('H6', 930, ['Hydra', 'Villain', 'Support']),
  owned('H7', 500, ['Hydra', 'Villain']),
  locked('H8', ['Hydra']),
  ...[800, 790, 780].map((p, i) => owned(`T${i + 1}`, p, ['Trio', 'Hero'])),
  owned('F1', 2000, ['Hero']),
  owned('Mentor', 700, ['Hero']),
  owned('F3', 690, ['Hero']),
];
const kits: CharacterKit[] = [
  { id: 'H6', traits: [], texts: { special: 'Heal all allies for 20% of their Max Health.' } },
  { id: 'T1', traits: [], texts: { passive: 'Mentor gains Offense Up when T1 is an ally.' } },
];
const synergy = buildSynergy(roster, kits);
const kitOf = (id: string) => kits.find((k) => k.id === id);

describe('rosterTeams', () => {
  it('keeps team traits only (no sides, roles or origins)', () => {
    const { teams } = rosterTeams({ roster, synergy });
    expect(teams.map((x) => x.name).sort()).toEqual(['Hydra', 'Trio']);
  });

  it('picks the strongest five of a big team and explains the bench', () => {
    const hydra = rosterTeams({ roster, synergy }).teams.find((x) => x.name === 'Hydra')!;
    expect(hydra.option.members.map((m) => m.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5']);
    expect(hydra.inGame).toBe(8);
    expect(hydra.locked.map((m) => m.id)).toEqual(['H8']);
    expect(hydra.bench.map((b) => b.entry.id)).toEqual(['H6', 'H7']);
    expect(hydra.bench[0].replaces?.id).toBe('H5');
    expect(hydra.bench[0].loss).toBeGreaterThan(0);
  });

  it('takes a weaker healer when the kits show nobody else heals', () => {
    const hydra = rosterTeams({ roster, synergy, kitOf }).teams.find((x) => x.name === 'Hydra')!;
    expect(hydra.option.members.map((m) => m.id)).toContain('H6');
    expect(hydra.option.members.map((m) => m.id)).not.toContain('H5');
  });

  it('fills a short team from outside, synergy before raw power', () => {
    const trio = rosterTeams({ roster, synergy }).teams.find((x) => x.name === 'Trio')!;
    expect(trio.fillers.map((m) => m.id)).toEqual(['Mentor', 'F1']);
    expect(trio.option.members).toHaveLength(5);
  });

  it('uses every character once in exclusive mode', () => {
    const { teams } = rosterTeams({ roster, synergy, exclusive: true });
    const ids = teams.flatMap((x) => x.option.members.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('takes fillers a later team does not need (exclusive mode)', () => {
    const r = [
      ...['A1', 'A2', 'A3'].map((id) => owned(id, 1000, ['Alpha'])),
      ...['B1', 'B2', 'B3'].map((id) => owned(id, 900, ['Beta'])),
      ...['L1', 'L2', 'L3', 'L4'].map((id) => owned(id, 100, ['Hero'])),
    ];
    const { teams } = rosterTeams({ roster: r, synergy: buildSynergy(r, []), exclusive: true });
    expect(teams.map((x) => x.name)).toEqual(['Alpha', 'Beta']);
    expect(teams[0].fillers.map((m) => m.id).sort()).toEqual(['L1', 'L2']);
  });

  it('never proposes characters from saved squads, not even as fillers', () => {
    const taken = new Set(['H1', 'Mentor', 'T2']);
    const { teams } = rosterTeams({ roster, synergy, taken });
    const proposed = teams.flatMap((x) => x.option.members.map((m) => m.id));
    expect(proposed.filter((id) => taken.has(id))).toEqual([]);
    const hydra = teams.find((x) => x.name === 'Hydra')!;
    expect(hydra.inSquads.map((m) => m.id)).toEqual(['H1']);
    expect(hydra.elsewhere).toEqual([]);
  });

  it('lists teams whose members are mostly in saved squads as blocked', () => {
    const { teams, blocked, partial } = rosterTeams({
      roster,
      synergy,
      taken: new Set(['T1', 'T2']),
    });
    expect(teams.map((x) => x.name)).toEqual(['Hydra']);
    expect(blocked).toEqual([{ id: 'Trio', name: 'Trio', owned: 3, free: 1 }]);
    expect(partial).toEqual([]);
  });

  it('reports teams with too few owned members as partial', () => {
    const few = [owned('P1', 100, ['Pair']), owned('P2', 90, ['Pair']), locked('P3', ['Pair'])];
    const { teams, partial } = rosterTeams({ roster: few, synergy: buildSynergy(few, []) });
    expect(teams).toEqual([]);
    expect(partial).toEqual([{ id: 'Pair', name: 'Pair', owned: 2, inGame: 3 }]);
  });

  it('takes tier, modes and the guide line-up from a matching known team', () => {
    const known: KnownTeam[] = [
      {
        name: 'Hydra',
        modes: ['raids'],
        tier: 'B',
        members: ['H1', 'H2', 'H3', 'H4', 'H5'],
        lineup: 'H1 w środku.',
        source: '',
      },
    ];
    const hydra = rosterTeams({ roster, synergy, known }).teams.find((x) => x.name === 'Hydra')!;
    expect(hydra.option.tier).toBe('B');
    expect(hydra.known).toEqual([{ name: 'Hydra', tier: 'B', modes: ['raids'] }]);
    expect(hydra.arrangement.note).toBe('Według poradnika: H1 w środku.');
  });
});

describe('rosterTeams: other known teams', () => {
  it('lists a known team sharing characters, without taking its tier', () => {
    const known: KnownTeam[] = [
      { name: 'Elite', modes: ['war'], tier: 'S', members: ['H6', 'H7', 'H8', 'F1'], source: '' },
    ];
    const hydra = rosterTeams({ roster, synergy, known }).teams.find((x) => x.name === 'Hydra')!;
    expect(hydra.known.map((k) => k.name)).toEqual(['Elite']);
    expect(hydra.option.tier).toBeUndefined();
  });
});

describe('arrange: positions', () => {
  it('puts the strongest Protector in a corner, a Brawler beside it, Supports far away', () => {
    const squad = [
      owned('Sup', 900, ['Support']),
      owned('Tank', 800, ['Protector']),
      owned('Bra', 700, ['Brawler']),
      owned('Bla', 600, ['Blaster']),
      owned('Con', 500, ['Controller']),
    ];
    const s = buildSynergy(squad, []);
    const lineup = arrange(synergySquad(squad, s), s);
    expect(lineup.members.map((m) => m.id)).toEqual(['Tank', 'Bra', 'Bla', 'Con', 'Sup']);
    expect(lineup.note).toContain('w rogu');
    expect(lineup.reason).toContain('wniosek z mechaniki');
  });

  it('ignores splash on adjacent enemies (not about the own line-up)', () => {
    const squad = ['A', 'B', 'C', 'D', 'E'].map((id, i) => owned(id, 500 - i, ['X']));
    const s = buildSynergy(squad, [
      { id: 'A', traits: [], texts: { basic: 'Attack primary and adjacent enemies.' } },
    ]);
    expect(s.positional('A')).toBe(false);
    expect(arrange(synergySquad(squad, s), s).note).toContain('ustaw dowolnie');
  });
});
