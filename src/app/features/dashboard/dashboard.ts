import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdvisorStore } from '../../core/state/advisor.store';
import { FarmingStore } from '../../core/state/farming.store';
import { PlayerStore } from '../../core/state/player.store';
import { TODAY_LABELS, todayItems } from '../../core/state/today';
import { RosterStore } from '../../core/state/roster.store';
import { EVENT_TYPE_LABELS, eventProgress, formatTimeLeft } from '../../core/state/event.utils';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { GearBadge } from '../../shared/ui/gear-badge';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { StarRating } from '../../shared/ui/star-rating';
import { StatTile } from '../../shared/ui/stat-tile';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DecimalPipe,
    CompactNumberPipe,
    StatTile,
    CharacterAvatar,
    StarRating,
    GearBadge,
    ProgressBar,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly player = inject(PlayerStore);
  protected readonly roster = inject(RosterStore);
  protected readonly farming = inject(FarmingStore);
  private readonly advisor = inject(AdvisorStore);

  protected readonly todayLabels = TODAY_LABELS;
  protected readonly today = computed(() =>
    todayItems(this.farming.plans(), this.farming.promotions(), this.advisor.recommendations()),
  );
  protected readonly todayStatus = this.farming.status;

  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly progressOf = eventProgress;
  protected readonly timeLeft = formatTimeLeft;

  constructor() {
    this.player.load();
    this.roster.load();
    this.advisor.load();
    effect(() => this.advisor.ensurePotentials());
  }
}
