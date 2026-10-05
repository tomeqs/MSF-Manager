/** Mirrors API schemas PlayerCard and SimpleProgress. */

export interface SimpleProgress {
  completedTier?: number;
  goalTier?: number;
  points?: number;
  goal?: number;
}

export interface PlayerCard {
  name: string;
  icon?: string;
  frame?: string;
  level?: SimpleProgress;
  /** Total collection power. */
  tcp?: number;
  /** Strongest team power. */
  stp?: number;
  warMvp?: number;
  charactersCollected?: number;
  charactersAtMaxStarRank?: number;
  bestArena?: number;
  latestArena?: number;
  latestBlitz?: number;
  blitzWins?: number;
}
