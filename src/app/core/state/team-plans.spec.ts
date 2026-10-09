import { KnownTeam } from '../data/known-meta';
import { RosterEntry } from '../models';
import { toRosterEntry } from './roster.mapper';
import { teamPlans } from './team-plans';

const owned = (id: string): RosterEntry =>
  toRosterEntry({ id, name: id }, { id, level: 90, activeYellow: 7, power: 1 });
const locked = (id: string): RosterEntry => toRosterEntry({ id, name: id });

const team = (name: string, members: string[], extra: Partial<KnownTeam> = {}): KnownTeam => ({
  name,
  modes: ['arena'],
  members,
  source: '',
  ...extra,
});

describe('team plans', () => {
  // share per id: how far each owned character is built.
  const share: Record<string, number> = { a: 0.9, b: 0.9, c: 0.9, d: 0.5, e: 0.5, f: 1, g: 1 };
  const done = new Set(['f', 'g']);
  const roster = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(owned).concat([locked('x')]);
  const stateOf = (e: RosterEntry) => ({ share: share[e.id] ?? 0, done: done.has(e.id) });

  it('focuses on the strongest, closest teams that still need work (at most three)', () => {
    const plans = teamPlans(
      [
        team('Close S', ['a', 'b', 'c'], { tier: 'S' }),
        team('Close B', ['a', 'b', 'c'], { tier: 'B' }),
        team('Half', ['d', 'e', 'x']),
        team('Built', ['f', 'g']),
        team('Typo', ['a', 'b', 'c', 'Nobody']),
        team('Multi', ['d', 'e'], { modes: ['arena', 'war', 'crucible'] }),
      ],
      roster,
      stateOf,
    );
    const byName = new Map(plans.map((p) => [p.team.name, p]));

    expect(byName.get('Close S')).toMatchObject({ closeness: 0.9, owned: 3, focus: true });
    expect(byName.get('Built')).toMatchObject({ complete: true, focus: false });
    expect(byName.get('Typo')!.focus).toBe(false); // a member is not in the game data
    expect(byName.get('Half')!.focus).toBe(false); // closeness 0.33 is too far
    expect(plans.filter((p) => p.focus).map((p) => p.team.name)).toEqual([
      'Close S',
      'Close B',
      'Multi',
    ]);
    // Tier and modes weigh in: S beats B at the same closeness, 3 modes add 30%.
    expect(byName.get('Close S')!.score).toBeCloseTo(0.81);
    expect(byName.get('Multi')!.score).toBeCloseTo(0.75 * 1.3 * 0.25);
  });
});
