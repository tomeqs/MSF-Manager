import { Injectable, computed, inject, signal } from '@angular/core';
import { CHARACTER_SOURCES } from '../data/character-sources';
import { KEY_CHARACTERS } from '../data/key-characters';
import { KNOWN_META } from '../data/known-meta';
import { RosterEntry } from '../models';
import {
  Advice,
  Recommendation,
  TeamCompletion,
  advise,
  advisorCandidates,
  bestByCharacter,
  completableTeams,
} from './advisor';
import { AutoSource, autoSourceIndex, withAutoSources } from './auto-sources';
import { capAt } from './level-caps';
import { FarmingGoal } from './farming-calc';
import { maxBuildGoal, mergeGoals, recommendedGoal } from './goals';
import { progression } from './progression';
import { localDate, sourceLookup } from './sources';
import { shardOffers } from './event-rewards';
import { MAX_YELLOW_STARS } from './game-rules';
import { memberPower } from './potential-calc';
import { FarmingStore } from './farming.store';
import { ShardDropsStore } from './shard-drops.store';
import { PlayerStore } from './player.store';
import { PotentialStore } from './potential.store';
import { RosterStore } from './roster.store';

const HOUR_MS = 60 * 60 * 1000;

/** Roster-wide ranking of what pays off most to farm right now (see `advisor.ts`). */
@Injectable({ providedIn: 'root' })
export class AdvisorStore {
  private readonly roster = inject(RosterStore);
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);
  private readonly farming = inject(FarmingStore);
  private readonly drops = inject(ShardDropsStore);

  readonly playerLevel = this.player.level;
  /** Max gear tier and ability levels at the player's level (undefined if not loaded). */
  readonly levelCap = computed(() => capAt(this.farming.levelCaps(), this.playerLevel()));

  /** Needs the inventory and upgrade data (shards), so it follows the farming store. */
  readonly status = this.farming.status;

  /**
   * The time, ticking hourly, so time-limited sources expire and events start or end while
   * the app stays open.
   */
  private readonly clock = signal(Date.now());
  private readonly today = computed(() => localDate(new Date(this.clock())));
  private readonly sources = computed(() =>
    sourceLookup(CHARACTER_SOURCES, new Date(`${this.today()}T12:00:00`)),
  );

  /** Shard sources read from game data (event rewards, campaign/event nodes, orbs). */
  private readonly autoIndex = computed(() =>
    autoSourceIndex(
      this.roster.entries(),
      this.drops.drops(),
      this.offers(),
      this.player.allEvents(),
      this.clock() / 1000,
    ),
  );

  /** What game data says about where a character's shards come from. */
  readonly autoSourcesOf = (entry: RosterEntry): AutoSource[] =>
    this.autoIndex().get(entry.id) ?? [];

  /** Shard source per character as of today: research corrected by game data. */
  readonly sourceOf = (entry: RosterEntry) =>
    withAutoSources(this.sources()(entry), this.autoSourcesOf(entry), entry);

  /** Running and upcoming events that award shards of roster characters, by shard item id. */
  readonly offers = computed(() =>
    shardOffers(
      this.player.allEvents(),
      new Set(this.roster.entries().flatMap((e) => (e.shardItemId ? [e.shardItemId] : []))),
      this.clock() / 1000,
    ),
  );

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
          offers: this.offers(),
          sourceOf: this.sourceOf,
          playerLevel: this.playerLevel(),
          levelCap: this.levelCap(),
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

  /**
   * What "Farmuj" on a character saves: every action recommended for it (upgrade and/or
   * stars, or unlock), else its max build once the potential is known; undefined until then.
   */
  farmGoal(entry: RosterEntry): FarmingGoal | undefined {
    const recs = this.recommendations().filter((r) => r.entry.id === entry.id);
    if (recs.length) {
      return recs.map(recommendedGoal).reduce<FarmingGoal | undefined>(mergeGoals, undefined);
    }
    return maxBuildGoal(entry, this.potentials.get(entry, this.playerLevel()));
  }

  constructor() {
    setInterval(() => this.clock.set(Date.now()), HOUR_MS);
  }

  load(): void {
    this.drops.load();
    this.farming.load();
    this.player.load();
  }

  /**
   * Requests max powers of team members and key characters — at 7★ and, below 7★, at the
   * current stars to split upgrade and shard gains (call in an effect).
   */
  ensurePotentials(): void {
    // The level is known once the player card loaded (or failed and the roster stands in).
    if (this.roster.status() !== 'loaded' || this.playerLevel() === undefined) return;
    const candidates = advisorCandidates(KNOWN_META, KEY_CHARACTERS, this.roster.entries());
    this.potentials.ensure(candidates, this.playerLevel());
    this.potentials.ensure(
      candidates.filter((e) => e.yellowStars < MAX_YELLOW_STARS),
      this.playerLevel(),
      true,
    );
  }
}
