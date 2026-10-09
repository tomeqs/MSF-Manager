import { KnownTeam, TeamTier } from '../data/known-meta';
import { RosterEntry } from '../models';
import { TeamMember, resolveKnownTeams } from './teams-calc';

/** How much a team's tier weighs its members in the ranking. */
export const TIER_WEIGHTS: Record<TeamTier, number> = { S: 1, A: 0.75, B: 0.5 };

/** How many teams the advisor tells the player to concentrate on. */
const FOCUS_TEAMS = 3;

/** Teams further than this from built (mean member share) are not worth focusing yet. */
const MIN_FOCUS_CLOSENESS = 0.35;

/** Each extra mode a team is good in adds this much to its weight. */
const EXTRA_MODE = 0.15;

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
  /** One of the teams to concentrate the scarce resources on. */
  focus: boolean;
}

export function teamWeight(team: KnownTeam): number {
  return TIER_WEIGHTS[team.tier ?? 'A'] * (1 + EXTRA_MODE * Math.max(0, team.modes.length - 1));
}

/**
 * Known teams with how far along the player is, and the few to focus on: the best tier ×
 * modes × closeness that still need work. Spreading shards and high-tier gear across many
 * half-built teams is the classic mistake; finishing one team at a time is the usual advice.
 */
export function teamPlans(
  known: KnownTeam[],
  roster: RosterEntry[],
  stateOf: (entry: RosterEntry) => { share: number; done: boolean },
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
      focus: false,
    };
  });
  plans.sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name));
  let picked = 0;
  for (const plan of plans) {
    if (picked >= FOCUS_TEAMS) break;
    const canFinish = plan.members.every((m) => !m.member.unknown);
    if (plan.complete || !canFinish || plan.closeness < MIN_FOCUS_CLOSENESS) continue;
    plan.focus = true;
    picked++;
  }
  return plans;
}
