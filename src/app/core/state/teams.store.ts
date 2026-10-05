import { Injectable, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, TeamTab } from '../models';
import { MetaTeam, mergeOrderings } from './teams-calc';

interface TabState {
  status: LoadStatus;
  teams: MetaTeam[];
}

const EMPTY: TabState = { status: 'idle', teams: [] };

/** Meta teams per game mode, loaded lazily per tab. */
@Injectable({ providedIn: 'root' })
export class TeamsStore {
  private readonly data = inject(MsfDataSource);
  private readonly _tabs = signal<Partial<Record<TeamTab, TabState>>>({});

  tab(tab: TeamTab): TabState {
    return this._tabs()[tab] ?? EMPTY;
  }

  load(tab: TeamTab, force = false): void {
    const status = this.tab(tab).status;
    if (!force && (status === 'loading' || status === 'loaded')) return;
    this.patch(tab, { status: 'loading' });
    this.data.getTeamOrder(tab).subscribe({
      next: (orders) => this.patch(tab, { status: 'loaded', teams: mergeOrderings(orders) }),
      error: () => this.patch(tab, { status: 'error' }),
    });
  }

  /** Reloads tabs that were loaded before. */
  refresh(): void {
    for (const [tab, state] of Object.entries(this._tabs())) {
      if (state.status !== 'idle') this.load(tab as TeamTab, true);
    }
  }

  private patch(tab: TeamTab, change: Partial<TabState>): void {
    this._tabs.update((tabs) => ({ ...tabs, [tab]: { ...(tabs[tab] ?? EMPTY), ...change } }));
  }
}
