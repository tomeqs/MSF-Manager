import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamTab } from '../../core/models';
import { goalFor } from '../../core/state/farming-calc';
import { FarmingStore } from '../../core/state/farming.store';
import { KeyCharacterRow } from '../../core/state/key-characters';
import { KeyCharactersStore } from '../../core/state/key-characters.store';
import { PotentialStore } from '../../core/state/potential.store';
import { DEV_STATUS_LABELS } from '../../core/state/potential-calc';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { StarRating } from '../../shared/ui/star-rating';

const MODE_LABELS: Record<TeamTab, string> = {
  arena: 'Arena',
  war: 'Wojna',
  raids: 'Raidy',
  blitz: 'Blitz',
  tower: 'Wieża',
  crucible: 'Crucible',
  roster: 'Roster',
};

@Component({
  selector: 'app-key-characters',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    CompactNumberPipe,
    CharacterAvatar,
    ProgressBar,
    StarRating,
  ],
  templateUrl: './key-characters.html',
  styleUrl: './key-characters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyCharacters {
  protected readonly store = inject(KeyCharactersStore);
  private readonly farming = inject(FarmingStore);
  private readonly potentials = inject(PotentialStore);

  private readonly statusLabels: Record<KeyCharacterRow['status'], string> = {
    ...DEV_STATUS_LABELS,
    unknown: 'Brak w danych gry',
  };

  protected readonly todo = computed(() => this.store.rows().filter((r) => r.priority > 0));
  protected readonly done = computed(() =>
    this.store.rows().filter((r) => r.status === 'maxed' || r.status === 'optimal'),
  );
  protected readonly unknown = computed(() =>
    this.store.rows().filter((r) => r.status === 'unknown'),
  );

  private readonly goalIds = computed(
    () => new Set(this.farming.goals().map((g) => g.characterId)),
  );

  constructor() {
    this.store.load();
    effect(() => this.store.ensurePotentials());
  }

  /** Resolved in-game name, or the first listed spelling. */
  protected displayName(row: KeyCharacterRow): string {
    return row.entry?.name ?? row.key.name.split('|')[0];
  }

  protected statusLabel(row: KeyCharacterRow): string {
    return this.statusLabels[row.status];
  }

  protected modes(row: KeyCharacterRow): string {
    return row.modes.map((m) => MODE_LABELS[m]).join(' · ');
  }

  protected inFarming(row: KeyCharacterRow): boolean {
    return !!row.entry && this.goalIds().has(row.entry.id);
  }

  protected farm(row: KeyCharacterRow): void {
    if (!row.entry) return;
    const potential = this.potentials.get(row.entry, this.store.playerLevel());
    this.farming.saveGoal(goalFor(row.entry, potential?.abilities));
  }
}
