import { IndexedCosts, ItemObject, ItemQuantity, UpgradeData } from '../../models';

const GOLD: ItemObject = { id: 'GOLD', name: 'Złoto' };
const T1: ItemObject = { id: 'ABILITY_T1', name: 'Materiał umiejętności T1' };
const T2: ItemObject = { id: 'ABILITY_T2', name: 'Materiał umiejętności T2' };
const T3: ItemObject = { id: 'ABILITY_T3', name: 'Materiał umiejętności T3' };
const T4: ItemObject = { id: 'ABILITY_T4', name: 'Materiał umiejętności T4' };

/** Cost to upgrade an ability TO the given level (level 1 is free). */
const ABILITY_COSTS: IndexedCosts = {
  '2': [
    { item: T1, quantity: 10 },
    { item: GOLD, quantity: 5_000 },
  ],
  '3': [
    { item: T1, quantity: 25 },
    { item: GOLD, quantity: 15_000 },
  ],
  '4': [
    { item: T2, quantity: 20 },
    { item: GOLD, quantity: 40_000 },
  ],
  '5': [
    { item: T2, quantity: 40 },
    { item: GOLD, quantity: 100_000 },
  ],
  '6': [
    { item: T3, quantity: 30 },
    { item: GOLD, quantity: 250_000 },
  ],
  '7': [
    { item: T3, quantity: 60 },
    { item: GOLD, quantity: 500_000 },
  ],
  '8': [
    { item: T4, quantity: 25 },
    { item: GOLD, quantity: 1_000_000 },
  ],
};

/** Shape of GET /game/v1/upgradeData (subset, illustrative numbers). */
export const MOCK_UPGRADE_DATA: UpgradeData = {
  yellowStarTotalShards: {
    '1': 15,
    '2': 30,
    '3': 55,
    '4': 95,
    '5': 155,
    '6': 255,
    '7': 410,
  },
  yellowStarTotalCosts: {
    '1': [],
    '2': [{ item: GOLD, quantity: 5_000 }],
    '3': [{ item: GOLD, quantity: 25_000 }],
    '4': [{ item: GOLD, quantity: 75_000 }],
    '5': [{ item: GOLD, quantity: 200_000 }],
    '6': [{ item: GOLD, quantity: 500_000 }],
    '7': [{ item: GOLD, quantity: 1_250_000 }],
  },
  abilityUpgradeCosts: {
    basic: ABILITY_COSTS,
    special: ABILITY_COSTS,
    ultimate: ABILITY_COSTS,
    passive: ABILITY_COSTS,
  },
};

const shards = (id: string, quantity: number): ItemQuantity => ({ item: `SHARD_${id}`, quantity });

/** Shape of GET /player/v1/inventory?itemFormat=id (subset). */
export const MOCK_INVENTORY: ItemQuantity[] = [
  { item: 'GOLD', quantity: 3_450_000 },
  { item: 'ABILITY_T1', quantity: 420 },
  { item: 'ABILITY_T2', quantity: 180 },
  { item: 'ABILITY_T3', quantity: 75 },
  { item: 'ABILITY_T4', quantity: 12 },
  shards('BlackPanther', 64),
  shards('Shuri', 88),
  shards('Okoye', 21),
  shards('StarLord', 40),
  shards('Rocket', 112),
  shards('Groot', 9),
  shards('Loki', 37),
  shards('Hulk', 120),
  shards('BlackWidow', 70),
  shards('Thanos', 15),
  shards('DoctorDoom', 42),
  shards('Drax', 48),
  shards('BlueMarvel', 70),
  shards('Knull', 120),
];
