import { KnownTeam, TeamTier } from '../data/known-meta';
import { RosterEntry, TeamTab } from '../models';
import { TeamMember, resolveKnownTeams } from './teams-calc';

/** How much a team's tier weighs its members in the ranking. */
export const TIER_WEIGHTS: Record<TeamTier, number> = { S: 1, A: 0.75, B: 0.5 };

/** How many teams the advisor tells the player to concentrate on. */
const FOCUS_TEAMS = 3;

/** Teams further than this from built (mean member share) are not worth focusing yet. */
const MIN_FOCUS_CLOSENESS = 0.35;

/** Each extra mode a team is good in adds this much to its weight. */
const EXTRA_MODE = 0.15;

/**
 * What a mode pays after the 2026 economy changes (official, Aug 2026): raids give gear,
 * Alliance War ISO-8 and Power Cores, Crucible T4 plus Red Stars and Diamonds, Blitz Shop
 * Credits, Arena only Training Modules — so a team's best mode sets most of its weight.
 */
export const MODE_VALUE: Record<TeamTab, number> = {
  raids: 1,
  war: 1,
  crucible: 0.9,
  arena: 0.6,
  blitz: 0.5,
  tower: 0.5,
  roster: 0.5,
};

export interface PlanMember {
  member: TeamMember;
  /** Development vs its max power (0 when locked or unknown). */
  share: number;
  /** Nothing worth farming on it for now (see `advisor.ts`). */
  done: boolean;
}

export interface TeamPlan {
  team: KnownTeam;
  tier: TeamTier;
  members: PlanMember[];
  owned: number;
  done: number;
  /** Mean member share — how close the team is to built. */
  closeness: number;
  /** Tier weight × mode factor × closeness². */
  score: number;
  /** Every member done for now — nothing to farm. */
  complete: boolean;
  /** A missing member cannot be obtained now (paid, endgame-gated or no source). */
  blocked: boolean;
  /** One of the teams to concentrate the scarce resources on. */
  focus: boolean;
}

export function teamWeight(team: KnownTeam): number {
  const values = team.modes.map((m) => MODE_VALUE[m]);
  const best = values.length ? Math.max(...values) : MODE_VALUE.blitz;
  return TIER_WEIGHTS[team.tier ?? 'A'] * (best + EXTRA_MODE * Math.max(0, values.length - 1));
}

/**
 * Known teams with how far along the player is, and the few to focus on: the best tier ×
 * modes × closeness that still need work and can actually be completed. Spreading shards and
 * high-tier gear across many half-built teams is the classic mistake, and so is chasing a top
 * team whose key member cannot be obtained now; finishing one team at a time is the advice.
 */
export function teamPlans(
  known: KnownTeam[],
  roster: RosterEntry[],
  stateOf: (entry: RosterEntry) => { share: number; done: boolean },
  isObtainable: (entry: RosterEntry) => boolean = () => true,
): TeamPlan[] {
  const plans = resolveKnownTeams(known, roster).map(({ team, members }): TeamPlan => {
    const planMembers = members.map((member): PlanMember => {
      if (!member.owned || !member.entry) return { member, share: 0, done: false };
      return { member, ...stateOf(member.entry) };
    });
    const closeness = planMembers.reduce((sum, m) => sum + m.share, 0) / members.length;
    const done = planMembers.filter((m) => m.done).length;
    return {
      team,
      tier: team.tier ?? 'A',
      members: planMembers,
      owned: members.filter((m) => m.owned).length,
      done,
      closeness,
      score: teamWeight(team) * closeness * closeness,
      complete: done === members.length,
      blocked: members.some((m) => !m.owned && (!m.entry || !isObtainable(m.entry))),
      focus: false,
    };
  });
  plans.sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name));
  let picked = 0;
  for (const plan of plans) {
    if (picked >= FOCUS_TEAMS) break;
    if (plan.complete || plan.blocked || plan.closeness < MIN_FOCUS_CLOSENESS) continue;
    plan.focus = true;
    picked++;
  }
  return plans;
}
