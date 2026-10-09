import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  RECOMMENDATION_LABELS,
  Recommendation,
  actionSummary,
  teamsSummary,
} from '../../../core/state/advisor';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { goalFor } from '../../../core/state/farming-calc';
import { FarmingStore } from '../../../core/state/farming.store';
import { PotentialStore } from '../../../core/state/potential.store';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { StarRating } from '../../../shared/ui/star-rating';

const PREVIEW = 8;

/** Roster-wide ranking: what pays off most to farm right now. */
@Component({
  selector: 'app-farming-ranking',
  imports: [RouterLink, CharacterAvatar, ProgressBar, StarRating],
  templateUrl: './farming-ranking.html',
  styleUrl: './farming-ranking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmingRanking {
  protected readonly store = inject(FarmingStore);
  private readonly advisor = inject(AdvisorStore);
  private readonly potentials = inject(PotentialStore);

  protected readonly kindLabels = RECOMMENDATION_LABELS;
  protected readonly action = actionSummary;
  protected readonly teamsOf = teamsSummary;

  protected readonly ranking = this.advisor.recommendations;
  protected readonly showAll = signal(false);
  protected readonly visibleRanking = computed(() =>
    this.showAll() ? this.ranking() : this.ranking().slice(0, PREVIEW),
  );
  protected readonly rankingPreview = PREVIEW;

  private readonly goalsById = computed(
    () => new Map(this.store.goals().map((g) => [g.characterId, g] as const)),
  );

  /** A saved goal covers the action: any goal for upgrades, a star target for shard actions. */
  protected inGoals(rec: Recommendation): boolean {
    const goal = this.goalsById().get(rec.entry.id);
    if (!goal) return false;
    return rec.kind === 'upgrade' || goal.targetYellow > rec.entry.yellowStars;
  }

  /**
   * Goal for a ranked action: abilities at the current stars for upgrades, otherwise 7★ (or
   * unlock) with the max ability levels.
   */
  protected farmRecommended(rec: Recommendation): void {
    const potential = this.potentials.get(rec.entry, this.advisor.playerLevel());
    const stars = rec.kind === 'upgrade' ? rec.entry.yellowStars : undefined;
    this.store.saveGoal(goalFor(rec.entry, potential?.abilities, stars));
  }
}
