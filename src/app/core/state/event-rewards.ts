import { Bracket, EventInfo, ItemQuantity, itemId } from '../models';

/** Shards of one character an event can award (summed over all its reward tiers). */
export interface ShardOffer {
  event: EventInfo;
  itemId: string;
  /** Free-track shards from reaching every tier. */
  guaranteed: number;
  /** Premium-track shards (e.g. paid battle pass). */
  premium: number;
  /** Shards inside random packages — at most this many, not certain. */
  possible: number;
  /** Already running (otherwise announced / upcoming). */
  live: boolean;
}

/**
 * Character shards awarded by running and upcoming events, read from their objective tiers
 * (`/player/v1/events?objRewards=full`). Keyed by shard item id; ended events are skipped.
 * Live offers come first, then the largest guaranteed amount.
 */
export function shardOffers(
  events: EventInfo[],
  shardIds: ReadonlySet<string>,
  nowSec = Date.now() / 1000,
): Map<string, ShardOffer[]> {
  const result = new Map<string, ShardOffer[]>();
  for (const event of events) {
    if (event.endTime <= nowSec) continue;
    const perItem = new Map<string, ShardOffer>();
    const offer = (id: string) => {
      let o = perItem.get(id);
      if (!o) {
        o = {
          event,
          itemId: id,
          guaranteed: 0,
          premium: 0,
          possible: 0,
          live: event.startTime <= nowSec,
        };
        perItem.set(id, o);
      }
      return o;
    };
    for (const bracket of bracketsOf(event)) {
      for (const tier of Object.values(bracket.objective?.tiers ?? {})) {
        walk(tier.rewards, 1, false, shardIds, (id, qty, random) => {
          if (random) offer(id).possible += qty;
          else offer(id).guaranteed += qty;
        });
        walk(tier.premiumRewards, 1, false, shardIds, (id, qty, random) => {
          if (random) offer(id).possible += qty;
          else offer(id).premium += qty;
        });
      }
    }
    for (const [id, o] of perItem) result.set(id, [...(result.get(id) ?? []), o]);
  }
  for (const offers of result.values()) {
    offers.sort((a, b) => Number(b.live) - Number(a.live) || b.guaranteed - a.guaranteed);
  }
  return result;
}

/** Shards an offer can surely bring (free track, plus premium when counted). */
export function offeredShards(offer: ShardOffer, withPremium = false): number {
  return offer.guaranteed + (withPremium ? offer.premium : 0);
}

function bracketsOf(event: EventInfo): Bracket[] {
  return [
    ...(event.milestone?.brackets ?? []),
    ...(event.blitz?.brackets ?? []),
    ...(event.tower?.brackets ?? []),
    ...(event.battlePass?.brackets ?? []),
    ...(event.strikePass?.brackets ?? []),
  ];
}

/** Visits every shard item in a reward package with its (maximum) quantity. */
function walk(
  reward: ItemQuantity | undefined,
  multiplier: number,
  random: boolean,
  shardIds: ReadonlySet<string>,
  visit: (id: string, quantity: number, random: boolean) => void,
): void {
  if (!reward) return;
  const id = itemId(reward.item);
  if (id && shardIds.has(id)) {
    visit(id, (reward.maxQuantity ?? reward.quantity ?? 1) * multiplier, random);
  }
  for (const child of reward.allOf ?? []) walk(child, multiplier, random, shardIds, visit);
  const pulls = reward.pulls ?? 1;
  for (const child of reward.oneOf ?? []) walk(child, multiplier * pulls, true, shardIds, visit);
  walk(reward.chanceOf, multiplier * pulls, true, shardIds, visit);
}

/** "Event „Fear Tower”: +120 shardów (do 18.10)" / "… od 20.10" for upcoming ones. */
export function offerSummary(offer: ShardOffer): string {
  const date = (sec: number) =>
    new Date(sec * 1000).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' });
  const name = offer.event.name ?? offer.event.id;
  const parts = [];
  if (offer.guaranteed) parts.push(`+${offer.guaranteed} shardów`);
  if (offer.premium) parts.push(`+${offer.premium} w wersji premium`);
  if (offer.possible) parts.push(`do ${offer.possible} losowo`);
  const when = offer.live ? `do ${date(offer.event.endTime)}` : `od ${date(offer.event.startTime)}`;
  return `Event „${name}”: ${parts.join(', ')} (${when})`;
}
