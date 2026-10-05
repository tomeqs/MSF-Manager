/** Mirrors API schema TeamOrder (GET /game/v1/analysis/teamOrder/{tabId}). */

export type TeamTab = 'arena' | 'war' | 'raids' | 'blitz' | 'tower' | 'crucible' | 'roster';

export interface TeamOrder {
  /** Character ids in squad order. */
  squad: string[];
  /** How many times this exact ordering occurs across players' saved squads. */
  total: number;
}
