import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KNOWN_META } from '../../../core/data/known-meta';
import { RosterEntry } from '../../../core/models';
import { isEmptyNews } from '../../../core/state/news';
import { NewsStore } from '../../../core/state/news.store';
import { PlayerStore } from '../../../core/state/player.store';
import { RosterStore } from '../../../core/state/roster.store';
import { resolveKnownTeams } from '../../../core/state/teams-calc';

/** What changed in the game since the last visit, read from game data. */
@Component({
  selector: 'app-news-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './news-card.html',
  styleUrl: './news-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCard {
  protected readonly store = inject(NewsStore);
  private readonly player = inject(PlayerStore);
  private readonly roster = inject(RosterStore);

  protected readonly news = this.store.news;
  protected readonly empty = computed(() => {
    const news = this.news();
    return !!news && isEmptyNews(news);
  });

  /** Known teams with a reworked member: their rating may no longer hold. */
  protected readonly affectedTeams = computed(() => {
    const reworked = new Set(this.news()?.reworked.map((e) => e.id) ?? []);
    if (!reworked.size) return [];
    return resolveKnownTeams(KNOWN_META, this.roster.entries())
      .filter(({ members }) => members.some((m) => reworked.has(m.id)))
      .map(({ team }) => team.name);
  });

  constructor() {
    this.store.load();
  }

  protected qualifies(id: string): boolean {
    return this.player.ownEventIds().has(id);
  }

  protected owned(members: RosterEntry[]): number {
    return members.filter((m) => m.unlocked).length;
  }

  protected names(members: RosterEntry[]): string {
    return members.map((m) => m.name).join(', ');
  }
}
