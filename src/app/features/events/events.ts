import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EVENT_TYPE_LABELS, eventProgress, formatTimeLeft } from '../../core/state/event.utils';
import { PlayerStore } from '../../core/state/player.store';
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

  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly progressOf = eventProgress;
  protected readonly timeLeft = formatTimeLeft;

  constructor() {
    this.store.load();
  }
}
