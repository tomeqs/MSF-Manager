import { KnownTeam } from '../data/known-meta';
import { RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { looseCharacters, modePlan, reviewSaved, squadOptions } from './squads';
import { buildSynergy } from './synergy';

const t = (id: string) => ({ id, name: id });
const owned = (id: string, power: number, traits: string[] = []): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) }, { id, level: 90, power, activeYellow: 7 });
const locked = (id: string, traits: string[] = []): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) });

// Two trait teams of five, a strong pair (W1, W2) with a rare trait of its own, and fillers.
const roster: RosterEntry[] = [
  ...['S1', 'S2', 'S3', 'S4', 'S5'].map((id, i) => owned(id, 900 - i * 10, ['Sym'])),
  ...['A1', 'A2', 'A3', 'A4'].map((id, i) => owned(id, 500 - i * 10, ['Av'])),
  locked('A5', ['Av']),
  owned('W1', 950, ['Wak']),
  owned('W2', 940, ['Wak']),
  ...['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].map((id, i) => owned(id, 300 - i)),
];
const synergy = buildSynergy(roster, []);
const known: KnownTeam[] = [
  {
    name: 'Symbiotes',
    modes: ['war'],
    tier: 'S',
    members: ['S1', 'S2', 'S3', 'S4', 'S5'],
    source: '',
  },
  {
    name: 'Avengers',
    modes: ['war'],
    tier: 'A',
    members: ['A1', 'A2', 'A3', 'A4', 'A5'],
    source: '',
  },
];
const options = (saved: string[][] = []) =>
  squadOptions({ tab: 'war', roster, known, community: [], saved, synergy });

describe('squads', () => {
  it('scores what the player can field now; missing members score 0', () => {
    const list = options([['W1', 'W2', 'F1', 'F2', 'F3']]);
    expect(list[0]).toMatchObject({ name: 'Symbiotes', origins: ['meta'], missing: [] });
    expect(list.find((o) => o.name === 'Avengers')).toMatchObject({ score: 0, missing: ['A5'] });
    const own = list.find((o) => o.saved)!;
    expect(own).toMatchObject({ origins: ['saved'], order: 'saved' });
    expect(own.score).toBeLessThan(list[0].score); // no meta backing, little synergy
  });

  it('plans squads without repeating characters, then builds from the kits', () => {
    const plan = modePlan(options(), roster, synergy, 3);
    expect(plan.squads[0].name).toBe('Symbiotes');
    const rest = plan.squads.slice(1);
    expect(rest.every((s) => s.origins[0] === 'synergy')).toBe(true);
    expect(rest[0].members.slice(0, 2).map((m) => m.id)).toEqual(['W1', 'W2']);
    const ids = plan.squads.flatMap((s) => s.members.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reviews saved squads: meta, a few swaps from it, or a weak link', () => {
    const saved = [
      ['S1', 'S2', 'S3', 'S4', 'S5'],
      ['S1', 'S2', 'S3', 'F1', 'F2'],
      ['W1', 'F3', 'F4', 'F5', 'F6'],
    ];
    const reviews = reviewSaved(saved, options(saved), roster, synergy);
    expect(reviews.map((r) => r.verdict)).toEqual(['meta', 'near', 'custom']);
    expect(reviews[1].target?.name).toBe('Symbiotes');
    expect(reviews[1].swaps.map((s) => [s.out?.id, s.in?.id])).toEqual([
      ['F1', 'S4'],
      ['F2', 'S5'],
    ]);
    // W2 shares a rare trait with W1 — a better fit than any filler.
    expect(reviews[2].swaps[0].in?.id).toBe('W2');
    expect(reviews[2].reason).toMatchObject({ kind: 'shared', via: 'Wak' });
  });

  it('pairs strong characters that have no squad with their best partners', () => {
    const homes = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'A1', 'A2', 'A3', 'A4', 'W2']);
    const loose = looseCharacters(roster, homes, synergy, 2);
    expect(loose[0].entry.id).toBe('W1');
    expect(loose[0].partners.map((p) => p.entry.id)).toEqual(['W2']);
    expect(loose[0].squad.members.map((m) => m.id).slice(0, 2)).toEqual(['W1', 'W2']);
  });

  it('lists loose characters that share a squad once', () => {
    const homes = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'A1', 'A2', 'A3', 'A4']);
    const loose = looseCharacters(roster, homes, synergy);
    expect(loose[0].entry.id).toBe('W1');
    expect(loose[0].together.map((e) => e.id)).toContain('W2');
    expect(loose.some((l) => l.entry.id === 'W2')).toBe(false);
  });
});
