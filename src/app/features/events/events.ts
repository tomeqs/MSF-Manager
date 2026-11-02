import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EVENT_TYPE_LABELS, eventProgress, formatTimeLeft } from '../../core/state/event.utils';
import { shardOffers } from '../../core/state/event-rewards';
import { PlayerStore } from '../../core/state/player.store';
import { RosterStore } from '../../core/state/roster.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { ProgressBar } from '../../shared/ui/progress-bar';

@Component({
  selector: 'app-events',
  imports: [DatePipe, CompactNumberPipe, ProgressBar],
  templateUrl: './events.html',
  styleUrl: './events.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Events {
  protected readonly store = inject(PlayerStore);
  private readonly roster = inject(RosterStore);

  /** "Shuri +60, Okoye do 15 losowo" per event id: the shards its reward tiers give. */
  protected readonly shards = computed(() => {
    const byShard = new Map(
      this.roster.entries().flatMap((e) => (e.shardItemId ? [[e.shardItemId, e.name]] : [])),
    );
    const result = new Map<string, string[]>();
    for (const [itemId, offers] of shardOffers(this.store.allEvents(), new Set(byShard.keys()))) {
      for (const o of offers) {
        const parts = [
          o.guaranteed ? `+${o.guaranteed}` : '',
          o.premium ? `+${o.premium} premium` : '',
          o.possible ? `do ${o.possible} losowo` : '',
        ].filter(Boolean);
        const text = `${byShard.get(itemId)} ${parts.join(', ')}`;
        result.set(o.event.id, [...(result.get(o.event.id) ?? []), text]);
      }
    }
    return result;
  });

  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly progressOf = eventProgress;
  protected readonly timeLeft = formatTimeLeft;

  constructor() {
    this.store.load();
    this.roster.load();
  }

  protected qualifies(id: string): boolean {
    return this.store.ownEventIds().has(id);
  }
}
