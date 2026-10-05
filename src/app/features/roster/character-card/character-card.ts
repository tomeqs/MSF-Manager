import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RosterEntry } from '../../../core/models';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../../shared/ui/character-avatar';
import { GearBadge } from '../../../shared/ui/gear-badge';
import { StarRating } from '../../../shared/ui/star-rating';

@Component({
  selector: 'app-character-card',
  imports: [RouterLink, CompactNumberPipe, CharacterAvatar, GearBadge, StarRating],
  templateUrl: './character-card.html',
  styleUrl: './character-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterCard {
  readonly entry = input.required<RosterEntry>();
}
