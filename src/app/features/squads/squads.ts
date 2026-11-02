import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamTab } from '../../core/models';
import { RosterStore } from '../../core/state/roster.store';
import { Proposal } from '../../core/state/squad-assistant';
import { SQUAD_TABS, SquadsStore } from '../../core/state/squads.store';
import { TeamsStore } from '../../core/state/teams.store';
import { LooseCharacters } from './loose-characters/loose-characters';
import { SavedSquads } from './saved-squads/saved-squads';
import { SquadCard } from './squad-card/squad-card';

const TAB_KEY = 'msf.squads.tab';
const TAB_LABELS: Record<string, string> = {
  arena: 'Arena',
  war: 'Wojna',
  raids: 'Raidy',
  blitz: 'Blitz',
  tower: 'Wieża',
  crucible: 'Crucible',
};

/**
 * Squad assistant per game mode: the next squad to save (with its line-up), the ones after
 * it, the player's squads, and strong characters still free. Characters in a saved squad are
 * never proposed again.
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
  protected readonly tab = signal<TeamTab>(readTab());
  protected readonly label = computed(() => TAB_LABELS[this.tab()]);

  protected readonly status = this.roster.status;
  protected readonly view = computed(() => this.store.tab(this.tab()));
  protected readonly next = computed(() => this.view().proposals[0]);
  protected readonly later = computed(() => this.view().proposals.slice(1));
  protected readonly hasSkips = computed(() => this.store.hasSkips(this.tab()));
  protected readonly communityDown = computed(() => this.teams.tab(this.tab()).source === 'known');
  protected readonly kitsMissing = computed(
    () => this.store.kitsStatus() === 'error' || !this.store.synergy().fromKits,
  );

  constructor() {
    this.store.load();
  }

  protected select(tab: TeamTab): void {
    this.tab.set(tab);
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // Remembering the tab is optional.
    }
  }

  /** The player saved it in game: its characters leave the proposals. */
  protected accept(proposal: Proposal): void {
    this.store.accept(
      this.tab(),
      proposal.arrangement.members.map((m) => m.id),
    );
  }

  protected skip(proposal: Proposal): void {
    this.store.skip(this.tab(), proposal.option.key);
  }

  protected resetSkips(): void {
    this.store.resetSkips(this.tab());
  }

  protected removeLocal(key: string): void {
    this.store.removeLocal(this.tab(), key);
  }

  protected setExclusive(event: Event): void {
    this.store.setExclusive((event.target as HTMLInputElement).checked);
  }

  /** "1. Riot · 2. Toxin · …" — the order to set in game. */
  protected order(proposal: Proposal): string {
    return proposal.arrangement.members.map((m, i) => `${i + 1}. ${m.name}`).join(' · ');
  }
}

function readTab(): TeamTab {
  try {
    const tab = localStorage.getItem(TAB_KEY) as TeamTab | null;
    return tab && SQUAD_TABS.includes(tab) ? tab : 'arena';
  } catch {
    return 'arena';
  }
}
