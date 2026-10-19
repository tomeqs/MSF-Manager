import { AbilityKey, CharacterInstance } from '../models';

/** The most a character of `level` can have (GET /game/v1/characterInstanceCaps). */
export interface LevelCap {
  level: number;
  gearTier: number;
  abilities: Record<AbilityKey, number>;
}

/** Caps sorted by level; entries without `level` are taken as levels 1, 2, … in order. */
export function toLevelCaps(instances: CharacterInstance[]): LevelCap[] {
  return instances
    .map((c, i) => ({
      level: c.level ?? i + 1,
      gearTier: c.gearTier ?? 0,
      abilities: {
        basic: c.basic ?? 0,
        special: c.special ?? 0,
        ultimate: c.ultimate ?? 0,
        passive: c.passive ?? 0,
      },
    }))
    .filter((c) => c.level > 0)
    .sort((a, b) => a.level - b.level);
}

/**
 * Caps for a character at `level` — the highest entry not above it. Characters cannot pass
 * the player's level, so the cap at the player's level bounds every upgrade target.
 */
export function capAt(caps: LevelCap[], level: number | undefined): LevelCap | undefined {
  if (level === undefined) return undefined;
  let found: LevelCap | undefined;
  for (const cap of caps) {
    if (cap.level > level) break;
    found = cap;
  }
  return found;
}
