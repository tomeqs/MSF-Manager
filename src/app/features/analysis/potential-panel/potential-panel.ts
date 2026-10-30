import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PotentialRow, PotentialSummary, topBy } from '../../../core/state/insights';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { StatTile } from '../../../shared/ui/stat-tile';

const COMPACT = new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 2 });

/** Where the strongest characters' power can still grow — with and without shards. */
@Component({
  selector: 'app-potential-panel',
  imports: [RouterLink, CompactNumberPipe, ProgressBar, StatTile],
  templateUrl: './potential-panel.html',
  styleUrl: './potential-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PotentialPanel {
  readonly summary = input.required<PotentialSummary>();

  protected readonly share = computed(() => {
    const s = this.summary();
    return s.max ? Math.round((s.current / s.max) * 100) : 0;
  });
  protected readonly tiles = computed(() => {
    const s = this.summary();
    return [
      {
        label: 'Moc / możliwa',
        value: `${COMPACT.format(s.current)} / ${COMPACT.format(s.max)}`,
        hint: `${this.share()}% maks. dla Twojego poziomu`,
      },
      {
        label: 'Bez shardów',
        value: `+${COMPACT.format(s.withoutShards)}`,
        hint: 'poziomy, gear, umiejętności, ISO-8',
      },
      { label: 'Z gwiazdkami', value: `+${COMPACT.format(s.fromStars)}`, hint: 'wymaga shardów' },
    ];
  });
  protected readonly ceiling = computed(() => topBy(this.summary().rows, (r) => r.max));
  protected readonly upgrades = computed(() => topBy(this.summary().rows, (r) => r.withoutShards));
  protected readonly stars = computed(() => topBy(this.summary().rows, (r) => r.fromStars, 5));

  protected pct(row: PotentialRow): number {
    return Math.round(row.share * 100);
  }
}
