import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbilityKey, RosterEntry } from '../../core/models';
import { GoalPlan } from '../../core/state/farming-calc';
import { FarmingStore } from '../../core/state/farming.store';
import { PlayerStore } from '../../core/state/player.store';
import { DEV_STATUS_LABELS, MemberPower, memberPower } from '../../core/state/potential-calc';
import { PotentialStore } from '../../core/state/potential.store';
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
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);

  protected readonly statusLabels = DEV_STATUS_LABELS;
  private readonly playerLevel = computed(() => this.player.card()?.level?.completedTier);

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

  /**
   * Goals split into characters to unlock, to upgrade, and done — goal reached or the
   * character already optimally built for the player's level, so farming can stop.
   */
  protected readonly groups = computed(() => {
    const unlock: GoalPlan[] = [];
    const upgrade: GoalPlan[] = [];
    const done: GoalPlan[] = [];
    for (const plan of this.store.plans()) {
      if (!plan.entry.unlocked) unlock.push(plan);
      else if (plan.reached || this.isDone(plan.entry)) done.push(plan);
      else upgrade.push(plan);
    }
    return [
      { id: 'unlock', label: 'Do odblokowania', plans: unlock },
      { id: 'upgrade', label: 'Do ulepszenia', plans: upgrade },
      { id: 'done', label: 'Gotowe — możesz przestać farmić', plans: done },
    ];
  });

  protected readonly missingTotals = computed(() =>
    this.store.totals().filter((line) => line.missing > 0),
  );

  constructor() {
    this.store.load();
    this.player.load();
    effect(() => {
      const playerStatus = this.player.status();
      if (
        this.store.status() !== 'loaded' ||
        playerStatus === 'idle' ||
        playerStatus === 'loading'
      ) {
        return;
      }
      this.potentials.ensure(
        this.store.plans().map((p) => p.entry),
        this.playerLevel(),
      );
    });
  }

  /** Development vs the max power for the player's level (once loaded). */
  protected devOf(entry: RosterEntry): MemberPower | undefined {
    return memberPower(entry, this.potentials.get(entry, this.playerLevel()));
  }

  private isDone(entry: RosterEntry): boolean {
    const status = this.devOf(entry)?.status;
    return status === 'maxed' || status === 'optimal';
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
