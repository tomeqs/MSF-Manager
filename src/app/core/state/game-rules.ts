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
