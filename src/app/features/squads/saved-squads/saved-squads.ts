import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LoadStatus } from '../../../core/models';
import { RosterStore } from '../../../core/state/roster.store';
import { SavedReview, SquadOption } from '../../../core/state/squads';
import { SynergyLink } from '../../../core/state/synergy';
import { SquadCard } from '../squad-card/squad-card';
import { linkText } from '../squad-labels';

/** The player's saved squads for a mode, each with a verdict and the swaps worth making. */
@Component({
  selector: 'app-saved-squads',
  imports: [SquadCard],
  templateUrl: './saved-squads.html',
  styleUrl: './saved-squads.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedSquads {
  private readonly roster = inject(RosterStore);

  readonly reviews = input.required<SavedReview[]>();
  readonly status = input.required<LoadStatus>();

  /** "Prawie Symbiote Six (S)" / "Prawie popularny skład graczy" */
  protected nearText(target: SquadOption): string {
    if (!target.name) return 'Prawie popularny skład graczy';
    return `Prawie ${target.name}${target.tier ? ` (${target.tier})` : ''}`;
  }

  protected link(link: SynergyLink): string {
    return linkText(link, (id) => this.roster.entry(id)?.name ?? id);
  }
}
