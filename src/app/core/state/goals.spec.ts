import { Recommendation } from './advisor';
import { planGoal } from './farming-calc';
import { goalCovers, isEmptyGoal, maxBuildGoal, mergeGoals, recommendedGoal } from './goals';
import { toRosterEntry } from './roster.mapper';

const entry = toRosterEntry(
  { id: 'A', name: 'A' },
  {
    id: 'A',
    level: 90,
    activeYellow: 6,
    gearTier: 15,
    basic: 8,
    special: 8,
    ultimate: 8,
    passive: 6,
  },
);
const max = { basic: 8, special: 8, ultimate: 8, passive: 6 };
const rec = (kind: Recommendation['kind'], extra: Partial<Recommendation> = {}) =>
  ({ entry, kind, upgrades: [], ...extra }) as Recommendation;
const gearOnly = rec('upgrade', { target: { level: 90, gear: 16, abilities: max } });

describe('farming goals', () => {
  it('saves exactly the recommended step, so a gear-only upgrade is not "reached"', () => {
    const goal = recommendedGoal(gearOnly);
    expect(goal).toMatchObject({ targetYellow: 6, targetGear: 16, targetLevel: 90 });
    const plan = planGoal(goal, entry, {}, new Map());
    expect(plan.reached).toBe(false);
    expect(plan.gear).toEqual({ from: 15, to: 16 });
    expect(plan.affordable).toBe(false); // gear materials are not counted yet
    expect(recommendedGoal(rec('stars')).targetYellow).toBe(7);
  });

  it('merges actions into one goal and knows when a goal covers an action', () => {
    const both = mergeGoals(recommendedGoal(gearOnly), recommendedGoal(rec('stars')));
    expect(both).toMatchObject({ targetYellow: 7, targetGear: 16 });
    expect(goalCovers(both, gearOnly)).toBe(true);
    expect(goalCovers(recommendedGoal(rec('stars')), gearOnly)).toBe(false);
    expect(goalCovers(undefined, gearOnly)).toBe(false);
  });

  it('never builds an empty goal for an owned character', () => {
    expect(maxBuildGoal(entry, undefined)).toBeUndefined(); // potential still loading
    const seven = { ...entry, yellowStars: 7 };
    const nothing = { characterId: 'A', targetYellow: 7, targetAbilities: max };
    expect(isEmptyGoal(nothing, seven)).toBe(true);
    expect(isEmptyGoal({ ...nothing, targetGear: 16 }, seven)).toBe(false);
  });
});
