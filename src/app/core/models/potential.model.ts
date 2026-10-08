import { IsoClass } from './character.model';
import { AbilityKey } from './item.model';

/** Build to compute a character's power for (GET /game/v1/characterInstances/{id}). */
export interface PotentialTarget {
  /** Character level to assume; omitted = the game's current level cap. */
  level?: number;
  /** Red stars/diamonds to keep (0-10) — these are not farmed with shards. */
  red: number;
  /** Active ISO-8 class to assume at max level, if the character has one. */
  isoClass?: IsoClass;
  /** Yellow stars to assume; omitted = 7. */
  yellow?: number;
}

/** Power and build of a character at a target (yellow stars, max gear/abilities for level). */
export interface CharacterPotential {
  power: number;
  level?: number;
  gearTier?: number;
  abilities: Record<AbilityKey, number>;
}
