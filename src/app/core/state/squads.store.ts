import { Injectable, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { MsfDataSource } from '../data/msf-data-source';
import { KNOWN_META } from '../data/known-meta';
import { LoadStatus, RosterEntry, Squad, SquadTabs, TeamTab } from '../models';
import { KitsStore } from './kits.store';
import { RosterStore } from './roster.store';
import { AdvisorStore } from './advisor.store';
import { FarmingStore } from './farming.store';
import { AssistantPlan, MemberNeed, memberNeeds, planSquads } from './squad-assistant';
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
const DEFENSE_KEY = 'msf.squads.warDefense';
const DEFAULT_DEFENSE = 3;

/**
 * Squads the player marked as saved here ("Zapisałem"), per plan ("arena", "war:defense",
 * "war:offense"…), until the game shows them.
 */
type AcceptedSquads = Record<string, Squad[]>;

/** One plan of a mode: the whole mode, or War defense / offense. */
export interface PlanView {
  /** Plan id: the mode, or "war:defense" / "war:offense". */
  id: string;
  label?: string;
  plan: AssistantPlan;
}

export interface TabSquads {
  options: SquadOption[];
  /** The player's squads for the mode — from the game, plus ones marked saved here. */
  saved: SavedReview[];
  /** Characters in those squads (in every mode with `exclusive`): never proposed again. */
  taken: ReadonlySet<string>;
  /** What to save next (ready) and what to farm towards — one plan, or War defense + offense. */
  plans: PlanView[];
  /** Strong free characters left out of the proposals, with their best free partners. */
  free: LooseCharacter[];
  /** How many of the strongest characters are still free in this mode. */
  freeCount: number;
}

const EMPTY_TAB: TabSquads = {
  options: [],
  saved: [],
  taken: new Set(),
  plans: [],
  free: [],
  freeCount: 0,
};

const keyOf = (squad: Squad) => [...squad].sort().join('|');

const ROLE_LABELS: Record<string, string | undefined> = {
  'war:defense': 'obrona',
  'war:offense': 'atak',
};

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
  private readonly advisor = inject(AdvisorStore);
  private readonly farming = inject(FarmingStore);

  private readonly _saved = signal<SquadTabs>({});
  private readonly _savedStatus = signal<LoadStatus>('idle');
  private readonly acceptedKey = computed(() => `${ACCEPTED_KEY}.${this.auth.mode() ?? 'none'}`);
  private readonly _accepted = linkedSignal<AcceptedSquads>(() => readJson(this.acceptedKey(), {}));
  private readonly _skipped = signal<Record<string, string[]>>({});
  private readonly _exclusive = signal<boolean>(readJson(EXCLUSIVE_KEY, false));
  private readonly _defenseCount = signal<number>(readJson(DEFENSE_KEY, DEFAULT_DEFENSE));

  /** Saved squads load or fail independently; the rest works without them. */
  readonly savedStatus = this._savedStatus.asReadonly();
  readonly kitsStatus = this.kits.status;
  /** One character in one squad across all modes (otherwise per mode). */
  readonly exclusive = this._exclusive.asReadonly();
  /** How many War defense squads to plan before offense. */
  readonly defenseCount = this._defenseCount.asReadonly();

  /** Lowest gear tier a member may have and count as ready (the player's stage minus one). */
  readonly readyGear = computed(() => Math.max(0, this.advisor.progression().frontier - 1));

  /** What a character still needs to be squad-ready (unlock, 7★, gear vs the player's stage). */
  readonly needsOf = computed(() => {
    const ctx = {
      frontier: this.advisor.progression().frontier,
      upgrade: this.farming.upgrade(),
      inventory: this.farming.inventory(),
    };
    const memo = new Map<string, MemberNeed[]>();
    return (entry: RosterEntry) => {
      let needs = memo.get(entry.id);
      if (!needs) {
        needs = memberNeeds(entry, ctx);
        memo.set(entry.id, needs);
      }
      return needs;
    };
  });

  readonly synergy = computed<SynergyIndex>(() =>
    buildSynergy(this.roster.entries(), this.kits.kits()),
  );

  /** Per mode: squads saved in game, and ones marked saved here that the game does not show yet. */
  private readonly mine = computed(() => {
    const result = new Map<TeamTab, { game: Squad[]; local: { id: string; squad: Squad }[] }>();
    for (const tab of SQUAD_TABS) {
      const game = (this._saved()[tab] ?? []).map((s) => s.filter((id) => !!id));
      const inGame = new Set(game.map(keyOf));
      const local = Object.entries(this._accepted())
        .filter(([id]) => id === tab || id.startsWith(`${tab}:`))
        .flatMap(([id, squads]) => squads.map((squad) => ({ id, squad })))
        .filter(({ squad }) => !inGame.has(keyOf(squad)));
      result.set(tab, { game, local });
    }
    return result;
  });

  private readonly byTab = computed(() => {
    const roster = this.roster.entries();
    const synergy = this.synergy();
    const mine = this.mine();
    const everywhere = new Set(
      [...mine.values()].flatMap(({ game, local }) => [
        ...game.flat(),
        ...local.flatMap((l) => l.squad),
      ]),
    );
    const needsOf = this.needsOf();
    const result = new Map<TeamTab, TabSquads>();
    for (const tab of SQUAD_TABS) {
      const { game, local } = mine.get(tab)!;
      const saved = [...game, ...local.map((l) => l.squad)];
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
      const localRole = new Map(local.map((l) => [keyOf(l.squad), l.id]));
      const reviews = reviewSaved(saved, options, roster, synergy).map((r) => ({
        ...r,
        local: localRole.has(r.option.key),
        role: ROLE_LABELS[localRole.get(r.option.key) ?? ''],
      }));
      const plan = (id: string, extra: Partial<Parameters<typeof planSquads>[0]> = {}) =>
        planSquads({
          options,
          roster,
          taken,
          skipped: new Set(this._skipped()[id] ?? []),
          synergy,
          needsOf,
          ...extra,
        });
      let plans: PlanView[];
      if (tab === 'war') {
        // Defense first, then offense from what defense left: no character in both.
        const defense = plan('war:defense', {
          allows: (o) => o.warRole !== 'offense',
          readyLimit: this._defenseCount(),
        });
        const onDefense = defense.ready.flatMap((p) => p.option.members.map((m) => m.id));
        const offense = plan('war:offense', {
          allows: (o) => o.warRole !== 'defense',
          taken: new Set([...taken, ...onDefense]),
        });
        plans = [
          { id: 'war:defense', label: 'Obrona', plan: defense },
          { id: 'war:offense', label: 'Atak', plan: offense },
        ];
      } else {
        plans = [{ id: tab, plan: plan(tab) }];
      }
      const freeRoster = roster.filter((e) => !taken.has(e.id));
      const placed = new Set(
        plans.flatMap((p) => p.plan.ready.flatMap((r) => r.option.members.map((m) => m.id))),
      );
      result.set(tab, {
        options,
        saved: reviews,
        taken,
        plans,
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

  /** The player saved this squad in game (for a plan): its characters stop being proposed. */
  accept(planId: string, members: string[]): void {
    this._accepted.update((all) => ({ ...all, [planId]: [...(all[planId] ?? []), members] }));
  }

  /** Forgets a squad marked saved here (the game's own squads change only in game). */
  removeLocal(tab: TeamTab, key: string): void {
    this._accepted.update((all) =>
      Object.fromEntries(
        Object.entries(all).map(([id, squads]) => [
          id,
          id === tab || id.startsWith(`${tab}:`) ? squads.filter((s) => keyOf(s) !== key) : squads,
        ]),
      ),
    );
  }

  /** Shows the next proposal instead of this one (until the page is reloaded). */
  skip(planId: string, key: string): void {
    this._skipped.update((all) => ({ ...all, [planId]: [...(all[planId] ?? []), key] }));
  }

  resetSkips(planId: string): void {
    this._skipped.update((all) => ({ ...all, [planId]: [] }));
  }

  hasSkips(planId: string): boolean {
    return (this._skipped()[planId]?.length ?? 0) > 0;
  }

  setDefenseCount(count: number): void {
    this._defenseCount.set(count);
    writeJson(DEFENSE_KEY, count);
  }

  setExclusive(value: boolean): void {
    this._exclusive.set(value);
    writeJson(EXCLUSIVE_KEY, value);
  }

  load(): void {
    this.roster.load();
    // Shards, inventory and the gear stage behind "ready" and "to farm".
    this.advisor.load();
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
            for (const [id, squads] of Object.entries(all)) {
              const tab = id.split(':')[0] as TeamTab;
              const inGame = new Set((tabs[tab] ?? []).map(keyOf));
              const left = squads.filter((s) => !inGame.has(keyOf(s)));
              if (left.length) pruned[id] = left;
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
