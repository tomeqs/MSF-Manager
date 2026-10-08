import { Injectable, computed, inject } from '@angular/core';
import { KEY_CHARACTERS } from '../data/key-characters';
import { KNOWN_META } from '../data/known-meta';
import { Recommendation, advisorCandidates, bestByCharacter, recommend } from './advisor';
import { MAX_YELLOW_STARS } from './game-rules';
import { FarmingStore } from './farming.store';
import { PlayerStore } from './player.store';
import { PotentialStore } from './potential.store';
import { RosterStore } from './roster.store';

/** Roster-wide ranking of what pays off most to farm right now (see `advisor.ts`). */
@Injectable({ providedIn: 'root' })
export class AdvisorStore {
  private readonly roster = inject(RosterStore);
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);
  private readonly farming = inject(FarmingStore);

  readonly playerLevel = computed(() => this.player.card()?.level?.completedTier);

  /** Needs the inventory and upgrade data (shards), so it follows the farming store. */
  readonly status = this.farming.status;

  readonly recommendations = computed<Recommendation[]>(() =>
    this.farming.status() === 'loaded'
      ? recommend({
          roster: this.roster.entries(),
          known: KNOWN_META,
          keys: KEY_CHARACTERS,
          potentialOf: (e) => this.potentials.get(e, this.playerLevel()),
          potentialAtStarsOf: (e) => this.potentials.get(e, this.playerLevel(), true),
          upgrade: this.farming.upgrade(),
          inventory: this.farming.inventory(),
        })
      : [],
  );

  /** Best-ranked action per character id. */
  readonly byId = computed(() => bestByCharacter(this.recommendations()));

  load(): void {
    this.farming.load();
    this.player.load();
  }

  /**
   * Requests max powers of team members and key characters — at 7★ and, below 7★, at the
   * current stars to split upgrade and shard gains (call in an effect).
   */
  ensurePotentials(): void {
    const playerStatus = this.player.status();
    if (
      this.roster.status() !== 'loaded' ||
      playerStatus === 'idle' ||
      playerStatus === 'loading'
    ) {
      return;
    }
    const candidates = advisorCandidates(KNOWN_META, KEY_CHARACTERS, this.roster.entries());
    this.potentials.ensure(candidates, this.playerLevel());
    this.potentials.ensure(
      candidates.filter((e) => e.yellowStars < MAX_YELLOW_STARS),
      this.playerLevel(),
      true,
    );
  }
}
