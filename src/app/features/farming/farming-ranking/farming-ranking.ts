import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  RECOMMENDATION_LABELS,
  Recommendation,
  actionSummary,
  teamsSummary,
} from '../../../core/state/advisor';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { offerSummary } from '../../../core/state/event-rewards';
import { goalCovers, recommendedGoal } from '../../../core/state/goals';
import { FarmingStore } from '../../../core/state/farming.store';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { SourceLine } from '../../../shared/ui/source-line';
import { StarRating } from '../../../shared/ui/star-rating';

const PREVIEW = 8;

/** Roster-wide ranking: what pays off most to farm right now. */
@Component({
  selector: 'app-farming-ranking',
  imports: [RouterLink, CharacterAvatar, ProgressBar, SourceLine, StarRating],
  templateUrl: './farming-ranking.html',
  styleUrl: './farming-ranking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmingRanking {
  protected readonly store = inject(FarmingStore);
  private readonly advisor = inject(AdvisorStore);

  protected readonly kindLabels = RECOMMENDATION_LABELS;
  protected readonly action = actionSummary;
  protected readonly teamsOf = teamsSummary;
  protected readonly offerText = offerSummary;

  protected readonly ranking = this.advisor.recommendations;
  protected readonly showAll = signal(false);
  protected readonly visibleRanking = computed(() =>
    this.showAll() ? this.ranking() : this.ranking().slice(0, PREVIEW),
  );
  protected readonly rankingPreview = PREVIEW;

  private readonly goalsById = computed(
    () => new Map(this.store.goals().map((g) => [g.characterId, g] as const)),
  );

  /** The saved goal already includes this action's step. */
  protected inGoals(rec: Recommendation): boolean {
    return goalCovers(this.goalsById().get(rec.entry.id), rec);
  }

  /** Adds exactly this action's step (gear, level, abilities, stars or unlock) to the goal. */
  protected farmRecommended(rec: Recommendation): void {
    this.store.farm(recommendedGoal(rec));
  }
}
