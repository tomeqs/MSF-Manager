import { CharacterKit, RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { arrange, assistantProposals } from './squad-assistant';
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
