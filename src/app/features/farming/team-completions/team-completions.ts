import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamCompletion } from '../../../core/state/advisor';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { goalFor } from '../../../core/state/farming-calc';
import { FarmingStore } from '../../../core/state/farming.store';
import { MODE_LABELS } from '../../../core/state/game-rules';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { ProgressBar } from '../../../shared/ui/progress-bar';

const PREVIEW = 4;

/** Known teams one or two unlocks away from complete, with the shards it takes. */
@Component({
  selector: 'app-team-completions',
  imports: [RouterLink, CharacterAvatar, ProgressBar],
  templateUrl: './team-completions.html',
  styleUrl: './team-completions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCompletions {
  private readonly advisor = inject(AdvisorStore);
  private readonly store = inject(FarmingStore);

  protected readonly completions = this.advisor.completions;
  protected readonly showAllCompletions = signal(false);
  protected readonly visibleCompletions = computed(() =>
    this.showAllCompletions() ? this.completions() : this.completions().slice(0, PREVIEW),
  );
  protected readonly completionsPreview = PREVIEW;

  private readonly goalIds = computed(() => new Set(this.store.goals().map((g) => g.characterId)));

  protected modes(completion: TeamCompletion): string {
    return completion.team.modes.map((m) => MODE_LABELS[m]).join(' · ');
  }

  protected allInGoals(completion: TeamCompletion): boolean {
    return completion.missing.every((m) => this.goalIds().has(m.entry.id));
  }

  /** Unlock goals for every missing member not in the goals yet. */
  protected farmMissing(completion: TeamCompletion): void {
    for (const { entry } of completion.missing) {
      if (!this.goalIds().has(entry.id)) this.store.saveGoal(goalFor(entry));
    }
  }
}
