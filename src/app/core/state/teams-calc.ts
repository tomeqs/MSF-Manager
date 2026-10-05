import { RosterEntry, TeamOrder } from '../models';

/** A squad (any ordering) with its combined popularity. */
export interface MetaTeam {
  /** Sorted member ids joined — identifies the squad regardless of order. */
  key: string;
  /** Member ids in the most common ordering. */
  members: string[];
  popularity: number;
  /** Popularity relative to the most popular team in the tab (0–1). */
  share: number;
}

export interface TeamMember {
  id: string;
  name: string;
  entry?: RosterEntry;
  owned: boolean;
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
    const missing = members.filter((m) => !m.owned);
    const fit: TeamFit = {
      team,
      members,
      missing,
      power: members.reduce((sum, m) => sum + (m.owned ? (m.entry?.power ?? 0) : 0), 0),
    };
    if (missing.length === 0) result.ready.push(fit);
    else if (missing.length <= MAX_MISSING) result.almost.push(fit);
    else result.hidden++;
  }

  // Ready teams: most popular first. Almost: fewest missing, then popularity.
  result.almost.sort(
    (a, b) => a.missing.length - b.missing.length || b.team.popularity - a.team.popularity,
  );
  return result;
}
