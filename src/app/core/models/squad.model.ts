import { TeamTab } from './team.model';

/**
 * Mirrors API schemas SquadsInfo / SquadTabs / Squad (GET /player/v1/squads): the player's
 * saved squads per game mode, each an array of character ids in squad order.
 */
export type Squad = string[];

export type SquadTabs = Partial<Record<TeamTab, Squad[]>>;

export interface SquadsInfo {
  tabs?: SquadTabs;
  /** The player's maximum number of squads. */
  maxSquads?: number;
}
