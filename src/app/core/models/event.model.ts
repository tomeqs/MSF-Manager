import { DateTime } from './api.model';
import { IsoClass, Trait } from './character.model';
import { ItemQuantity } from './item.model';

/** Mirrors API schema EventInfo (subset). */

export type EventType =
  | 'info'
  | 'bonus'
  | 'blitz'
  | 'episodic'
  | 'milestone'
  | 'raid'
  | 'raidSeason'
  | 'warSeason'
  | 'donation'
  | 'battlePass'
  | 'strikePass'
  | 'tower'
  | 'pickYourPoison';

export interface Progress {
  completedTier?: number;
  goalTier?: number;
  points?: number;
  goal?: number;
  rank?: number;
}

/** Mirrors API schema ObjectiveTier (subset). Tier rewards are additive. */
export interface ObjectiveTier {
  goal?: number;
  rewards?: ItemQuantity;
  premiumRewards?: ItemQuantity;
}

export interface Objective {
  progress?: Progress;
  /** Tier number ("1", "2", …) → tier; present with `objRewards=full`. */
  tiers?: Record<string, ObjectiveTier>;
}

export interface Bracket {
  id?: string;
  objective?: Objective;
}

/** Mirrors API schema CharacterFilter: a character must satisfy every field present. */
export interface CharacterFilter {
  allTraits?: Trait[];
  anyTraits?: Trait[];
  exceptTraits?: Trait[];
  anyCharacters?: string[];
  level?: number;
  activeYellow?: number;
  activeRed?: number;
  gearTier?: number;
  iso8Class?: IsoClass;
  iso8ClassLevel?: number;
}

/** Mirrors API schema Requirements (subset). */
export interface Requirements {
  minCharacters?: number;
  maxCharacters?: number;
  /** Each character must satisfy at least one of these filters. */
  anyCharacterFilters?: CharacterFilter[];
  /** All of these characters are required. */
  specificCharacters?: string[];
  description?: string;
}

export interface EventInfo {
  id: string;
  type: EventType;
  name?: string;
  subName?: string;
  details?: string;
  startTime: DateTime;
  endTime: DateTime;
  cardArt?: string;
  milestone?: { type?: 'solo' | 'alliance'; brackets?: Bracket[] };
  blitz?: { requirements?: Requirements; brackets?: Bracket[] };
  tower?: { requirements?: Requirements; brackets?: Bracket[] };
  battlePass?: { brackets?: Bracket[] };
  strikePass?: { brackets?: Bracket[] };
}
