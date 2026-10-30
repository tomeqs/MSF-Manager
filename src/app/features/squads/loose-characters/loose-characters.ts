import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RosterStore } from '../../../core/state/roster.store';
import { LooseCharacter } from '../../../core/state/squads';
import { SynergyLink } from '../../../core/state/synergy';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { SquadCard } from '../squad-card/squad-card';
import { linkText } from '../squad-labels';

/** Strong characters without a squad: their best partners and a squad built around each. */
@Component({
  selector: 'app-loose-characters',
  imports: [RouterLink, CompactNumberPipe, CharacterAvatar, SquadCard],
  templateUrl: './loose-characters.html',
  styleUrl: './loose-characters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LooseCharacters {
  private readonly roster = inject(RosterStore);

  readonly loose = input.required<LooseCharacter[]>();

  protected names(entries: { name: string }[]): string {
    return entries.map((e) => e.name).join(', ');
  }

  protected link(link: SynergyLink | undefined): string {
    return link ? linkText(link, (id) => this.roster.entry(id)?.name ?? id) : '';
  }
}
