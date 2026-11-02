import { CharacterKit, EventInfo, RosterEntry } from '../models';
import { traitKey } from './roster.mapper';

/** What the game looked like at the player's last visit (kept in the browser). */
export interface GameSnapshot {
  /** When it was taken (ms). */
  at: number;
  /** Character id → name. */
  characters: Record<string, string>;
  /** Character id → fingerprint of its ability texts (absent when kits were not loaded). */
  kits?: Record<string, string>;
  /** Scheduled or running event id → name. */
  events: Record<string, string>;
  /** Team-like trait id → name. */
  teamTraits: Record<string, string>;
}

export interface NamedTrait {
  id: string;
  name: string;
  /** Characters with it, strongest owned first, then locked. */
  members: RosterEntry[];
}

/** Changes in the game since the snapshot. */
export interface GameNews {
  since: number;
  newCharacters: RosterEntry[];
  /** Characters whose ability texts changed (a rework or a buff). */
  reworked: RosterEntry[];
  newEvents: EventInfo[];
  newTeams: NamedTrait[];
}

/**
 * Origins, roles, sides and the like are shared by too many characters to be teams; a trait
 * held by this many characters or fewer (and at least `MIN_TEAM`) is treated as a team.
 */
const MAX_TEAM = 10;
const MIN_TEAM = 3;
const NOT_TEAMS = new Set(
  [
    'Hero',
    'Villain',
    'Bio',
    'Mutant',
    'Mystic',
    'Skill',
    'Tech',
    'Blaster',
    'Brawler',
    'Controller',
    'Protector',
    'Support',
    'Global',
    'City',
    'Cosmic',
    'Legendary',
    'Minion',
  ].map(traitKey),
);

/** Traits that group a handful of characters, like a team ("Symbiote", "Menace"). */
export function teamTraits(roster: RosterEntry[]): NamedTrait[] {
  const byId = new Map<string, NamedTrait>();
  for (const entry of roster) {
    for (const t of entry.traits) {
      if (NOT_TEAMS.has(traitKey(t.id)) || NOT_TEAMS.has(traitKey(t.name ?? t.id))) continue;
      const trait = byId.get(t.id) ?? { id: t.id, name: t.name ?? t.id, members: [] };
      trait.members.push(entry);
      byId.set(t.id, trait);
    }
  }
  return [...byId.values()]
    .filter((t) => t.members.length >= MIN_TEAM && t.members.length <= MAX_TEAM)
    .map((t) => ({
      ...t,
      members: [...t.members].sort(
        (a, b) => Number(b.unlocked) - Number(a.unlocked) || b.power - a.power,
      ),
    }));
}

export function snapshotOf(
  roster: RosterEntry[],
  kits: CharacterKit[],
  events: EventInfo[],
  now = Date.now(),
): GameSnapshot {
  const nowSec = now / 1000;
  return {
    at: now,
    characters: Object.fromEntries(roster.map((e) => [e.id, e.name])),
    kits: kits.length ? Object.fromEntries(kits.map((k) => [k.id, fingerprint(k)])) : undefined,
    events: Object.fromEntries(
      events.filter((e) => e.endTime > nowSec).map((e) => [e.id, e.name ?? e.id]),
    ),
    teamTraits: Object.fromEntries(teamTraits(roster).map((t) => [t.id, t.name])),
  };
}

/** What is new or changed since `previous`; reworks only when both sides had kits. */
export function newsSince(
  previous: GameSnapshot,
  current: GameSnapshot,
  roster: RosterEntry[],
  events: EventInfo[],
): GameNews {
  const byId = new Map(roster.map((e) => [e.id, e]));
  const entries = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const reworked =
    previous.kits && current.kits
      ? Object.entries(current.kits)
          .filter(([id, print]) => previous.kits![id] !== undefined && previous.kits![id] !== print)
          .map(([id]) => id)
      : [];
  return {
    since: previous.at,
    newCharacters: entries(
      Object.keys(current.characters).filter((id) => !(id in previous.characters)),
    ),
    reworked: entries(reworked),
    newEvents: events
      .filter((e) => e.id in current.events && !(e.id in previous.events))
      .sort((a, b) => a.startTime - b.startTime),
    newTeams: teamTraits(roster).filter(
      (t) => t.id in current.teamTraits && !(t.id in previous.teamTraits),
    ),
  };
}

export function isEmptyNews(news: GameNews): boolean {
  return (
    !news.newCharacters.length &&
    !news.reworked.length &&
    !news.newEvents.length &&
    !news.newTeams.length
  );
}

/** Short fingerprint of a kit's texts (FNV-1a), enough to notice a change. */
function fingerprint(kit: CharacterKit): string {
  const text = [kit.texts.basic, kit.texts.special, kit.texts.ultimate, kit.texts.passive].join(
    '|',
  );
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
