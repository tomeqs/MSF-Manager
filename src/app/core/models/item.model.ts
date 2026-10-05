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
}

export interface ItemCost {
  item: Item;
  quantity?: number;
}

/** Inventory entries are ItemQuantity objects with a plain `item`. */
export interface ItemQuantity {
  item?: Item;
  quantity?: number;
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
