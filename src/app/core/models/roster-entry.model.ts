import { IsoClass, IsoMatrix, TraitObject } from './character.model';

/**
 * Flat view model used by the UI. Built from CharacterInfo + CharacterInstance by
 * `toRosterEntry`, so components never depend on the raw API shapes.
 */
export interface RosterEntry {
  id: string;
  name: string;
  portrait?: string;
  traits: TraitObject[];
  unlocked: boolean;
  favorite: boolean;
  level: number;
  yellowStars: number;
  /** Red stars capped at 7. */
  redStars: number;
  /** 0-3, from activeRed 8-10. */
  diamonds: number;
  gearTier: number;
  gearSlots: boolean[];
  abilities: { basic: number; special: number; ultimate: number; passive: number };
  iso: { active?: IsoClass; level: number; matrix?: IsoMatrix };
  power: number;
  /** Inventory item id of this character's yellow-star shards. */
  shardItemId?: string;
}
