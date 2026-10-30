import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamTab } from '../../core/models';
import { RosterStore } from '../../core/state/roster.store';
import { Alternative } from '../../core/state/squads';
import { SQUAD_TABS, SquadsStore } from '../../core/state/squads.store';
import { TeamsStore } from '../../core/state/teams.store';
import { LooseCharacters } from './loose-characters/loose-characters';
import { SavedSquads } from './saved-squads/saved-squads';
import { SquadCard } from './squad-card/squad-card';
import { squadTitle } from './squad-labels';

const TAB_KEY = 'msf.squads.tab';
const COUNT_KEY = 'msf.squads.count';
const TAB_LABELS: Record<string, string> = {
  arena: 'Arena',
  war: 'Wojna',
  raids: 'Raidy',
  blitz: 'Blitz',
  tower: 'Wieża',
  crucible: 'Crucible',
};
/** Arena needs one defence; elsewhere several squads are used at once. */
const DEFAULT_COUNT: Partial<Record<TeamTab, number>> = { arena: 1 };
const COUNTS = [1, 2, 3, 4, 5, 6];

/**
 * Squads per game mode: the best ones to field (no character twice), alternatives, the
 * player's saved squads with suggested swaps, and strong characters without a squad.
 */
@Component({
  selector: 'app-squads',
  imports: [RouterLink, SquadCard, SavedSquads, LooseCharacters],
  templateUrl: './squads.html',
  styleUrl: './squads.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Squads {
  protected readonly store = inject(SquadsStore);
  private readonly roster = inject(RosterStore);
  private readonly teams = inject(TeamsStore);

  protected readonly tabs = SQUAD_TABS.map((id) => ({ id, label: TAB_LABELS[id] }));
  protected readonly counts = COUNTS;
  protected readonly tab = signal<TeamTab>(read<TeamTab>(TAB_KEY, 'arena'));
  private readonly countByTab = signal<Partial<Record<TeamTab, number>>>(read(COUNT_KEY, {}));
  protected readonly count = computed(
    () => this.countByTab()[this.tab()] ?? DEFAULT_COUNT[this.tab()] ?? 3,
  );

  protected readonly status = this.roster.status;
  protected readonly plan = computed(() => this.store.plan(this.tab(), this.count()));
  protected readonly saved = computed(() => this.store.tab(this.tab()).saved);
  protected readonly communityDown = computed(() => this.teams.tab(this.tab()).source === 'known');
  protected readonly kitsMissing = computed(
    () => this.store.kitsStatus() === 'error' || !this.store.synergy().fromKits,
  );
  protected readonly title = squadTitle;

  constructor() {
    this.store.load();
  }

  protected select(tab: TeamTab): void {
    this.tab.set(tab);
    write(TAB_KEY, tab);
  }

  protected setCount(count: number): void {
    this.countByTab.update((c) => ({ ...c, [this.tab()]: count }));
    write(COUNT_KEY, this.countByTab());
  }

  /** "Koliduje z #1 (Riot, Toxin) · #3 (Thanos)" */
  protected conflicts(list: Alternative['conflicts']): string {
    const squads = this.plan().squads;
    const parts = list.map(
      (c) => `#${squads.indexOf(c.with) + 1} (${c.members.map((m) => m.name).join(', ')})`,
    );
    return `Koliduje z ${parts.join(' · ')}`;
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Remembering choices is optional.
  }
}
