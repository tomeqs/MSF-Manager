import { AbilityKey, Item } from './item.model';

/**
 * Character models mirroring the MSF API schemas (CharacterInfo, CharacterInstance, Trait, Iso8).
 * Only the fields the app uses are declared; the API may return more.
 */

/** API returns traits as plain ids when `traitFormat=id`, otherwise as objects. */
export type Trait = string | TraitObject;

export interface TraitObject {
  id: string;
  name?: string;
  alwaysInvisible?: boolean;
  isEvent?: boolean;
}

export type CharacterStatus =
  'playable' | 'summon' | 'war' | 'operator' | 'nue' | 'model' | 'unplayable' | 'other' | 'unknown';

export interface CharacterInfo {
  id: string;
  name?: string;
  description?: string;
  portrait?: string;
  status?: CharacterStatus;
  unlockStars?: number;
  traits?: Trait[];
  invisibleTraits?: Trait[];
  eventTraits?: Trait[];
  /** [0] = yellow-star shard item, [1-7] red star items, [8-10] diamond items. */
  starItems?: Item[];
  /** Only when requested with `abilityKits`. */
  abilityKit?: AbilityKit;
}

/** Mirrors API schemas AbilityKit / Ability / AbilityLevel (descriptions only). */
export interface AbilityKit {
  basic?: Ability;
  special?: Ability;
  ultimate?: Ability;
  passive?: Ability;
}

export interface Ability {
  name?: string;
  /** Level number (from 1) → that level. */
  levels?: Record<string, { description?: string }>;
}

/**
 * What the app keeps of a character's kit: the description of each ability at its highest
 * level, with the character's name and traits in the same language as the text.
 */
export interface CharacterKit {
  id: string;
  name?: string;
  traits: TraitObject[];
  texts: Partial<Record<AbilityKey, string>>;
}

export type IsoClass = 'striker' | 'fortifier' | 'healer' | 'skirmisher' | 'raider';
export type IsoMatrix = 'green' | 'blue' | 'purple';

export interface Iso8 {
  matrix?: IsoMatrix;
  active?: IsoClass;
  health?: number;
  damage?: number;
  armor?: number;
  focus?: number;
  resist?: number;
  striker?: number;
  fortifier?: number;
  healer?: number;
  skirmisher?: number;
  raider?: number;
}

/** A character in a roster. Most fields are omitted for locked characters. */
export interface CharacterInstance {
  id: string;
  level?: number;
  activeYellow?: number;
  /** 0-7 red stars, 8-10 = 1-3 diamonds. */
  activeRed?: number;
  costume?: number;
  gearTier?: number;
  /** 6 slots: top→bottom left, then top→bottom right. */
  gearSlots?: boolean[];
  basic?: number;
  special?: number;
  ultimate?: number;
  passive?: number;
  /** Object unless `statsFormat=csv` was requested. */
  iso8?: Iso8 | string;
  power?: number;
  favorite?: boolean;
  info?: CharacterInfo;
}
