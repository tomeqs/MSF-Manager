import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IsoAdvice } from '../../../core/state/insights';
import { ISO_CLASS_LABELS } from '../../../core/state/roster.mapper';
import { RosterEntry } from '../../../core/models';

/** ISO-8 classes that differ from what most players pick, and ISO-8 levels lagging behind. */
@Component({
  selector: 'app-iso-panel',
  imports: [RouterLink],
  templateUrl: './iso-panel.html',
  styleUrl: '../analysis-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IsoPanel {
  readonly advice = input.required<IsoAdvice[]>();
  readonly lagging = input.required<RosterEntry[]>();
  readonly usual = input.required<number>();

  protected readonly labels = ISO_CLASS_LABELS;
  protected readonly limit = 8;

  protected pct(share: number): number {
    return Math.round(share * 100);
  }
}
