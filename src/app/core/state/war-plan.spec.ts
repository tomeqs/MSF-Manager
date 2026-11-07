import { KNOWN_META, KnownTeam } from '../data/known-meta';
import { WAR_DEFENSES, WAR_TEAM_STATUS, WarDefense } from '../data/war-meta';
import { CharacterKit, RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { MemberNeed } from './squad-assistant';
import { buildSynergy } from './synergy';
import { fitCounter, warPlan } from './war-plan';

const t = (id: string) => ({ id, name: id });
const owned = (id: string, power: number, traits: string[], yellow = 7): RosterEntry =>
  toRosterEntry(
    { id, name: id, traits: traits.map(t) },
    { id, level: 90, power, activeYellow: yellow },
  );
const locked = (id: string, traits: string[]): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) });

const roster: RosterEntry[] = [
  // Ready team.
  ...['Ace', 'Bolt', 'Coil', 'Dart', 'Echo'].map((id, i) => owned(id, 900 - i * 10, ['Alpha'])),
  // Four owned, the Protector locked.
  ...['Fang', 'Gale', 'Husk', 'Iris'].map((id, i) => owned(id, 800 - i * 10, ['Beast'])),
  locked('Jolt', ['Beast', 'Protector']),
  // One weak member (5★).
  ...['Kite', 'Lynx', 'Mist', 'Nova'].map((id, i) => owned(id, 700 - i * 10, ['Gamma'])),
  owned('Onyx', 500, ['Gamma'], 5),
  // Candidates: a strong loner, a Protector sharing the team trait, a plug-and-play.
  owned('Titan', 2000, ['Hero']),
  owned('Wall', 600, ['Beast', 'Protector']),
  owned('Plug', 650, ['Hero']),
  // Mostly locked team.
  owned('Quill', 400, ['Delta']),
  ...['Rook', 'Sage', 'Tusk', 'Urn'].map((id) => locked(id, ['Delta'])),
];
const kits: CharacterKit[] = [];
const synergy = buildSynergy(roster, kits);
const needsOf = (e: RosterEntry): MemberNeed[] =>
  e.unlocked && e.yellowStars < 7
    ? [{ name: e.name, entry: e, kind: 'stars', text: `${e.yellowStars}★→7★` }]
    : [];
const team = (name: string, members: string[], war?: 'offense' | 'defense'): KnownTeam => ({
  name,
  modes: ['war'],
  tier: 'A',
  members,
  war,
  source: '',
});
const known: KnownTeam[] = [
  team('Alpha', ['Ace', 'Bolt', 'Coil', 'Dart', 'Echo'], 'defense'),
  team('Beast', ['Fang', 'Gale', 'Husk', 'Iris', 'Jolt'], 'offense'),
  team('Gamma', ['Kite', 'Lynx', 'Mist', 'Nova', 'Onyx']),
  team('Delta', ['Quill', 'Rook', 'Sage', 'Tusk', 'Urn'], 'offense'),
];
const input = {
  roster,
  synergy,
  needsOf,
  known,
  defenses: [] as WarDefense[],
  keyCharacters: [{ name: 'Plug', modes: ['war' as const], why: '', source: '' }],
};

describe('warPlan', () => {
  const plan = warPlan(input);
  const fit = (name: string) => [...plan.defense, ...plan.offense].find((f) => f.name === name)!;

  it('splits War teams into defense and offense (no role = both)', () => {
    expect(plan.defense.map((f) => f.name).sort()).toEqual(['Alpha', 'Gamma']);
    expect(plan.offense.map((f) => f.name).sort()).toEqual(['Beast', 'Delta', 'Gamma']);
  });

  it('marks a fully owned, ready team as ready', () => {
    expect(fit('Alpha').verdict).toBe('ready');
    expect(fit('Alpha').swaps).toEqual([]);
  });

  it('replaces a missing member: same role and team trait before raw power', () => {
    const beast = fit('Beast');
    expect(beast.verdict).toBe('substitute');
    expect(beast.swaps[0].slot.label).toBe('Jolt');
    expect(beast.swaps[0].by.entry.id).toBe('Wall');
    expect(beast.swaps[0].by.role).toBe('Protector');
    expect(beast.option.members.map((m) => m.id)).toContain('Wall');
  });

  it('keeps a weak member but offers ready, stronger characters instead', () => {
    const gamma = fit('Gamma');
    expect(gamma.verdict).toBe('develop');
    const onyx = gamma.slots.find((s) => s.label === 'Onyx')!;
    expect(onyx.state).toBe('weak');
    expect(onyx.substitutes.every((s) => !s.needs.length && s.entry.power >= 500)).toBe(true);
  });

  it('calls a team with fewer than three owned members far, without substitutes', () => {
    expect(fit('Delta').verdict).toBe('far');
    expect(fit('Delta').swaps).toEqual([]);
    expect(fit('Delta').option.missing).toEqual(['Rook', 'Sage', 'Tusk', 'Urn']);
  });

  it('calls a team with none of its characters in the game data far', () => {
    const empty = warPlan({
      ...input,
      known: [{ name: 'Ghosts', modes: ['war'], traits: ['Nobody'], source: '' }],
    });
    expect(empty.defense[0].verdict).toBe('far');
  });

  it('sorts ready teams first', () => {
    expect(plan.defense[0].name).toBe('Alpha');
  });
});

describe('fitCounter', () => {
  it('adds the counter’s characters and drops the least useful member', () => {
    const fit = fitCounter(
      { label: 'Alpha + Plug', team: 'Alpha', plus: ['Plug'], confidence: '' },
      input,
    );
    expect(fit.option.members.map((m) => m.id)).toContain('Plug');
    expect(fit.option.members).toHaveLength(5);
    expect(fit.dropped.map((m) => m.id)).toEqual(['Echo']);
    expect(fit.slots[0].required).toBe(true);
  });

  it('never offers a member the counter leaves out as its substitute', () => {
    const fit = fitCounter(
      {
        label: 'Alpha + Jolt bez Ace',
        team: 'Alpha',
        plus: ['Jolt'],
        minus: ['Ace'],
        confidence: '',
      },
      input,
    );
    expect(fit.swaps.map((s) => s.by.entry.id)).not.toContain('Ace');
  });

  it('leaves out members the counter says to skip', () => {
    const fit = fitCounter(
      { label: 'Alpha bez Ace', team: 'Alpha', plus: ['Titan'], minus: ['Ace'], confidence: '' },
      input,
    );
    expect(fit.option.members.map((m) => m.id)).not.toContain('Ace');
    expect(fit.dropped).toEqual([]);
  });

  it('picks the counter the player is best placed to use', () => {
    const defenses: WarDefense[] = [
      {
        team: 'Alpha',
        counters: [
          { label: 'Delta', team: 'Delta', punch: '▲▲▲', confidence: '' },
          { label: 'Beast', team: 'Beast', confidence: '' },
          { label: 'Gamma', team: 'Gamma', punch: '▲▲', confidence: '' },
        ],
        source: '',
      },
    ];
    const answer = warPlan({ ...input, defenses }).answers[0];
    expect(answer.counters[answer.best!].counter.label).toBe('Gamma');
  });
});

describe('war meta data', () => {
  it('refers only to teams in known-meta', () => {
    const names = new Set(KNOWN_META.map((k) => k.name));
    const refs = [
      ...WAR_DEFENSES.map((d) => d.team),
      ...WAR_DEFENSES.flatMap((d) => d.counters.map((c) => c.team)).filter((n) => !!n),
      ...Object.keys(WAR_TEAM_STATUS),
    ];
    expect(refs.filter((n) => !names.has(n!))).toEqual([]);
  });

  it('gives every counter a team, a trait or a line-up', () => {
    const bad = WAR_DEFENSES.flatMap((d) => d.counters).filter(
      (c) => !c.team && !c.trait && !c.members,
    );
    expect(bad).toEqual([]);
  });
});
