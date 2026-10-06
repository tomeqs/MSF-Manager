import { GoalPlan, Promotion } from './farming-calc';
import { KeyCharacterRow } from './key-characters';

export type TodayKind = 'promote' | 'goal-ready' | 'close' | 'key';

export interface TodayItem {
  kind: TodayKind;
  characterId: string;
  name: string;
  text: string;
  /** Router link for the action. */
  link: string[];
}

export const TODAY_LABELS: Record<TodayKind, string> = {
  promote: 'Awansuj teraz',
  'goal-ready': 'Cel gotowy',
  close: 'Blisko',
  key: 'Kluczowa',
};

/** Share of the next star's shards from which a goal counts as "close". */
const CLOSE_SHARE = 0.5;

/**
 * Today's most actionable steps, one per character, in this order:
 * 1. enough shards to promote / unlock right now (goals first, then the rest of the roster),
 * 2. everything for the whole goal is in the inventory,
 * 3. at least half of the next star's shards collected (closest first),
 * 4. key characters still worth investing in (highest priority first).
 */
export function todayItems(
  plans: GoalPlan[],
  promotions: Promotion[],
  keys: KeyCharacterRow[],
  limit = 6,
): TodayItem[] {
  const items: TodayItem[] = [];
  const seen = new Set<string>();
  const add = (item: TodayItem) => {
    if (seen.has(item.characterId) || items.length >= limit) return;
    seen.add(item.characterId);
    items.push(item);
  };
  const active = plans.filter((p) => !p.reached);

  const promote = ({ entry, next }: Promotion, link: string[]) =>
    add({
      kind: 'promote',
      characterId: entry.id,
      name: entry.name,
      text: entry.unlocked
        ? `Masz ${next.owned}/${next.needed} shardów — awansuj na ${next.stars}★`
        : `Masz ${next.owned}/${next.needed} shardów — odblokuj (${next.stars}★)`,
      link,
    });
  for (const p of active) {
    if (p.nextStar?.ready) promote({ entry: p.entry, next: p.nextStar }, ['/farming']);
  }
  for (const p of promotions) promote(p, ['/roster', p.entry.id]);

  for (const p of active.filter((p) => p.affordable)) {
    add({
      kind: 'goal-ready',
      characterId: p.entry.id,
      name: p.entry.name,
      text: `Masz wszystkie zasoby na cel ${p.goal.targetYellow}★ i umiejętności`,
      link: ['/farming'],
    });
  }

  const close = active
    .filter((p) => p.nextStar && !p.nextStar.ready)
    .map((p) => ({ p, share: p.nextStar!.owned / p.nextStar!.needed }))
    .filter(({ share }) => share >= CLOSE_SHARE)
    .sort((a, b) => b.share - a.share);
  for (const { p } of close) {
    const next = p.nextStar!;
    add({
      kind: 'close',
      characterId: p.entry.id,
      name: p.entry.name,
      text: `Brakuje ${next.needed - next.owned} shardów do ${next.stars}★ (${next.owned}/${next.needed})`,
      link: ['/farming'],
    });
  }

  for (const row of keys) {
    if (!row.entry || row.priority <= 0) continue;
    const where = row.teams.length
      ? `w ${row.teams.length} ${row.teams.length === 1 ? 'drużynie' : 'drużynach'} z listy`
      : `w ${row.modes.length} ${row.modes.length === 1 ? 'trybie' : 'trybach'}`;
    const share = row.power ? ` — ${Math.round(row.power.share * 100)}% maks.` : '';
    add({
      kind: 'key',
      characterId: row.entry.id,
      name: row.entry.name,
      text:
        row.status === 'locked'
          ? `Zablokowana, a przydatna (${where}) — zacznij zbierać shardy`
          : `Uniwersalna (${where})${share}`,
      link: ['/key-characters'],
    });
  }

  return items;
}
