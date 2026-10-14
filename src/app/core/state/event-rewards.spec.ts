import { EventInfo } from '../models';
import { offeredShards, shardOffers } from './event-rewards';

const NOW = 1_000_000;

const event = (
  id: string,
  start: number,
  end: number,
  tiers: EventInfo['milestone'],
): EventInfo => ({
  id,
  type: 'milestone',
  name: id,
  startTime: start,
  endTime: end,
  milestone: tiers,
});

describe('event rewards', () => {
  const events: EventInfo[] = [
    event('live', NOW - 10, NOW + 100, {
      brackets: [
        {
          objective: {
            tiers: {
              '1': { rewards: { item: 'SHARD_A', quantity: 10 } },
              '2': {
                rewards: {
                  allOf: [
                    { item: 'SHARD_A', quantity: 15 },
                    { item: 'GOLD', quantity: 1000 },
                    { oneOf: [{ item: 'SHARD_B', quantity: 5, maxQuantity: 8 }], pulls: 2 },
                  ],
                },
                premiumRewards: { item: 'SHARD_A', quantity: 30 },
              },
            },
          },
        },
      ],
    }),
    event('soon', NOW + 50, NOW + 500, {
      brackets: [{ objective: { tiers: { '1': { rewards: { item: 'SHARD_A', quantity: 40 } } } } }],
    }),
    event('over', NOW - 500, NOW - 1, {
      brackets: [{ objective: { tiers: { '1': { rewards: { item: 'SHARD_A', quantity: 99 } } } } }],
    }),
  ];

  it('sums shards over tiers and packages, splitting free, premium and random rewards', () => {
    const offers = shardOffers(events, new Set(['SHARD_A', 'SHARD_B']), NOW);
    expect(
      offers.get('SHARD_A')!.map((o) => [o.event.id, o.live, o.guaranteed, o.premium]),
    ).toEqual([
      ['live', true, 25, 30],
      ['soon', false, 40, 0],
    ]);
    expect(offers.get('SHARD_B')![0]).toMatchObject({ guaranteed: 0, possible: 16 });
    expect(offeredShards(offers.get('SHARD_A')![0])).toBe(25);
    expect(offeredShards(offers.get('SHARD_A')![0], true)).toBe(55);
  });

  it('ignores ended events and items that are not tracked shards', () => {
    const offers = shardOffers(events, new Set(['SHARD_A']), NOW);
    expect(offers.get('SHARD_A')!.some((o) => o.event.id === 'over')).toBe(false);
    expect(offers.has('GOLD')).toBe(false);
  });
});
