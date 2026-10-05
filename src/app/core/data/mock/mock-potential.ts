import { CharacterPotential, PotentialTarget } from '../../models';

/** Deterministic, illustrative max power so demo mode shows realistic-looking gaps. */
export function mockPotential(characterId: string, target: PotentialTarget): CharacterPotential {
  const seed = [...characterId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const base = 650_000 + (seed % 15) * 10_000;
  return {
    power: base + target.red * 25_000 + (target.isoClass ? 40_000 : 0),
    level: target.level ?? 95,
    gearTier: 20,
    abilities: { basic: 8, special: 8, ultimate: 8, passive: 6 },
  };
}
