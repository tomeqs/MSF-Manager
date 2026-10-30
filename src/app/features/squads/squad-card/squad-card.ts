import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RosterStore } from '../../../core/state/roster.store';
import { SquadOption } from '../../../core/state/squads';
import { SynergyLink } from '../../../core/state/synergy';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { ORDER_LABELS, ORIGIN_LABELS, linkText, squadTitle } from '../squad-labels';

/** One squad: members in order, power, synergy from the kits and why it fits. */
@Component({
  selector: 'app-squad-card',
  imports: [RouterLink, CompactNumberPipe, CharacterAvatar, ProgressBar],
  templateUrl: './squad-card.html',
  styleUrl: './squad-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquadCard {
  private readonly roster = inject(RosterStore);

  readonly option = input.required<SquadOption>();
  /** Position in a plan (1, 2, …). */
  readonly index = input<number>();
  /** Show synergy reasons (off for compact cards). */
  readonly details = input(true);
  /** Without the card frame (inside another card). */
  readonly flat = input(false);

  protected readonly title = computed(() => squadTitle(this.option()));
  protected readonly origins = computed(() =>
    this.option()
      .origins.filter((o, i, all) => all.indexOf(o) === i)
      .map((o) => ORIGIN_LABELS[o]),
  );
  protected readonly orderLabel = computed(() => ORDER_LABELS[this.option().order]);
  protected readonly synergyPct = computed(() => Math.round(this.option().cohesion * 100));

  protected link(link: SynergyLink): string {
    return linkText(link, (id) => this.roster.entry(id)?.name ?? id);
  }
}
