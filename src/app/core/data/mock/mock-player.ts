import { PlayerCard } from '../../models';

/** Shape of GET /player/v1/card. */
export const MOCK_PLAYER: PlayerCard = {
  name: 'Commander',
  level: { completedTier: 82, goalTier: 83, points: 41_250, goal: 60_000 },
  tcp: 8_727_400,
  stp: 3_245_800,
  warMvp: 37,
  charactersCollected: 21,
  charactersAtMaxStarRank: 12,
  bestArena: 14,
  latestArena: 52,
  latestBlitz: 318,
  blitzWins: 1_904,
};
