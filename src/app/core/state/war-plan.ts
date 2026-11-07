import { KeyCharacter } from '../data/key-characters';
import { KnownTeam, TeamTier } from '../data/known-meta';
import { Punch, WarCounter, WarDefense } from '../data/war-meta';
import { RosterEntry } from '../models';
import { MemberNeed } from './squad-assistant';
import { SquadOption, strongest, synergySquad } from './squads';
import { SynergyIndex, SynergyLink, cohesion, contribution } from './synergy';
import { hasRole } from './team-traits';
import {
  MAX_MISSING,
  TEAM_SIZE,
  nameKey,
  resolveKnownTeams,
  resolveName,
  rosterByName,
} from './teams-calc';

/** How a listed member stands for the player. */
export type SlotState = 'ready' | 'weak' | 'locked' | 'unknown';

/**
 * - `ready`: every member owned and ready (stars, gear);
 * - `develop`: every member owned, some still need stars or gear;
 * - `substitute`: up to two missing, replaced from the roster;
 * - `far`: fewer than three members owned.
 */
export type Verdict = 'ready' | 'develop' | 'substitute' | 'far';

/** An owned character that could take a member's place, and why. */
export interface Substitute {
  entry: RosterEntry;
  score: number;
  /** Role trait shared with the member it replaces. */
  role?: string;
  /** The strongest kit or trait link to the rest of the team. */
  link?: SynergyLink;
  /** A plug-and-play War character (`KEY_CHARACTERS`). */
  key: boolean;
  needs: MemberNeed[];
}

export interface WarSlot {
  /** The member as listed (resolved to the game's name when found). */
  label: string;
  /** In the game data (owned or locked). */
  entry?: RosterEntry;
  state: SlotState;
  needs: MemberNeed[];
  /** Added by the counter ("+ Oath"). */
  required: boolean;
  /** Best owned characters for the slot (missing or weak members only). */
  substitutes: Substitute[];
}

/** A known team (or a counter) measured against the roster. */
export interface TeamFit {
  name: string;
  tier?: TeamTier;
  slots: WarSlot[];
  /** Owned team members left out for the counter's additions. */
  dropped: RosterEntry[];
  /** Missing members and who replaces them in `fielded`. */
  swaps: { slot: WarSlot; by: Substitute }[];
  /** What the player can field now: the owned members plus the substitutes. */
  option: SquadOption;
  verdict: Verdict;
  power: number;
  cohesion: number;
}

export interface CounterFit {
  counter: WarCounter;
  fit: TeamFit;
}

/** A defense to expect and how the player can beat it. */
export interface DefenseAnswer {
  defense: WarDefense;
  tier?: TeamTier;
  counters: CounterFit[];
  /** The counter the player is best placed to use (index in `counters`). */
  best?: number;
}

export interface WarPlan {
  defense: TeamFit[];
  offense: TeamFit[];
  answers: DefenseAnswer[];
}

export interface WarPlanInput {
  roster: RosterEntry[];
  synergy: SynergyIndex;
  /** What a character still needs to be ready (`memberNeeds`). */
  needsOf: (entry: RosterEntry) => MemberNeed[];
  known: KnownTeam[];
  defenses: WarDefense[];
  keyCharacters: KeyCharacter[];
}

/** Owned members below this make a team "far" (the rest would be substitutes). */
const MIN_CORE = 3;
const SUBSTITUTES = 3;
/** Substitute scoring: synergy with the team, then these bonuses. */
const ROLE_BONUS = 0.6;
const KEY_BONUS = 0.4;
const POWER_WEIGHT = 0.5;
const NOT_READY_PENALTY = 0.3;
const ROLES = ['Protector', 'Brawler', 'Blaster', 'Controller', 'Support'];
const STATE_RANK: Record<SlotState, number> = { ready: 0, weak: 1, locked: 2, unknown: 3 };
const VERDICT_RANK: Record<Verdict, number> = { ready: 0, develop: 1, substitute: 2, far: 3 };
const TIER_RANK: Record<TeamTier, number> = { S: 0, A: 1, B: 2 };
const PUNCH_RANK: Record<Punch, number> = {
  '▲▲▲': 0,
  '▲▲': 1,
  '▲': 2,
  '⊜': 3,
  '▼': 4,
  '▼▼': 5,
  '▼▼▼': 6,
};

interface Context extends WarPlanInput {
  byName: Map<string, RosterEntry>;
  keyIds: Set<string>;
  pool: RosterEntry[];
  top: number;
}

/**
 * The War plan: the meta's defense and offense teams measured against the roster (with
 * substitutes for missing members), and for every expected defense the counters the player
 * can field, best first.
 */
export function warPlan(input: WarPlanInput): WarPlan {
  const ctx = context(input);
  const war = input.known.filter((t) => t.modes.includes('war'));
  const sortFits = (fits: TeamFit[]) =>
    fits.sort(
      (a, b) =>
        VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
        TIER_RANK[a.tier ?? 'A'] - TIER_RANK[b.tier ?? 'A'] ||
        b.power - a.power,
    );
  const fitOf = (t: KnownTeam) =>
    fitSlots(t.name, t.tier, teamSlots(t, ctx), [], ctx, { lineup: t.lineup });
  const answers = input.defenses.map((defense) => {
    const team = input.known.find((t) => t.name === defense.team);
    const counters = defense.counters.map((counter) => ({
      counter,
      fit: fitCounter(counter, ctx),
    }));
    const order = counters
      .map((c, i) => ({ c, i }))
      .sort(
        (a, b) =>
          VERDICT_RANK[a.c.fit.verdict] - VERDICT_RANK[b.c.fit.verdict] ||
          punchRank(a.c.counter) - punchRank(b.c.counter) ||
          b.c.fit.power - a.c.fit.power,
      );
    const best = order[0] && order[0].c.fit.verdict !== 'far' ? order[0].i : undefined;
    return { defense, tier: team?.tier, counters, best };
  });
  return {
    defense: sortFits(war.filter((t) => t.war !== 'offense').map(fitOf)),
    offense: sortFits(war.filter((t) => t.war !== 'defense').map(fitOf)),
    answers,
  };
}

/** A counter (team + additions − removals, a trait team or an exact line-up) vs the roster. */
export function fitCounter(counter: WarCounter, input: WarPlanInput | Context): TeamFit {
  const ctx = 'byName' in input ? input : context(input);
  const base = counter.team ? ctx.known.find((t) => t.name === counter.team) : undefined;
  const team: KnownTeam | undefined = counter.members
    ? { name: counter.label, modes: ['war'], members: counter.members, source: '' }
    : counter.trait
      ? { name: counter.label, modes: ['war'], traits: [counter.trait], source: '' }
      : base;
  const minus = new Set((counter.minus ?? []).map(nameKey));
  const isMinus = (s: Slot) =>
    minus.has(nameKey(s.label)) || (!!s.entry && minus.has(nameKey(s.entry.name)));
  const all = team ? teamSlots(team, ctx) : [];
  const plus = (counter.plus ?? []).map((slot) => resolveSlot(slot, ctx));
  // Members the counter leaves out are not substitutes either.
  const excluded = all.filter(isMinus).flatMap((s) => (s.entry ? [s.entry.id] : []));
  return fitSlots(
    counter.label,
    base?.tier,
    all.filter((s) => !isMinus(s)),
    plus,
    ctx,
    {
      excluded,
    },
  );
}

function context(input: WarPlanInput): Context {
  const byName = rosterByName(input.roster);
  const keyIds = new Set(
    input.keyCharacters
      .filter((k) => k.modes.includes('war'))
      .map((k) => resolveName(k.name, byName)?.id)
      .filter((id): id is string => !!id),
  );
  const pool = strongest(input.roster);
  return { ...input, byName, keyIds, pool, top: Math.max(1, ...pool.map((e) => e.power)) };
}

interface Slot {
  label: string;
  entry?: RosterEntry;
}

/** "A|B": the first owned option, else the first in the game data, else unknown. */
function resolveSlot(slot: string, ctx: Context): Slot {
  const options = slot.split('|').map((s) => s.trim());
  const found = options.map((o) => ctx.byName.get(nameKey(o))).filter((e): e is RosterEntry => !!e);
  const entry = found.find((e) => e.unlocked) ?? found[0];
  return { label: entry?.name ?? options[0], entry };
}

function teamSlots(team: KnownTeam, ctx: Context): Slot[] {
  if (team.members) return team.members.map((s) => resolveSlot(s, ctx));
  const resolved = resolveKnownTeams([team], ctx.roster)[0];
  return (resolved?.members ?? []).map((m) => ({ label: m.name, entry: m.entry }));
}

function stateOf(slot: Slot, ctx: Context): { state: SlotState; needs: MemberNeed[] } {
  if (!slot.entry) return { state: 'unknown', needs: [] };
  if (!slot.entry.unlocked) return { state: 'locked', needs: ctx.needsOf(slot.entry) };
  const needs = ctx.needsOf(slot.entry);
  return { state: needs.length ? 'weak' : 'ready', needs };
}

/**
 * Picks the five: the counter's additions always, then the team's members, owned and ready
 * first and those adding the most synergy; then finds substitutes for the missing ones.
 */
function fitSlots(
  name: string,
  tier: TeamTier | undefined,
  teamSlotsIn: Slot[],
  plus: Slot[],
  ctx: Context,
  opts: { lineup?: string; excluded?: string[] } = {},
): TeamFit {
  const rated = (s: Slot) => ({ slot: s, ...stateOf(s, ctx) });
  const required = plus.map(rated);
  const rest = teamSlotsIn.map(rated);
  const ownedIds = [...required, ...rest]
    .map((r) => r.slot.entry)
    .filter((e): e is RosterEntry => !!e?.unlocked)
    .map((e) => e.id);
  const room = Math.max(0, TEAM_SIZE - required.length);
  const chosen = [...rest]
    .sort(
      (a, b) =>
        STATE_RANK[a.state] - STATE_RANK[b.state] ||
        valueIn(b.slot, ownedIds, ctx) - valueIn(a.slot, ownedIds, ctx),
    )
    .slice(0, room);
  // Keep the guide's order for the members kept, the additions first.
  const picked = [...required, ...rest.filter((r) => chosen.includes(r))];
  const dropped = rest
    .filter((r) => !chosen.includes(r) && r.slot.entry?.unlocked)
    .map((r) => r.slot.entry!);

  const inTeam = new Set([
    ...[...required, ...rest].map((r) => r.slot.entry?.id).filter((id): id is string => !!id),
    ...(opts.excluded ?? []),
  ]);
  const isMissing = (r: { state: SlotState }) => r.state === 'locked' || r.state === 'unknown';
  const ownedCount = picked.filter((r) => !isMissing(r)).length;
  // Substitutes only for a team that is mostly there: at least MIN_CORE owned, ≤ MAX_MISSING out.
  const replaceable =
    ownedCount >= MIN_CORE && picked.length - ownedCount <= MAX_MISSING && picked.length > 0;
  const fieldedOwned = picked
    .map((r) => r.slot.entry)
    .filter((e): e is RosterEntry => !!e?.unlocked);
  const used = new Set(fieldedOwned.map((e) => e.id));
  const slots: WarSlot[] = [];
  const swaps: TeamFit['swaps'] = [];
  for (const r of picked) {
    const missing = isMissing(r);
    const others = fieldedOwned.filter((e) => e !== r.slot.entry).map((e) => e.id);
    const substitutes =
      (missing && replaceable) || r.state === 'weak'
        ? substitutesFor(r.slot, others, ctx, (c) => !inTeam.has(c.id) && !used.has(c.id), r.state)
        : [];
    const slot: WarSlot = {
      label: r.slot.label,
      entry: r.slot.entry,
      state: r.state,
      needs: r.needs,
      required: required.includes(r),
      substitutes,
    };
    slots.push(slot);
    if (missing && substitutes[0]) {
      swaps.push({ slot, by: substitutes[0] });
      used.add(substitutes[0].entry.id);
    }
  }

  const fielded = [...fieldedOwned, ...swaps.map((s) => s.by.entry)];
  const option: SquadOption = {
    ...synergySquad(fielded, ctx.synergy),
    name,
    tier,
    origins: ['meta'],
    missing: slots
      .filter(
        (s) => (s.state === 'locked' || s.state === 'unknown') && !swaps.some((w) => w.slot === s),
      )
      .map((s) => s.label),
    lineupNote: swaps.length ? undefined : opts.lineup,
  };
  const missingCount = slots.length - ownedCount;
  const verdict: Verdict =
    !replaceable || missingCount > swaps.length
      ? 'far'
      : missingCount
        ? 'substitute'
        : slots.some((s) => s.state === 'weak')
          ? 'develop'
          : 'ready';
  return {
    name,
    tier,
    slots,
    dropped,
    swaps,
    option,
    verdict,
    power: option.power,
    cohesion: cohesion(
      fielded.map((e) => e.id),
      ctx.synergy,
    ),
  };
}

/** How much an owned member adds to the others (power breaks ties). */
function valueIn(slot: Slot, ids: string[], ctx: Context): number {
  if (!slot.entry?.unlocked) return 0;
  return (
    contribution(slot.entry.id, ids, ctx.synergy) + (POWER_WEIGHT * slot.entry.power) / ctx.top
  );
}

/**
 * Owned characters for a member's slot: synergy with the rest of the team, the same role,
 * plug-and-play War characters and power count; characters not ready yet count less. For a
 * weak member only ready characters at least as strong are offered.
 */
function substitutesFor(
  slot: Slot,
  others: string[],
  ctx: Context,
  allowed: (c: RosterEntry) => boolean,
  state: SlotState,
): Substitute[] {
  const role = slot.entry ? ROLES.find((r) => hasRole(slot.entry!, r)) : undefined;
  const result: Substitute[] = [];
  for (const c of ctx.pool) {
    if (!allowed(c)) continue;
    const needs = ctx.needsOf(c);
    if (state === 'weak' && (needs.length || c.power < (slot.entry?.power ?? 0))) continue;
    const sameRole = role && hasRole(c, role) ? role : undefined;
    const key = ctx.keyIds.has(c.id);
    const score =
      contribution(c.id, others, ctx.synergy) +
      (sameRole ? ROLE_BONUS : 0) +
      (key ? KEY_BONUS : 0) +
      (POWER_WEIGHT * c.power) / ctx.top -
      (needs.length ? NOT_READY_PENALTY : 0);
    const link = others
      .flatMap((o) => ctx.synergy.links(c.id, o).slice(0, 1))
      .sort((a, b) => b.weight - a.weight)[0];
    result.push({ entry: c, score, role: sameRole, link, key, needs });
  }
  return result.sort((a, b) => b.score - a.score).slice(0, SUBSTITUTES);
}

function punchRank(counter: WarCounter): number {
  return counter.punch ? PUNCH_RANK[counter.punch] : PUNCH_RANK['⊜'];
}
