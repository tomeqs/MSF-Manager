import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RosterStore } from '../../../core/state/roster.store';
import { LooseCharacter } from '../../../core/state/squads';
import { SynergyLink } from '../../../core/state/synergy';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { linkText } from '../squad-labels';

/** Strong characters without a squad: their best partners and a squad built around each. */
@Component({
  selector: 'app-loose-characters',
  imports: [RouterLink, CompactNumberPipe, CharacterAvatar],
  templateUrl: './loose-characters.html',
  styleUrl: './loose-characters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LooseCharacters {
  private readonly roster = inject(RosterStore);

  readonly loose = input.required<LooseCharacter[]>();

  protected others(partners: LooseCharacter['partners']): string {
    return partners
      .slice(1)
      .map((p) => p.entry.name)
      .join(', ');
  }

  protected link(link: SynergyLink | undefined): string {
    return link ? linkText(link, (id) => this.roster.entry(id)?.name ?? id) : '';
  }
}
