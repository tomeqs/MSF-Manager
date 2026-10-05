import { Requirements } from '../models';
import { checkRequirements, describeRequirements, eventSquads } from './requirements';
import { buildRoster } from './roster.mapper';

const roster = buildRoster(
  [
    { id: 'A', name: 'A', traits: ['Mutant', 'Hero'] },
    { id: 'B', name: 'B', traits: ['Mutant'] },
    { id: 'C', name: 'C', traits: ['Mutant'], invisibleTraits: ['Legendary'] },
    { id: 'D', name: 'D', traits: ['Mutant', 'Villain'] },
    { id: 'E', name: 'E', traits: ['Mutant'] },
    { id: 'F', name: 'F', traits: ['Mutant'] },
    { id: 'G', name: 'G', traits: ['Bio'] },
    { id: 'L', name: 'L', traits: ['Mutant'] },
  ],
  [
    { id: 'A', level: 90, activeYellow: 7, gearTier: 19, power: 900 },
    { id: 'B', level: 90, activeYellow: 7, gearTier: 18, power: 800 },
    { id: 'C', level: 90, activeYellow: 6, gearTier: 17, power: 700 },
    { id: 'D', level: 90, activeYellow: 6, gearTier: 16, power: 600 },
    { id: 'E', level: 90, activeYellow: 6, gearTier: 15, power: 500 },
    { id: 'F', level: 90, activeYellow: 5, gearTier: 15, power: 400 },
    { id: 'G', level: 90, activeYellow: 7, gearTier: 20, power: 999 },
    { id: 'L' },
  ],
);
const byId = (id: string) => roster.find((e) => e.id === id)!;
const MUTANT_6: Requirements = {
  anyCharacterFilters: [{ allTraits: [{ id: 'Mutant', name: 'Mutant' }], activeYellow: 6 }],
};

describe('requirements', () => {
  it('checks traits (incl. invisible) and lists stat shortfalls', () => {
    expect(checkRequirements(byId('A'), MUTANT_6)).toMatchObject({ fits: true, shortfalls: [] });
    expect(checkRequirements(byId('F'), MUTANT_6)).toMatchObject({
      fits: true,
      shortfalls: ['5★ (wym. 6★)'],
      minYellow: 6,
    });
    expect(checkRequirements(byId('G'), MUTANT_6).fits).toBe(false);
    expect(checkRequirements(byId('L'), MUTANT_6).shortfalls).toEqual(['zablokowana']);
    const legendary: Requirements = { anyCharacterFilters: [{ allTraits: ['Legendary'] }] };
    expect(checkRequirements(byId('C'), legendary).fits).toBe(true);
    const noVillains: Requirements = {
      anyCharacterFilters: [{ allTraits: ['Mutant'], exceptTraits: ['Villain'] }],
    };
    expect(checkRequirements(byId('D'), noVillains).fits).toBe(false);
  });

  it('builds disjoint squads of the strongest qualifying characters and near-misses', () => {
    const result = eventSquads(roster, MUTANT_6);
    expect(result.qualifying).toBe(5);
    expect(result.squads.map((s) => s.members.map((e) => e.id))).toEqual([
      ['A', 'B', 'C', 'D', 'E'],
    ]);
    expect(result.squads[0].power).toBe(3500);
    expect(result.nearMisses.map((n) => n.entry.id)).toEqual(['F', 'L']);

    const small = eventSquads(roster, { ...MUTANT_6, maxCharacters: 2, minCharacters: 2 });
    expect(small.squads.map((s) => s.members.map((e) => e.id))).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('puts required specific characters first and allows only that squad', () => {
    const result = eventSquads(roster, { ...MUTANT_6, specificCharacters: ['E'] });
    expect(result.squads.map((s) => s.members.map((e) => e.id))).toEqual([
      ['E', 'A', 'B', 'C', 'D'],
    ]);
  });

  it('describes requirements when the API gives no description', () => {
    expect(describeRequirements(MUTANT_6)).toBe('Mutant · min. 6★');
    expect(describeRequirements({ description: 'Tylko X' })).toBe('Tylko X');
    expect(describeRequirements(undefined)).toBe('Bez wymagań — dowolne postacie.');
  });
});
