import { Injectable, computed, inject } from '@angular/core';
import { KEY_CHARACTERS } from '../data/key-characters';
import { KNOWN_META } from '../data/known-meta';
import {
  Advice,
  Recommendation,
  TeamCompletion,
  advise,
  advisorCandidates,
  bestByCharacter,
  completableTeams,
} from './advisor';
import { progression } from './progression';
import { MAX_YELLOW_STARS } from './game-rules';
import { memberPower } from './potential-calc';
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

  private readonly advice = computed<Advice | undefined>(() =>
    this.farming.status() === 'loaded'
      ? advise({
          roster: this.roster.entries(),
          known: KNOWN_META,
          keys: KEY_CHARACTERS,
          potentialOf: (e) => this.potentials.get(e, this.playerLevel()),
          potentialAtStarsOf: (e) => this.potentials.get(e, this.playerLevel(), true),
          upgrade: this.farming.upgrade(),
          inventory: this.farming.inventory(),
        })
      : undefined,
  );

  readonly recommendations = computed<Recommendation[]>(() => this.advice()?.ranking ?? []);

  /** Known teams with progress; the `focus` ones are where scarce resources should go. */
  readonly plans = computed(() => this.advice()?.plans ?? []);
  readonly focusPlans = computed(() => this.plans().filter((p) => p.focus));

  /** The player's gear frontier, read from their strongest characters. */
  readonly progression = computed(
    () => this.advice()?.progression ?? progression(this.roster.entries()),
  );

  /** Known teams one or two unlocks away from complete, cheapest first. */
  readonly completions = computed<TeamCompletion[]>(() =>
    this.farming.status() === 'loaded'
      ? completableTeams(
          KNOWN_META,
          this.roster.entries(),
          this.farming.upgrade(),
          this.farming.inventory(),
          (e) => memberPower(e, this.potentials.get(e, this.playerLevel())),
        )
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
