import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbilityOrder } from '../../../core/state/insights';
import { ABILITY_LABELS } from '../../../core/state/game-rules';

/** Abilities in the order most players develop them, with the next one to raise. */
@Component({
  selector: 'app-ability-order-panel',
  imports: [RouterLink],
  templateUrl: './ability-order-panel.html',
  styleUrl: '../analysis-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbilityOrderPanel {
  readonly orders = input.required<AbilityOrder[]>();

  protected readonly labels = ABILITY_LABELS;

  protected pct(share: number): number {
    return Math.round(share * 100);
  }
}
