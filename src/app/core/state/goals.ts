import { CharacterPotential, RosterEntry } from '../models';
import { Recommendation } from './advisor';
import { FarmingGoal, goalFor } from './farming-calc';
import { ABILITY_KEYS, MAX_YELLOW_STARS } from './game-rules';

/**
 * What a "Farmuj" click saves: exactly the recommended step — the upgrade's level, gear tier
 * and ability levels at the current stars, 7★ for a shard action, or unlocking.
 */
export function recommendedGoal(rec: Recommendation): FarmingGoal {
  const e = rec.entry;
  if (rec.kind === 'upgrade' && rec.target) {
    return {
      characterId: e.id,
      targetYellow: e.yellowStars,
      targetAbilities: { ...rec.target.abilities },
      targetGear: rec.target.gear,
      targetLevel: rec.target.level,
    };
  }
  if (rec.kind === 'stars') {
    return {
      characterId: e.id,
      targetYellow: MAX_YELLOW_STARS,
      targetAbilities: { ...e.abilities },
    };
  }
  return goalFor(e);
}

/**
 * The max build for the player's level from the character's potential: unlock, or 7★ with
 * its level, gear tier and ability levels. Undefined for an owned character until the
 * potential is known (a goal without targets would read as reached).
 */
export function maxBuildGoal(
  entry: RosterEntry,
  potential: CharacterPotential | undefined,
): FarmingGoal | undefined {
  if (!entry.unlocked) return goalFor(entry);
  if (!potential) return undefined;
  return {
    ...goalFor(entry, potential.abilities),
    targetGear: potential.gearTier,
    targetLevel: potential.level,
  };
}

/** One goal from two for the same character: the higher target of each part. */
export function mergeGoals(a: FarmingGoal | undefined, b: FarmingGoal): FarmingGoal {
  if (!a) return b;
  const abilities = { ...b.targetAbilities };
  for (const k of ABILITY_KEYS) abilities[k] = Math.max(a.targetAbilities[k], abilities[k]);
  return {
    characterId: b.characterId,
    targetYellow: Math.max(a.targetYellow, b.targetYellow),
    targetAbilities: abilities,
    targetGear: higher(a.targetGear, b.targetGear),
    targetLevel: higher(a.targetLevel, b.targetLevel),
  };
}

/** Nothing in the goal is above what the character already has. */
export function isEmptyGoal(goal: FarmingGoal, entry: RosterEntry): boolean {
  return (
    goal.targetYellow <= entry.yellowStars &&
    ABILITY_KEYS.every((k) => goal.targetAbilities[k] <= entry.abilities[k]) &&
    (goal.targetGear ?? 0) <= entry.gearTier &&
    (goal.targetLevel ?? 0) <= entry.level
  );
}

/** The saved goal already includes everything the action recommends. */
export function goalCovers(goal: FarmingGoal | undefined, rec: Recommendation): boolean {
  return !!goal && mergeEquals(goal, mergeGoals(goal, recommendedGoal(rec)));
}

function mergeEquals(a: FarmingGoal, b: FarmingGoal): boolean {
  return (
    a.targetYellow === b.targetYellow &&
    ABILITY_KEYS.every((k) => a.targetAbilities[k] === b.targetAbilities[k]) &&
    (a.targetGear ?? 0) === (b.targetGear ?? 0) &&
    (a.targetLevel ?? 0) === (b.targetLevel ?? 0)
  );
}

function higher(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}
