import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { FarmingStore } from '../../../core/state/farming.store';
import { FarmProposal, Proposal } from '../../../core/state/squad-assistant';
import { PlanView, SquadsStore } from '../../../core/state/squads.store';
import { SquadCard } from '../squad-card/squad-card';

/** One plan of the assistant: squads to save now, and squads worth farming towards. */
@Component({
  selector: 'app-assistant-plan',
  imports: [RouterLink, SquadCard],
  templateUrl: './assistant-plan.html',
  styleUrl: './assistant-plan.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPlan {
  protected readonly store = inject(SquadsStore);
  private readonly advisor = inject(AdvisorStore);
  private readonly farming = inject(FarmingStore);

  readonly view = input.required<PlanView>();

  protected readonly next = computed(() => this.view().plan.ready[0]);
  protected readonly later = computed(() => this.view().plan.ready.slice(1));
  protected readonly toFarm = computed(() => this.view().plan.toFarm);
  protected readonly hasSkips = computed(() => this.store.hasSkips(this.view().id));
  protected readonly isDefense = computed(() => this.view().id === 'war:defense');
  protected readonly counts = [1, 2, 3, 4, 5];
  private readonly goalIds = computed(
    () => new Set(this.farming.goals().map((g) => g.characterId)),
  );

  protected accept(p: Proposal): void {
    this.store.accept(
      this.view().id,
      p.arrangement.members.map((m) => m.id),
    );
  }

  protected skip(p: Proposal): void {
    this.store.skip(this.view().id, p.option.key);
  }

  protected resetSkips(): void {
    this.store.resetSkips(this.view().id);
  }

  /** "1. Riot · 2. Toxin · …" — the order to set in game. */
  protected order(p: Proposal): string {
    return p.arrangement.members.map((m, i) => `${i + 1}. ${m.name}`).join(' · ');
  }

  /** Adds farming goals for every member that needs something. */
  protected farm(p: FarmProposal): void {
    for (const need of p.needs) {
      if (need.entry) this.farming.farm(this.advisor.farmGoal(need.entry));
    }
  }

  protected allFarmed(p: FarmProposal): boolean {
    const entries = p.needs.flatMap((n) => n.entry ?? []);
    return entries.length > 0 && entries.every((e) => this.goalIds().has(e.id));
  }

  protected names(p: FarmProposal): string {
    return p.overlap.map((m) => m.name).join(', ');
  }
}
