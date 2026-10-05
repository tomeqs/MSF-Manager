import { CharacterFilter, Requirements, RosterEntry } from '../models';
import { ISO_CLASS_LABELS, normalizeTrait, traitKey } from './roster.mapper';

export const DEFAULT_SQUAD_SIZE = 5;

export interface FilterCheck {
  /** Traits / allowed characters match (the character belongs in this event at all). */
  fits: boolean;
  /** Unmet stat minimums, e.g. "5★ (wym. 6★)". Empty when the character qualifies. */
  shortfalls: string[];
  /** Yellow stars the filter asks for, used to suggest a farming goal. */
  minYellow?: number;
}

export interface EventSquads {
  /** Disjoint squads of qualifying characters, strongest first. */
  squads: { members: RosterEntry[]; power: number }[];
  qualifying: number;
  /** Characters that fit the event but miss stat minimums (or are locked), strongest first. */
  nearMisses: { entry: RosterEntry; shortfalls: string[]; minYellow?: number }[];
}

const keysOf = (traits: CharacterFilter['allTraits']) =>
  (traits ?? []).map((t) => traitKey(normalizeTrait(t).id));

/** Checks one filter: trait/character membership, then stat minimums. */
export function checkFilter(entry: RosterEntry, filter: CharacterFilter): FilterCheck {
  const has = (key: string) => entry.traitKeys.includes(key);
  const fits =
    keysOf(filter.allTraits).every(has) &&
    (!filter.anyTraits?.length || keysOf(filter.anyTraits).some(has)) &&
    !keysOf(filter.exceptTraits).some(has) &&
    (!filter.anyCharacters?.length || filter.anyCharacters.includes(entry.id));

  const shortfalls: string[] = [];
  if (!entry.unlocked) shortfalls.push('zablokowana');
  else {
    const red = entry.redStars + entry.diamonds;
    if (filter.level && entry.level < filter.level) {
      shortfalls.push(`poz. ${entry.level} (wym. ${filter.level})`);
    }
    if (filter.activeYellow && entry.yellowStars < filter.activeYellow) {
      shortfalls.push(`${entry.yellowStars}★ (wym. ${filter.activeYellow}★)`);
    }
    if (filter.activeRed && red < filter.activeRed) {
      shortfalls.push(`${red} czerw. (wym. ${filter.activeRed})`);
    }
    if (filter.gearTier && entry.gearTier < filter.gearTier) {
      shortfalls.push(`G${entry.gearTier} (wym. G${filter.gearTier})`);
    }
    if (filter.iso8Class && entry.iso.active !== filter.iso8Class) {
      shortfalls.push(`ISO-8: wym. ${ISO_CLASS_LABELS[filter.iso8Class]}`);
    } else if (filter.iso8ClassLevel && entry.iso.level < filter.iso8ClassLevel) {
      shortfalls.push(`ISO-8 poz. ${entry.iso.level} (wym. ${filter.iso8ClassLevel})`);
    }
  }
  return { fits, shortfalls, minYellow: filter.activeYellow };
}

/** Best result over the "any of" filters: a qualifying one, else the fitting one closest to it. */
export function checkRequirements(entry: RosterEntry, req: Requirements | undefined): FilterCheck {
  const filters = req?.anyCharacterFilters?.length ? req.anyCharacterFilters : [{}];
  const results = filters.map((f) => checkFilter(entry, f)).filter((r) => r.fits);
  if (!results.length) return { fits: false, shortfalls: [] };
  return results.reduce((best, r) => (r.shortfalls.length < best.shortfalls.length ? r : best));
}

/**
 * Splits qualifying characters into disjoint squads (strongest first). Required specific
 * characters go into the first squad, which then is the only one.
 */
export function eventSquads(
  roster: RosterEntry[],
  req: Requirements | undefined,
  maxSquads = 3,
): EventSquads {
  const size = req?.maxCharacters ?? DEFAULT_SQUAD_SIZE;
  const minSize = req?.minCharacters ?? size;
  const checked = roster.map((entry) => ({ entry, check: checkRequirements(entry, req) }));
  const qualifying = checked
    .filter((c) => c.check.fits && c.check.shortfalls.length === 0)
    .map((c) => c.entry)
    .sort((a, b) => b.power - a.power);

  const squads: EventSquads['squads'] = [];
  const specific = req?.specificCharacters ?? [];
  if (specific.length) {
    const required = qualifying.filter((e) => specific.includes(e.id));
    const rest = qualifying.filter((e) => !specific.includes(e.id));
    const members = [...required, ...rest].slice(0, size);
    if (required.length === specific.length && members.length >= minSize) {
      squads.push({ members, power: sum(members) });
    }
  } else {
    for (let i = 0; i + minSize <= qualifying.length && squads.length < maxSquads; i += size) {
      const members = qualifying.slice(i, i + size);
      squads.push({ members, power: sum(members) });
    }
  }

  const nearMisses = checked
    .filter((c) => c.check.fits && c.check.shortfalls.length > 0)
    .sort((a, b) => b.entry.power - a.entry.power)
    .map((c) => ({ entry: c.entry, shortfalls: c.check.shortfalls, minYellow: c.check.minYellow }));

  return { squads, qualifying: qualifying.length, nearMisses };
}

/** Readable summary when the API gives no `description`. */
export function describeRequirements(req: Requirements | undefined): string {
  if (req?.description) return req.description;
  const filters = req?.anyCharacterFilters ?? [];
  if (!filters.length) return 'Bez wymagań — dowolne postacie.';
  return filters
    .map((f) => {
      const parts: string[] = [];
      const names = (t: CharacterFilter['allTraits']) =>
        (t ?? []).map((x) => normalizeTrait(x).name).join(', ');
      if (f.allTraits?.length) parts.push(names(f.allTraits));
      if (f.anyTraits?.length) parts.push(`jedna z: ${names(f.anyTraits)}`);
      if (f.exceptTraits?.length) parts.push(`bez: ${names(f.exceptTraits)}`);
      if (f.activeYellow) parts.push(`min. ${f.activeYellow}★`);
      if (f.gearTier) parts.push(`min. G${f.gearTier}`);
      if (f.level) parts.push(`min. poz. ${f.level}`);
      if (f.activeRed) parts.push(`min. ${f.activeRed} czerw.`);
      return parts.join(' · ') || 'dowolne';
    })
    .join(' albo ');
}

function sum(members: RosterEntry[]): number {
  return members.reduce((total, e) => total + e.power, 0);
}
