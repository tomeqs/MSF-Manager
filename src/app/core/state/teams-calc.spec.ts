import { buildRoster } from './roster.mapper';
import { fitTeams, mergeOrderings } from './teams-calc';

describe('teams calc', () => {
  it('merges orderings of the same squad and keeps the most common order', () => {
    const teams = mergeOrderings([
      { squad: ['A', 'B', 'C'], total: 10 },
      { squad: ['C', 'B', 'A'], total: 30 },
      { squad: ['D', 'E', 'F'], total: 25 },
    ]);
    expect(teams.map((t) => [t.members, t.popularity, t.share])).toEqual([
      [['C', 'B', 'A'], 40, 1],
      [['D', 'E', 'F'], 25, 25 / 40],
    ]);
  });

  it('splits teams into ready, almost and hidden based on the roster', () => {
    const roster = buildRoster(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'L' }],
      [
        { id: 'A', level: 1, power: 100 },
        { id: 'B', level: 1, power: 50 },
        { id: 'C', level: 1, power: 10 },
        { id: 'L' }, // locked
      ],
    );
    const teams = mergeOrderings([
      { squad: ['A', 'B', 'C'], total: 5 },
      { squad: ['A', 'B', 'L'], total: 9 },
      { squad: ['A', 'X', 'Y'], total: 7 },
      { squad: ['X', 'Y', 'Z'], total: 99 },
    ]);
    const fits = fitTeams(teams, roster);

    expect(fits.ready.map((f) => f.team.members)).toEqual([['A', 'B', 'C']]);
    expect(fits.ready[0].power).toBe(160);
    // Fewest missing first, then popularity.
    expect(fits.almost.map((f) => f.missing.map((m) => m.id))).toEqual([['L'], ['X', 'Y']]);
    expect(fits.hidden).toBe(1);
  });
});
