import { EventInfo, ShardDrops } from '../../models';
import { mockEvents } from './mock-events';

const DAY = 24 * 3600;

/**
 * Shape of GET /game/v1/events: the player's events plus ones they do not qualify for yet.
 * Invented for the demo.
 */
export function mockGameEvents(nowMs: number): EventInfo[] {
  const now = Math.floor(nowMs / 1000);
  return [
    ...mockEvents(nowMs),
    {
      id: 'mock-wakanda',
      type: 'milestone',
      name: 'Wakanda Forever',
      subName: 'Solo milestone',
      startTime: now - DAY,
      endTime: now + 4 * DAY,
      milestone: {
        type: 'solo',
        brackets: [
          {
            objective: {
              tiers: {
                '1': { rewards: { item: 'SHARD_Shuri', quantity: 20 } },
                '2': { rewards: { item: 'SHARD_Shuri', quantity: 40 } },
              },
            },
          },
        ],
      },
    },
    {
      id: 'mock-mystic-campaign',
      type: 'episodic',
      name: 'Mystic Mayhem',
      subName: 'Event campaign',
      startTime: now + 2 * DAY,
      endTime: now + 9 * DAY,
      episodic: { type: 'eventCampaign', ids: ['MysticMayhem'] },
    },
  ];
}

/**
 * Shape of what `getShardDrops` builds from campaign nodes, event campaigns and orbs.
 * Invented for the demo.
 */
export const MOCK_SHARD_DROPS: ShardDrops = {
  nodes: [
    {
      itemId: 'SHARD_Okoye',
      episodicType: 'campaign',
      episodicId: 'Heroes',
      episodicName: 'Heroes',
      node: 'HEROES 4-3',
      energyCost: 12,
      kind: 'rewards',
      amount: 1,
      random: true,
    },
    {
      itemId: 'SHARD_BlackPanther',
      episodicType: 'campaign',
      episodicId: 'Nexus',
      episodicName: 'Nexus',
      node: 'NEXUS 2-9',
      energyCost: 12,
      kind: 'rewards',
      amount: 1,
      random: true,
    },
    {
      itemId: 'SHARD_Mephisto',
      episodicType: 'eventCampaign',
      episodicId: 'MysticMayhem',
      episodicName: 'Mystic Mayhem',
      node: 'MYSTIC MAYHEM 1-5',
      energyCost: 15,
      kind: 'limited',
      amount: 5,
      random: false,
    },
  ],
  orbs: [
    { itemId: 'SHARD_StarLord', orbId: 'Orb_Guardians', orbName: 'Guardians Orb', amount: 15 },
    { itemId: 'SHARD_Rocket', orbId: 'Orb_Guardians', orbName: 'Guardians Orb', amount: 15 },
    { itemId: 'SHARD_Groot', orbId: 'Orb_Guardians', orbName: 'Guardians Orb', amount: 15 },
  ],
};
