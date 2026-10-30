import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coverage, GROUP_LABELS } from '../../../core/state/capabilities';

/** A mechanic is scarce when this few of the strongest characters bring it. */
const SCARCE = 2;

/** Which mechanics the strongest characters bring, rarest first. */
@Component({
  selector: 'app-capabilities-panel',
  imports: [RouterLink],
  templateUrl: './capabilities-panel.html',
  styleUrl: '../analysis-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapabilitiesPanel {
  readonly coverage = input.required<Coverage[]>();
  readonly poolSize = input.required<number>();

  protected readonly groups = GROUP_LABELS;
  protected readonly scarce = computed(() =>
    this.coverage().filter((c) => c.characters.length <= SCARCE),
  );
  protected readonly common = computed(() =>
    this.coverage().filter((c) => c.characters.length > SCARCE),
  );
}
