import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SOURCE_STATUS_LABELS } from '../../../core/data/character-sources';
import { RosterEntry } from '../../../core/models';
import { Recommendation, actionSummary } from '../../../core/state/advisor';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { goalCovers, recommendedGoal } from '../../../core/state/goals';
import { offerSummary } from '../../../core/state/event-rewards';
import { FarmingStore } from '../../../core/state/farming.store';
import { MODE_LABELS } from '../../../core/state/game-rules';
import {
  DIFFICULTY_LABELS,
  Difficulty,
  gearDifficulty,
  reachOf,
} from '../../../core/state/progression';
import { PlanMember, TeamPlan } from '../../../core/state/team-plans';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { ProgressBar } from '../../../shared/ui/progress-bar';

interface TierChip {
  tier: number;
  difficulty: Difficulty;
  label: string;
  have: number;
}

/** The player's gear frontier and the few teams to concentrate scarce resources on. */
@Component({
  selector: 'app-focus-teams',
  imports: [RouterLink, CharacterAvatar, ProgressBar],
  templateUrl: './focus-teams.html',
  styleUrl: './focus-teams.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusTeams {
  private readonly advisor = inject(AdvisorStore);
  private readonly farming = inject(FarmingStore);

  protected readonly plans = this.advisor.focusPlans;
  protected readonly profile = this.advisor.progression;
  protected readonly playerLevel = this.advisor.playerLevel;
  protected readonly levelCap = this.advisor.levelCap;

  /**
   * Gear tiers around the frontier with how hard they are for this player — none past what
   * the player's level allows.
   */
  protected readonly tiers = computed<TierChip[]>(() => {
    const p = this.profile();
    if (!p.sample) return [];
    const last = Math.min(p.frontier + 2, this.levelCap()?.gearTier ?? Infinity);
    const chips: TierChip[] = [];
    for (let tier = Math.max(1, p.frontier - 1); tier <= last; tier++) {
      const difficulty = gearDifficulty(p, tier);
      chips.push({
        tier,
        difficulty,
        label: DIFFICULTY_LABELS[difficulty],
        have: Math.round(reachOf(p, tier) * p.sample),
      });
    }
    return chips;
  });

  private readonly goalsById = computed(
    () => new Map(this.farming.goals().map((g) => [g.characterId, g])),
  );

  protected modes(plan: TeamPlan): string {
    return plan.team.modes.map((m) => MODE_LABELS[m]).join(' · ');
  }

  /** The member's best ranked action, or why there is none. */
  protected next(member: PlanMember): string {
    if (member.member.unknown) return 'brak w danych gry';
    if (member.done) return 'gotowa na Twój etap ✓';
    const rec = member.member.entry && this.advisor.byId().get(member.member.entry.id);
    const entry = member.member.entry;
    const source = entry && this.advisor.sourceOf(entry);
    if (!rec) {
      return entry && !entry.unlocked && source
        ? `${SOURCE_STATUS_LABELS[source.status]}${source.next ? ` — ${source.next}` : ''}`
        : 'bez opłacalnych ruchów';
    }
    const offer = rec.offer ? ` · ${offerSummary(rec.offer)}` : '';
    const where =
      rec.kind !== 'upgrade' && rec.source ? ` · ${SOURCE_STATUS_LABELS[rec.source.status]}` : '';
    return `#${rec.rank}: ${actionSummary(rec)}${offer}${where}`;
  }

  private todo(plan: TeamPlan): RosterEntry[] {
    return plan.members.flatMap((m) =>
      !m.done && m.member.entry && this.advisor.byId().has(m.member.entry.id)
        ? [m.member.entry]
        : [],
    );
  }

  protected allInGoals(plan: TeamPlan): boolean {
    return this.todo(plan).every((e) => goalCovers(this.goalsById().get(e.id), this.recOf(e)));
  }

  /** Adds each member's best action to its goal. */
  protected farmTeam(plan: TeamPlan): void {
    for (const entry of this.todo(plan)) this.farming.farm(recommendedGoal(this.recOf(entry)));
  }

  private recOf(entry: RosterEntry): Recommendation {
    return this.advisor.byId().get(entry.id)!;
  }
}
