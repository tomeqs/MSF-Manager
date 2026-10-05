import { CharacterPotential, PotentialTarget } from '../../models';
import { MOCK_ROSTER } from './mock-roster';

const MAX_ABILITIES = { basic: 8, special: 8, ultimate: 8, passive: 6 };

/**
 * Illustrative max power for demo mode: owned characters scale with how far they are from
 * 7★ / G20 / max abilities (so demo shows maxed, optimal and developing characters);
 * locked ones get a deterministic base value.
 */
export function mockPotential(characterId: string, target: PotentialTarget): CharacterPotential {
  const owned = MOCK_ROSTER.find((c) => c.id === characterId && c.level);
  let power: number;
  if (owned) {
    const missingAbilities =
      MAX_ABILITIES.basic -
      (owned.basic ?? 0) +
      (MAX_ABILITIES.special - (owned.special ?? 0)) +
      (MAX_ABILITIES.ultimate - (owned.ultimate ?? 0)) +
      (MAX_ABILITIES.passive - (owned.passive ?? 0));
    const factor =
      1 +
      (7 - (owned.activeYellow ?? 7)) * 0.08 +
      Math.max(0, 20 - (owned.gearTier ?? 20)) * 0.04 +
      missingAbilities * 0.01;
    power = Math.round((owned.power ?? 0) * factor);
  } else {
    const seed = [...characterId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    power = 650_000 + (seed % 15) * 10_000 + target.red * 25_000 + (target.isoClass ? 40_000 : 0);
  }
  return {
    power,
    level: target.level ?? 95,
    gearTier: 20,
    abilities: { ...MAX_ABILITIES },
  };
}
