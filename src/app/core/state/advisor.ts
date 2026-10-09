import { KeyCharacter } from '../data/key-characters';
import { KnownTeam, TeamTier } from '../data/known-meta';
import {
  AbilityKey,
  CharacterPotential,
  RosterEntry,
  TeamTab,
  UpgradeData,
  itemId,
} from '../models';
import { Inventory, levelCostsBetween, shardsBetween } from './farming-calc';
import { ABILITY_KEYS, ABILITY_MAX, MAX_YELLOW_STARS, OPTIMAL_POWER_SHARE } from './game-rules';
import { MemberPower, memberPower } from './potential-calc';
import {
  DIFFICULTY_LABELS,
  Difficulty,
  Progression,
  gearCost,
  gearDifficulty,
  progression,
  realisticGear,
} from './progression';
import { TeamPlan, teamPlans, teamWeight } from './team-plans';
import {
  MAX_MISSING,
  TeamMember,
  resolveKnownTeams,
  resolveName,
  rosterByName,
} from './teams-calc';

/**
 * Effort in abstract units. Shards are the scarcest resource (few farmable nodes, most
 * characters only from events and orbs). Gear is priced per tier from the player's own roster
 * (`progression.ts`): tiers most of their best characters have are cheap, tiers only a few
 * have (typically G17+) cost as much as dozens of shards. Abilities are priced from the
 * materials actually in the inventory; levels are cheap.
 */
export const EFFORT = {
  /** Every action has a base cost, so tiny steps do not win just by being tiny. */
  base: 1,
  /** Shards per unit. */
  shardsPerUnit: 5,
  /** Any missing character levels (gold and XP are plentiful). */
  levels: 0.5,
  abilityLevel: 0.05,
  /**
   * Ability materials not in the inventory: × the largest missing share of any material
   * (T4 is moderately hard to get — a full shortfall ≈ 50 shards).
   */
  abilityShortfall: 10,
  /** Per ability level when the upgrade data has no ability costs. */
  abilityLevelUnknown: 0.15,
  /** Abilities of a freshly unlocked character (levels and gear are priced separately). */
  newCharacterAbilities: 1,
};

/** A plug-and-play key character counts like half a ready team, even without one. */
const KEY_BONUS = 0.5;

/**
 * Extra value for unlocking the last missing member of a known team (× the readiness of the
 * rest) — a complete synergy team is worth far more than four members without the fifth.
 */
const COMPLETE_BONUS = 1.5;

/** Extra value for unlocking one of the last two missing members. */
const NEAR_COMPLETE_BONUS = 0.5;

/** Teams to focus on (`team-plans.ts`) count this much more. */
const FOCUS_BOOST = 2;

/** Readiness contribution of another team member that is owned but still developing. */
const DEVELOPING_MEMBER = 0.75;

/** Actions gaining less than this share of max power are noise. */
const MIN_GAIN = 0.01;

/** Used only when upgradeData has no shard table (0→7★ is about 810 shards). */
const FALLBACK_SHARDS_PER_STAR = 115;

/** Rough power share of one yellow star, until the real potentials are loaded. */
const STAR_SHARE_ESTIMATE = 0.06;

/** Rough split of the gap to the ceiling between gear, abilities and levels. */
const GAP_WEIGHTS = { gear: 0.6, abilities: 0.25, levels: 0.15 };

/**
 * - `upgrade`: levels, gear (up to a realistic tier) and abilities at the current stars.
 * - `stars`: yellow stars up to 7★ — shards.
 * - `unlock`: a locked character up to 7★ — shards, then everything else.
 */
export type RecommendationKind = 'upgrade' | 'stars' | 'unlock';

export const RECOMMENDATION_LABELS: Record<RecommendationKind, string> = {
  upgrade: 'Ulepszenia',
  stars: 'Shardy',
  unlock: 'Odblokowanie',
};

/** A known team the character is part of, and how usable the rest of it already is. */
export interface TeamContext {
  name: string;
  modes: TeamTab[];
  tier: TeamTier;
  /** One of the teams to focus on. */
  focus: boolean;
  /** Tier × modes × focus. */
  weight: number;
  others: number;
  ownedOthers: number;
  /** Other members with nothing left to farm for now. */
  doneOthers: number;
  /** Other members not owned yet (including names not found in the game data). */
  missingOthers: number;
  /** Unlocking this (locked) character completes the team. */
  completes: boolean;
  /** Unlocking this (locked) character leaves one member to go. */
  nearlyCompletes: boolean;
  /** 0–1: owned others count 0.75, done ones 1. */
  readiness: number;
}

export interface Recommendation {
  /** `${characterId}:${kind}` — a character can have an upgrade and a stars action. */
  id: string;
  entry: RosterEntry;
  kind: RecommendationKind;
  /** 1 = best return right now. */
  rank: number;
  /** value × gain ÷ effort. */
  score: number;
  /** Score relative to the best recommendation (0–1). */
  relative: number;
  /**
   * Σ over its teams of weight × (readiness² + completion bonus) + key bonus: how much a
   * stronger version of it is used.
   */
  value: number;
  /** Share of the 7★ max power this action adds (1 for unlocking). */
  gain: number;
  effort: number;
  /** Teams sorted: completes, focus, readiness. */
  teams: TeamContext[];
  modes: TeamTab[];
  key: boolean;
  /** In one of the focus teams. */
  focus: boolean;
  power?: MemberPower;
  /** Shards still to collect for 7★ after the ones in the inventory. */
  shardsMissing: number;
  /** Steps of an upgrade action, e.g. "G15→G16", "umiejętności +5". */
  upgrades: string[];
  /** Difficulty of the highest gear tier in an upgrade action. */
  gearDifficulty?: Difficulty;
  /** Unlock action: shards to unlock (team completion happens here, before 7★). */
  unlock?: MissingMember;
  /** True while max powers are not loaded yet and the gain is estimated. */
  estimated: boolean;
}

export interface AdvisorInput {
  roster: RosterEntry[];
  known: KnownTeam[];
  keys: KeyCharacter[];
  /** Max power at 7★. */
  potentialOf: (entry: RosterEntry) => CharacterPotential | undefined;
  /** Max power at the current yellow stars (upgrades only). */
  potentialAtStarsOf: (entry: RosterEntry) => CharacterPotential | undefined;
  upgrade: UpgradeData;
  inventory: Inventory;
}

export interface Advice {
  ranking: Recommendation[];
  plans: TeamPlan[];
  progression: Progression;
}

/** The build worth aiming for now: max level and abilities, gear up to a realistic tier. */
interface BuildTarget {
  level: number;
  gear: number;
  /** Gear tier the level allows (the potentials assume it). */
  gearCap: number;
  abilities: Record<AbilityKey, number>;
}

/** Owned characters in known teams plus key characters — whose max power the advisor uses. */
export function advisorCandidates(
  known: KnownTeam[],
  keys: KeyCharacter[],
  roster: RosterEntry[],
): RosterEntry[] {
  const byName = rosterByName(roster);
  const all = [
    ...resolveKnownTeams(known, roster).flatMap((t) => t.members.map((m) => m.entry)),
    ...keys.map((k) => resolveName(k.name, byName)),
  ];
  const unique = new Map<string, RosterEntry>();
  for (const entry of all) if (entry?.unlocked) unique.set(entry.id, entry);
  return [...unique.values()];
}

export function recommend(input: AdvisorInput): Recommendation[] {
  return advise(input).ranking;
}

/**
 * Ranks farming actions by what pays off most right now: usefulness in known teams the
 * player (almost) has — focus teams double — × power gained ÷ effort, where shards and gear
 * tiers beyond the player's usual level are expensive. Upgrades at the current stars and the
 * stars themselves are separate actions. Characters with nothing realistic left to farm drop out.
 */
export function advise(input: AdvisorInput): Advice {
  const { roster, known, keys, potentialOf, potentialAtStarsOf, upgrade, inventory } = input;
  const profile = progression(roster);
  const byName = rosterByName(roster);
  const keyModes = new Map<string, TeamTab[]>();
  for (const k of keys) {
    const entry = resolveName(k.name, byName);
    if (entry) keyModes.set(entry.id, [...(keyModes.get(entry.id) ?? []), ...k.modes]);
  }

  const targetOf = (e: RosterEntry) => buildTarget(e, potentialOf(e), profile);
  const isDone = (e: RosterEntry) =>
    e.unlocked && doneForNow(e, memberPower(e, potentialOf(e)), targetOf(e));
  const plans = teamPlans(known, roster, (e) => ({
    share: memberPower(e, potentialOf(e))?.share ?? estimatedShare(e, profile.top),
    done: isDone(e),
  }));
  const focus = new Set(plans.filter((p) => p.focus).map((p) => p.team.name));
  const contexts = teamContexts(known, roster, isDone, focus);

  const recs: Recommendation[] = [];
  for (const entry of roster) {
    const teams = (contexts.get(entry.id) ?? []).sort(
      (a, b) =>
        Number(b.completes) - Number(a.completes) ||
        Number(b.focus) - Number(a.focus) ||
        Number(b.nearlyCompletes) - Number(a.nearlyCompletes) ||
        b.readiness - a.readiness,
    );
    const key = keyModes.has(entry.id);
    const value = teams.reduce((sum, t) => sum + teamValue(t), 0) + (key ? KEY_BONUS : 0);
    if (value <= 0 || isDone(entry)) continue;

    const potential = potentialOf(entry);
    const power = memberPower(entry, potential);
    const shardsMissing = shardsToMax(entry, upgrade, inventory);
    const base = {
      entry,
      rank: 0,
      relative: 0,
      value,
      teams,
      modes: [...new Set([...teams.flatMap((t) => t.modes), ...(keyModes.get(entry.id) ?? [])])],
      key,
      focus: teams.some((t) => t.focus),
      power,
      shardsMissing,
    };
    const add = (
      kind: RecommendationKind,
      gain: number,
      effort: number,
      estimated: boolean,
      extra: Partial<Recommendation> = {},
    ) => {
      if (gain < MIN_GAIN) return;
      recs.push({
        ...base,
        id: `${entry.id}:${kind}`,
        kind,
        gain,
        effort,
        score: (value * gain) / effort,
        upgrades: [],
        estimated,
        ...extra,
      });
    };

    const shardEffort = EFFORT.base + shardsMissing / EFFORT.shardsPerUnit;
    if (!entry.unlocked) {
      const build =
        EFFORT.levels + gearCost(profile, 1, profile.frontier) + EFFORT.newCharacterAbilities;
      add('unlock', 1, shardEffort + build, false, {
        unlock: unlockCost(entry, upgrade, inventory),
      });
      continue;
    }

    const target = targetOf(entry);
    const atStars = entry.yellowStars >= MAX_YELLOW_STARS ? potential : potentialAtStarsOf(entry);
    const { max, ceiling, estimated } = powerSplit(entry, potential, atStars, profile.top);
    const steps = upgradeSteps(entry, target, profile, upgrade, inventory);
    if (steps.upgrades.length && entry.power < ceiling * OPTIMAL_POWER_SHARE) {
      const gain = ((ceiling - entry.power) / max) * realizedShare(entry, target);
      add('upgrade', gain, steps.effort, estimated, {
        upgrades: steps.upgrades,
        gearDifficulty: steps.gearDifficulty,
      });
    }
    if (entry.yellowStars < MAX_YELLOW_STARS) {
      add('stars', (max - ceiling) / max, shardEffort, estimated);
    }
  }

  recs.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  const best = recs[0]?.score || 1;
  return {
    ranking: recs.map((r, i) => ({ ...r, rank: i + 1, relative: r.score / best })),
    plans,
    progression: profile,
  };
}

/** Best (highest ranked) action per character. */
export function bestByCharacter(ranking: Recommendation[]): Map<string, Recommendation> {
  const best = new Map<string, Recommendation>();
  for (const rec of ranking) if (!best.has(rec.entry.id)) best.set(rec.entry.id, rec);
  return best;
}

function buildTarget(
  entry: RosterEntry,
  potential: CharacterPotential | undefined,
  profile: Progression,
): BuildTarget {
  const gearCap = potential?.gearTier ?? profile.frontier + 1;
  return {
    level: Math.max(entry.level, potential?.level ?? entry.level),
    gear: realisticGear(profile, entry.gearTier, gearCap),
    gearCap: Math.max(gearCap, entry.gearTier),
    abilities: potential?.abilities ?? ABILITY_MAX,
  };
}

/**
 * Nothing worth farming for now: optimal/maxed, or 7★ with max level, abilities and gear at
 * the realistic tier — the next tiers need materials the player does not get yet.
 */
function doneForNow(
  entry: RosterEntry,
  power: MemberPower | undefined,
  target: BuildTarget,
): boolean {
  if (power?.status === 'maxed' || power?.status === 'optimal') return true;
  return (
    entry.yellowStars >= MAX_YELLOW_STARS &&
    entry.level >= target.level &&
    entry.gearTier >= target.gear &&
    ABILITY_KEYS.every((k) => entry.abilities[k] >= target.abilities[k])
  );
}

function teamValue(t: TeamContext): number {
  const bonus = t.completes ? COMPLETE_BONUS : t.nearlyCompletes ? NEAR_COMPLETE_BONUS : 0;
  return t.weight * (t.readiness * t.readiness + bonus * t.readiness);
}

function teamContexts(
  known: KnownTeam[],
  roster: RosterEntry[],
  isDone: (entry: RosterEntry) => boolean,
  focus: Set<string>,
): Map<string, TeamContext[]> {
  const contexts = new Map<string, TeamContext[]>();
  for (const { team, members } of resolveKnownTeams(known, roster)) {
    const isFocus = focus.has(team.name);
    const weight = teamWeight(team) * (isFocus ? FOCUS_BOOST : 1);
    for (const member of members) {
      if (!member.entry) continue;
      const others = members.filter((m) => m.id !== member.id);
      if (!others.length) continue;
      let ownedOthers = 0;
      let doneOthers = 0;
      let points = 0;
      const unknownOthers = others.filter((m) => m.unknown).length;
      for (const other of others) {
        if (!other.owned || !other.entry) continue;
        ownedOthers++;
        if (isDone(other.entry)) {
          doneOthers++;
          points += 1;
        } else {
          points += DEVELOPING_MEMBER;
        }
      }
      contexts.set(member.id, [
        ...(contexts.get(member.id) ?? []),
        {
          name: team.name,
          modes: team.modes,
          tier: team.tier ?? 'A',
          focus: isFocus,
          weight,
          others: others.length,
          ownedOthers,
          doneOthers,
          missingOthers: others.length - ownedOthers,
          completes: !member.owned && ownedOthers === others.length,
          nearlyCompletes:
            !member.owned && unknownOthers === 0 && ownedOthers === others.length - 1,
          readiness: points / others.length,
        },
      ]);
    }
  }
  return contexts;
}

/**
 * Max power at 7★ and the ceiling reachable with upgrades alone at the current stars.
 * Estimated from stars, gear and abilities while the potentials are loading.
 */
function powerSplit(
  entry: RosterEntry,
  potential: CharacterPotential | undefined,
  atStars: CharacterPotential | undefined,
  maxGear: number,
): { max: number; ceiling: number; estimated: boolean } {
  const current = entry.power;
  const max = Math.max(potential?.power ?? current / estimatedShare(entry, maxGear), current, 1);
  const ceiling = atStars
    ? atStars.power
    : max * (1 - STAR_SHARE_ESTIMATE * (MAX_YELLOW_STARS - entry.yellowStars));
  return {
    max,
    ceiling: Math.min(max, Math.max(current, ceiling)),
    estimated: !potential || !atStars,
  };
}

/**
 * Part of the gap to the ceiling (max gear, abilities, level) the realistic target closes —
 * stopping gear at the realistic tier leaves the rest of the gear portion open.
 */
function realizedShare(entry: RosterEntry, target: BuildTarget): number {
  const parts: { weight: number; done: number }[] = [];
  if (target.gearCap > entry.gearTier) {
    const done = (target.gear - entry.gearTier) / (target.gearCap - entry.gearTier);
    parts.push({ weight: GAP_WEIGHTS.gear, done });
  }
  if (ABILITY_KEYS.some((k) => target.abilities[k] > entry.abilities[k])) {
    parts.push({ weight: GAP_WEIGHTS.abilities, done: 1 });
  }
  if (target.level > entry.level) parts.push({ weight: GAP_WEIGHTS.levels, done: 1 });
  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  return total ? parts.reduce((sum, p) => sum + p.weight * p.done, 0) / total : 0;
}

/** Stars, gear and abilities equally weighted (never 0). */
export function estimatedShare(entry: RosterEntry, maxGear: number): number {
  if (!entry.unlocked) return 0;
  const abilities = ABILITY_KEYS.reduce((sum, k) => sum + entry.abilities[k], 0);
  const maxAbilities = ABILITY_KEYS.reduce((sum, k) => sum + ABILITY_MAX[k], 0);
  const share =
    (entry.yellowStars / MAX_YELLOW_STARS +
      (maxGear ? Math.min(1, entry.gearTier / maxGear) : 1) +
      abilities / maxAbilities) /
    3;
  return Math.max(share, 0.1);
}

/** Shards still to collect for 7★, net of the ones already in the inventory. */
export function shardsToMax(
  entry: RosterEntry,
  upgrade: UpgradeData,
  inventory: Inventory,
): number {
  const needed = upgrade.yellowStarTotalShards
    ? shardsBetween(upgrade.yellowStarTotalShards, entry.yellowStars, MAX_YELLOW_STARS)
    : (MAX_YELLOW_STARS - entry.yellowStars) * FALLBACK_SHARDS_PER_STAR;
  const owned = entry.shardItemId ? (inventory.get(entry.shardItemId) ?? 0) : 0;
  return Math.max(0, needed - owned);
}

/** Levels, gear (to the realistic tier) and abilities still open, and their effort. */
function upgradeSteps(
  entry: RosterEntry,
  target: BuildTarget,
  profile: Progression,
  upgrade: UpgradeData,
  inventory: Inventory,
): { effort: number; upgrades: string[]; gearDifficulty?: Difficulty } {
  const upgrades: string[] = [];
  let effort = EFFORT.base;
  let difficulty: Difficulty | undefined;
  if (target.level > entry.level) {
    effort += EFFORT.levels;
    upgrades.push(`poz. ${entry.level}→${target.level}`);
  }
  if (target.gear > entry.gearTier) {
    effort += gearCost(profile, entry.gearTier, target.gear);
    difficulty = gearDifficulty(profile, target.gear);
    const label = `G${entry.gearTier}→G${target.gear}`;
    upgrades.push(
      difficulty === 'easy'
        ? label
        : `${label} (G${target.gear}: ${DIFFICULTY_LABELS[difficulty]})`,
    );
  }
  const abilities = abilityNeeds(entry, target.abilities, upgrade, inventory);
  if (abilities.levels > 0) {
    effort += abilities.known
      ? abilities.levels * EFFORT.abilityLevel + abilities.missingShare * EFFORT.abilityShortfall
      : abilities.levels * EFFORT.abilityLevelUnknown;
    upgrades.push(
      abilities.missingShare > 0
        ? `umiejętności +${abilities.levels} (brakuje materiałów)`
        : `umiejętności +${abilities.levels}`,
    );
  }
  return { effort, upgrades, gearDifficulty: difficulty };
}

/**
 * Ability levels still open and the largest share of any material that is missing from the
 * inventory (0 = everything is there, 1 = none of some material).
 */
function abilityNeeds(
  entry: RosterEntry,
  target: Record<AbilityKey, number>,
  upgrade: UpgradeData,
  inventory: Inventory,
): { levels: number; missingShare: number; known: boolean } {
  const levels = ABILITY_KEYS.reduce(
    (sum, k) => sum + Math.max(0, target[k] - entry.abilities[k]),
    0,
  );
  const costs = upgrade.abilityUpgradeCosts;
  if (!levels || !costs) return { levels, missingShare: 0, known: !!costs };
  const needed = new Map<string, number>();
  for (const k of ABILITY_KEYS) {
    for (const cost of levelCostsBetween(costs[k], entry.abilities[k], target[k])) {
      const id = itemId(cost.item);
      if (id) needed.set(id, (needed.get(id) ?? 0) + (cost.quantity ?? 1));
    }
  }
  let missingShare = 0;
  for (const [id, quantity] of needed) {
    if (quantity <= 0) continue;
    const missing = Math.max(0, quantity - (inventory.get(id) ?? 0));
    missingShare = Math.max(missingShare, missing / quantity);
  }
  return { levels, missingShare, known: true };
}

/**
 * "Fokus · skompletuje Amazing Avengers, Symbiote Six (reszta gotowa)" — the best two teams.
 */
export function teamsSummary(rec: Recommendation, limit = 2): string {
  const parts = rec.teams.slice(0, limit).map((t) => {
    if (t.completes) return `skompletuje ${t.name}`;
    if (t.nearlyCompletes) return `${t.name} (po nim brakuje jeszcze 1)`;
    if (t.ownedOthers < t.others) {
      return `${t.name} (masz ${t.ownedOthers}/${t.others} pozostałych)`;
    }
    return t.doneOthers === t.others
      ? `${t.name} (reszta rozwinięta)`
      : `${t.name} (reszta gotowa)`;
  });
  const more = rec.teams.length - limit;
  if (more > 0) parts.push(`+${more}`);
  if (rec.key) parts.push('postać kluczowa');
  const text = parts.join(', ');
  return rec.focus ? `Fokus · ${text}` : text;
}

/** What to do, e.g. "G15→G16 · umiejętności +4" or "Brakuje 35 shardów do 7★". */
export function actionSummary(rec: Recommendation): string {
  switch (rec.kind) {
    case 'upgrade': {
      const steps = rec.upgrades.join(' · ');
      return rec.entry.yellowStars < MAX_YELLOW_STARS ? `${steps} — bez shardów` : steps;
    }
    case 'stars':
      return rec.shardsMissing > 0
        ? `Brakuje ${rec.shardsMissing} shardów do 7★`
        : 'Masz shardy do 7★ — awansuj';
    case 'unlock': {
      const unlock = rec.unlock;
      if (!unlock) return `Odblokuj i dobij do 7★: brakuje ${rec.shardsMissing} shardów`;
      const rest = rec.shardsMissing - unlock.missing;
      const then = rest > 0 ? `, potem ${rest} do 7★` : '';
      return unlock.missing === 0
        ? `Masz shardy na odblokowanie (${unlock.stars}★)${then}`
        : `Do odblokowania (${unlock.stars}★) brakuje ${unlock.missing} shardów${then}`;
    }
  }
}

/** A locked member of a team the player could complete. */
export interface MissingMember {
  entry: RosterEntry;
  /** Stars it unlocks at. */
  stars: number;
  /** Shards to unlock, in the inventory, and still to collect. */
  needed: number;
  owned: number;
  missing: number;
}

export interface TeamCompletion {
  team: KnownTeam;
  members: TeamMember[];
  missing: MissingMember[];
  /** Owned members that are optimally built or maxed. */
  optimalMembers: number;
  /** Shards still to collect to unlock every missing member. */
  shardsMissing: number;
  /** Every missing member can be unlocked with shards already in the inventory. */
  readyNow: boolean;
}

/**
 * Known teams one or two unlocks away from complete, cheapest first: ready to complete now,
 * then fewer missing members, then fewer shards to collect, then stronger tier and more modes.
 * Teams with names not found in the game data are skipped — they cannot be completed.
 */
export function completableTeams(
  known: KnownTeam[],
  roster: RosterEntry[],
  upgrade: UpgradeData,
  inventory: Inventory,
  powerOf: (entry: RosterEntry) => MemberPower | undefined = () => undefined,
  maxMissing = MAX_MISSING,
): TeamCompletion[] {
  const result: TeamCompletion[] = [];
  for (const { team, members } of resolveKnownTeams(known, roster)) {
    const locked = members.filter((m) => !m.owned);
    if (!locked.length || locked.length > maxMissing || locked.some((m) => !m.entry)) continue;
    const missing = locked.map(({ entry }) => unlockCost(entry!, upgrade, inventory));
    const optimalMembers = members.filter((m) => {
      const status = m.owned && m.entry ? powerOf(m.entry)?.status : undefined;
      return status === 'optimal' || status === 'maxed';
    }).length;
    const shardsMissing = missing.reduce((sum, m) => sum + m.missing, 0);
    result.push({
      team,
      members,
      missing,
      optimalMembers,
      shardsMissing,
      readyNow: shardsMissing === 0,
    });
  }
  return result.sort(
    (a, b) =>
      Number(b.readyNow) - Number(a.readyNow) ||
      a.missing.length - b.missing.length ||
      a.shardsMissing - b.shardsMissing ||
      teamWeight(b.team) - teamWeight(a.team),
  );
}

function unlockCost(entry: RosterEntry, upgrade: UpgradeData, inventory: Inventory): MissingMember {
  const stars = entry.unlockStars ?? MAX_YELLOW_STARS;
  const needed = upgrade.yellowStarTotalShards
    ? shardsBetween(upgrade.yellowStarTotalShards, 0, stars)
    : stars * FALLBACK_SHARDS_PER_STAR;
  const owned = entry.shardItemId ? (inventory.get(entry.shardItemId) ?? 0) : 0;
  return { entry, stars, needed, owned, missing: Math.max(0, needed - owned) };
}
