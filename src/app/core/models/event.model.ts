import { DateTime } from './api.model';

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

export interface Objective {
  progress?: Progress;
}

export interface Bracket {
  id?: string;
  objective?: Objective;
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
  blitz?: { brackets?: Bracket[] };
  tower?: { brackets?: Bracket[] };
}
