import { ItemQuantity } from './item.model';

/** Mirrors the API's episodic types (`/game/v1/episodics/{episodicType}`). */
export type EpisodicType =
  'campaign' | 'eventCampaign' | 'challenge' | 'flashEvent' | 'unlockEvent' | 'otherEvent';

/** Mirrors API schema NodeInfo (rewards subset). */
export interface NodeInfo {
  name?: string;
  energyCost?: number;
  firstTimeRewards?: ItemQuantity;
  limitedRewards?: ItemQuantity;
  limitedRewardsLimit?: number;
  rewards?: ItemQuantity;
}

/** Mirrors API schema ChapterInfo (subset): tier number → node. */
export interface ChapterInfo {
  numTiers?: number;
  tiers?: Record<string, NodeInfo>;
}

/** Mirrors API schema EpisodicInfo (subset): chapter number → chapter. */
export interface EpisodicInfo {
  id: string;
  name?: string;
  /** Prefix of node names, e.g. "HEROES" in "HEROES 1-1". */
  nodeName?: string;
  numChapters?: number;
  chapters?: Record<string, ChapterInfo>;
}

/** A node whose rewards include a character's shards. */
export interface NodeDrop {
  /** Shard item id. */
  itemId: string;
  episodicType: EpisodicType;
  episodicId: string;
  episodicName?: string;
  /** "HEROES 4-3". */
  node: string;
  energyCost?: number;
  /** Repeatable rewards, the first clear only, or a limited number of clears. */
  kind: 'rewards' | 'firstTime' | 'limited';
  /** Shards per clear (the maximum when random). */
  amount: number;
  /** Only a chance per clear. */
  random: boolean;
}

/** An orb whose possible rewards include a character's shards. */
export interface OrbDrop {
  itemId: string;
  orbId: string;
  orbName?: string;
  /** Most shards one opening can give. */
  amount: number;
}

/** Where shards drop, read from game data (nodes and orbs; stores are not in the API). */
export interface ShardDrops {
  nodes: NodeDrop[];
  orbs: OrbDrop[];
}
