import { CharacterPotential, RosterEntry } from '../models';
import { ABILITY_KEYS, MAX_YELLOW_STARS, OPTIMAL_POWER_SHARE } from './game-rules';

/** Gaps below this are rounding noise (e.g. partially equipped gear slots). */
const MIN_GAP = 1_000;

/**
 * - `maxed`: at the max power for the player's level.
 * - `optimal`: 7★ and at least OPTIMAL_POWER_SHARE of it — farming can stop.
 * - `developing`: below that. `locked`: not unlocked yet.
 */
export type DevStatus = 'maxed' | 'optimal' | 'developing' | 'locked';

export const DEV_STATUS_LABELS: Record<DevStatus, string> = {
  maxed: 'Wymaksowana — koniec farmienia',
  optimal: 'Optymalna — przestań farmić',
  developing: 'W rozwoju',
  locked: 'Zablokowana',
};

export interface MemberPower {
  entry: RosterEntry;
  current: number;
  /** Max of the potential and the current power (current can exceed a fresh gear tier). */
  target: number;
  gap: number;
  /** Short labels of what is missing for an owned character, e.g. "5★→7★", "G17→G19". */
  upgrades: string[];
  /** current / target (0–1). */
  share: number;
  status: DevStatus;
}

export interface TeamPower {
  current: number;
  target: number;
  missing: number;
  /** False while some members' potentials are still loading. */
  complete: boolean;
  /** Every member unlocked and maxed or optimal — the team needs no more farming. */
  optimal: boolean;
  /** Power still needed to bring developing members up to the optimal share. */
  toOptimal: number;
  byId: Map<string, MemberPower>;
}

export function memberPower(
  entry: RosterEntry,
  potential: CharacterPotential | undefined,
): MemberPower | undefined {
  if (!potential) return undefined;
  const current = entry.unlocked ? entry.power : 0;
  const target = Math.max(potential.power, current);
  const gap = target - current;
  const upgrades: string[] = [];
  if (entry.unlocked) {
    if (entry.yellowStars < MAX_YELLOW_STARS) {
      upgrades.push(`${entry.yellowStars}★→${MAX_YELLOW_STARS}★`);
    }
    if (potential.level && potential.level > entry.level) {
      upgrades.push(`poz. ${entry.level}→${potential.level}`);
    }
    if (potential.gearTier && potential.gearTier > entry.gearTier) {
      upgrades.push(`G${entry.gearTier}→G${potential.gearTier}`);
    }
    if (ABILITY_KEYS.some((k) => potential.abilities[k] > entry.abilities[k])) {
      upgrades.push('umiejętności');
    }
  }
  const realGap = gap >= MIN_GAP ? gap : 0;
  const share = target > 0 ? current / target : 0;
  return {
    entry,
    current,
    target,
    gap: realGap,
    upgrades,
    share,
    status: devStatus(entry, realGap, share),
  };
}

function devStatus(entry: RosterEntry, gap: number, share: number): DevStatus {
  if (!entry.unlocked) return 'locked';
  if (gap === 0) return 'maxed';
  if (entry.yellowStars >= MAX_YELLOW_STARS && share >= OPTIMAL_POWER_SHARE) return 'optimal';
  return 'developing';
}

/** Power a member still needs to reach the optimal share (0 once maxed/optimal). */
export function powerToOptimal(member: MemberPower): number {
  if (member.status === 'maxed' || member.status === 'optimal') return 0;
  return Math.max(0, Math.ceil(member.target * OPTIMAL_POWER_SHARE) - member.current);
}

export function teamPower(
  entries: RosterEntry[],
  potentialOf: (entry: RosterEntry) => CharacterPotential | undefined,
): TeamPower {
  const byId = new Map<string, MemberPower>();
  let complete = true;
  for (const entry of entries) {
    const power = memberPower(entry, potentialOf(entry));
    if (power) byId.set(entry.id, power);
    else complete = false;
  }
  const current = entries.reduce((sum, e) => sum + (e.unlocked ? e.power : 0), 0);
  const target = [...byId.values()].reduce((sum, m) => sum + m.target, 0);
  const members = [...byId.values()];
  const missing = members.reduce((sum, m) => sum + m.gap, 0);
  const toOptimal = members.reduce((sum, m) => sum + powerToOptimal(m), 0);
  const optimal =
    complete &&
    entries.length > 0 &&
    members.every((m) => m.status === 'maxed' || m.status === 'optimal');
  return {
    current,
    target: Math.max(target, current),
    missing,
    complete,
    optimal,
    toOptimal,
    byId,
  };
}
