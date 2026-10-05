import { buildRoster } from '../../core/state/roster.mapper';
import { DEFAULT_FILTERS, filterRoster } from './roster-filter';

const entries = buildRoster(
  [
    { id: 'A', name: 'Alpha', traits: ['Hero', 'Mutant'] },
    { id: 'B', name: 'Beta', traits: ['Villain'] },
    { id: 'C', name: 'Gamma', traits: ['Hero'] },
    { id: 'L', name: 'Locked', traits: ['Hero'] },
  ],
  [
    { id: 'A', level: 90, activeYellow: 7, gearTier: 19, power: 500, favorite: true },
    { id: 'B', level: 70, activeYellow: 5, gearTier: 13, power: 900 },
    { id: 'C', level: 80, activeYellow: 6, gearTier: 16, power: 100 },
  ],
);

const ids = (list: { id: string }[]) => list.map((e) => e.id);

describe('filterRoster', () => {
  it('sorts by power with locked characters last', () => {
    expect(ids(filterRoster(entries, DEFAULT_FILTERS))).toEqual(['B', 'A', 'C', 'L']);
  });

  it('filters by trait, stars, gear and favorites', () => {
    expect(
      ids(filterRoster(entries, { ...DEFAULT_FILTERS, traitId: 'Hero', showLocked: false })),
    ).toEqual(['A', 'C']);
    expect(
      ids(filterRoster(entries, { ...DEFAULT_FILTERS, minYellow: 6, showLocked: false })),
    ).toEqual(['A', 'C']);
    expect(
      ids(filterRoster(entries, { ...DEFAULT_FILTERS, minGear: 17, showLocked: false })),
    ).toEqual(['A']);
    expect(ids(filterRoster(entries, { ...DEFAULT_FILTERS, favoritesOnly: true }))).toEqual(['A']);
  });

  it('searches by name case-insensitively', () => {
    expect(ids(filterRoster(entries, { ...DEFAULT_FILTERS, search: 'GAM' }))).toEqual(['C']);
  });

  it('sorts by name', () => {
    expect(
      ids(filterRoster(entries, { ...DEFAULT_FILTERS, sort: 'name', showLocked: false })),
    ).toEqual(['A', 'B', 'C']);
  });
});
