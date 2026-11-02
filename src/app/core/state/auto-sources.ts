import { CharacterSource, SourceStatus } from '../data/character-sources';
import { EventInfo, NodeDrop, RosterEntry, ShardDrops } from '../models';
import { ShardOffer, offerSummary } from './event-rewards';
import { SOURCE_FACTOR, localDate } from './sources';

/** A shard source read from game data (API), not from research. */
export interface AutoSource {
  /**
   * - `event`: reward tiers of an event (priced separately by the advisor).
   * - `node`: a campaign node that drops them on every clear — a permanent source.
   * - `eventNode`: a node of an event campaign, open while its event runs.
   * - `orb`: an orb met in game rewards that can contain them.
   */
  kind: 'event' | 'node' | 'eventNode' | 'orb';
  label: string;
  /** Open now (otherwise announced). */
  live: boolean;
  /** Event end (seconds) for time-limited sources. */
  endsAt?: number;
}

/** Shard sources per character id, from event rewards, node drops and orb contents. */
export function autoSourceIndex(
  roster: RosterEntry[],
  drops: ShardDrops,
  offers: ReadonlyMap<string, ShardOffer[]>,
  events: EventInfo[],
  nowSec = Date.now() / 1000,
): Map<string, AutoSource[]> {
  const byShard = new Map(roster.flatMap((e) => (e.shardItemId ? [[e.shardItemId, e.id]] : [])));
  const result = new Map<string, AutoSource[]>();
  const add = (itemId: string, source: AutoSource) => {
    const id = byShard.get(itemId);
    if (id) result.set(id, [...(result.get(id) ?? []), source]);
  };

  for (const [itemId, list] of offers) {
    for (const offer of list) {
      add(itemId, {
        kind: 'event',
        label: offerSummary(offer),
        live: offer.live,
        endsAt: offer.event.endTime,
      });
    }
  }
  for (const drop of drops.nodes) {
    if (drop.episodicType === 'campaign') {
      add(drop.itemId, { kind: 'node', label: nodeLabel(drop), live: true });
      continue;
    }
    // Event campaigns count only while (or before) an event that runs them is on.
    const event = events
      .filter((e) => e.endTime > nowSec && runs(e, drop))
      .sort((a, b) => a.startTime - b.startTime)[0];
    if (!event) continue;
    add(drop.itemId, {
      kind: 'eventNode',
      label: `${event.name ?? drop.episodicName ?? drop.episodicId}: ${nodeLabel(drop)}`,
      live: event.startTime <= nowSec,
      endsAt: event.endTime,
    });
  }
  for (const orb of drops.orbs) {
    add(orb.itemId, {
      kind: 'orb',
      label: `${orb.orbName ?? orb.orbId} (do ${orb.amount} na otwarcie)`,
      live: true,
    });
  }
  return result;
}

function runs(event: EventInfo, drop: NodeDrop): boolean {
  const episodic = event.episodic;
  return !!episodic && (episodic.ids?.includes(drop.episodicId) || episodic.id === drop.episodicId);
}

/** "HEROES 4-3 (losowo do 1)", "HEROES 4-3 (+5, tylko pierwsze przejście)". */
function nodeLabel(drop: NodeDrop): string {
  const amount = drop.random ? `losowo do ${drop.amount}` : `+${drop.amount}`;
  const kind =
    drop.kind === 'firstTime'
      ? ', tylko pierwsze przejście'
      : drop.kind === 'limited'
        ? ', ograniczona liczba przejść'
        : '';
  const energy = drop.energyCost ? `, ${drop.energyCost} energii` : '';
  return `${drop.node} (${amount}${kind}${energy})`;
}

/** Researched statuses that game data showing a real source should replace outright. */
const REPLACEABLE: SourceStatus[] = ['unknown', 'expired', 'unavailable', 'permanentUnverified'];

/**
 * The researched source corrected by game data. An event campaign that drops the shards makes
 * it an event until that event ends; a repeatable campaign node makes it permanent; an orb in
 * game rewards makes it an orb source. Game data replaces unknown, expired, closed or
 * unverified research and otherwise wins when it is cheaper. Event reward tiers do not change
 * the status: the advisor prices those shards on their own.
 */
export function withAutoSources(
  manual: CharacterSource | undefined,
  auto: AutoSource[],
  entry: RosterEntry,
): CharacterSource | undefined {
  const eventNode = auto
    .filter((a) => a.kind === 'eventNode' && a.live)
    .sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0))[0];
  const node = auto.find((a) => a.kind === 'node' && !/tylko pierwsze/.test(a.label));
  const orb = auto.find((a) => a.kind === 'orb');
  const found = eventNode ?? node ?? orb;
  if (!found) return manual;

  const status: SourceStatus = eventNode ? 'event' : node ? 'permanent' : 'orb';
  const wins =
    !manual ||
    REPLACEABLE.includes(manual.status) ||
    SOURCE_FACTOR[status] < SOURCE_FACTOR[manual.status];
  if (!wins) return manual;
  return {
    name: manual?.name ?? entry.name,
    teams: manual?.teams ?? '',
    status,
    source: `${found.label} — z danych gry`,
    next: manual ? `badania: ${manual.source}` : undefined,
    confidence: 'API',
    url: manual?.url,
    until: eventNode?.endsAt ? localDate(new Date(eventNode.endsAt * 1000)) : undefined,
    afterUntil: eventNode ? (node ? 'permanent' : orb ? 'orb' : manual?.status) : undefined,
  };
}
