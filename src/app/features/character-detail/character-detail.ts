import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHARACTER_SOURCES_AS_OF } from '../../core/data/character-sources';
import { AdvisorStore } from '../../core/state/advisor.store';
import { offerSummary } from '../../core/state/event-rewards';
import { goalFor } from '../../core/state/farming-calc';
import { FarmingStore } from '../../core/state/farming.store';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_MAX,
  OPTIMAL_POWER_SHARE,
} from '../../core/state/game-rules';
import { PlayerStore } from '../../core/state/player.store';
import { DEV_STATUS_LABELS, memberPower } from '../../core/state/potential-calc';
import { PotentialStore } from '../../core/state/potential.store';
import { ISO_CLASS_LABELS } from '../../core/state/roster.mapper';
import { RosterStore } from '../../core/state/roster.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { GearBadge } from '../../shared/ui/gear-badge';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { SourceLine } from '../../shared/ui/source-line';
import { StarRating } from '../../shared/ui/star-rating';

@Component({
  selector: 'app-character-detail',
  imports: [
    RouterLink,
    CompactNumberPipe,
    CharacterAvatar,
    GearBadge,
    ProgressBar,
    StarRating,
    SourceLine,
  ],
  templateUrl: './character-detail.html',
  styleUrl: './character-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterDetail {
  private readonly store = inject(RosterStore);
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);
  private readonly farming = inject(FarmingStore);
  private readonly advisor = inject(AdvisorStore);

  /** Bound from the `roster/:id` route param. */
  readonly id = input.required<string>();

  protected readonly status = this.store.status;
  protected readonly entry = computed(() => this.store.entries().find((e) => e.id === this.id()));
  protected readonly isoLabels = ISO_CLASS_LABELS;
  protected readonly statusLabels = DEV_STATUS_LABELS;
  protected readonly optimalPct = Math.round(OPTIMAL_POWER_SHARE * 100);

  private readonly playerLevel = this.player.level;

  /** Development vs the max power for the player's level. */
  protected readonly dev = computed(() => {
    const e = this.entry();
    return e ? memberPower(e, this.potentials.get(e, this.playerLevel())) : undefined;
  });

  /** Researched shard source and running/upcoming events that award its shards. */
  protected readonly source = computed(() => {
    const e = this.entry();
    return e && this.advisor.sourceOf(e);
  });
  protected readonly offers = computed(() => {
    const id = this.entry()?.shardItemId;
    return (id && this.advisor.offers().get(id)) || [];
  });
  protected readonly offerText = offerSummary;
  protected readonly sourcesAsOf = CHARACTER_SOURCES_AS_OF;

  protected readonly inFarming = computed(() =>
    this.farming.goals().some((g) => g.characterId === this.id()),
  );

  /** Ability levels against the max for the player's level (game max until it is known). */
  protected readonly abilities = computed(() => {
    const e = this.entry();
    if (!e) return [];
    const max = this.potentials.get(e, this.playerLevel())?.abilities;
    return ABILITY_KEYS.map((key) => ({
      key,
      label: ABILITY_LABELS[key],
      level: e.abilities[key],
      max: Math.max(e.abilities[key], max?.[key] ?? ABILITY_MAX[key]),
    }));
  });

  protected readonly equippedSlots = computed(
    () => this.entry()?.gearSlots.filter(Boolean).length ?? 0,
  );

  constructor() {
    this.store.load();
    this.player.load();
    effect(() => {
      const e = this.entry();
      const playerStatus = this.player.status();
      if (!e || playerStatus === 'idle' || playerStatus === 'loading') return;
      this.potentials.ensure([e], this.playerLevel());
    });
  }

  /** Farming goal towards the max build: unlock, or 7★ with the target ability levels. */
  protected farm(): void {
    const e = this.entry();
    if (!e) return;
    const potential = this.potentials.get(e, this.playerLevel());
    this.farming.saveGoal(goalFor(e, potential?.abilities));
  }
}
