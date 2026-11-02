import { Injectable, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { MsfDataSource } from '../data/msf-data-source';
import { KNOWN_META } from '../data/known-meta';
import { LoadStatus, Squad, SquadTabs, TeamTab } from '../models';
import { KitsStore } from './kits.store';
import { RosterStore } from './roster.store';
import { Proposal, assistantProposals } from './squad-assistant';
import {
  LooseCharacter,
  SavedReview,
  SquadOption,
  looseCharacters,
  reviewSaved,
  squadOptions,
  strongest,
} from './squads';
import { SynergyIndex, buildSynergy } from './synergy';
import { TeamsStore } from './teams.store';

export const SQUAD_TABS: TeamTab[] = ['arena', 'war', 'raids', 'blitz', 'tower', 'crucible'];

const ACCEPTED_KEY = 'msf.squads.accepted';
const EXCLUSIVE_KEY = 'msf.squads.exclusive';

/** Squads the player marked as saved here ("Zapisałem"), per mode, until the game shows them. */
type AcceptedSquads = Partial<Record<TeamTab, Squad[]>>;

export interface TabSquads {
  options: SquadOption[];
  /** The player's squads for the mode — from the game, plus ones marked saved here. */
  saved: SavedReview[];
  /** Characters in those squads (in every mode with `exclusive`): never proposed again. */
  taken: ReadonlySet<string>;
  /** The next squads to save, best first, only from free characters. */
  proposals: Proposal[];
  /** Strong free characters left out of the proposals, with their best free partners. */
  free: LooseCharacter[];
  /** How many of the strongest characters are still free in this mode. */
  freeCount: number;
}

const EMPTY_TAB: TabSquads = {
  options: [],
  saved: [],
  taken: new Set(),
  proposals: [],
  free: [],
  freeCount: 0,
};

const keyOf = (squad: Squad) => [...squad].sort().join('|');

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the choice lasts for this session only.
  }
}

/**
 * Squad assistant: the player's saved squads per mode, and the next squads to build from
 * characters that are still free — never proposing a character that is already in one.
 */
@Injectable({ providedIn: 'root' })
export class SquadsStore {
  private readonly data = inject(MsfDataSource);
  private readonly auth = inject(AuthService);
  private readonly roster = inject(RosterStore);
  private readonly teams = inject(TeamsStore);
  private readonly kits = inject(KitsStore);

  private readonly _saved = signal<SquadTabs>({});
  private readonly _savedStatus = signal<LoadStatus>('idle');
  private readonly acceptedKey = computed(() => `${ACCEPTED_KEY}.${this.auth.mode() ?? 'none'}`);
  private readonly _accepted = linkedSignal<AcceptedSquads>(() => readJson(this.acceptedKey(), {}));
  private readonly _skipped = signal<Partial<Record<TeamTab, string[]>>>({});
  private readonly _exclusive = signal<boolean>(readJson(EXCLUSIVE_KEY, false));

  /** Saved squads load or fail independently; the rest works without them. */
  readonly savedStatus = this._savedStatus.asReadonly();
  readonly kitsStatus = this.kits.status;
  /** One character in one squad across all modes (otherwise per mode). */
  readonly exclusive = this._exclusive.asReadonly();

  readonly synergy = computed<SynergyIndex>(() =>
    buildSynergy(this.roster.entries(), this.kits.kits()),
  );

  /** Per mode: squads saved in game, and ones marked saved here that the game does not show yet. */
  private readonly mine = computed(() => {
    const result = new Map<TeamTab, { game: Squad[]; local: Squad[] }>();
    for (const tab of SQUAD_TABS) {
      const game = (this._saved()[tab] ?? []).map((s) => s.filter((id) => !!id));
      const inGame = new Set(game.map(keyOf));
      const local = (this._accepted()[tab] ?? []).filter((s) => !inGame.has(keyOf(s)));
      result.set(tab, { game, local });
    }
    return result;
  });

  private readonly byTab = computed(() => {
    const roster = this.roster.entries();
    const synergy = this.synergy();
    const mine = this.mine();
    const everywhere = new Set(
      [...mine.values()].flatMap(({ game, local }) => [...game, ...local].flat()),
    );
    const result = new Map<TeamTab, TabSquads>();
    for (const tab of SQUAD_TABS) {
      const { game, local } = mine.get(tab)!;
      const saved = [...game, ...local];
      const taken = this._exclusive() ? everywhere : new Set(saved.flat());
      const state = this.teams.tab(tab);
      const options = squadOptions({
        tab,
        roster,
        known: KNOWN_META,
        community: state.source === 'api' ? state.teams : [],
        saved,
        synergy,
      });
      const localKeys = new Set(local.map(keyOf));
      const reviews = reviewSaved(saved, options, roster, synergy).map((r) => ({
        ...r,
        local: localKeys.has(r.option.key),
      }));
      const proposals = assistantProposals({
        options,
        roster,
        taken,
        skipped: new Set(this._skipped()[tab] ?? []),
        synergy,
      });
      const freeRoster = roster.filter((e) => !taken.has(e.id));
      const placed = new Set(proposals.flatMap((p) => p.option.members.map((m) => m.id)));
      result.set(tab, {
        options,
        saved: reviews,
        taken,
        proposals,
        free: looseCharacters(freeRoster, placed, synergy, 6),
        freeCount: strongest(freeRoster).length,
      });
    }
    return result;
  });

  constructor() {
    effect(() => writeJson(this.acceptedKey(), this._accepted()));
  }

  tab(tab: TeamTab): TabSquads {
    return this.byTab().get(tab) ?? EMPTY_TAB;
  }

  /** The player saved this squad in game: its characters stop being proposed. */
  accept(tab: TeamTab, members: string[]): void {
    this._accepted.update((all) => ({ ...all, [tab]: [...(all[tab] ?? []), members] }));
  }

  /** Forgets a squad marked saved here (the game's own squads change only in game). */
  removeLocal(tab: TeamTab, key: string): void {
    this._accepted.update((all) => ({
      ...all,
      [tab]: (all[tab] ?? []).filter((s) => keyOf(s) !== key),
    }));
  }

  /** Shows the next proposal instead of this one (until the page is reloaded). */
  skip(tab: TeamTab, key: string): void {
    this._skipped.update((all) => ({ ...all, [tab]: [...(all[tab] ?? []), key] }));
  }

  resetSkips(tab: TeamTab): void {
    this._skipped.update((all) => ({ ...all, [tab]: [] }));
  }

  hasSkips(tab: TeamTab): boolean {
    return (this._skipped()[tab]?.length ?? 0) > 0;
  }

  setExclusive(value: boolean): void {
    this._exclusive.set(value);
    writeJson(EXCLUSIVE_KEY, value);
  }

  load(): void {
    this.roster.load();
    for (const tab of SQUAD_TABS) this.teams.load(tab);
    if (this._savedStatus() === 'idle' || this._savedStatus() === 'error') {
      this._savedStatus.set('loading');
      this.data.getSquads().subscribe({
        next: (info) => {
          const tabs = info.tabs ?? {};
          this._saved.set(tabs);
          // Squads marked saved here that the game now shows are no longer needed.
          this._accepted.update((all) => {
            const pruned: AcceptedSquads = {};
            for (const tab of SQUAD_TABS) {
              const inGame = new Set((tabs[tab] ?? []).map(keyOf));
              const left = (all[tab] ?? []).filter((s) => !inGame.has(keyOf(s)));
              if (left.length) pruned[tab] = left;
            }
            return pruned;
          });
          this._savedStatus.set('loaded');
        },
        error: () => this._savedStatus.set('error'),
      });
    }
    this.kits.load();
  }

  /** Reloads the game's saved squads (after saving or deleting squads in game). */
  reloadFromGame(): void {
    if (this._savedStatus() === 'loading') return;
    this._savedStatus.set('idle');
    this.load();
  }

  /** "Odśwież": reloads only if the squads were loaded before. */
  refresh(): void {
    if (this._savedStatus() !== 'idle') this.reloadFromGame();
  }
}
