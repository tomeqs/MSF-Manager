import { Injectable, computed, inject } from '@angular/core';
import { KEY_CHARACTERS } from '../data/key-characters';
import { KNOWN_META } from '../data/known-meta';
import { AdvisorStore } from './advisor.store';
import { keyCharacterRows } from './key-characters';
import { PotentialStore } from './potential.store';
import { RosterStore } from './roster.store';

/** Key characters resolved against the roster, with development status and ranking. */
@Injectable({ providedIn: 'root' })
export class KeyCharactersStore {
  private readonly roster = inject(RosterStore);
  private readonly potentials = inject(PotentialStore);
  private readonly advisor = inject(AdvisorStore);

  readonly playerLevel = this.advisor.playerLevel;

  readonly rows = computed(() =>
    keyCharacterRows(
      KEY_CHARACTERS,
      KNOWN_META,
      this.roster.entries(),
      (e) => this.potentials.get(e, this.playerLevel()),
      this.advisor.byId(),
    ),
  );

  readonly status = computed(() => this.roster.status());

  load(): void {
    this.advisor.load();
  }

  /** Requests max-power potentials (call in an effect). */
  ensurePotentials(): void {
    this.advisor.ensurePotentials();
  }
}
