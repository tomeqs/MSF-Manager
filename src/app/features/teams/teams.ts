import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventInfo, Requirements, RosterEntry, TeamTab } from '../../core/models';
import { goalFor } from '../../core/state/farming-calc';
import { FarmingStore } from '../../core/state/farming.store';
import { PlayerStore } from '../../core/state/player.store';
import { MemberPower, TeamPower, teamPower } from '../../core/state/potential-calc';
import { PotentialStore } from '../../core/state/potential.store';
import { formatTimeLeft } from '../../core/state/event.utils';
import { EventSquads, describeRequirements, eventSquads } from '../../core/state/requirements';
import { RosterStore } from '../../core/state/roster.store';
import { KNOWN_META, KNOWN_META_AS_OF } from '../../core/data/known-meta';
import {
  KnownTeamFits,
  MAX_MISSING,
  TeamFit,
  TeamMember,
  fitTeams,
  knownTeamFits,
} from '../../core/state/teams-calc';
import { TeamsStore } from '../../core/state/teams.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterAvatar } from '../../shared/ui/character-avatar';
import { ProgressBar } from '../../shared/ui/progress-bar';

const TAB_KEY = 'msf.teams.tab';
const COMPACT = new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 2 });

type TodoKind = 'unlock' | 'upgrade' | 'unknown';

interface EventPlan {
  event: EventInfo;
  active: boolean;
  requirements: string;
  plan: EventSquads;
}

/** Tabs whose content depends on the requirements of running events. */
const EVENT_TABS: Partial<Record<TeamTab, 'blitz' | 'tower'>> = { blitz: 'blitz', tower: 'tower' };

interface TodoRow {
  member: TeamMember;
  kind: TodoKind;
  power?: MemberPower;
}

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
  private readonly player = inject(PlayerStore);
  private readonly potentials = inject(PotentialStore);

  protected readonly maxMissing = MAX_MISSING;
  protected readonly knownAsOf = KNOWN_META_AS_OF;
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
  protected readonly source = computed(() => this.state().source);
  protected readonly status = computed(() => {
    const roster = this.roster.status();
    if (roster === 'error') return 'error';
    return roster === 'loaded' && this.state().status === 'loaded' ? 'loaded' : 'loading';
  });
  protected readonly fits = computed<KnownTeamFits>(() => {
    const roster = this.roster.entries();
    return this.source() === 'known'
      ? knownTeamFits(KNOWN_META, this.tab(), roster)
      : { ...fitTeams(this.state().teams, roster), unmatched: [], unrecognized: [] };
  });

  protected readonly kindLabels: Record<TodoKind, string> = {
    unlock: 'Odblokuj',
    upgrade: 'Ulepsz',
    unknown: 'Nieznana',
  };

  /** Characters cannot exceed the player's level, so potentials are computed for it. */
  private readonly playerLevel = computed(() => this.player.card()?.level?.completedTier);
  private readonly playerReady = computed(() => {
    const status = this.player.status();
    return status === 'loaded' || status === 'error';
  });

  protected readonly eventTab = computed(() => EVENT_TABS[this.tab()]);

  /** Running and announced blitz/tower events with the player's best squads for them. */
  protected readonly eventPlans = computed<EventPlan[]>(() => {
    const type = this.eventTab();
    if (!type) return [];
    const roster = this.roster.entries();
    const toPlan = (event: EventInfo, active: boolean): EventPlan => {
      const req: Requirements | undefined = event[type]?.requirements;
      return {
        event,
        active,
        requirements: describeRequirements(req),
        plan: eventSquads(roster, req, type === 'blitz' ? 3 : 1),
      };
    };
    return [
      ...this.player
        .activeEvents()
        .filter((e) => e.type === type)
        .map((e) => toPlan(e, true)),
      ...this.player
        .upcomingEvents()
        .filter((e) => e.type === type)
        .map((e) => toPlan(e, false)),
    ];
  });

  /** The tower tab has no team list of its own when only the known-meta fallback exists. */
  protected readonly showTeamLists = computed(
    () => !(this.tab() === 'tower' && this.source() === 'known'),
  );

  protected readonly timeLeft = formatTimeLeft;

  private readonly shownFits = computed(() => [...this.fits().ready, ...this.fits().almost]);

  private readonly powers = computed(() => {
    const level = this.playerLevel();
    const map = new Map<string, TeamPower>();
    for (const fit of this.shownFits()) {
      const entries = fit.members.flatMap((m) => (m.entry ? [m.entry] : []));
      map.set(
        fit.team.key,
        teamPower(entries, (e) => this.potentials.get(e, level)),
      );
    }
    return map;
  });

  private readonly goalIds = computed(
    () => new Set(this.farming.goals().map((g) => g.characterId)),
  );

  constructor() {
    this.roster.load();
    this.player.load();
    this.teams.load(this.tab());
    effect(() => {
      if (this.status() !== 'loaded' || !this.playerReady()) return;
      const entries = this.shownFits().flatMap((f) =>
        f.members.flatMap((m) => (m.entry ? [m.entry] : [])),
      );
      this.potentials.ensure(entries, this.playerLevel());
    });
  }

  /** "G17→G20 · umiejętności · +455 tys. mocy" */
  protected details(kind: TodoKind, power: MemberPower): string {
    const parts = kind === 'unlock' ? ['potencjał przy 7★ i maks. gearze'] : [...power.upgrades];
    if (power.gap) parts.push(`+${COMPACT.format(power.gap)} mocy`);
    if (kind === 'upgrade') parts.push(`${Math.round(power.share * 100)}% maks.`);
    return parts.join(' · ');
  }

  protected powerOf(key: string): TeamPower | undefined {
    return this.powers().get(key);
  }

  /** Owned member that is maxed or optimally built (no more farming needed). */
  protected isDone(teamKey: string, memberId: string): boolean {
    const status = this.powers().get(teamKey)?.byId.get(memberId)?.status;
    return status === 'maxed' || status === 'optimal';
  }

  /** Members that need work: locked, still developing, or not recognised. */
  protected todo(fit: TeamFit): TodoRow[] {
    const power = this.powers().get(fit.team.key);
    const rows: TodoRow[] = [];
    for (const member of fit.members) {
      const mp = power?.byId.get(member.id);
      if (member.unknown) rows.push({ member, kind: 'unknown' });
      else if (!member.owned) rows.push({ member, kind: 'unlock', power: mp });
      else if (mp?.status === 'developing') rows.push({ member, kind: 'upgrade', power: mp });
    }
    const order: Record<TodoKind, number> = { unlock: 0, upgrade: 1, unknown: 2 };
    return rows.sort(
      (a, b) => order[a.kind] - order[b.kind] || (b.power?.gap ?? 0) - (a.power?.gap ?? 0),
    );
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

  /**
   * Adds a farming goal: unlock a locked character; otherwise 7★ and the ability levels of
   * its max build for the player's level (when known).
   */
  protected farm(member: TeamMember): void {
    if (member.entry) this.farmEntry(member.entry);
  }

  /**
   * Farming goal for an event near-miss: unlock it, or reach the required yellow stars.
   * Returns false when stars are not what is missing (e.g. only gear), so no goal applies.
   */
  protected canFarmFor(entry: RosterEntry, minYellow: number | undefined): boolean {
    return !entry.unlocked || (!!minYellow && entry.yellowStars < minYellow);
  }

  protected farmFor(entry: RosterEntry, minYellow: number | undefined): void {
    this.farmEntry(entry, entry.unlocked ? minYellow : undefined);
  }

  private farmEntry(entry: RosterEntry, targetYellow?: number): void {
    const potential = this.potentials.get(entry, this.playerLevel());
    this.farming.saveGoal(goalFor(entry, potential?.abilities, targetYellow));
  }

  protected isGoal(entry: RosterEntry): boolean {
    return this.goalIds().has(entry.id);
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
