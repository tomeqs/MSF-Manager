import { CharacterSource, SourceStatus } from '../data/character-sources';
import { RosterEntry } from '../models';
import { nameKey } from './teams-calc';

/** Statuses under which a locked character cannot be obtained now. */
const BLOCKED: SourceStatus[] = ['paid', 'endgame', 'unavailable'];

/**
 * How much harder shards are to collect than from a permanent source (campaign node or
 * Character Store tab), by source status: a running event is the cheapest window, random orbs
 * are slow, and paid / endgame-gated / closed sources cannot really be farmed now.
 */
export const SOURCE_FACTOR: Record<SourceStatus, number> = {
  event: 0.7,
  permanent: 1,
  permanentUnverified: 1,
  unknown: 1,
  orb: 1.5,
  paid: 3,
  endgame: 4,
  unavailable: 6,
  // Most event windows close until a rerun; without knowing, price it like random orbs.
  expired: 1.5,
};

/** Colour of a status: open now, slow or uncertain, closed. */
export const SOURCE_TONE: Record<SourceStatus, 'good' | 'warn' | 'bad'> = {
  permanent: 'good',
  permanentUnverified: 'good',
  event: 'good',
  orb: 'warn',
  unknown: 'warn',
  expired: 'warn',
  paid: 'bad',
  endgame: 'bad',
  unavailable: 'bad',
};

/**
 * The source as of `now` (the player's local date): a time-limited status past its `until`
 * date becomes `afterUntil`, or `expired` when nothing says what follows.
 */
export function currentSource(source: CharacterSource, now = new Date()): CharacterSource {
  if (!source.until || localDate(now) <= source.until) return source;
  return { ...source, status: source.afterUntil ?? 'expired' };
}

/** "2026-11-01" in the player's time zone. */
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Source of a roster entry, matched by name ignoring case and punctuation. */
export function sourceLookup(
  sources: CharacterSource[],
  now = new Date(),
): (entry: RosterEntry) => CharacterSource | undefined {
  const byName = new Map(sources.map((s) => [nameKey(s.name), currentSource(s, now)] as const));
  return (entry) => byName.get(nameKey(entry.name));
}

export function isObtainableNow(source: CharacterSource | undefined): boolean {
  return !source || !BLOCKED.includes(source.status);
}
