import { CharacterPotential, RosterEntry } from '../models';
import { ABILITY_KEYS, MAX_YELLOW_STARS } from './game-rules';

/** Gaps below this are rounding noise (e.g. partially equipped gear slots). */
const MIN_GAP = 1_000;

export interface MemberPower {
  entry: RosterEntry;
  current: number;
  /** Max of the potential and the current power (current can exceed a fresh gear tier). */
  target: number;
  gap: number;
  /** Short labels of what is missing for an owned character, e.g. "5★→7★", "G17→G19". */
  upgrades: string[];
}

export interface TeamPower {
  current: number;
  target: number;
  missing: number;
  /** False while some members' potentials are still loading. */
  complete: boolean;
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
  return { entry, current, target, gap: gap >= MIN_GAP ? gap : 0, upgrades };
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
  const missing = [...byId.values()].reduce((sum, m) => sum + m.gap, 0);
  return { current, target: Math.max(target, current), missing, complete, byId };
}
