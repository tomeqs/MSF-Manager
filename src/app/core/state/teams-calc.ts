import { KnownTeam } from '../data/known-meta';
import { RosterEntry, TeamOrder, TeamTab } from '../models';
import { traitKey } from './roster.mapper';

/** A squad (any ordering) with its combined popularity. */
export interface MetaTeam {
  /** Sorted member ids joined — identifies the squad regardless of order. */
  key: string;
  /** Team name, when the squad comes from a named team rather than player data. */
  name?: string;
  /** Member ids in the most common ordering. */
  members: string[];
  popularity: number;
  /** Popularity relative to the most popular team in the tab (0–1). */
  share: number;
  /** Where the recommendation comes from (known-meta fallback). */
  source?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  entry?: RosterEntry;
  owned: boolean;
  /** Listed by name but not found in the game data (likely a spelling to fix). */
  unknown?: boolean;
}

export interface TeamFit {
  team: MetaTeam;
  members: TeamMember[];
  missing: TeamMember[];
  /** Sum of power of owned members. */
  power: number;
}

export interface TeamFits {
  ready: TeamFit[];
  /** Missing 1..MAX_MISSING members. */
  almost: TeamFit[];
  /** Teams skipped because too many members are missing. */
  hidden: number;
}

/** Teams missing more members than this are not worth suggesting. */
export const MAX_MISSING = 2;

export const TEAM_SIZE = 5;

/** Blitz scores any team by power, so every known team is listed there. */
const ANY_TEAM_TABS: TeamTab[] = ['blitz'];

export interface KnownTeamFits extends TeamFits {
  /** Known teams that could not be built from the game data at all. */
  unmatched: string[];
  /** Character names from the known list that were not found in the game data. */
  unrecognized: string[];
}

/** Below this many recognised members a known team is treated as not found. */
const MIN_RECOGNISED = 3;

/** Merges orderings of the same squad and ranks squads by total popularity. */
export function mergeOrderings(orders: TeamOrder[]): MetaTeam[] {
  const groups = new Map<string, { members: string[]; best: number; popularity: number }>();
  for (const { squad, total } of orders) {
    if (!squad?.length) continue;
    const key = [...squad].sort().join('|');
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { members: squad, best: total, popularity: total });
      continue;
    }
    group.popularity += total;
    if (total > group.best) {
      group.best = total;
      group.members = squad;
    }
  }
  const teams = [...groups.entries()]
    .map(([key, g]) => ({ key, members: g.members, popularity: g.popularity, share: 0 }))
    .sort((a, b) => b.popularity - a.popularity);
  const top = teams[0]?.popularity || 1;
  return teams.map((t) => ({ ...t, share: t.popularity / top }));
}

/** Splits meta teams by how much of each one the player already owns. */
export function fitTeams(teams: MetaTeam[], roster: RosterEntry[]): TeamFits {
  const byId = new Map(roster.map((e) => [e.id, e]));
  const result: TeamFits = { ready: [], almost: [], hidden: 0 };

  for (const team of teams) {
    const members = team.members.map((id): TeamMember => {
      const entry = byId.get(id);
      return { id, name: entry?.name ?? id, entry, owned: !!entry?.unlocked };
    });
    place(result, toFit(team, members));
  }

  // Ready teams: most popular first. Almost: fewest missing, then popularity.
  result.almost.sort(
    (a, b) => a.missing.length - b.missing.length || b.team.popularity - a.team.popularity,
  );
  return result;
}

/** Case/punctuation-insensitive character name key ("Spider-Man (Pavitr)" = "spidermanpavitr"). */
export function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Builds each known team for the given mode from the roster.
 * - `members`: the listed lineup; for "A|B" slots the first owned option wins.
 * - `traits`: the five strongest owned characters with the trait, locked ones filling gaps.
 */
export function knownTeamFits(
  known: KnownTeam[],
  tab: TeamTab,
  roster: RosterEntry[],
): KnownTeamFits {
  const result: KnownTeamFits = {
    ready: [],
    almost: [],
    hidden: 0,
    unmatched: [],
    unrecognized: [],
  };
  const byName = new Map<string, RosterEntry>();
  for (const entry of roster) {
    if (!byName.has(nameKey(entry.name))) byName.set(nameKey(entry.name), entry);
  }

  for (const team of known) {
    if (!ANY_TEAM_TABS.includes(tab) && !team.modes.includes(tab)) continue;
    const members = team.members
      ? lineupMembers(team.members, byName, result.unrecognized)
      : traitMembers(team.traits ?? [], roster);
    const recognised = members.filter((m) => !m.unknown).length;
    if (recognised === 0 || recognised < Math.min(MIN_RECOGNISED, members.length)) {
      result.unmatched.push(team.name);
      continue;
    }
    const meta: MetaTeam = {
      key: team.name,
      name: team.name,
      members: members.map((m) => m.id),
      popularity: 0,
      share: 0,
      source: team.source,
    };
    place(result, toFit(meta, members));
  }

  result.unrecognized = [...new Set(result.unrecognized)];
  result.ready.sort((a, b) => b.power - a.power);
  result.almost.sort((a, b) => a.missing.length - b.missing.length || b.power - a.power);
  return result;
}

function lineupMembers(
  slots: string[],
  byName: Map<string, RosterEntry>,
  unrecognized: string[],
): TeamMember[] {
  return slots.map((slot) => {
    const options = slot.split('|').map((name) => name.trim());
    const found = options
      .map((name) => byName.get(nameKey(name)))
      .filter((e): e is RosterEntry => !!e);
    const entry = found.find((e) => e.unlocked) ?? found[0];
    if (entry) return { id: entry.id, name: entry.name, entry, owned: entry.unlocked };
    unrecognized.push(options[0]);
    return { id: `unknown:${options[0]}`, name: options[0], owned: false, unknown: true };
  });
}

function traitMembers(traits: string[], roster: RosterEntry[]): TeamMember[] {
  const keys = traits.map(traitKey);
  const pool = roster.filter((e) => keys.some((k) => e.traitKeys.includes(k)));
  const size = Math.min(TEAM_SIZE, pool.length);
  const owned = pool.filter((e) => e.unlocked).sort((a, b) => b.power - a.power);
  return [...owned.slice(0, size), ...pool.filter((e) => !e.unlocked)]
    .slice(0, size)
    .map((entry) => ({ id: entry.id, name: entry.name, entry, owned: entry.unlocked }));
}

function toFit(team: MetaTeam, members: TeamMember[]): TeamFit {
  return {
    team,
    members,
    missing: members.filter((m) => !m.owned),
    power: members.reduce((sum, m) => sum + (m.owned ? (m.entry?.power ?? 0) : 0), 0),
  };
}

function place(result: TeamFits, fit: TeamFit): void {
  if (fit.missing.length === 0) result.ready.push(fit);
  else if (fit.missing.length <= MAX_MISSING) result.almost.push(fit);
  else result.hidden++;
}
