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
