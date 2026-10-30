import { Injectable, computed, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { KNOWN_META } from '../data/known-meta';
import { LoadStatus, SquadTabs, TeamTab } from '../models';
import { KitsStore } from './kits.store';
import { RosterStore } from './roster.store';
import {
  LooseCharacter,
  ModePlan,
  SavedReview,
  SquadOption,
  looseCharacters,
  modePlan,
  reviewSaved,
  squadOptions,
} from './squads';
import { SynergyIndex, buildSynergy } from './synergy';
import { resolveKnownTeams } from './teams-calc';
import { TeamsStore } from './teams.store';

export const SQUAD_TABS: TeamTab[] = ['arena', 'war', 'raids', 'blitz', 'tower', 'crucible'];

export interface TabSquads {
  options: SquadOption[];
  saved: SavedReview[];
}

/** The player's saved squads, kit synergies and squad plans per game mode. */
@Injectable({ providedIn: 'root' })
export class SquadsStore {
  private readonly data = inject(MsfDataSource);
  private readonly roster = inject(RosterStore);
  private readonly teams = inject(TeamsStore);
  private readonly kits = inject(KitsStore);

  private readonly _saved = signal<SquadTabs>({});
  private readonly _savedStatus = signal<LoadStatus>('idle');

  /** Saved squads load or fail independently; the rest works without them. */
  readonly savedStatus = this._savedStatus.asReadonly();
  readonly kitsStatus = this.kits.status;
  readonly hasSaved = computed(() =>
    SQUAD_TABS.some((tab) => (this._saved()[tab]?.length ?? 0) > 0),
  );

  readonly synergy = computed<SynergyIndex>(() =>
    buildSynergy(this.roster.entries(), this.kits.kits()),
  );

  /** Options and saved-squad reviews per mode. */
  private readonly byTab = computed(() => {
    const roster = this.roster.entries();
    const synergy = this.synergy();
    const result = new Map<TeamTab, TabSquads>();
    for (const tab of SQUAD_TABS) {
      const saved = this._saved()[tab] ?? [];
      const state = this.teams.tab(tab);
      const options = squadOptions({
        tab,
        roster,
        known: KNOWN_META,
        community: state.source === 'api' ? state.teams : [],
        saved,
        synergy,
      });
      result.set(tab, { options, saved: reviewSaved(saved, options, roster, synergy) });
    }
    return result;
  });

  tab(tab: TeamTab): TabSquads {
    return this.byTab().get(tab) ?? { options: [], saved: [] };
  }

  plan(tab: TeamTab, count: number): ModePlan {
    return modePlan(this.tab(tab).options, this.roster.entries(), this.synergy(), count);
  }

  /** Strong characters with no known team, popular squad or saved squad. */
  readonly loose = computed<LooseCharacter[]>(() => {
    const roster = this.roster.entries();
    const homes = new Set<string>();
    for (const { members } of resolveKnownTeams(KNOWN_META, roster)) {
      for (const m of members) homes.add(m.id);
    }
    for (const tab of SQUAD_TABS) {
      const state = this.teams.tab(tab);
      if (state.source === 'api')
        for (const t of state.teams) t.members.forEach((id) => homes.add(id));
      for (const squad of this._saved()[tab] ?? []) squad.forEach((id) => homes.add(id));
    }
    return looseCharacters(roster, homes, this.synergy());
  });

  load(): void {
    this.roster.load();
    for (const tab of SQUAD_TABS) this.teams.load(tab);
    if (this._savedStatus() === 'idle' || this._savedStatus() === 'error') {
      this._savedStatus.set('loading');
      this.data.getSquads().subscribe({
        next: (info) => {
          this._saved.set(info.tabs ?? {});
          this._savedStatus.set('loaded');
        },
        error: () => this._savedStatus.set('error'),
      });
    }
    this.kits.load();
  }

  /** Reloads saved squads (they change in game); kits follow the game data hash. */
  refresh(): void {
    if (this._savedStatus() === 'idle') return;
    this._savedStatus.set('idle');
    this.load();
  }
}
