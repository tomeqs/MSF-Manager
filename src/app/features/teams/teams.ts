import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamTab } from '../../core/models';
import { FarmingStore } from '../../core/state/farming.store';
import { MAX_YELLOW_STARS } from '../../core/state/game-rules';
import { RosterStore } from '../../core/state/roster.store';
import { MAX_MISSING, TeamMember, fitTeams } from '../../core/state/teams-calc';
import { TeamsStore } from '../../core/state/teams.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { ProgressBar } from '../../shared/ui/progress-bar';

const TAB_KEY = 'msf.teams.tab';

@Component({
  selector: 'app-teams',
  imports: [NgTemplateOutlet, RouterLink, CompactNumberPipe, CharacterAvatar, ProgressBar],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams {
  private readonly teams = inject(TeamsStore);
  private readonly roster = inject(RosterStore);
  private readonly farming = inject(FarmingStore);

  protected readonly maxMissing = MAX_MISSING;
  protected readonly tabs: { id: TeamTab; label: string }[] = [
    { id: 'arena', label: 'Arena' },
    { id: 'war', label: 'Wojna' },
    { id: 'raids', label: 'Raidy' },
    { id: 'blitz', label: 'Blitz' },
    { id: 'tower', label: 'Wieża' },
    { id: 'crucible', label: 'Crucible' },
  ];

  protected readonly tab = signal<TeamTab>(readTab() ?? 'arena');
  protected readonly state = computed(() => this.teams.tab(this.tab()));
  protected readonly status = computed(() => {
    const roster = this.roster.status();
    const own = this.state().status;
    if (roster === 'error' || own === 'error') return 'error';
    return roster === 'loaded' && own === 'loaded' ? 'loaded' : 'loading';
  });
  protected readonly fits = computed(() => fitTeams(this.state().teams, this.roster.entries()));

  private readonly goalIds = computed(
    () => new Set(this.farming.goals().map((g) => g.characterId)),
  );

  constructor() {
    this.roster.load();
    this.teams.load(this.tab());
  }

  protected select(tab: TeamTab): void {
    this.tab.set(tab);
    this.teams.load(tab);
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // Remembering the tab is optional.
    }
  }

  protected retry(): void {
    this.roster.load();
    this.teams.load(this.tab(), true);
  }

  protected isFarmed(member: TeamMember): boolean {
    return this.goalIds().has(member.id);
  }

  /** Adds a farming goal: unlock a locked character, otherwise aim for max yellow stars. */
  protected farm(member: TeamMember): void {
    const entry = member.entry;
    if (!entry) return;
    this.farming.saveGoal({
      characterId: entry.id,
      targetYellow: entry.unlocked ? MAX_YELLOW_STARS : (entry.unlockStars ?? MAX_YELLOW_STARS),
      targetAbilities: { ...entry.abilities },
    });
  }
}

const TAB_IDS: TeamTab[] = ['arena', 'war', 'raids', 'blitz', 'tower', 'crucible'];

function readTab(): TeamTab | null {
  try {
    const saved = localStorage.getItem(TAB_KEY) as TeamTab | null;
    return saved && TAB_IDS.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}
