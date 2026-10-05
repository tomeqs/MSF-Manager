import { buildRoster, toRosterEntry } from './roster.mapper';

describe('toRosterEntry', () => {
  it('splits activeRed into red stars and diamonds', () => {
    const entry = toRosterEntry(
      { id: 'SpiderMan', name: 'Spider-Man' },
      { id: 'SpiderMan', level: 95, activeYellow: 7, activeRed: 9, power: 1 },
    );
    expect(entry.redStars).toBe(7);
    expect(entry.diamonds).toBe(2);
    expect(entry.unlocked).toBe(true);
  });

  it('normalizes string traits and reads the active ISO-8 class level', () => {
    const entry = toRosterEntry(
      { id: 'Storm', traits: ['Mutant', { id: 'Xmen', name: 'X-Men' }] },
      { id: 'Storm', level: 80, iso8: { active: 'striker', striker: 11 } },
    );
    expect(entry.name).toBe('Storm');
    expect(entry.traits).toEqual([
      { id: 'Mutant', name: 'Mutant' },
      { id: 'Xmen', name: 'X-Men' },
    ]);
    expect(entry.iso).toEqual({ active: 'striker', level: 11, matrix: undefined });
  });

  it('treats a missing instance or one without level as locked', () => {
    const roster = buildRoster([{ id: 'A' }, { id: 'B' }], [{ id: 'B' }]);
    expect(roster.map((e) => e.unlocked)).toEqual([false, false]);
    expect(roster[0].gearSlots).toHaveLength(6);
  });
});
