/** Mirrors API schemas Item, ItemCost, ItemQuantity and the upgradeData indexed maps. */

/** Plain id when `itemFormat=id`, otherwise an object. */
export type Item = string | ItemObject;

export interface ItemObject {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  /** Shard/star items only. */
  characterId?: string;
  tier?: number;
  isOrb?: boolean;
}

export interface ItemCost {
  item: Item;
  quantity?: number;
}

/**
 * Inventory entries are ItemQuantity objects with a plain `item`. Rewards may instead be
 * packages: `allOf` (everything), `oneOf` (one weighted random pick), `chanceOf` (maybe).
 */
export interface ItemQuantity {
  item?: Item;
  quantity?: number;
  /** A range of possible quantities, from `quantity` to `maxQuantity`. */
  maxQuantity?: number;
  oneOf?: ItemQuantity[];
  allOf?: ItemQuantity[];
  chanceOf?: ItemQuantity;
  /** How many times a `oneOf`/`chanceOf` package is opened (default 1). */
  pulls?: number;
}

/** Level/tier number (as string key, starting at "1") → cost. */
export type IndexedCosts = Record<string, ItemCost[]>;

/** Yellow stars → total shards required to reach them. */
export type IndexedShards = Record<string, number>;

export type AbilityKey = 'basic' | 'special' | 'ultimate' | 'passive';

/** Subset of GET /game/v1/upgradeData used by the farming calculator. */
export interface UpgradeData {
  yellowStarTotalShards?: IndexedShards;
  yellowStarTotalCosts?: IndexedCosts;
  abilityUpgradeCosts?: Partial<Record<AbilityKey, IndexedCosts>>;
}

export function itemId(item: Item | undefined): string | undefined {
  return typeof item === 'string' ? item : item?.id;
}

/**
 * Visits every item in a reward package with its (maximum) quantity, and whether it is only
 * a chance (inside `oneOf`/`chanceOf`). `pulls` multiply what a random package can give.
 */
export function forEachRewardItem(
  reward: ItemQuantity | undefined,
  visit: (id: string, quantity: number, random: boolean) => void,
  multiplier = 1,
  random = false,
): void {
  if (!reward) return;
  const id = itemId(reward.item);
  if (id) visit(id, (reward.maxQuantity ?? reward.quantity ?? 1) * multiplier, random);
  for (const child of reward.allOf ?? []) forEachRewardItem(child, visit, multiplier, random);
  const pulls = reward.pulls ?? 1;
  for (const child of reward.oneOf ?? []) forEachRewardItem(child, visit, multiplier * pulls, true);
  forEachRewardItem(reward.chanceOf, visit, multiplier * pulls, true);
}
