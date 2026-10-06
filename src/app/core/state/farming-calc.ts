import {
  AbilityKey,
  IndexedCosts,
  IndexedShards,
  ItemCost,
  ItemQuantity,
  RosterEntry,
  UpgradeData,
  itemId,
} from '../models';
import { ABILITY_KEYS, MAX_YELLOW_STARS } from './game-rules';

export interface FarmingGoal {
  characterId: string;
  targetYellow: number;
  targetAbilities: Record<AbilityKey, number>;
}

export interface MaterialLine {
  itemId: string;
  name: string;
  icon?: string;
  needed: number;
  owned: number;
  missing: number;
}

export interface ShardPlan {
  needed: number;
  owned: number;
  missing: number;
  /** False when the shard item id is unknown, so `owned` could not be read. */
  tracked: boolean;
}

/** The next single step: unlocking, or one more yellow star. */
export interface NextStar {
  stars: number;
  needed: number;
  owned: number;
  /** Enough shards in the inventory to promote/unlock right now. */
  ready: boolean;
}

/** A character whose next step is already covered by the shards in the inventory. */
export interface Promotion {
  entry: RosterEntry;
  next: NextStar;
}

export interface GoalPlan {
  goal: FarmingGoal;
  entry: RosterEntry;
  shards: ShardPlan;
  nextStar?: NextStar;
  materials: MaterialLine[];
  /** Nothing left to upgrade. */
  reached: boolean;
  /** Everything needed is in the inventory. */
  affordable: boolean;
}

export type Inventory = ReadonlyMap<string, number>;

interface Label {
  name: string;
  icon?: string;
}

/** Item id → quantity. */
export function toInventory(items: ItemQuantity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of items) {
    const id = itemId(entry.item);
    if (id) map.set(id, (map.get(id) ?? 0) + (entry.quantity ?? 1));
  }
  return map;
}

/** Shards still to collect between two yellow-star counts (tables are cumulative). */
export function shardsBetween(totals: IndexedShards | undefined, from: number, to: number): number {
  const total = (stars: number) => (stars <= 0 ? 0 : (totals?.[String(stars)] ?? 0));
  return Math.max(0, total(to) - total(from));
}

/** Difference of two cumulative cost entries (`yellowStarTotalCosts`). */
export function cumulativeCostsBetween(
  costs: IndexedCosts | undefined,
  from: number,
  to: number,
): ItemCost[] {
  if (to <= from) return [];
  const result = new Map<string, ItemCost>();
  for (const cost of costs?.[String(to)] ?? []) addCost(result, cost, 1);
  if (from > 0) for (const cost of costs?.[String(from)] ?? []) addCost(result, cost, -1);
  return [...result.values()].filter((c) => (c.quantity ?? 0) > 0);
}

/**
 * Sum of per-level costs for levels `from+1 … to` (`abilityUpgradeCosts`, where the key is the
 * level being upgraded to).
 */
export function levelCostsBetween(
  costs: IndexedCosts | undefined,
  from: number,
  to: number,
): ItemCost[] {
  const result = new Map<string, ItemCost>();
  for (let level = Math.max(from, 0) + 1; level <= to; level++) {
    for (const cost of costs?.[String(level)] ?? []) addCost(result, cost, 1);
  }
  return [...result.values()];
}

export function planGoal(
  goal: FarmingGoal,
  entry: RosterEntry,
  upgrade: UpgradeData,
  inventory: Inventory,
): GoalPlan {
  const shardsNeeded = shardsBetween(
    upgrade.yellowStarTotalShards,
    entry.yellowStars,
    goal.targetYellow,
  );
  const shardsOwned = entry.shardItemId ? (inventory.get(entry.shardItemId) ?? 0) : 0;
  const shards: ShardPlan = {
    needed: shardsNeeded,
    owned: shardsOwned,
    missing: Math.max(0, shardsNeeded - shardsOwned),
    tracked: !!entry.shardItemId,
  };

  const costs: ItemCost[] = [
    ...cumulativeCostsBetween(upgrade.yellowStarTotalCosts, entry.yellowStars, goal.targetYellow),
    ...ABILITY_KEYS.flatMap((key) =>
      levelCostsBetween(
        upgrade.abilityUpgradeCosts?.[key],
        entry.abilities[key],
        goal.targetAbilities[key],
      ),
    ),
  ];
  const materials = toLines(merge(costs), inventory, labelsOf(upgrade));

  return {
    goal,
    entry,
    shards,
    nextStar: nextStar(entry, upgrade, inventory, goal.targetYellow),
    materials,
    reached: shardsNeeded === 0 && materials.length === 0,
    affordable: shards.missing === 0 && materials.every((m) => m.missing === 0),
  };
}

/**
 * The next step towards `targetYellow` (default: unlock, or 7★): one more star, or unlocking
 * at the character's unlock stars. Undefined when done or the shard item is unknown.
 */
export function nextStar(
  entry: RosterEntry,
  upgrade: UpgradeData,
  inventory: Inventory,
  targetYellow = goalFor(entry).targetYellow,
): NextStar | undefined {
  if (!entry.shardItemId || entry.yellowStars >= targetYellow) return undefined;
  const stars = entry.unlocked
    ? entry.yellowStars + 1
    : Math.min(targetYellow, entry.unlockStars ?? targetYellow);
  const needed = shardsBetween(upgrade.yellowStarTotalShards, entry.yellowStars, stars);
  if (needed <= 0) return undefined;
  const owned = inventory.get(entry.shardItemId) ?? 0;
  return { stars, needed, owned, ready: owned >= needed };
}

/** Every roster character that can be unlocked or promoted with the shards already owned. */
export function promotions(
  roster: RosterEntry[],
  upgrade: UpgradeData,
  inventory: Inventory,
): Promotion[] {
  return roster.flatMap((entry) => {
    const next = nextStar(entry, upgrade, inventory);
    return next?.ready ? [{ entry, next }] : [];
  });
}

/**
 * Goal towards a character's max build: unlock a locked one, otherwise `targetYellow`
 * (default 7★) with the ability levels of its max build when known.
 */
export function goalFor(
  entry: RosterEntry,
  maxAbilities?: Record<AbilityKey, number>,
  targetYellow?: number,
): FarmingGoal {
  return {
    characterId: entry.id,
    targetYellow:
      targetYellow ?? (entry.unlocked ? MAX_YELLOW_STARS : (entry.unlockStars ?? MAX_YELLOW_STARS)),
    targetAbilities: entry.unlocked && maxAbilities ? { ...maxAbilities } : { ...entry.abilities },
  };
}

/** Total materials across all goals, compared with one shared inventory. */
export function aggregateMaterials(
  plans: GoalPlan[],
  inventory: Inventory,
  upgrade: UpgradeData,
): MaterialLine[] {
  const costs = plans.flatMap((p) =>
    p.materials.map((m) => ({ item: m.itemId, quantity: m.needed })),
  );
  return toLines(merge(costs), inventory, labelsOf(upgrade));
}

function addCost(into: Map<string, ItemCost>, cost: ItemCost, sign: 1 | -1): void {
  const id = itemId(cost.item);
  if (!id) return;
  const quantity = (cost.quantity ?? 1) * sign;
  const existing = into.get(id);
  into.set(id, {
    item: existing?.item ?? cost.item,
    quantity: (existing?.quantity ?? 0) + quantity,
  });
}

function merge(costs: ItemCost[]): ItemCost[] {
  const result = new Map<string, ItemCost>();
  for (const cost of costs) addCost(result, cost, 1);
  return [...result.values()];
}

function toLines(
  costs: ItemCost[],
  inventory: Inventory,
  labels: Map<string, Label>,
): MaterialLine[] {
  return costs
    .map((cost) => {
      const id = itemId(cost.item)!;
      const needed = cost.quantity ?? 0;
      const owned = inventory.get(id) ?? 0;
      const label = labels.get(id);
      return {
        itemId: id,
        name: label?.name ?? id,
        icon: label?.icon,
        needed,
        owned,
        missing: Math.max(0, needed - owned),
      };
    })
    .filter((line) => line.needed > 0)
    .sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name));
}

/** Names and icons of items referenced by upgrade costs (when `itemFormat=object`). */
function labelsOf(upgrade: UpgradeData): Map<string, Label> {
  const labels = new Map<string, Label>();
  const visit = (costs: IndexedCosts | undefined) => {
    for (const list of Object.values(costs ?? {})) {
      for (const { item } of list) {
        if (typeof item === 'object' && item.name) {
          labels.set(item.id, { name: item.name, icon: item.icon });
        }
      }
    }
  };
  visit(upgrade.yellowStarTotalCosts);
  for (const key of ABILITY_KEYS) visit(upgrade.abilityUpgradeCosts?.[key]);
  return labels;
}
