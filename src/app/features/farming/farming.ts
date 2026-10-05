import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbilityKey } from '../../core/models';
import { FarmingStore } from '../../core/state/farming.store';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_MAX,
  MAX_YELLOW_STARS,
} from '../../core/state/game-rules';
import { RosterStore } from '../../core/state/roster.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { ProgressBar } from '../../shared/ui/progress-bar';

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

@Component({
  selector: 'app-farming',
  imports: [NgTemplateOutlet, RouterLink, CompactNumberPipe, CharacterAvatar, ProgressBar],
  templateUrl: './farming.html',
  styleUrl: './farming.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Farming {
  protected readonly store = inject(FarmingStore);
  private readonly roster = inject(RosterStore);

  protected readonly abilityKeys = ABILITY_KEYS;
  protected readonly abilityLabels = ABILITY_LABELS;

  /** Characters sorted by name for the picker. */
  protected readonly characters = computed(() =>
    [...this.roster.entries()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly selectedId = signal('');
  protected readonly selected = computed(() =>
    this.roster.entries().find((e) => e.id === this.selectedId()),
  );
  protected readonly targetYellow = signal(MAX_YELLOW_STARS);
  protected readonly targetAbilities = signal<Record<AbilityKey, number>>({
    basic: 0,
    special: 0,
    ultimate: 0,
    passive: 0,
  });

  protected readonly yellowOptions = computed(() =>
    range(Math.max(1, this.selected()?.yellowStars ?? 1), MAX_YELLOW_STARS),
  );

  /** Goals split into characters to unlock and characters to upgrade. */
  protected readonly groups = computed(() => {
    const plans = this.store.plans();
    return [
      { id: 'unlock', label: 'Do odblokowania', plans: plans.filter((p) => !p.entry.unlocked) },
      { id: 'upgrade', label: 'Do ulepszenia', plans: plans.filter((p) => p.entry.unlocked) },
    ];
  });

  protected readonly missingTotals = computed(() =>
    this.store.totals().filter((line) => line.missing > 0),
  );

  constructor() {
    this.store.load();
  }

  protected abilityOptions(key: AbilityKey): number[] {
    return range(this.selected()?.abilities[key] ?? 0, ABILITY_MAX[key]);
  }

  protected select(id: string): void {
    this.selectedId.set(id);
    const entry = this.selected();
    if (!entry) return;
    const existing = this.store.goals().find((g) => g.characterId === id);
    this.targetYellow.set(existing?.targetYellow ?? MAX_YELLOW_STARS);
    this.targetAbilities.set(existing?.targetAbilities ?? { ...entry.abilities });
  }

  protected setAbility(key: AbilityKey, value: number): void {
    this.targetAbilities.update((a) => ({ ...a, [key]: value }));
  }

  protected save(): void {
    const entry = this.selected();
    if (!entry) return;
    this.store.saveGoal({
      characterId: entry.id,
      targetYellow: Math.max(this.targetYellow(), entry.yellowStars),
      targetAbilities: this.targetAbilities(),
    });
    this.selectedId.set('');
  }

  protected edit(characterId: string): void {
    this.select(characterId);
  }
}
