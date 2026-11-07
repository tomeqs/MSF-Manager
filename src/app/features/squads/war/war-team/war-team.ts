import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TREND_LABELS, WAR_TEAM_STATUS } from '../../../../core/data/war-meta';
import { RosterStore } from '../../../../core/state/roster.store';
import { arrange } from '../../../../core/state/squad-assistant';
import { SquadsStore } from '../../../../core/state/squads.store';
import { SlotState, Substitute, TeamFit } from '../../../../core/state/war-plan';
import { SquadCard } from '../../squad-card/squad-card';
import { VERDICT_LABELS, names, substituteReasons, verdictText } from '../war-labels';

/** A meta War team against the roster: the squad to field now, substitutes and what to develop. */
@Component({
  selector: 'app-war-team',
  imports: [SquadCard],
  templateUrl: './war-team.html',
  styleUrl: './war-team.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarTeam {
  private readonly roster = inject(RosterStore);
  private readonly squads = inject(SquadsStore);

  readonly fit = input.required<TeamFit>();
  readonly index = input<number>();

  protected readonly lineup = computed(() => arrange(this.fit().option, this.squads.synergy()));
  protected readonly status = computed(() => WAR_TEAM_STATUS[this.fit().name]);
  protected readonly trendLabels = TREND_LABELS;
  protected readonly verdictLabel = computed(() => VERDICT_LABELS[this.fit().verdict]);
  protected readonly verdict = computed(() => verdictText(this.fit()));
  /** Members to develop (not for a team too far to field). */
  protected readonly weak = computed(() =>
    this.fit().verdict === 'far' ? [] : this.fit().slots.filter((s) => s.state === 'weak'),
  );
  /** Missing members without a substitute (a team too far to fill). */
  protected readonly missing = computed(() => this.fit().option.missing);
  protected readonly names = names;

  protected stateText(state: SlotState): string {
    return state === 'locked' ? 'nie masz' : 'brak w danych gry';
  }

  protected reasons(sub: Substitute): string {
    return substituteReasons(sub, (id) => this.roster.entry(id)?.name ?? id);
  }

  protected others(subs: Substitute[], from = 1): string {
    return subs
      .slice(from)
      .map((s) => s.entry.name)
      .join(', ');
  }
}
