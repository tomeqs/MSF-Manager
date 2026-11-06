import { KnownTeam, TeamTier } from '../data/known-meta';
import { RosterEntry, Squad, TeamTab } from '../models';
import { SynergyIndex, SynergyLink, cohesion, contribution, squadLinks } from './synergy';
import { MetaTeam, TEAM_SIZE, resolveKnownTeams } from './teams-calc';

/** Where a squad option comes from. */
export type SquadOrigin = 'meta' | 'community' | 'saved' | 'synergy';

/** A squad worth considering for a mode, with how good it is for this player now. */
export interface SquadOption {
  /** Sorted member ids — the same squad in any order. */
  key: string;
  /** Known (researched) team name. */
  name?: string;
  tier?: TeamTier;
  source?: string;
  origins: SquadOrigin[];
  /** Members in the recommended order (see `order`). */
  members: RosterEntry[];
  /** Members the player does not have (names; includes ones not in the game data). */
  missing: string[];
  /** Members in the game data the player has not unlocked yet. */
  locked: RosterEntry[];
  /** Alliance War role from the sources (absent = either). */
  warRole?: 'offense' | 'defense';
  /** Line-up advice from the sources. */
  lineupNote?: string;
  /** Whose ordering `members` follows: most players', the player's own, or the guide's. */
  order: 'community' | 'saved' | 'meta' | 'synergy';
  /** Popularity among players' saved squads, relative to the top squad (0–1). */
  popularity?: number;
  /** The player has this squad saved for the mode. */
  saved: boolean;
  power: number;
  /** 0–1, from the kits (see `synergy.ts`). */
  cohesion: number;
  /** Strength × standing in the meta × cohesion; 0 when something is missing. */
  score: number;
  links: SynergyLink[];
  /** Members whose kit depends on neighbours. */
  positional: string[];
}

export interface SquadInput {
  tab: TeamTab;
  roster: RosterEntry[];
  known: KnownTeam[];
  /** Most common squads across players for the mode (API analysis; may be empty). */
  community: MetaTeam[];
  /** The player's saved squads for the mode. */
  saved: Squad[];
  synergy: SynergyIndex;
}

/** How much standing in the meta counts next to raw power. */
const TIER_FACTOR: Record<TeamTier, number> = { S: 1, A: 0.85, B: 0.72 };
const COMMUNITY_BASE = 0.7;
const COMMUNITY_RANGE = 0.25;
/** Squads with no backing beyond the player's own choice or the kits. */
const UNBACKED_FACTOR = 0.65;
/** Cohesion moves the score by up to 25%. */
const COHESION_RANGE = 0.25;
/** Blitz scores any team by power, so every known team fits there. */
const ANY_TEAM_TABS: TeamTab[] = ['blitz'];
/** Power breaks ties when building a squad around a character (relative to the strongest). */
const POWER_TIEBREAK = 0.3;
/** Squads are built from the strongest characters only (same pool as the gear frontier). */
export const POOL_SIZE = 60;
/** A swap is suggested only when it adds at least this much synergy (≈ one rare shared trait). */
const MIN_SWAP_GAIN = 0.3;
/** Overlap with a known or popular squad from which a saved squad counts as "almost it". */
const NEAR_OVERLAP = 3;

/**
 * Every squad worth considering for a mode — known teams, popular squads and the player's own
 * — merged by members, scored for what the player can field now. Best first.
 */
export function squadOptions(input: SquadInput): SquadOption[] {
  const { tab, roster, known, community, saved, synergy } = input;
  const byId = new Map(roster.map((e) => [e.id, e]));
  const options = new Map<string, Draft>();
  const draft = (ids: string[]): Draft => {
    const key = [...ids].sort().join('|');
    let d = options.get(key);
    if (!d) {
      d = { key, ids, origins: [], order: 'meta', saved: false };
      options.set(key, d);
    }
    return d;
  };

  const forTab = known.filter((t) => ANY_TEAM_TABS.includes(tab) || t.modes.includes(tab));
  for (const { team, members } of resolveKnownTeams(forTab, roster)) {
    const d = draft(members.map((m) => m.id));
    d.origins.push('meta');
    d.name ??= team.name;
    d.tier ??= team.tier ?? 'A';
    d.source ??= team.source;
    d.warRole ??= team.war;
    d.lineupNote ??= team.lineup;
    d.missingNames = members.filter((m) => !m.owned).map((m) => m.name);
  }
  for (const team of community) {
    const d = draft(team.members);
    d.origins.push('community');
    d.popularity = team.share;
    d.ids = team.members;
    d.order = 'community';
  }
  for (const squad of saved) {
    const ids = squad.filter((id) => !!id && byId.has(id));
    if (!ids.length) continue;
    const d = draft(ids);
    d.origins.push('saved');
    d.saved = true;
    if (d.order !== 'community') {
      d.ids = ids;
      d.order = 'saved';
    }
  }

  const drafts = [...options.values()].map((d) => toOption(d, byId, synergy));
  const strongest = Math.max(1, ...drafts.filter((o) => !o.missing.length).map((o) => o.power));
  for (const o of drafts) o.score = o.missing.length ? 0 : scoreOf(o, strongest);
  return drafts.sort((a, b) => b.score - a.score || b.power - a.power);
}

interface Draft {
  key: string;
  ids: string[];
  origins: SquadOrigin[];
  order: SquadOption['order'];
  saved: boolean;
  name?: string;
  tier?: TeamTier;
  source?: string;
  popularity?: number;
  missingNames?: string[];
  warRole?: 'offense' | 'defense';
  lineupNote?: string;
}

function toOption(d: Draft, byId: Map<string, RosterEntry>, synergy: SynergyIndex): SquadOption {
  const entries = d.ids.map((id) => byId.get(id));
  const members = entries.filter((e): e is RosterEntry => !!e?.unlocked);
  const missing =
    d.missingNames ??
    d.ids.flatMap((id, i) => (entries[i]?.unlocked ? [] : [entries[i]?.name ?? id]));
  const ids = members.map((m) => m.id);
  return {
    key: d.key,
    name: d.name,
    tier: d.tier,
    source: d.source,
    origins: d.origins,
    members,
    missing,
    locked: entries.filter((e): e is RosterEntry => !!e && !e.unlocked),
    warRole: d.warRole,
    lineupNote: d.lineupNote,
    order: d.order,
    popularity: d.popularity,
    saved: d.saved,
    power: members.reduce((sum, m) => sum + m.power, 0),
    cohesion: cohesion(ids, synergy),
    score: 0,
    links: squadLinks(ids, synergy),
    positional: members.filter((m) => synergy.positional(m.id)).map((m) => m.name),
  };
}

/** How well the meta backs a squad: its tier, else its popularity, else a base value. */
export function standingOf(o: SquadOption): number {
  return Math.max(
    o.tier ? TIER_FACTOR[o.tier] : 0,
    o.popularity !== undefined ? COMMUNITY_BASE + COMMUNITY_RANGE * o.popularity : 0,
    UNBACKED_FACTOR,
  );
}

function scoreOf(o: SquadOption, strongest: number): number {
  return (o.power / strongest) * standingOf(o) * (1 - COHESION_RANGE + COHESION_RANGE * o.cohesion);
}

export interface Alternative {
  option: SquadOption;
  /** Planned squads that already use some of its members, with those members. */
  conflicts: { with: SquadOption; members: RosterEntry[] }[];
}

export interface ModePlan {
  squads: SquadOption[];
  alternatives: Alternative[];
}

/**
 * The best `count` squads for a mode with no character in two of them (as when several
 * squads are needed at once: war defence, raid lanes, crucible). Known and popular squads
 * first; when they run out, squads built from the kits around the strongest characters left.
 */
export function modePlan(
  options: SquadOption[],
  roster: RosterEntry[],
  synergy: SynergyIndex,
  count: number,
  alternativesLimit = 4,
): ModePlan {
  const used = new Set<string>();
  const squads: SquadOption[] = [];
  const ready = options.filter((o) => !o.missing.length && o.members.length);
  for (const o of ready) {
    if (squads.length >= count) break;
    if (o.members.some((m) => used.has(m.id))) continue;
    squads.push(o);
    for (const m of o.members) used.add(m.id);
  }
  const pool = strongest(roster).filter((e) => !used.has(e.id));
  while (squads.length < count && pool.length) {
    const members = buildAround(pool[0], pool, synergy);
    if (!members.length) break;
    squads.push(synergySquad(members, synergy));
    for (const m of members) pool.splice(pool.indexOf(m), 1);
  }

  // The player's own squads are reviewed separately; alternatives are the backed ones.
  const planned = new Set(squads.map((s) => s.key));
  const alternatives = ready
    .filter((o) => !planned.has(o.key) && o.origins.some((x) => x !== 'saved'))
    .slice(0, alternativesLimit)
    .map((option) => ({
      option,
      conflicts: squads
        .map((s) => ({
          with: s,
          members: option.members.filter((m) => s.members.some((x) => x.id === m.id)),
        }))
        .filter((c) => c.members.length),
    }));
  return { squads, alternatives };
}

/** The player's strongest owned characters (the pool squads are built from). */
export function strongest(roster: RosterEntry[], size = POOL_SIZE): RosterEntry[] {
  return roster
    .filter((e) => e.unlocked)
    .sort((a, b) => b.power - a.power)
    .slice(0, size);
}

/** Greedy squad around `seed`: each next member adds the most synergy (power breaks ties). */
export function buildAround(
  seed: RosterEntry,
  pool: RosterEntry[],
  synergy: SynergyIndex,
  size = TEAM_SIZE,
): RosterEntry[] {
  return extendSquad([seed], pool, synergy, size);
}

/** Fills `start` up to `size` from `pool`, each next member adding the most synergy. */
export function extendSquad(
  start: RosterEntry[],
  pool: RosterEntry[],
  synergy: SynergyIndex,
  size = TEAM_SIZE,
): RosterEntry[] {
  const members = [...start];
  const top = Math.max(1, ...pool.map((e) => e.power));
  while (members.length < size) {
    let best: RosterEntry | undefined;
    let bestValue = -1;
    for (const c of pool) {
      if (members.includes(c)) continue;
      const value =
        contribution(
          c.id,
          members.map((m) => m.id),
          synergy,
        ) +
        (POWER_TIEBREAK * c.power) / top;
      if (value > bestValue) {
        best = c;
        bestValue = value;
      }
    }
    if (!best) break;
    members.push(best);
  }
  return members;
}

/** A squad built from the kits (no known or popular squad behind it). */
export function synergySquad(members: RosterEntry[], synergy: SynergyIndex): SquadOption {
  const ids = members.map((m) => m.id);
  return {
    key: [...ids].sort().join('|'),
    origins: ['synergy'],
    members,
    missing: [],
    locked: [],
    order: 'synergy',
    saved: false,
    power: members.reduce((sum, m) => sum + m.power, 0),
    cohesion: cohesion(ids, synergy),
    score: 0,
    links: squadLinks(ids, synergy),
    positional: members.filter((m) => synergy.positional(m.id)).map((m) => m.name),
  };
}

export interface Swap {
  out?: RosterEntry;
  in?: RosterEntry;
  /** Locked member of the target squad (cannot be swapped in yet). */
  locked?: string;
}

/** What the app thinks of one of the player's saved squads. */
export interface SavedReview {
  option: SquadOption;
  /** `meta`: a known or popular squad; `near`: a few swaps from one; `custom`: neither. */
  verdict: 'meta' | 'near' | 'custom';
  /** For `near`: the squad it is close to. */
  target?: SquadOption;
  swaps: Swap[];
  /** For `custom`: why the suggested swap helps. */
  reason?: SynergyLink;
  /** Saved here with "Zapisałem" and not seen in the game's squads yet. */
  local?: boolean;
  /** For War squads saved here: "obrona" or "atak". */
  role?: string;
}

/**
 * Reviews the player's saved squads for a mode against the options. Swaps never bring in a
 * character another saved squad of the mode already uses.
 */
export function reviewSaved(
  saved: Squad[],
  options: SquadOption[],
  roster: RosterEntry[],
  synergy: SynergyIndex,
): SavedReview[] {
  const usedBy = (own: string[]) => new Set(saved.flat().filter((id) => !!id && !own.includes(id)));
  const byKey = new Map(options.map((o) => [o.key, o]));
  const byId = new Map(roster.map((e) => [e.id, e]));
  const backed = options.filter((o) => o.origins.some((x) => x === 'meta' || x === 'community'));
  const reviews: SavedReview[] = [];
  for (const squad of saved) {
    const ids = squad.filter((id) => !!id && byId.has(id));
    const option = byKey.get([...ids].sort().join('|'));
    if (!option) continue;
    if (option.origins.includes('meta') || option.origins.includes('community')) {
      reviews.push({ option, verdict: 'meta', swaps: [] });
      continue;
    }
    const blocked = usedBy(ids);
    const near = nearest(
      ids,
      backed.filter((o) => !o.members.some((m) => blocked.has(m.id))),
    );
    if (near) {
      reviews.push({ option, verdict: 'near', target: near, swaps: swapsTo(ids, near, byId) });
      continue;
    }
    reviews.push({
      option,
      verdict: 'custom',
      ...weakestLink(
        option,
        roster.filter((e) => !blocked.has(e.id)),
        synergy,
      ),
    });
  }
  return reviews;
}

/** The known or popular squad sharing the most members (at least NEAR_OVERLAP), best first. */
function nearest(ids: string[], backed: SquadOption[]): SquadOption | undefined {
  let best: SquadOption | undefined;
  let bestOverlap = NEAR_OVERLAP - 1;
  for (const o of backed) {
    const members = o.key.split('|');
    const overlap = ids.filter((id) => members.includes(id)).length;
    if (overlap > bestOverlap || (overlap === bestOverlap && best && o.score > best.score)) {
      best = o;
      bestOverlap = overlap;
    }
  }
  return best;
}

function swapsTo(ids: string[], target: SquadOption, byId: Map<string, RosterEntry>): Swap[] {
  const targetIds = target.key.split('|');
  const out = ids.filter((id) => !targetIds.includes(id)).map((id) => byId.get(id)!);
  const add = targetIds.filter((id) => !ids.includes(id)).map((id) => byId.get(id));
  const swaps: Swap[] = [];
  const owned = add.filter((e): e is RosterEntry => !!e?.unlocked);
  const locked = target.missing;
  const length = Math.max(out.length, owned.length + locked.length);
  for (let i = 0; i < length; i++) {
    const incoming = owned[i];
    swaps.push(
      incoming ? { out: out[i], in: incoming } : { out: out[i], locked: locked[i - owned.length] },
    );
  }
  return swaps;
}

/** The member adding the least synergy and the owned character that would add the most. */
function weakestLink(
  option: SquadOption,
  roster: RosterEntry[],
  synergy: SynergyIndex,
): { swaps: Swap[]; reason?: SynergyLink } {
  const ids = option.members.map((m) => m.id);
  if (ids.length < 2) return { swaps: [] };
  // Least synergy first; on a tie, the weaker character goes.
  const weakest = [...option.members].sort(
    (a, b) =>
      contribution(a.id, ids, synergy) - contribution(b.id, ids, synergy) || a.power - b.power,
  )[0];
  const others = ids.filter((id) => id !== weakest.id);
  const current = contribution(weakest.id, ids, synergy);
  let best: RosterEntry | undefined;
  let bestGain = MIN_SWAP_GAIN;
  for (const c of strongest(roster)) {
    if (ids.includes(c.id) || c.power < weakest.power * 0.8) continue;
    const gain = contribution(c.id, others, synergy) - current;
    if (gain > bestGain) {
      best = c;
      bestGain = gain;
    }
  }
  if (!best) return { swaps: [] };
  const reason = others
    .flatMap((o) => synergy.links(best!.id, o))
    .sort((a, b) => b.weight - a.weight)[0];
  return { swaps: [{ out: weakest, in: best }], reason };
}

/** A strong character with no squad, and who it works best with. */
export interface LooseCharacter {
  entry: RosterEntry;
  /** Other loose characters that landed in the same squad (not listed again). */
  together: RosterEntry[];
  partners: { entry: RosterEntry; score: number; link?: SynergyLink }[];
  /** Best squad built around it from the kits. */
  squad: SquadOption;
}

/**
 * Strong characters that are in no known team, no popular squad and none of the player's
 * squads — with their best partners and a squad built around each. Loose characters that end
 * up in an earlier one's squad are listed with it rather than again.
 */
export function looseCharacters(
  roster: RosterEntry[],
  homes: ReadonlySet<string>,
  synergy: SynergyIndex,
  limit = 8,
): LooseCharacter[] {
  const pool = strongest(roster);
  const loose = pool.filter((e) => !homes.has(e.id));
  const covered = new Set<string>();
  const result: LooseCharacter[] = [];
  for (const entry of loose) {
    if (result.length >= limit) break;
    if (covered.has(entry.id)) continue;
    const members = buildAround(entry, pool, synergy);
    const together = members.filter((m) => m !== entry && loose.includes(m));
    for (const m of members) covered.add(m.id);
    const partners = pool
      .filter((p) => p.id !== entry.id)
      .map((p) => ({
        entry: p,
        score: synergy.pair(entry.id, p.id),
        link: synergy.links(entry.id, p.id)[0],
      }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score || b.entry.power - a.entry.power)
      .slice(0, 4);
    result.push({ entry, together, partners, squad: synergySquad(members, synergy) });
  }
  return result;
}
