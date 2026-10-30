import { AbilityKey, CharacterKit, CharacterPotential, IsoClass, RosterEntry } from '../models';
import { ABILITY_KEYS, MAX_YELLOW_STARS } from './game-rules';

/** Max power analysis of one character (current vs what the player's level allows). */
export interface PotentialRow {
  entry: RosterEntry;
  current: number;
  /** Max power at 7★ for the player's level. */
  max: number;
  /** current / max. */
  share: number;
  /** Power upgrades alone can still add (levels, gear, abilities, ISO-8). */
  withoutShards: number;
  /** Power only more yellow stars can add. */
  fromStars: number;
}

export interface PotentialSummary {
  rows: PotentialRow[];
  /** Characters whose max power is loaded / all in the pool. */
  loaded: number;
  total: number;
  current: number;
  max: number;
  withoutShards: number;
  fromStars: number;
}

/**
 * Where the pool's power can still grow. Characters below 7★ need their max power at the
 * current stars to split upgrades from stars; until it loads they are left out.
 */
export function potentialSummary(
  pool: RosterEntry[],
  potentialOf: (e: RosterEntry) => CharacterPotential | undefined,
  potentialAtStarsOf: (e: RosterEntry) => CharacterPotential | undefined,
): PotentialSummary {
  const rows: PotentialRow[] = [];
  for (const entry of pool) {
    const max = potentialOf(entry)?.power;
    if (!max) continue;
    const below = entry.yellowStars < MAX_YELLOW_STARS;
    const atStars = below ? potentialAtStarsOf(entry)?.power : max;
    if (!atStars) continue;
    const current = entry.power;
    const ceiling = Math.max(max, current);
    const upgraded = Math.min(ceiling, Math.max(atStars, current));
    rows.push({
      entry,
      current,
      max: ceiling,
      share: current / ceiling,
      withoutShards: upgraded - current,
      fromStars: ceiling - upgraded,
    });
  }
  const sum = (f: (r: PotentialRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  return {
    rows,
    loaded: rows.length,
    total: pool.length,
    current: sum((r) => r.current),
    max: sum((r) => r.max),
    withoutShards: sum((r) => r.withoutShards),
    fromStars: sum((r) => r.fromStars),
  };
}

export function topBy<T>(rows: T[], value: (r: T) => number, limit = 8): T[] {
  return [...rows]
    .filter((r) => value(r) > 0)
    .sort((a, b) => value(b) - value(a))
    .slice(0, limit);
}

/** ISO-8 class most players use clearly differs from the player's (or none is set). */
export interface IsoAdvice {
  entry: RosterEntry;
  current?: IsoClass;
  currentShare: number;
  best: IsoClass;
  bestShare: number;
}

/** A clear majority of players picks the class. */
const ISO_CONSENSUS = 0.5;

export function isoAdvice(
  pool: RosterEntry[],
  kitOf: (id: string) => CharacterKit | undefined,
): IsoAdvice[] {
  const result: IsoAdvice[] = [];
  for (const entry of pool) {
    const adoption = kitOf(entry.id)?.isoAdoption;
    if (!adoption) continue;
    const [best, bestShare] = (Object.entries(adoption) as [IsoClass, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? [undefined, 0];
    if (!best || bestShare < ISO_CONSENSUS) continue;
    const current = entry.iso.active;
    const currentShare = current ? (adoption[current] ?? 0) : 0;
    if (current === best || (current && currentShare > bestShare / 2)) continue;
    result.push({ entry, current, currentShare, best, bestShare });
  }
  return result.sort((a, b) => b.entry.power - a.entry.power);
}

/** ISO-8 levels clearly below the player's usual level for strong characters. */
export function isoLagging(pool: RosterEntry[], behind = 4, limit = 8): RosterEntry[] {
  const levels = pool.filter((e) => e.iso.active).map((e) => e.iso.level);
  if (levels.length < 3) return [];
  const usual = median(levels);
  return pool
    .filter((e) => e.iso.active && e.iso.level <= usual - behind)
    .sort((a, b) => b.power - a.power)
    .slice(0, limit);
}

export function usualIsoLevel(pool: RosterEntry[]): number {
  const levels = pool.filter((e) => e.iso.active).map((e) => e.iso.level);
  return levels.length ? Math.round(median(levels)) : 0;
}

export interface AbilityStep {
  key: AbilityKey;
  level: number;
  max: number;
  /** Share of players with T4 in this ability (0–1). */
  adoption: number;
}

/** How much further along a lower-priority ability must be to call the order unusual. */
const OFF_ORDER_MARGIN = 0.2;

/** Abilities in the order players develop them (T4 adoption), with the next one to raise. */
export interface AbilityOrder {
  entry: RosterEntry;
  steps: AbilityStep[];
  next: AbilityStep;
  /** A lower-priority ability is further along than `next` (an unusual order). */
  offOrder: boolean;
}

export function abilityOrder(
  entry: RosterEntry,
  kit: CharacterKit | undefined,
  max: Record<AbilityKey, number>,
): AbilityOrder | undefined {
  const adoption = kit?.t4Adoption;
  if (!adoption) return undefined;
  const steps = ABILITY_KEYS.map((key) => ({
    key,
    level: entry.abilities[key],
    max: max[key],
    adoption: adoption[key] ?? 0,
  })).sort((a, b) => b.adoption - a.adoption);
  const nextIndex = steps.findIndex((s) => s.level < s.max);
  if (nextIndex < 0) return undefined;
  const next = steps[nextIndex];
  const progress = (s: AbilityStep) => (s.max > 0 ? s.level / s.max : 1);
  const offOrder = steps
    .slice(nextIndex + 1)
    .some((s) => progress(s) - progress(next) >= OFF_ORDER_MARGIN);
  return { entry, steps, next, offOrder };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
