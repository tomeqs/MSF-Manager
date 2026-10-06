import { Injectable, computed, inject } from '@angular/core';
import { KEY_CHARACTERS } from '../data/key-characters';
import { KNOWN_META } from '../data/known-meta';
import { keyCharacterRows } from './key-characters';
import { PlayerStore } from './player.store';
import { PotentialStore } from './potential.store';
import { RosterStore } from './roster.store';

/** Key characters resolved against the roster, with development status and priority. */
@Injectable({ providedIn: 'root' })
export class KeyCharactersStore {
  private readonly roster = inject(RosterStore);
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);

  readonly playerLevel = computed(() => this.player.card()?.level?.completedTier);

  readonly rows = computed(() =>
    keyCharacterRows(KEY_CHARACTERS, KNOWN_META, this.roster.entries(), (e) =>
      this.potentials.get(e, this.playerLevel()),
    ),
  );

  readonly status = computed(() => this.roster.status());

  load(): void {
    this.roster.load();
    this.player.load();
  }

  /** Requests max-power potentials once roster and player level are known (call in an effect). */
  ensurePotentials(): void {
    const playerStatus = this.player.status();
    if (
      this.roster.status() !== 'loaded' ||
      playerStatus === 'idle' ||
      playerStatus === 'loading'
    ) {
      return;
    }
    const entries = this.rows().flatMap((r) => (r.entry ? [r.entry] : []));
    this.potentials.ensure(entries, this.playerLevel());
  }
}
