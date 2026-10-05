import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, TeamTab } from '../models';
import { MetaTeam, mergeOrderings } from './teams-calc';

interface TabState {
  status: LoadStatus;
  teams: MetaTeam[];
  /** User-facing reason when `status` is `error`. */
  error?: string;
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
      error: (error: unknown) => this.patch(tab, { status: 'error', error: describe(error) }),
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

function describe(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const subcode = error.error?.error?.subcode;
    const detail = subcode ? `${error.status} ${subcode}` : `HTTP ${error.status}`;
    return error.status >= 500
      ? `Serwer MSF API zwraca błąd (${detail}) dla analizy drużyn. To problem po stronie API (beta) — spróbuj później.`
      : `Nie udało się pobrać analizy drużyn (${detail}).`;
  }
  return 'Nie udało się pobrać analizy drużyn.';
}
