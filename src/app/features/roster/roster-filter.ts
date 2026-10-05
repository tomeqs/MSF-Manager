import { RosterEntry } from '../../core/models';

export type RosterSort = 'power' | 'name' | 'stars' | 'gear' | 'level';

export interface RosterFilters {
  search: string;
  traitId: string;
  minYellow: number;
  minGear: number;
  favoritesOnly: boolean;
  showLocked: boolean;
  sort: RosterSort;
}

export const DEFAULT_FILTERS: RosterFilters = {
  search: '',
  traitId: '',
  minYellow: 0,
  minGear: 0,
  favoritesOnly: false,
  showLocked: true,
  sort: 'power',
};

const COMPARATORS: Record<RosterSort, (a: RosterEntry, b: RosterEntry) => number> = {
  power: (a, b) => b.power - a.power,
  name: (a, b) => a.name.localeCompare(b.name),
  stars: (a, b) =>
    b.yellowStars - a.yellowStars ||
    b.redStars + b.diamonds - (a.redStars + a.diamonds) ||
    b.power - a.power,
  gear: (a, b) => b.gearTier - a.gearTier || b.power - a.power,
  level: (a, b) => b.level - a.level || b.power - a.power,
};

/** Pure filter + sort; locked characters always go last. */
export function filterRoster(entries: RosterEntry[], f: RosterFilters): RosterEntry[] {
  const search = f.search.trim().toLowerCase();
  return entries
    .filter((e) => f.showLocked || e.unlocked)
    .filter((e) => !search || e.name.toLowerCase().includes(search))
    .filter((e) => !f.traitId || e.traits.some((t) => t.id === f.traitId))
    .filter((e) => !e.unlocked || e.yellowStars >= f.minYellow)
    .filter((e) => !e.unlocked || e.gearTier >= f.minGear)
    .filter((e) => !f.favoritesOnly || e.favorite)
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || COMPARATORS[f.sort](a, b));
}
