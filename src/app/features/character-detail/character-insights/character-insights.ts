import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IsoClass, RosterEntry } from '../../../core/models';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { capabilitiesOf, capabilityLabel } from '../../../core/state/capabilities';
import { ABILITY_LABELS, ABILITY_MAX } from '../../../core/state/game-rules';
import { abilityOrder } from '../../../core/state/insights';
import { KitsStore } from '../../../core/state/kits.store';
import { PlayerStore } from '../../../core/state/player.store';
import { PotentialStore } from '../../../core/state/potential.store';
import { ISO_CLASS_LABELS } from '../../../core/state/roster.mapper';

/** Mechanics from the kit, and how players build the character (ISO-8 class, T4 order). */
@Component({
  selector: 'app-character-insights',
  templateUrl: './character-insights.html',
  styleUrl: './character-insights.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterInsights {
  private readonly kits = inject(KitsStore);
  private readonly potentials = inject(PotentialStore);
  private readonly player = inject(PlayerStore);
  private readonly advisor = inject(AdvisorStore);

  readonly entry = input.required<RosterEntry>();

  protected readonly abilityLabels = ABILITY_LABELS;
  private readonly kit = computed(() => this.kits.byId().get(this.entry().id));

  protected readonly mechanics = computed(() => capabilitiesOf(this.kit()).map(capabilityLabel));
  protected readonly iso = computed(() =>
    (Object.entries(this.kit()?.isoAdoption ?? {}) as [IsoClass, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([id, share]) => ({
        label: ISO_CLASS_LABELS[id],
        pct: Math.round(share * 100),
        mine: this.entry().iso.active === id,
      })),
  );
  protected readonly order = computed(() => {
    const e = this.entry();
    const max =
      this.potentials.get(e, this.player.level())?.abilities ??
      this.advisor.levelCap()?.abilities ??
      ABILITY_MAX;
    return e.unlocked ? abilityOrder(e, this.kit(), max) : undefined;
  });

  constructor() {
    this.kits.load();
  }

  protected pct(share: number): number {
    return Math.round(share * 100);
  }
}
