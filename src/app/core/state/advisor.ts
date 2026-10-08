import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { CharacterPotential, RosterEntry, TeamTab, UpgradeData } from '../models';
import { Inventory, shardsBetween } from './farming-calc';
import { ABILITY_KEYS, ABILITY_MAX, MAX_YELLOW_STARS, OPTIMAL_POWER_SHARE } from './game-rules';
import { MemberPower, memberPower } from './potential-calc';
import { resolveKnownTeams, resolveName, rosterByName } from './teams-calc';

/**
 * Effort in abstract units. Shards are by far the scarcest resource (few farmable nodes,
 * most characters only from events and orbs); levels, gear and abilities are comparatively
 * easy. With these weights 0→7★ (~400 shards) costs as much as ~100 gear tiers.
 */
export const EFFORT = {
  /** Every action has a base cost, so tiny steps do not win just by being tiny. */
  base: 1,
  /** Shards per unit. */
  shardsPerUnit: 5,
  gearTier: 0.75,
  abilityLevel: 0.15,
  /** Any missing character levels (gold and XP are plentiful). */
  levels: 0.5,
  /** Levelling, gearing and skilling a freshly unlocked character from scratch. */
  newCharacter: 5,
};

/** A plug-and-play key character counts like half a ready team, even without one. */
const KEY_BONUS = 0.5;

/** Readiness contribution of another team member that is owned but still developing. */
const DEVELOPING_MEMBER = 0.75;

/** Actions gaining less than this share of max power are noise. */
const MIN_GAIN = 0.01;

/** Used only when upgradeData has no shard table. */
const FALLBACK_SHARDS_PER_STAR = 60;

/** Rough power share of one yellow star, until the real potentials are loaded. */
const STAR_SHARE_ESTIMATE = 0.06;

/**
 * - `upgrade`: levels, gear and abilities at the current stars — no shards.
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
  others: number;
  ownedOthers: number;
  /** Other members that are optimally built or maxed. */
  optimalOthers: number;
  /** 0–1: owned others count 0.75, optimal ones 1. */
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
  /** Σ readiness² of its teams (+ key bonus): how much a stronger version of it is used. */
  value: number;
  /** Share of the 7★ max power this action adds (1 for unlocking). */
  gain: number;
  effort: number;
  /** Teams sorted by readiness, best first. */
  teams: TeamContext[];
  modes: TeamTab[];
  key: boolean;
  power?: MemberPower;
  /** Shards still to collect for 7★ after the ones in the inventory. */
  shardsMissing: number;
  /** Steps of an upgrade action, e.g. "G17→G20", "umiejętności +5". */
  upgrades: string[];
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

/**
 * Ranks farming actions by what pays off most right now: usefulness in known teams the
 * player (almost) has × power gained ÷ effort, where shards weigh far more than levels, gear
 * and abilities. Upgrades at the current stars and the stars themselves are separate actions,
 * so cheap upgrades of a low-star character are not buried under its shard cost.
 * Optimal and maxed characters drop out.
 */
export function recommend(input: AdvisorInput): Recommendation[] {
  const { roster, known, keys, potentialOf, potentialAtStarsOf, upgrade, inventory } = input;
  const byName = rosterByName(roster);
  const keyModes = new Map<string, TeamTab[]>();
  for (const k of keys) {
    const entry = resolveName(k.name, byName);
    if (entry) keyModes.set(entry.id, [...(keyModes.get(entry.id) ?? []), ...k.modes]);
  }
  const contexts = teamContexts(known, roster, (e) => memberPower(e, potentialOf(e)));
  const maxGear = Math.max(0, ...roster.map((e) => e.gearTier));

  const recs: Recommendation[] = [];
  for (const entry of roster) {
    const teams = (contexts.get(entry.id) ?? []).sort((a, b) => b.readiness - a.readiness);
    const key = keyModes.has(entry.id);
    const value =
      teams.reduce((sum, t) => sum + t.readiness * t.readiness, 0) + (key ? KEY_BONUS : 0);
    if (value <= 0) continue;

    const potential = potentialOf(entry);
    const power = memberPower(entry, potential);
    if (power?.status === 'maxed' || power?.status === 'optimal') continue;
    const shardsMissing = shardsToMax(entry, upgrade, inventory);
    const base = {
      entry,
      rank: 0,
      relative: 0,
      value,
      teams,
      modes: [...new Set([...teams.flatMap((t) => t.modes), ...(keyModes.get(entry.id) ?? [])])],
      key,
      power,
      shardsMissing,
    };
    const add = (
      kind: RecommendationKind,
      gain: number,
      effort: number,
      upgrades: string[],
      estimated: boolean,
    ) => {
      if (gain < MIN_GAIN) return;
      recs.push({
        ...base,
        id: `${entry.id}:${kind}`,
        kind,
        gain,
        effort,
        score: (value * gain) / effort,
        upgrades,
        estimated,
      });
    };

    const shardEffort = EFFORT.base + shardsMissing / EFFORT.shardsPerUnit;
    if (!entry.unlocked) {
      add('unlock', 1, shardEffort + EFFORT.newCharacter, [], false);
      continue;
    }

    const atStars = entry.yellowStars >= MAX_YELLOW_STARS ? potential : potentialAtStarsOf(entry);
    const { max, ceiling, estimated } = powerSplit(entry, potential, atStars, maxGear);
    const steps = upgradeSteps(entry, atStars ?? potential, maxGear);
    if (steps.upgrades.length && entry.power < ceiling * OPTIMAL_POWER_SHARE) {
      add('upgrade', (ceiling - entry.power) / max, steps.effort, steps.upgrades, estimated);
    }
    if (entry.yellowStars < MAX_YELLOW_STARS) {
      add('stars', (max - ceiling) / max, shardEffort, [], estimated);
    }
  }

  recs.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  const best = recs[0]?.score || 1;
  return recs.map((r, i) => ({ ...r, rank: i + 1, relative: r.score / best }));
}

/** Best (highest ranked) action per character. */
export function bestByCharacter(ranking: Recommendation[]): Map<string, Recommendation> {
  const best = new Map<string, Recommendation>();
  for (const rec of ranking) if (!best.has(rec.entry.id)) best.set(rec.entry.id, rec);
  return best;
}

function teamContexts(
  known: KnownTeam[],
  roster: RosterEntry[],
  powerOf: (entry: RosterEntry) => MemberPower | undefined,
): Map<string, TeamContext[]> {
  const contexts = new Map<string, TeamContext[]>();
  for (const { team, members } of resolveKnownTeams(known, roster)) {
    for (const member of members) {
      if (!member.entry) continue;
      const others = members.filter((m) => m.id !== member.id);
      if (!others.length) continue;
      let ownedOthers = 0;
      let optimalOthers = 0;
      let points = 0;
      for (const other of others) {
        if (!other.owned || !other.entry) continue;
        ownedOthers++;
        const status = powerOf(other.entry)?.status;
        if (status === 'optimal' || status === 'maxed') {
          optimalOthers++;
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
          others: others.length,
          ownedOthers,
          optimalOthers,
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

/** Stars, gear and abilities equally weighted (never 0). */
function estimatedShare(entry: RosterEntry, maxGear: number): number {
  const abilities = ABILITY_KEYS.reduce((sum, k) => sum + entry.abilities[k], 0);
  const maxAbilities = ABILITY_KEYS.reduce((sum, k) => sum + ABILITY_MAX[k], 0);
  const share =
    (entry.yellowStars / MAX_YELLOW_STARS +
      (maxGear ? entry.gearTier / maxGear : 1) +
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

/** Levels, gear and abilities still open towards the target build, and their effort. */
function upgradeSteps(
  entry: RosterEntry,
  target: CharacterPotential | undefined,
  maxGear: number,
): { effort: number; upgrades: string[] } {
  const upgrades: string[] = [];
  let effort = EFFORT.base;
  const level = target?.level ?? 0;
  if (level > entry.level) {
    effort += EFFORT.levels;
    upgrades.push(`poz. ${entry.level}→${level}`);
  }
  const gear = target?.gearTier ?? maxGear;
  if (gear > entry.gearTier) {
    effort += (gear - entry.gearTier) * EFFORT.gearTier;
    upgrades.push(`G${entry.gearTier}→G${gear}`);
  }
  const abilityLevels = ABILITY_KEYS.reduce(
    (sum, k) => sum + Math.max(0, (target?.abilities[k] ?? ABILITY_MAX[k]) - entry.abilities[k]),
    0,
  );
  if (abilityLevels > 0) {
    effort += abilityLevels * EFFORT.abilityLevel;
    upgrades.push(`umiejętności +${abilityLevels}`);
  }
  return { effort, upgrades };
}

/** "Symbiote Six (reszta gotowa), Phoenix Force (masz 2/4 pozostałych)" — the best two teams. */
export function teamsSummary(rec: Recommendation, limit = 2): string {
  const parts = rec.teams.slice(0, limit).map((t) => {
    if (t.ownedOthers < t.others)
      return `${t.name} (masz ${t.ownedOthers}/${t.others} pozostałych)`;
    return t.optimalOthers === t.others
      ? `${t.name} (reszta optymalna)`
      : `${t.name} (reszta gotowa)`;
  });
  const more = rec.teams.length - limit;
  if (more > 0) parts.push(`+${more}`);
  if (rec.key) parts.push('postać kluczowa');
  return parts.join(', ');
}

/** What to do, e.g. "G17→G20 · umiejętności +4" or "Brakuje 35 shardów do 7★". */
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
    case 'unlock':
      return `Odblokuj i dobij do 7★: brakuje ${rec.shardsMissing} shardów`;
  }
}
