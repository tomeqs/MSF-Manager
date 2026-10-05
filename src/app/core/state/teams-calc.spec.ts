import { buildRoster } from './roster.mapper';
import { fitTeams, knownTeamFits, mergeOrderings } from './teams-calc';

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

describe('knownTeamFits', () => {
  const roster = buildRoster(
    [
      { id: 'QS', name: 'Quicksilver (Symbiote)' },
      { id: 'RIOT', name: 'Riot' },
      { id: 'TOX', name: 'Toxin' },
      { id: 'X', name: 'Professor Xavier' },
      { id: 'VEN', name: 'Venom' },
      { id: 'KNULL', name: 'Knull' },
      { id: 'ANN', name: 'Annihilus' },
      { id: 'G1', name: 'Gamma One', traits: ['Gamma'] },
      { id: 'G2', name: 'Gamma Two', traits: ['Gamma'] },
      { id: 'G3', name: 'Gamma Three', traits: ['Gamma'] },
    ],
    [
      { id: 'QS', level: 1, power: 500 },
      { id: 'RIOT', level: 1, power: 400 },
      { id: 'TOX', level: 1, power: 300 },
      { id: 'VEN', level: 1, power: 200 },
      { id: 'KNULL', level: 1, power: 100 },
      { id: 'G1', level: 1, power: 10 },
      { id: 'G2', level: 1, power: 20 },
    ],
  );

  it('fills "A|B" slots with the first owned option, else the first known one', () => {
    const fits = knownTeamFits(
      [
        {
          name: 'Symbiote Six',
          modes: ['arena'],
          members: [
            'Quicksilver (Symbiote)',
            'Riot',
            'Toxin',
            'Professor Xavier|Venom',
            'Annihilus|Knull',
          ],
          source: 's',
        },
      ],
      'arena',
      roster,
    );
    // Xavier not owned → Venom; Annihilus not owned → Knull.
    expect(fits.ready.map((f) => f.members.map((m) => m.id))).toEqual([
      ['QS', 'RIOT', 'TOX', 'VEN', 'KNULL'],
    ]);
    expect(fits.ready[0].power).toBe(1500);
  });

  it('reports names missing from the game data and skips teams with too few recognised', () => {
    const fits = knownTeamFits(
      [
        {
          name: 'Half',
          modes: ['war'],
          members: ['Riot', 'Toxin', 'Venom', 'Nobody', 'Ghosty'],
          source: 's',
        },
        {
          name: 'Unknown',
          modes: ['war'],
          members: ['A?', 'B?', 'C?', 'Riot', 'Toxin'],
          source: 's',
        },
        { name: 'Other mode', modes: ['raids'], members: ['Riot'], source: 's' },
      ],
      'war',
      roster,
    );
    expect(fits.almost.map((f) => f.team.name)).toEqual(['Half']);
    expect(fits.almost[0].missing.every((m) => m.unknown)).toBe(true);
    expect(fits.unmatched).toEqual(['Unknown']);
    expect(fits.unrecognized).toEqual(['Nobody', 'Ghosty', 'A?', 'B?', 'C?']);
  });

  it('builds trait teams from the strongest owned members and lists every team in blitz', () => {
    const fits = knownTeamFits(
      [{ name: 'Gamma', modes: ['raids'], traits: ['Gamma'], source: 's' }],
      'blitz',
      roster,
    );
    expect(fits.almost.map((f) => f.members.map((m) => m.id))).toEqual([['G2', 'G1', 'G3']]);
    expect(fits.almost[0].missing.map((m) => m.id)).toEqual(['G3']);
  });
});
