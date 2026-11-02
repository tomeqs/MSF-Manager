import { EpisodicInfo, EventInfo } from '../../models';
import { linkedEpisodics, nodeDrops, orbCandidates, orbDrops } from './shard-drops';

const shards = new Set(['SHARD_A', 'SHARD_B']);

describe('shard drops from game data', () => {
  it('finds the nodes whose rewards include shards, with what kind of reward', () => {
    const heroes: EpisodicInfo = {
      id: 'Heroes',
      nodeName: 'HEROES',
      chapters: {
        '4': {
          tiers: {
            '3': {
              energyCost: 12,
              rewards: {
                allOf: [
                  { item: 'GOLD', quantity: 900 },
                  { chanceOf: { item: 'SHARD_A', quantity: 1 } },
                ],
              },
              firstTimeRewards: { item: 'SHARD_B', quantity: 5 },
            },
            '4': { rewards: { item: 'GEAR_X', quantity: 2 } },
          },
        },
      },
    };
    expect(nodeDrops(heroes, 'campaign', shards)).toEqual([
      expect.objectContaining({
        itemId: 'SHARD_A',
        node: 'HEROES 4-3',
        kind: 'rewards',
        random: true,
        amount: 1,
        energyCost: 12,
      }),
      expect.objectContaining({
        itemId: 'SHARD_B',
        node: 'HEROES 4-3',
        kind: 'firstTime',
        random: false,
        amount: 5,
      }),
    ]);
  });

  it('follows running and scheduled events to their event campaigns', () => {
    const event = (id: string, endTime: number, episodic: EventInfo['episodic']): EventInfo => ({
      id,
      type: 'episodic',
      startTime: 0,
      endTime,
      episodic,
    });
    const refs = linkedEpisodics(
      [
        event('a', 200, { type: 'eventCampaign', ids: ['Mystic'] }),
        event('b', 200, { type: 'flashEvent', id: 'Flash1' }),
        event('old', 50, { type: 'eventCampaign', ids: ['Ended'] }),
      ],
      100,
    );
    expect(refs).toEqual([
      { type: 'eventCampaign', id: 'Mystic' },
      { type: 'flashEvent', id: 'Flash1' },
    ]);
  });

  it('spots orb-like reward items and reads shards from orb contents', () => {
    expect(orbCandidates([{ oneOf: [{ item: 'Orb_Guardians' }, { item: 'GOLD' }] }])).toEqual([
      'Orb_Guardians',
    ]);
    const contents = {
      oneOf: [{ item: 'SHARD_A', quantity: 5, maxQuantity: 15 }, { item: 'GOLD' }],
    };
    expect(orbDrops('Orb_Guardians', 'Guardians Orb', contents, shards)).toEqual([
      { itemId: 'SHARD_A', orbId: 'Orb_Guardians', orbName: 'Guardians Orb', amount: 15 },
    ]);
  });
});
