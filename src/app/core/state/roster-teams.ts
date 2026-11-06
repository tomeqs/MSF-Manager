import { KnownTeam, TeamTier } from '../data/known-meta';
import { CharacterKit, RosterEntry, TeamTab } from '../models';
import { CAPABILITIES, CapabilityGroup, ESSENTIAL_GROUPS, capabilitiesOf } from './capabilities';
import { traitKey } from './roster.mapper';
import { Arrangement, arrange } from './squad-assistant';
import { SquadOption, extendSquad, strongest, synergySquad } from './squads';
import { SynergyIndex, cohesion } from './synergy';
import { MIN_TEAM_TRAIT, NamedTrait, teamTraits } from './team-traits';
import { TEAM_SIZE, resolveKnownTeams } from './teams-calc';

/** Fewest owned members for a team to be worth building (the rest are fillers from outside). */
export const MIN_CORE = 3;
/** Larger traits are categories (Avenger, X-Men…) rather than teams. */
export const MAX_TEAM_TRAIT = 15;
/** Only the strongest owned members are tried for the best five (at most 252 squads). */
const CANDIDATES = 10;
/** Cohesion moves a squad's value by up to 25% (as in the squad options). */
const COHESION_RANGE = 0.25;
/** Each essential mechanic nobody brings (protection, healing, cleanse) costs this much. */
const GAP_PENALTY = 0.06;
const TIERS: TeamTier[] = ['S', 'A', 'B'];
/** A guide's line-up applies when the five shares at least this many members with it. */
const GUIDE_OVERLAP = 4;

/** An owned team member left out of the best five. */
export interface BenchMember {
  entry: RosterEntry;
  /** The member it would replace with the smallest loss. */
  replaces?: RosterEntry;
  /** Share of the squad's value lost by that swap (0–1). */
  loss: number;
}

/** A known (researched) team built on the same characters. */
export interface KnownMatch {
  name: string;
  tier: TeamTier;
  modes: TeamTab[];
}

/** One team (trait) of the roster with the best five the player can field. */
export interface RosterTeam {
  /** Trait id. */
  id: string;
  name: string;
  /** Characters with the trait in the game data. */
  inGame: number;
  /** Owned members, strongest first (all of them, also those in other teams). */
  owned: RosterEntry[];
  /** Members not unlocked yet. */
  locked: RosterEntry[];
  /** The best five (named after the team; tier from the matching known team). */
  option: SquadOption;
  /** Members from outside the team, when fewer than five are owned (or free). */
  fillers: RosterEntry[];
  /** Owned members left out, closest to the five first. */
  bench: BenchMember[];
  /** Owned members already used by a better team (only with `exclusive`). */
  elsewhere: RosterEntry[];
  /** Owned members in the player's saved squads (never proposed). */
  inSquads: RosterEntry[];
  arrangement: Arrangement;
  known: KnownMatch[];
  /** Power × cohesion × coverage of the five. */
  score: number;
}

/** A team the player owns too few members of to build yet. */
export interface PartialTeam {
  id: string;
  name: string;
  owned: number;
  inGame: number;
}

/** A team the player could build, but its members are mostly in saved squads already. */
export interface BlockedTeam {
  id: string;
  name: string;
  owned: number;
  /** Owned members not in a saved squad. */
  free: number;
}

export interface RosterTeamsInput {
  roster: RosterEntry[];
  synergy: SynergyIndex;
  /** Kits by id; without them only power and traits decide. */
  kitOf?: (id: string) => CharacterKit | undefined;
  known?: KnownTeam[];
  /** Every character in one team only: best teams first, the next ones from what is left. */
  exclusive?: boolean;
  /** Characters in the player's saved squads: never proposed, not even as fillers. */
  taken?: ReadonlySet<string>;
}

export interface RosterTeams {
  teams: RosterTeam[];
  /** Teams with 1–2 owned members (fewer than `MIN_CORE`). */
  partial: PartialTeam[];
  /** Teams left out because fewer than `MIN_CORE` members are free of saved squads. */
  blocked: BlockedTeam[];
}

/**
 * The teams (traits) the player can build from the roster, best first: for each the five
 * strongest members by power, synergy from the kits and coverage of the essential mechanics,
 * who stays on the bench and why, fillers from outside when the team is short, and the line-up.
 */
export function rosterTeams(input: RosterTeamsInput): RosterTeams {
  const { roster, synergy, kitOf } = input;
  const taken = input.taken ?? new Set<string>();
  const groups = teamTraits(roster, MAX_TEAM_TRAIT);
  const known = matchKnown(groups, input.known ?? [], roster);
  const pool = strongest(roster);
  const gapsOf = kitOf ? essentialGaps(kitOf) : () => 0;
  const value = (members: RosterEntry[]) =>
    members.reduce((sum, m) => sum + m.power, 0) *
    (1 - COHESION_RANGE + COHESION_RANGE * cohesion(ids(members), synergy)) *
    (1 - GAP_PENALTY * gapsOf(members));

  const none = new Set<string>();
  const build = (
    group: NamedTrait,
    used: ReadonlySet<string>,
    avoid: ReadonlySet<string> = none,
  ): RosterTeam | undefined => {
    const all = group.members.filter((e) => e.unlocked);
    const owned = all.filter((e) => !used.has(e.id));
    if (owned.length < MIN_CORE) return undefined;
    let members: RosterEntry[];
    let fillers: RosterEntry[] = [];
    if (owned.length >= TEAM_SIZE) {
      members = bestFive(owned.slice(0, CANDIDATES), value);
    } else {
      const inTeam = new Set(group.members.map((m) => m.id));
      const outside = pool.filter((e) => !inTeam.has(e.id) && !used.has(e.id));
      // Fillers come first from characters no team still to be built needs.
      members = extendSquad(
        owned,
        outside.filter((e) => !avoid.has(e.id)),
        synergy,
      );
      if (members.length < TEAM_SIZE) {
        members = extendSquad(
          members,
          outside.filter((e) => !members.includes(e)),
          synergy,
        );
      }
      fillers = members.slice(owned.length);
    }
    const best = value(members);
    const bench = owned
      .filter((e) => !members.includes(e))
      .map((entry) => benchOf(entry, members, value, best))
      .sort((a, b) => a.loss - b.loss);
    const matches = known.get(group.id) ?? [];
    const option = synergySquad(members, synergy);
    // Tier and line-up only from the same team: named like it, or nearly the same five.
    const same = matches.filter((k) => k.sameName || overlap(k.ids, members) >= GUIDE_OVERLAP);
    const guide = same.find((k) => k.lineup && overlap(k.ids, members) >= GUIDE_OVERLAP);
    const named: SquadOption = {
      ...option,
      name: group.name,
      tier: same[0]?.tier,
      source: same[0]?.source,
      origins: matches.length ? ['meta', 'synergy'] : ['synergy'],
      lineupNote: guide?.lineup,
    };
    return {
      id: group.id,
      name: group.name,
      inGame: group.members.length,
      owned: all,
      locked: group.members.filter((e) => !e.unlocked),
      option: named,
      fillers,
      bench,
      elsewhere: all.filter((e) => used.has(e.id) && !taken.has(e.id)),
      inSquads: all.filter((e) => taken.has(e.id)),
      arrangement: arrange(named, synergy),
      known: matches.map(({ name, tier, modes }) => ({ name, tier, modes })),
      score: best,
    };
  };

  const separate = groups
    .map((g) => ({ group: g, team: build(g, taken) }))
    .sort((a, b) => (b.team?.score ?? 0) - (a.team?.score ?? 0));
  let teams: RosterTeam[];
  if (input.exclusive) {
    const used = new Set(taken);
    const order = separate.filter(({ team }) => !!team);
    teams = [];
    for (let i = 0; i < order.length; i++) {
      const later = new Set(order.slice(i + 1).flatMap(({ team }) => ids(team!.owned)));
      const fitted = build(order[i].group, used, later);
      if (!fitted) continue;
      teams.push(fitted);
      for (const m of fitted.option.members) used.add(m.id);
    }
  } else {
    teams = separate.flatMap(({ team }) => (team ? [team] : []));
  }
  const left = separate
    .filter(({ team }) => !team)
    .map(({ group }) => {
      const owned = group.members.filter((e) => e.unlocked);
      return {
        id: group.id,
        name: group.name,
        owned: owned.length,
        free: owned.filter((e) => !taken.has(e.id)).length,
        inGame: group.members.length,
      };
    });
  const partial = left
    .filter((p) => p.owned > 0 && p.owned < MIN_CORE)
    .map(({ id, name, owned, inGame }) => ({ id, name, owned, inGame }))
    .sort((a, b) => b.owned / b.inGame - a.owned / a.inGame || a.name.localeCompare(b.name));
  const blocked = left
    .filter((p) => p.owned >= MIN_CORE)
    .map(({ id, name, owned, free }) => ({ id, name, owned, free }))
    .sort((a, b) => b.owned - a.owned || a.name.localeCompare(b.name));
  return { teams, partial, blocked };
}

/** The five candidates with the highest value (every combination; candidates ≤ 10). */
function bestFive(candidates: RosterEntry[], value: (m: RosterEntry[]) => number): RosterEntry[] {
  let best = candidates.slice(0, TEAM_SIZE);
  let bestValue = value(best);
  const pick: RosterEntry[] = [];
  const walk = (from: number) => {
    if (pick.length === TEAM_SIZE) {
      const v = value(pick);
      if (v > bestValue) {
        best = [...pick];
        bestValue = v;
      }
      return;
    }
    for (let i = from; i <= candidates.length - (TEAM_SIZE - pick.length); i++) {
      pick.push(candidates[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  // Strongest first, as the members are listed before the line-up is worked out.
  return best.sort((a, b) => b.power - a.power);
}

function benchOf(
  entry: RosterEntry,
  members: RosterEntry[],
  value: (m: RosterEntry[]) => number,
  best: number,
): BenchMember {
  let replaces: RosterEntry | undefined;
  let bestSwap = 0;
  for (const m of members) {
    const v = value(members.map((x) => (x === m ? entry : x)));
    if (v > bestSwap) {
      bestSwap = v;
      replaces = m;
    }
  }
  return { entry, replaces, loss: best > 0 ? Math.max(0, 1 - bestSwap / best) : 0 };
}

interface KnownForTrait extends KnownMatch {
  ids: string[];
  /** Named like the trait or built from it (not only sharing characters). */
  sameName: boolean;
  lineup?: string;
  source: string;
}

/**
 * Known teams per trait: named like the trait, built from it (`traits`), or sharing at least
 * `MIN_TEAM_TRAIT` characters with it. Best tier first.
 */
function matchKnown(
  groups: NamedTrait[],
  known: KnownTeam[],
  roster: RosterEntry[],
): Map<string, KnownForTrait[]> {
  const resolved = resolveKnownTeams(known, roster);
  const result = new Map<string, KnownForTrait[]>();
  for (const g of groups) {
    const key = traitKey(g.name);
    const inTrait = new Set(g.members.map((m) => m.id));
    const keys = [key, traitKey(g.id)];
    const sameName = (team: KnownTeam) =>
      keys.includes(traitKey(team.name)) ||
      (team.traits ?? []).some((t) => keys.includes(traitKey(t)));
    const matches = resolved
      .filter(
        ({ team, members }) =>
          sameName(team) || members.filter((m) => inTrait.has(m.id)).length >= MIN_TEAM_TRAIT,
      )
      .map(({ team, members }) => ({
        sameName: sameName(team),
        name: team.name,
        tier: team.tier ?? 'A',
        modes: team.modes,
        ids: members.map((m) => m.id),
        lineup: team.lineup,
        source: team.source,
      }))
      .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
    if (matches.length) result.set(g.id, matches);
  }
  return result;
}

/** How many essential mechanic groups nobody in the squad brings (kits read once each). */
function essentialGaps(
  kitOf: (id: string) => CharacterKit | undefined,
): (members: RosterEntry[]) => number {
  const groupOf = new Map(CAPABILITIES.map((c) => [c.id, c.group]));
  const memo = new Map<string, Set<CapabilityGroup>>();
  const groups = (id: string) => {
    let g = memo.get(id);
    if (!g) {
      g = new Set(capabilitiesOf(kitOf(id)).map((c) => groupOf.get(c)!));
      memo.set(id, g);
    }
    return g;
  };
  return (members) =>
    ESSENTIAL_GROUPS.filter((g) => !members.some((m) => groups(m.id).has(g))).length;
}

function ids(members: RosterEntry[]): string[] {
  return members.map((m) => m.id);
}

function overlap(a: string[], members: RosterEntry[]): number {
  return members.filter((m) => a.includes(m.id)).length;
}
