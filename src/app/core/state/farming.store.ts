import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, UpgradeData } from '../models';
import {
  FarmingGoal,
  GoalPlan,
  Promotion,
  aggregateMaterials,
  planGoal,
  promotions,
  toInventory,
} from './farming-calc';
import { RosterStore } from './roster.store';

const GOALS_KEY = 'msf.farming.goals';

function readGoals(key: string): FarmingGoal[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FarmingGoal[]) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class FarmingStore {
  private readonly data = inject(MsfDataSource);
  private readonly roster = inject(RosterStore);
  /** Demo and real-account goals are kept apart. */
  private readonly storageKey = `${GOALS_KEY}.${inject(AuthService).mode() ?? 'none'}`;

  private readonly _goals = signal<FarmingGoal[]>(readGoals(this.storageKey));
  private readonly _inventory = signal<Map<string, number>>(new Map());
  private readonly _upgrade = signal<UpgradeData>({});
  private readonly _status = signal<LoadStatus>('idle');

  readonly goals = this._goals.asReadonly();
  readonly inventory = this._inventory.asReadonly();
  readonly status = computed<LoadStatus>(() => {
    const own = this._status();
    const roster = this.roster.status();
    if (own === 'error' || roster === 'error') return 'error';
    return own === 'loaded' && roster === 'loaded' ? 'loaded' : 'loading';
  });

  readonly plans = computed<GoalPlan[]>(() => {
    const byId = new Map(this.roster.entries().map((e) => [e.id, e]));
    return this._goals().flatMap((goal) => {
      const entry = byId.get(goal.characterId);
      return entry ? [planGoal(goal, entry, this._upgrade(), this._inventory())] : [];
    });
  });

  /** Any roster character (goal or not) whose next star / unlock is covered by owned shards. */
  readonly promotions = computed<Promotion[]>(() =>
    promotions(this.roster.entries(), this._upgrade(), this._inventory()),
  );

  readonly totals = computed(() =>
    aggregateMaterials(this.plans(), this._inventory(), this._upgrade()),
  );

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this._goals()));
      } catch {
        // Storage unavailable — goals live for this session only.
      }
    });
  }

  /** Reloads only if something was loaded before. Roster is refreshed by its own store. */
  refresh(): void {
    if (this._status() !== 'idle') this.load(true);
  }

  load(force = false): void {
    this.roster.load();
    const status = this._status();
    if (!force && (status === 'loading' || status === 'loaded')) return;
    this._status.set('loading');
    forkJoin({
      inventory: this.data.getInventory(),
      upgrade: this.data.getUpgradeData(),
    }).subscribe({
      next: ({ inventory, upgrade }) => {
        this._inventory.set(toInventory(inventory));
        this._upgrade.set(upgrade);
        this._status.set('loaded');
      },
      error: () => this._status.set('error'),
    });
  }

  /** Adds a goal or replaces the existing one for the same character. */
  saveGoal(goal: FarmingGoal): void {
    this._goals.update((goals) => [
      goal,
      ...goals.filter((g) => g.characterId !== goal.characterId),
    ]);
  }

  removeGoal(characterId: string): void {
    this._goals.update((goals) => goals.filter((g) => g.characterId !== characterId));
  }
}
