import { CharacterInstance, CharacterPotential, PotentialTarget } from '../../models';
import { MOCK_ROSTER } from './mock-roster';

const LEVEL_CAP = 110;

/** Demo-only gear tier cap per character level (the real one comes from the API). */
function gearCapFor(level: number): number {
  const steps: [number, number][] = [
    [105, 21],
    [100, 20],
    [95, 19],
    [90, 18],
    [85, 17],
    [75, 16],
    [70, 15],
    [65, 14],
    [60, 13],
  ];
  return steps.find(([min]) => level >= min)?.[1] ?? Math.max(1, Math.floor(level / 5));
}

function capFor(level: number): CharacterInstance {
  const top = level >= 90 ? 8 : level >= 75 ? 7 : 6;
  return {
    id: `level-${level}`,
    level,
    gearTier: gearCapFor(level),
    basic: top,
    special: top,
    ultimate: top,
    passive: top - 2,
  };
}

/** Shape of GET /game/v1/characterInstanceCaps (demo values). */
export const MOCK_LEVEL_CAPS: CharacterInstance[] = Array.from({ length: LEVEL_CAP }, (_, i) =>
  capFor(i + 1),
);

/**
 * Illustrative max power for demo mode: owned characters scale with how far they are from
 * 7★ / G20 / max abilities (so demo shows maxed, optimal and developing characters);
 * locked ones get a deterministic base value.
 */
export function mockPotential(characterId: string, target: PotentialTarget): CharacterPotential {
  const level = target.level ?? LEVEL_CAP;
  const cap = capFor(level);
  const owned = MOCK_ROSTER.find((c) => c.id === characterId && c.level);
  let power: number;
  if (owned) {
    const missingAbilities = (['basic', 'special', 'ultimate', 'passive'] as const).reduce(
      (sum, k) => sum + Math.max(0, (cap[k] ?? 0) - (owned[k] ?? 0)),
      0,
    );
    const factor =
      1 +
      Math.max(0, (target.yellow ?? 7) - (owned.activeYellow ?? 7)) * 0.08 +
      Math.max(0, (cap.gearTier ?? 0) - (owned.gearTier ?? 0)) * 0.04 +
      missingAbilities * 0.01;
    power = Math.round((owned.power ?? 0) * factor);
  } else {
    const seed = [...characterId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    power = 650_000 + (seed % 15) * 10_000 + target.red * 25_000 + (target.isoClass ? 40_000 : 0);
  }
  return {
    power,
    level,
    gearTier: cap.gearTier,
    abilities: {
      basic: cap.basic ?? 0,
      special: cap.special ?? 0,
      ultimate: cap.ultimate ?? 0,
      passive: cap.passive ?? 0,
    },
  };
}
