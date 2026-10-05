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
      id: 'mock-blitz-xmen',
      type: 'blitz',
      name: 'X-Men Blitz',
      subName: 'Wymagane: X-Men',
      startTime: now - 6 * HOUR,
      endTime: now + 1 * DAY + 18 * HOUR,
      blitz: {
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
      subName: 'Startuje wkrótce',
      startTime: now + 2 * DAY,
      endTime: now + 9 * DAY,
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
