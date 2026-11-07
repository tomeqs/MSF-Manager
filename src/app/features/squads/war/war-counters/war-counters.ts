import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PUNCH_LABELS, Punch } from '../../../../core/data/war-meta';
import { RosterStore } from '../../../../core/state/roster.store';
import { arrange } from '../../../../core/state/squad-assistant';
import { SquadsStore } from '../../../../core/state/squads.store';
import { DefenseAnswer, TeamFit } from '../../../../core/state/war-plan';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { SquadCard } from '../../squad-card/squad-card';
import { VERDICT_LABELS, substituteReasons } from '../war-labels';

/** For each defense to expect: who to hit first and the counters, the player's best first. */
@Component({
  selector: 'app-war-counters',
  imports: [CompactNumberPipe, SquadCard],
  templateUrl: './war-counters.html',
  styleUrl: './war-counters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarCounters {
  private readonly roster = inject(RosterStore);
  private readonly squads = inject(SquadsStore);

  readonly answers = input.required<DefenseAnswer[]>();

  protected readonly verdicts = VERDICT_LABELS;

  protected punchTitle(punch: Punch): string {
    return PUNCH_LABELS[punch];
  }

  protected lineup(fit: TeamFit) {
    return arrange(fit.option, this.squads.synergy());
  }

  /** "zamiast Oath: Blade (ta sama rola…)" for each swap. */
  protected swaps(fit: TeamFit): string {
    const nameOf = (id: string) => this.roster.entry(id)?.name ?? id;
    return fit.swaps
      .map(
        (s) => `zamiast ${s.slot.label}: ${s.by.entry.name} (${substituteReasons(s.by, nameOf)})`,
      )
      .join(' · ');
  }

  /** The counter closest to fieldable when none is (most members owned). */
  protected nearest(
    answer: DefenseAnswer,
  ): { label: string; owned: number; missing: string[] } | undefined {
    const best = [...answer.counters].sort(
      (a, b) => owned(b.fit) - owned(a.fit) || b.fit.power - a.fit.power,
    )[0];
    return best
      ? { label: best.counter.label, owned: owned(best.fit), missing: missing(best.fit) }
      : undefined;
  }
}

function owned(fit: TeamFit): number {
  return fit.slots.filter((s) => s.state === 'ready' || s.state === 'weak').length;
}

function missing(fit: TeamFit): string[] {
  return fit.slots
    .filter((s) => s.state === 'locked' || s.state === 'unknown')
    .filter((s) => !fit.swaps.some((w) => w.slot === s))
    .map((s) => s.label);
}
