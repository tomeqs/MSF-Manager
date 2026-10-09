import { RosterEntry } from '../models';

/**
 * Where the player is in the game, read from their own roster: how many of their strongest
 * characters reached each gear tier. A tier few of them have is one whose materials the player
 * cannot farm reliably yet — so it is expensive for *this* player, whatever its number.
 */
export interface Progression {
  /** Characters the profile is based on (strongest owned, up to SAMPLE_SIZE). */
  sample: number;
  /** reach[t] = share of the sample with gear tier ≥ t (index 0 unused). */
  reach: number[];
  /** Highest tier at least FRONTIER_SHARE of the sample has — reachable on demand. */
  frontier: number;
  /** Highest tier anyone in the sample has. */
  top: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'łatwy',
  medium: 'średni',
  hard: 'trudny',
  extreme: 'ekstremalny',
};

const SAMPLE_SIZE = 60;
const FRONTIER_SHARE = 0.2;

/**
 * Effort units per gear tier = base ÷ reach², capped. With 5 shards = 1 unit: a tier all of the
 * player's best characters have ≈ 1–2 shards, half of them ≈ 6, a fifth ≈ 37, one in seven
 * ≈ 75, and a tier almost nobody has ≈ 300 shards — gear past the player's level is slow.
 */
const GEAR_COST_BASE = 0.3;
const GEAR_COST_CAP = 60;

export function progression(roster: RosterEntry[], sampleSize = SAMPLE_SIZE): Progression {
  const sample = roster
    .filter((e) => e.unlocked)
    .sort((a, b) => b.power - a.power)
    .slice(0, sampleSize);
  const top = Math.max(0, ...sample.map((e) => e.gearTier));
  const reach = [0];
  for (let tier = 1; tier <= top + 1; tier++) {
    reach.push(sample.length ? sample.filter((e) => e.gearTier >= tier).length / sample.length : 0);
  }
  let frontier = 0;
  for (let tier = 1; tier < reach.length; tier++) {
    if (reach[tier] >= FRONTIER_SHARE) frontier = tier;
  }
  return { sample: sample.length, reach, frontier, top };
}

export function reachOf(p: Progression, tier: number): number {
  return p.reach[tier] ?? 0;
}

export function gearDifficulty(p: Progression, tier: number): Difficulty {
  const reach = reachOf(p, tier);
  if (reach >= 0.5) return 'easy';
  if (reach >= FRONTIER_SHARE) return 'medium';
  if (reach >= 0.05) return 'hard';
  return 'extreme';
}

/** Effort of reaching `tier` from the tier below. */
export function gearTierCost(p: Progression, tier: number): number {
  const reach = reachOf(p, tier);
  return reach > 0 ? Math.min(GEAR_COST_CAP, GEAR_COST_BASE / (reach * reach)) : GEAR_COST_CAP;
}

/** Effort of going from gear tier `from` to `to`. */
export function gearCost(p: Progression, from: number, to: number): number {
  let cost = 0;
  for (let tier = from + 1; tier <= to; tier++) cost += gearTierCost(p, tier);
  return cost;
}

/**
 * The next sensible gear target, never above the level cap: up to the frontier (cheap — the
 * player gets those materials) while below it, then one hard tier past it. Further tiers need
 * materials the player does not get yet.
 */
export function realisticGear(p: Progression, current: number, cap: number): number {
  if (current < p.frontier) return Math.min(cap, p.frontier);
  return Math.max(current, Math.min(cap, p.frontier + 1));
}
