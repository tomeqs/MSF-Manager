import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, TeamTab } from '../models';
import { MetaTeam, mergeOrderings } from './teams-calc';

/** `api` = player-data analysis from MSF API; `known` = hand-maintained fallback list. */
export type TeamSource = 'api' | 'known';

interface TabState {
  status: LoadStatus;
  source: TeamSource;
  teams: MetaTeam[];
  /** Why the API analysis is unavailable when `source` is `known`. */
  apiError?: string;
}

const EMPTY: TabState = { status: 'idle', source: 'api', teams: [] };

/** Meta teams per game mode, loaded lazily per tab. */
@Injectable({ providedIn: 'root' })
export class TeamsStore {
  private readonly data = inject(MsfDataSource);
  private readonly _tabs = signal<Partial<Record<TeamTab, TabState>>>({});
  /** Set after a server error so other tabs skip straight to the fallback this session. */
  private apiDown: string | null = null;

  tab(tab: TeamTab): TabState {
    return this._tabs()[tab] ?? EMPTY;
  }

  load(tab: TeamTab, force = false): void {
    const status = this.tab(tab).status;
    if (!force && (status === 'loading' || status === 'loaded')) return;
    if (force) this.apiDown = null;
    if (this.apiDown) {
      this.useFallback(tab, this.apiDown);
      return;
    }
    this.patch(tab, { status: 'loading' });
    this.data.getTeamOrder(tab).subscribe({
      next: (orders) =>
        this.patch(tab, { status: 'loaded', source: 'api', teams: mergeOrderings(orders) }),
      error: (error: unknown) => {
        const reason = describe(error);
        if (error instanceof HttpErrorResponse && error.status >= 500) this.apiDown = reason;
        this.useFallback(tab, reason);
      },
    });
  }

  private useFallback(tab: TeamTab, reason: string): void {
    this.patch(tab, { status: 'loaded', source: 'known', teams: [], apiError: reason });
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
      ? `serwer MSF API zwraca błąd ${detail} — problem po stronie API w wersji beta`
      : `błąd ${detail}`;
  }
  return 'nieznany błąd';
}
