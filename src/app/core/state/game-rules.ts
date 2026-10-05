import { AbilityKey } from '../models';

/** Current caps per API params (basic/special/ultimate ≤ 8, passive ≤ 6). */
export const ABILITY_MAX: Record<AbilityKey, number> = {
  basic: 8,
  special: 8,
  ultimate: 8,
  passive: 6,
};

export const ABILITY_KEYS: AbilityKey[] = ['basic', 'special', 'ultimate', 'passive'];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  basic: 'Basic',
  special: 'Special',
  ultimate: 'Ultimate',
  passive: 'Passive',
};

export const MAX_YELLOW_STARS = 7;

/**
 * Share of the max power for the player's level from which a 7★ character counts as
 * optimally built: the last few percent (top gear tier, last ability levels) cost far more
 * than they give, so farming can stop there.
 */
export const OPTIMAL_POWER_SHARE = 0.95;
