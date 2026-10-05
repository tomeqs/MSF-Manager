import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ISO_CLASS_LABELS } from '../../core/state/roster.mapper';
import { RosterStore } from '../../core/state/roster.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { GearBadge } from '../../shared/ui/gear-badge';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { StarRating } from '../../shared/ui/star-rating';

/** Current caps per API params (basic/special/ultimate ≤ 8, passive ≤ 6). */
const ABILITY_MAX = { basic: 8, special: 8, ultimate: 8, passive: 6 } as const;

@Component({
  selector: 'app-character-detail',
  imports: [RouterLink, CompactNumberPipe, CharacterAvatar, GearBadge, ProgressBar, StarRating],
  templateUrl: './character-detail.html',
  styleUrl: './character-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterDetail {
  private readonly store = inject(RosterStore);

  /** Bound from the `roster/:id` route param. */
  readonly id = input.required<string>();

  protected readonly status = this.store.status;
  protected readonly entry = computed(() => this.store.entries().find((e) => e.id === this.id()));
  protected readonly isoLabels = ISO_CLASS_LABELS;

  protected readonly abilities = computed(() => {
    const e = this.entry();
    if (!e) return [];
    return (Object.keys(ABILITY_MAX) as (keyof typeof ABILITY_MAX)[]).map((key) => ({
      key,
      label: { basic: 'Basic', special: 'Special', ultimate: 'Ultimate', passive: 'Passive' }[key],
      level: e.abilities[key],
      max: ABILITY_MAX[key],
    }));
  });

  protected readonly equippedSlots = computed(
    () => this.entry()?.gearSlots.filter(Boolean).length ?? 0,
  );

  constructor() {
    this.store.load();
  }
}
