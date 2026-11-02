import {
  EpisodicInfo,
  EpisodicType,
  EventInfo,
  ItemQuantity,
  NodeDrop,
  OrbDrop,
  forEachRewardItem,
} from '../../models';

/** An episodic to read node rewards from. */
export interface EpisodicRef {
  type: EpisodicType;
  id: string;
}

const NODE_REWARDS: [
  keyof Pick<EpisodicNode, 'rewards' | 'firstTimeRewards' | 'limitedRewards'>,
  NodeDrop['kind'],
][] = [
  ['rewards', 'rewards'],
  ['firstTimeRewards', 'firstTime'],
  ['limitedRewards', 'limited'],
];

type EpisodicNode = NonNullable<NonNullable<EpisodicInfo['chapters']>[string]['tiers']>[string];

/** Every node of the episodic whose rewards include one of the shard items. */
export function nodeDrops(
  info: EpisodicInfo,
  type: EpisodicType,
  shardIds: ReadonlySet<string>,
): NodeDrop[] {
  const drops: NodeDrop[] = [];
  for (const [chapter, chapterInfo] of Object.entries(info.chapters ?? {})) {
    for (const [tier, node] of Object.entries(chapterInfo.tiers ?? {})) {
      const label = `${info.nodeName ?? info.name ?? info.id} ${chapter}-${tier}`;
      for (const [field, kind] of NODE_REWARDS) {
        const found = new Map<string, { amount: number; random: boolean }>();
        forEachRewardItem(node[field], (id, quantity, random) => {
          if (!shardIds.has(id)) return;
          const prev = found.get(id);
          found.set(id, {
            amount: (prev?.amount ?? 0) + quantity,
            random: (prev?.random ?? true) && random,
          });
        });
        for (const [itemId, { amount, random }] of found) {
          drops.push({
            itemId,
            episodicType: type,
            episodicId: info.id,
            episodicName: info.name,
            node: label,
            energyCost: node.energyCost,
            kind,
            amount,
            random,
          });
        }
      }
    }
  }
  return drops;
}

/** Event campaigns and flash/unlock events that scheduled or running events point to. */
export function linkedEpisodics(events: EventInfo[], nowSec = Date.now() / 1000): EpisodicRef[] {
  const refs = new Map<string, EpisodicRef>();
  for (const event of events) {
    if (event.endTime <= nowSec || !event.episodic) continue;
    for (const id of event.episodic.ids ?? [])
      refs.set(`eventCampaign:${id}`, { type: 'eventCampaign', id });
    const single = event.episodic.id;
    const type = event.episodic.type;
    if (single && (type === 'flashEvent' || type === 'unlockEvent')) {
      refs.set(`${type}:${single}`, { type, id: single });
    }
  }
  return [...refs.values()];
}

/**
 * Items in these rewards that look like orbs. Orb items are only recognisable by id with
 * `itemFormat=id`; a wrong guess just gets NOT_FOUND from `/orbRewards`.
 */
export function orbCandidates(rewards: (ItemQuantity | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const reward of rewards) {
    forEachRewardItem(reward, (id) => {
      if (/orb/i.test(id)) ids.add(id);
    });
  }
  return [...ids];
}

/** All reward packages of episodics and events, for orb discovery. */
export function allRewards(
  episodics: EpisodicInfo[],
  events: EventInfo[],
): (ItemQuantity | undefined)[] {
  const rewards: (ItemQuantity | undefined)[] = [];
  for (const info of episodics) {
    for (const chapter of Object.values(info.chapters ?? {})) {
      for (const node of Object.values(chapter.tiers ?? {})) {
        rewards.push(node.rewards, node.firstTimeRewards, node.limitedRewards);
      }
    }
  }
  for (const event of events) {
    const brackets = [
      ...(event.milestone?.brackets ?? []),
      ...(event.blitz?.brackets ?? []),
      ...(event.tower?.brackets ?? []),
      ...(event.battlePass?.brackets ?? []),
      ...(event.strikePass?.brackets ?? []),
    ];
    for (const b of brackets) {
      for (const tier of Object.values(b.objective?.tiers ?? {})) {
        rewards.push(tier.rewards, tier.premiumRewards);
      }
    }
  }
  return rewards;
}

/** Shard items an orb can give, with the most one opening can give. */
export function orbDrops(
  orbId: string,
  orbName: string | undefined,
  contents: ItemQuantity,
  shardIds: ReadonlySet<string>,
): OrbDrop[] {
  const amounts = new Map<string, number>();
  forEachRewardItem(contents, (id, quantity) => {
    if (shardIds.has(id)) amounts.set(id, Math.max(amounts.get(id) ?? 0, quantity));
  });
  return [...amounts].map(([itemId, amount]) => ({ itemId, orbId, orbName, amount }));
}
