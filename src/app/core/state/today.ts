import {
  Recommendation,
  RecommendationKind,
  actionSummary,
  bestByCharacter,
  teamsSummary,
} from './advisor';
import { GoalPlan, Promotion } from './farming-calc';

export type TodayKind = 'promote' | 'goal-ready' | RecommendationKind;

export interface TodayItem {
  kind: TodayKind;
  characterId: string;
  name: string;
  text: string;
  /** Why it pays off (teams), when known. */
  why?: string;
  /** Router link for the action. */
  link: string[];
}

export const TODAY_LABELS: Record<TodayKind, string> = {
  promote: 'Awansuj teraz',
  'goal-ready': 'Cel gotowy',
  upgrade: 'Ulepsz',
  stars: 'Shardy',
  unlock: 'Odblokuj',
};

/**
 * Today's most worthwhile steps, one per character:
 * 1. shards already owned for the next star / unlock — free progress (goals and ranked
 *    characters, best ranked first),
 * 2. goals fully covered by the inventory,
 * 3. the roster-wide ranking (`advisor.ts`), best action per character: cheap upgrades of
 *    useful characters first, shard-heavy work only where it pays off.
 */
export function todayItems(
  plans: GoalPlan[],
  promotions: Promotion[],
  ranking: Recommendation[],
  limit = 6,
): TodayItem[] {
  const items: TodayItem[] = [];
  const seen = new Set<string>();
  const add = (item: TodayItem) => {
    if (seen.has(item.characterId) || items.length >= limit) return;
    seen.add(item.characterId);
    items.push(item);
  };
  const recs = bestByCharacter(ranking);
  const rankOf = (id: string) => recs.get(id)?.rank ?? Number.MAX_SAFE_INTEGER;
  const why = (id: string) => {
    const rec = recs.get(id);
    return rec && teamsSummary(rec);
  };
  const active = plans.filter((p) => !p.reached);
  const goalIds = new Set(plans.map((p) => p.entry.id));

  const ready: Promotion[] = [
    ...active.flatMap((p) => (p.nextStar?.ready ? [{ entry: p.entry, next: p.nextStar }] : [])),
    ...promotions.filter((p) => recs.has(p.entry.id) && !goalIds.has(p.entry.id)),
  ].sort((a, b) => rankOf(a.entry.id) - rankOf(b.entry.id));
  for (const { entry, next } of ready) {
    add({
      kind: 'promote',
      characterId: entry.id,
      name: entry.name,
      text: entry.unlocked
        ? `Masz ${next.owned}/${next.needed} shardów — awansuj na ${next.stars}★`
        : `Masz ${next.owned}/${next.needed} shardów — odblokuj (${next.stars}★)`,
      why: why(entry.id),
      link: goalIds.has(entry.id) ? ['/farming'] : ['/roster', entry.id],
    });
  }

  const affordable = active
    .filter((p) => p.affordable)
    .sort((a, b) => rankOf(a.entry.id) - rankOf(b.entry.id));
  for (const p of affordable) {
    add({
      kind: 'goal-ready',
      characterId: p.entry.id,
      name: p.entry.name,
      text: `Masz wszystkie zasoby na cel ${p.goal.targetYellow}★ i umiejętności`,
      why: why(p.entry.id),
      link: ['/farming'],
    });
  }

  for (const rec of ranking) {
    add({
      kind: rec.kind,
      characterId: rec.entry.id,
      name: rec.entry.name,
      text: actionSummary(rec),
      why: teamsSummary(rec),
      link: ['/farming'],
    });
  }

  return items;
}
