import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RosterEntry } from '../../../core/models';
import { actionSummary } from '../../../core/state/advisor';
import { AdvisorStore } from '../../../core/state/advisor.store';
import { goalFor } from '../../../core/state/farming-calc';
import { FarmingStore } from '../../../core/state/farming.store';
import { MODE_LABELS } from '../../../core/state/game-rules';
import { PotentialStore } from '../../../core/state/potential.store';
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
  private readonly potentials = inject(PotentialStore);

  protected readonly plans = this.advisor.focusPlans;
  protected readonly profile = this.advisor.progression;

  /** Gear tiers around the frontier with how hard they are for this player. */
  protected readonly tiers = computed<TierChip[]>(() => {
    const p = this.profile();
    if (!p.sample) return [];
    const chips: TierChip[] = [];
    for (let tier = Math.max(1, p.frontier - 1); tier <= p.frontier + 2; tier++) {
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

  private readonly goalIds = computed(
    () => new Set(this.farming.goals().map((g) => g.characterId)),
  );

  protected modes(plan: TeamPlan): string {
    return plan.team.modes.map((m) => MODE_LABELS[m]).join(' · ');
  }

  /** The member's best ranked action, or why there is none. */
  protected next(member: PlanMember): string {
    if (member.member.unknown) return 'brak w danych gry';
    if (member.done) return 'gotowa na Twój etap ✓';
    const rec = member.member.entry && this.advisor.byId().get(member.member.entry.id);
    return rec ? `#${rec.rank}: ${actionSummary(rec)}` : 'bez opłacalnych ruchów';
  }

  private todo(plan: TeamPlan): RosterEntry[] {
    return plan.members.flatMap((m) =>
      !m.done && m.member.entry && this.advisor.byId().has(m.member.entry.id)
        ? [m.member.entry]
        : [],
    );
  }

  protected allInGoals(plan: TeamPlan): boolean {
    return this.todo(plan).every((e) => this.goalIds().has(e.id));
  }

  /** Goals for every member with something worth farming, following its best action. */
  protected farmTeam(plan: TeamPlan): void {
    const level = this.advisor.playerLevel();
    for (const entry of this.todo(plan)) {
      if (this.goalIds().has(entry.id)) continue;
      const rec = this.advisor.byId().get(entry.id)!;
      const potential = this.potentials.get(entry, level);
      const stars = rec.kind === 'upgrade' ? entry.yellowStars : undefined;
      this.farming.saveGoal(goalFor(entry, potential?.abilities, stars));
    }
  }
}
