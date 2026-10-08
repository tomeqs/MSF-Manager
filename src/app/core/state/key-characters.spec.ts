import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { CharacterPotential } from '../models';
import { Recommendation } from './advisor';
import { keyCharacterRows } from './key-characters';
import { toRosterEntry } from './roster.mapper';

const MAXED: CharacterPotential = {
  power: 1_000_000,
  level: 90,
  gearTier: 20,
  abilities: { basic: 8, special: 8, ultimate: 8, passive: 6 },
};

const key = (name: string, modes: KeyCharacter['modes']): KeyCharacter => ({
  name,
  modes,
  why: '',
  source: 'https://example.com',
});

const team = (name: string, modes: KnownTeam['modes'], members: string[]): KnownTeam => ({
  name,
  modes,
  members,
  source: 'https://example.com',
});

const roster = [
  toRosterEntry(
    { id: 'A', name: 'Alt A' },
    { id: 'A', level: 80, activeYellow: 5, power: 500_000 },
  ),
  toRosterEntry({ id: 'B', name: 'Locked B' }),
  toRosterEntry(
    { id: 'C', name: 'Done C' },
    { id: 'C', level: 90, activeYellow: 7, power: 990_000 },
  ),
];

const ranked = (id: string, rank: number) =>
  [id, { rank, entry: roster.find((e) => e.id === id) } as Recommendation] as const;

describe('key characters', () => {
  const rows = keyCharacterRows(
    [
      key('Hero A|Alt A', ['arena']),
      key('Locked B', ['war']),
      key('Ghost', ['raids']),
      key('Done C', ['arena']),
    ],
    [
      team('T1', ['crucible'], ['Alt A', 'Locked B', 'Someone']),
      team('T2', ['war'], ['Other|Locked B']),
    ],
    roster,
    () => MAXED,
    new Map([ranked('A', 7), ranked('B', 2), ranked('C', 1)]),
  );
  const byName = new Map(rows.map((r) => [r.key.name, r]));

  it('resolves alternative spellings and collects teams and modes', () => {
    const a = byName.get('Hero A|Alt A')!;
    expect(a.entry?.id).toBe('A');
    expect(a.teams).toEqual(['T1']);
    expect(a.modes).toEqual(['arena', 'crucible']);
    expect(a.status).toBe('developing');
    expect(byName.get('Locked B')!.teams).toEqual(['T1', 'T2']);
  });

  it('follows the ranking; done and unknown characters go last', () => {
    expect(rows.map((r) => [r.key.name, r.recommendation?.rank])).toEqual([
      ['Locked B', 2],
      ['Hero A|Alt A', 7],
      ['Done C', undefined],
      ['Ghost', undefined],
    ]);
    expect(byName.get('Done C')!.status).toBe('optimal');
    expect(byName.get('Ghost')).toMatchObject({ status: 'unknown', entry: undefined });
  });
});
