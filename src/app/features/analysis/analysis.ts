import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { AbilityKey, RosterEntry } from '../../core/models';
import { AdvisorStore } from '../../core/state/advisor.store';
import { rosterCoverage } from '../../core/state/capabilities';
import { ABILITY_MAX, MAX_YELLOW_STARS } from '../../core/state/game-rules';
import {
  AbilityOrder,
  abilityOrder,
  isoAdvice,
  isoLagging,
  potentialSummary,
  usualIsoLevel,
} from '../../core/state/insights';
import { KitsStore } from '../../core/state/kits.store';
import { PlayerStore } from '../../core/state/player.store';
import { PotentialStore } from '../../core/state/potential.store';
import { RosterStore } from '../../core/state/roster.store';
import { POOL_SIZE, strongest } from '../../core/state/squads';
import { AbilityOrderPanel } from './ability-order-panel/ability-order-panel';
import { CapabilitiesPanel } from './capabilities-panel/capabilities-panel';
import { IsoPanel } from './iso-panel/iso-panel';
import { PotentialPanel } from './potential-panel/potential-panel';

/** ISO-8 and ability-order checks look at the strongest characters only. */
const TOP = 30;
const ORDERS_SHOWN = 10;

/** Roster-wide analyses of the strongest characters: potential, mechanics, ISO-8, abilities. */
@Component({
  selector: 'app-analysis',
  imports: [PotentialPanel, CapabilitiesPanel, IsoPanel, AbilityOrderPanel],
  templateUrl: './analysis.html',
  styleUrl: './analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analysis {
  private readonly roster = inject(RosterStore);
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);
  private readonly kits = inject(KitsStore);
  private readonly advisor = inject(AdvisorStore);

  protected readonly poolSize = POOL_SIZE;
  protected readonly status = this.roster.status;
  protected readonly kitsStatus = this.kits.status;
  private readonly kitOf = (id: string) => this.kits.byId().get(id);

  protected readonly pool = computed(() => strongest(this.roster.entries()));
  private readonly top = computed(() => this.pool().slice(0, TOP));

  protected readonly summary = computed(() => {
    const level = this.player.level();
    return potentialSummary(
      this.pool(),
      (e) => this.potentials.get(e, level),
      (e) => this.potentials.get(e, level, true),
    );
  });
  protected readonly coverage = computed(() => rosterCoverage(this.pool(), this.kitOf));
  protected readonly iso = computed(() => isoAdvice(this.top(), this.kitOf));
  protected readonly lagging = computed(() => isoLagging(this.top()));
  protected readonly usualIso = computed(() => usualIsoLevel(this.top()));
  protected readonly orders = computed<AbilityOrder[]>(() =>
    this.top()
      .flatMap((e) => abilityOrder(e, this.kitOf(e.id), this.maxAbilities(e)) ?? [])
      .sort((a, b) => Number(b.offOrder) - Number(a.offOrder) || b.entry.power - a.entry.power)
      .slice(0, ORDERS_SHOWN),
  );

  constructor() {
    this.roster.load();
    this.advisor.load();
    this.kits.load();
    effect(() => {
      const level = this.player.level();
      if (this.roster.status() !== 'loaded' || level === undefined) return;
      const pool = this.pool();
      this.potentials.ensure(pool, level);
      this.potentials.ensure(
        pool.filter((e) => e.yellowStars < MAX_YELLOW_STARS),
        level,
        true,
      );
    });
  }

  /** Ability caps for the player's level (the game max until they are known). */
  private maxAbilities(entry: RosterEntry): Record<AbilityKey, number> {
    return (
      this.potentials.get(entry, this.player.level())?.abilities ??
      this.advisor.levelCap()?.abilities ??
      ABILITY_MAX
    );
  }
}
