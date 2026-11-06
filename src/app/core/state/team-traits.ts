import { RosterEntry, TraitObject } from '../models';
import { traitKey } from './roster.mapper';

/** Fewest characters a trait needs to count as a team. */
export const MIN_TEAM_TRAIT = 3;

/**
 * Side, origin, role, location and rarity traits, and the chapter-boost traits (Anxiety…
 * Terror): every character has some of them, so they are not teams.
 */
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
    'Mythic',
    'Minion',
    'Anxiety',
    'Panic',
    'Fear',
    'Terror',
  ].map(traitKey),
);

export function isTeamTrait(trait: TraitObject): boolean {
  return !NOT_TEAMS.has(traitKey(trait.id)) && !NOT_TEAMS.has(traitKey(trait.name ?? trait.id));
}

export interface NamedTrait {
  id: string;
  name: string;
  /** Characters with it, strongest owned first, then locked. */
  members: RosterEntry[];
}

/**
 * Traits that group a handful of characters, like a team ("Symbiote", "Hydra"): at least
 * `MIN_TEAM_TRAIT` characters and at most `max` (more is a category such as Avenger).
 */
export function teamTraits(roster: RosterEntry[], max: number): NamedTrait[] {
  const byId = new Map<string, NamedTrait>();
  for (const entry of roster) {
    for (const t of entry.traits) {
      if (!isTeamTrait(t)) continue;
      const trait = byId.get(t.id) ?? { id: t.id, name: t.name ?? t.id, members: [] };
      trait.members.push(entry);
      byId.set(t.id, trait);
    }
  }
  return [...byId.values()]
    .filter((t) => t.members.length >= MIN_TEAM_TRAIT && t.members.length <= max)
    .map((t) => ({
      ...t,
      members: [...t.members].sort(
        (a, b) => Number(b.unlocked) - Number(a.unlocked) || b.power - a.power,
      ),
    }));
}

/** Whether the character has the role trait (Protector, Support…). */
export function hasRole(entry: RosterEntry, role: string): boolean {
  return entry.traitKeys.includes(traitKey(role));
}
