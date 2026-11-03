import { Inventory, shardsBetween } from './farming-calc';
import { RosterEntry, UpgradeData } from '../models';
import { shardsToMax, unlockCost } from './advisor';
import { MAX_YELLOW_STARS } from './game-rules';
import { SquadOption, buildAround, standingOf, strongest, synergySquad } from './squads';
import { SynergyIndex } from './synergy';
import { MAX_MISSING, TEAM_SIZE } from './teams-calc';

/** How the members of a proposal should be lined up in game, and why. */
export interface Arrangement {
  members: RosterEntry[];
  /** Whose order it is: most players', the player's own, the guide's, or worked out here. */
  basis: 'community' | 'saved' | 'meta' | 'kits';
  /** What the order is based on, for the player. */
  note: string;
}

export interface Proposal {
  option: SquadOption;
  arrangement: Arrangement;
}

/** What one member still needs before the squad is ready. */
export interface MemberNeed {
  name: string;
  entry?: RosterEntry;
  kind: 'unlock' | 'stars' | 'gear' | 'unknown';
  text: string;
}

/** A known or popular squad worth building, with what to farm first. */
export interface FarmProposal extends Proposal {
  needs: MemberNeed[];
  /** Members that a ready proposal of the same plan also uses. */
  overlap: RosterEntry[];
}

export interface AssistantPlan {
  /** Squads that can be saved now, best first (no member needs farming). */
  ready: Proposal[];
  /** Known/popular squads a little farming away, closest and strongest first. */
  toFarm: FarmProposal[];
}

export interface AssistantInput {
  /** Every option for the mode (`squadOptions`). */
  options: SquadOption[];
  roster: RosterEntry[];
  /** Characters already in saved squads — never proposed again. */
  taken: ReadonlySet<string>;
  /** Option keys the player asked to skip. */
  skipped: ReadonlySet<string>;
  synergy: SynergyIndex;
  /** What a character still needs to be ready (`memberNeeds`). */
  needsOf: (entry: RosterEntry) => MemberNeed[];
  /** Options this plan may use (e.g. only War defense teams). */
  allows?: (option: SquadOption) => boolean;
  readyLimit?: number;
  farmLimit?: number;
}

/** Gear tiers below the player's stage (frontier) a member may be and still count as ready. */
const GEAR_SLACK = 1;
/** A squad with more members needing work than this is not "a little farming away". */
const MAX_NEEDING = 3;

export interface ReadinessContext {
  frontier: number;
  upgrade: UpgradeData;
  inventory: Inventory;
  /** Yellow stars from which a character counts as ready (6 or 7; default 7). */
  minStars?: number;
}

/**
 * What a character still needs to be squad-ready: unlocked, `minStars` (7★ by default —
 * shards are the hard part) and gear no more than one tier below the player's stage.
 */
export function memberNeeds(entry: RosterEntry, ctx: ReadinessContext): MemberNeed[] {
  const name = entry.name;
  if (!entry.unlocked) {
    const u = unlockCost(entry, ctx.upgrade, ctx.inventory);
    return [
      {
        name,
        entry,
        kind: 'unlock',
        text: u.missing
          ? `odblokuj — masz ${u.owned}/${u.needed} shardów`
          : 'odblokuj — masz shardy',
      },
    ];
  }
  const needs: MemberNeed[] = [];
  const minStars = ctx.minStars ?? MAX_YELLOW_STARS;
  if (entry.yellowStars < minStars) {
    const missing = shardsTo(entry, minStars, ctx);
    needs.push({
      name,
      entry,
      kind: 'stars',
      text:
        `${entry.yellowStars}★→${minStars}★` +
        (missing === undefined ? '' : missing ? `, brakuje ${missing} shardów` : ', masz shardy'),
    });
  }
  if (ctx.frontier && entry.gearTier < ctx.frontier - GEAR_SLACK) {
    needs.push({ name, entry, kind: 'gear', text: `G${entry.gearTier}→G${ctx.frontier}` });
  }
  return needs;
}

/** Shards still to collect to reach `stars`, net of the inventory (undefined if unknown). */
function shardsTo(entry: RosterEntry, stars: number, ctx: ReadinessContext): number | undefined {
  if (stars >= MAX_YELLOW_STARS) return shardsToMax(entry, ctx.upgrade, ctx.inventory);
  const totals = ctx.upgrade.yellowStarTotalShards;
  if (totals?.[String(stars)] === undefined) return undefined;
  const owned = entry.shardItemId ? (ctx.inventory.get(entry.shardItemId) ?? 0) : 0;
  return Math.max(0, shardsBetween(totals, entry.yellowStars, stars) - owned);
}

/**
 * The plan for a mode: squads to save now — known and popular ones whose members are all
 * ready, then full kit squads around the strongest ready free characters — and known/popular
 * squads a little farming away. Never a character already in a saved squad; ready proposals
 * never share one.
 */
export function planSquads(input: AssistantInput): AssistantPlan {
  const { options, roster, taken, skipped, synergy, needsOf } = input;
  const allows = input.allows ?? (() => true);
  const readyLimit = input.readyLimit ?? 5;
  const ready = (e: RosterEntry) => needsOf(e).length === 0;

  const used = new Set(taken);
  const chosen: SquadOption[] = [];
  for (const o of options) {
    if (chosen.length >= readyLimit) break;
    if (o.missing.length || !o.members.length || skipped.has(o.key) || !allows(o)) continue;
    if (o.origins.every((x) => x === 'saved')) continue;
    if (o.members.some((m) => used.has(m.id) || !ready(m))) continue;
    chosen.push(o);
    for (const m of o.members) used.add(m.id);
  }
  const pool = strongest(roster.filter((e) => !used.has(e.id) && ready(e)));
  const seeds = [...pool];
  while (chosen.length < readyLimit && seeds.length) {
    const seed = seeds.shift()!;
    if (used.has(seed.id)) continue;
    const members = buildAround(
      seed,
      pool.filter((e) => !used.has(e.id)),
      synergy,
    );
    // Too few ready characters left for a full squad: they stay on the free list.
    if (members.length < TEAM_SIZE) break;
    const squad = synergySquad(members, synergy);
    if (skipped.has(squad.key)) continue;
    chosen.push(squad);
    for (const m of members) used.add(m.id);
  }

  const inReady = new Set(chosen.flatMap((o) => o.members.map((m) => m.id)));
  const toFarm = options
    .filter(
      (o) =>
        allows(o) &&
        !skipped.has(o.key) &&
        o.origins.some((x) => x === 'meta' || x === 'community') &&
        ![...o.members, ...o.locked].some((m) => taken.has(m.id)),
    )
    .map((option) => ({ option, needs: needsFor(option, needsOf) }))
    .filter(({ option, needs }) => {
      if (!needs.length || option.missing.length > MAX_MISSING) return false;
      return new Set(needs.map((n) => n.name)).size <= MAX_NEEDING;
    })
    .sort((a, b) => farmScore(b.option, b.needs) - farmScore(a.option, a.needs))
    .slice(0, input.farmLimit ?? 4)
    .map(({ option, needs }) => ({
      option,
      needs,
      arrangement: arrange(option, synergy),
      overlap: option.members.filter((m) => inReady.has(m.id)),
    }));

  return {
    ready: chosen.map((option) => ({ option, arrangement: arrange(option, synergy) })),
    toFarm,
  };
}

function needsFor(option: SquadOption, needsOf: (e: RosterEntry) => MemberNeed[]): MemberNeed[] {
  const lockedNames = new Set(option.locked.map((e) => e.name));
  return [
    ...option.members.flatMap(needsOf),
    ...option.locked.flatMap(needsOf),
    ...option.missing
      .filter((name) => !lockedNames.has(name))
      .map((name) => ({
        name,
        kind: 'unknown' as const,
        text: 'brak w danych gry — sprawdź nazwę',
      })),
  ];
}

/** Meta standing × share of members already ready (power breaks ties). */
function farmScore(option: SquadOption, needs: MemberNeed[]): number {
  const size = option.members.length + option.missing.length || 1;
  const needing = new Set(needs.map((n) => n.name)).size;
  return standingOf(option) * (1 - needing / size) + option.power * 1e-12;
}

/**
 * The next squads to save for a mode (the ready part of `planSquads` with every character
 * counted as ready).
 */
export function assistantProposals(input: Omit<AssistantInput, 'needsOf'>, limit = 5): Proposal[] {
  return planSquads({ ...input, needsOf: () => [], readyLimit: limit }).ready;
}

/**
 * Line-up for a squad. Most players' order wins when the squad is a popular one, then the
 * guide's own advice, the player's order and the guide's order. Otherwise only kits that act
 * on neighbours ("adjacent") make the order matter: such a character goes in the middle with
 * its best partners beside it.
 */
export function arrange(option: SquadOption, synergy: SynergyIndex): Arrangement {
  const members = option.members;
  if (option.order === 'community') {
    return { members, basis: 'community', note: 'Kolejność jak u większości graczy.' };
  }
  if (option.lineupNote) {
    return { members, basis: 'meta', note: `Według poradnika: ${option.lineupNote}` };
  }
  const positional = members.filter((m) => synergy.positional(m.id));
  if (!positional.length) {
    if (option.order === 'saved') {
      return { members, basis: 'saved', note: 'Twoja kolejność z gry.' };
    }
    return {
      members,
      basis: option.order === 'meta' ? 'meta' : 'kits',
      note: 'Nic w umiejętnościach tych postaci nie zależy od pozycji — ustaw dowolnie.',
    };
  }
  const center = positional[0];
  const rest = members
    .filter((m) => m !== center)
    .sort((a, b) => synergy.pair(center.id, b.id) - synergy.pair(center.id, a.id));
  // Middle slot for the neighbour-dependent kit, its two best partners right beside it.
  const lineup = [rest[2], rest[0], center, rest[1], rest[3]].filter((m): m is RosterEntry => !!m);
  const partners = [rest[0], rest[1]].filter((m) => !!m).map((m) => m.name);
  return {
    members: lineup,
    basis: 'kits',
    note:
      `${center.name} ma umiejętność działającą na sąsiadów — w środku` +
      (partners.length ? `, obok ${partners.join(' i ')}.` : '.'),
  };
}
