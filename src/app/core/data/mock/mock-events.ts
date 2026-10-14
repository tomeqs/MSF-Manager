import { EventInfo } from '../../models';

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Shape of GET /player/v1/events. Times are relative to `nowMs` so the mock never goes stale. */
export function mockEvents(nowMs: number): EventInfo[] {
  const now = Math.floor(nowMs / 1000);
  return [
    {
      id: 'mock-milestone-spider',
      type: 'milestone',
      name: 'Spider-Verse Rising',
      subName: 'Solo milestone',
      details: 'Zdobywaj punkty, ulepszając postacie Spider-Verse.',
      startTime: now - 2 * DAY,
      endTime: now + 3 * DAY + 5 * HOUR,
      milestone: {
        type: 'solo',
        brackets: [
          {
            objective: {
              progress: { completedTier: 6, goalTier: 7, points: 18_400, goal: 25_000 },
            },
          },
        ],
      },
    },
    {
      id: 'mock-blitz-mutant',
      type: 'blitz',
      name: 'Mutant Blitz',
      subName: 'Wymagane: Mutant, min. 6★',
      startTime: now - 6 * HOUR,
      endTime: now + 1 * DAY + 18 * HOUR,
      blitz: {
        requirements: {
          anyCharacterFilters: [{ allTraits: [{ id: 'Mutant', name: 'Mutant' }], activeYellow: 6 }],
        },
        brackets: [
          {
            objective: {
              progress: { completedTier: 3, goalTier: 4, points: 4_250, goal: 6_000, rank: 412 },
            },
          },
        ],
      },
    },
    {
      id: 'mock-alliance-milestone',
      type: 'milestone',
      name: 'Alliance Training',
      subName: 'Alliance milestone',
      startTime: now - 1 * DAY,
      endTime: now + 5 * DAY,
      milestone: {
        type: 'alliance',
        brackets: [
          {
            objective: {
              progress: { completedTier: 2, goalTier: 3, points: 310_000, goal: 500_000 },
            },
          },
        ],
      },
    },
    {
      id: 'mock-tower-wakanda',
      type: 'tower',
      name: 'Survival Tower: Wakanda',
      subName: 'Wymagane: Wakandan, min. 6★',
      startTime: now - 1 * DAY,
      endTime: now + 6 * DAY,
      tower: {
        requirements: {
          minCharacters: 3,
          anyCharacterFilters: [
            { allTraits: [{ id: 'Wakandan', name: 'Wakandan' }], activeYellow: 6 },
          ],
        },
      },
    },
    {
      id: 'mock-blitz-heroes',
      type: 'blitz',
      name: 'Hero Blitz',
      subName: 'Wymagane: Hero, min. G15',
      startTime: now + 1 * DAY,
      endTime: now + 3 * DAY,
      blitz: {
        requirements: {
          anyCharacterFilters: [{ allTraits: [{ id: 'Hero', name: 'Hero' }], gearTier: 15 }],
        },
      },
    },
    {
      id: 'mock-milestone-phoenix',
      type: 'milestone',
      name: 'Phoenix Rising',
      subName: 'Solo milestone — nagrody: shardy Magneto (Phoenix Force)',
      details: 'Punkty za walki postaciami Phoenix Force.',
      startTime: now - 1 * DAY,
      endTime: now + 4 * DAY,
      milestone: {
        type: 'solo',
        brackets: [
          {
            objective: {
              progress: { completedTier: 1, goalTier: 2, points: 2_000, goal: 6_000 },
              tiers: {
                '1': { goal: 2_000, rewards: { item: 'SHARD_MagnetoPF', quantity: 15 } },
                '2': { goal: 6_000, rewards: { item: 'SHARD_MagnetoPF', quantity: 25 } },
                '3': {
                  goal: 12_000,
                  rewards: { item: 'SHARD_MagnetoPF', quantity: 40 },
                  premiumRewards: { item: 'SHARD_MagnetoPF', quantity: 50 },
                },
              },
            },
          },
        ],
      },
    },
    {
      id: 'mock-legendary-odin',
      type: 'episodic',
      name: 'Legendary: Odin',
      subName: 'Nadchodzi — odblokowanie Odina',
      startTime: now + 3 * DAY,
      endTime: now + 10 * DAY,
      milestone: {
        brackets: [
          { objective: { tiers: { '1': { rewards: { item: 'SHARD_Odin', quantity: 100 } } } } },
        ],
      },
    },
    {
      id: 'mock-raid-season',
      type: 'raidSeason',
      name: 'Raid Season 12',
      startTime: now - 10 * DAY,
      endTime: now + 18 * DAY,
    },
  ];
}
