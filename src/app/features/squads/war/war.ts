import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KEY_CHARACTERS } from '../../../core/data/key-characters';
import { KNOWN_META } from '../../../core/data/known-meta';
import { WAR_DEFENSES, WAR_META_AS_OF, WAR_SEASON_NOTE } from '../../../core/data/war-meta';
import { RosterStore } from '../../../core/state/roster.store';
import { rosterTeams } from '../../../core/state/roster-teams';
import { SquadsStore } from '../../../core/state/squads.store';
import { TeamFit, warPlan } from '../../../core/state/war-plan';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { WarCounters } from './war-counters/war-counters';
import { WarTeam } from './war-team/war-team';

type View = 'defense' | 'offense' | 'counters';
const VIEW_KEY = 'msf.war.view';
/** Strong roster teams outside the War meta shown as alternatives. */
const ALTERNATIVES = 3;

/**
 * Alliance War against the roster: the meta's defense and offense teams (ready, to develop,
 * with a substitute, far), the counters to each expected defense with the player's best pick,
 * and strong teams of the roster outside the meta.
 */
@Component({
  selector: 'app-war',
  imports: [RouterLink, CompactNumberPipe, WarCounters, WarTeam],
  templateUrl: './war.html',
  styleUrl: './war.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class War {
  private readonly roster = inject(RosterStore);
  private readonly squads = inject(SquadsStore);

  protected readonly status = this.roster.status;
  protected readonly asOf = WAR_META_AS_OF;
  protected readonly seasonNote = WAR_SEASON_NOTE;
  protected readonly view = signal<View>(readView());
  protected readonly views: { id: View; label: string }[] = [
    { id: 'defense', label: 'Obrona' },
    { id: 'offense', label: 'Atak' },
    { id: 'counters', label: 'Kontry' },
  ];

  protected readonly plan = computed(() =>
    warPlan({
      roster: this.roster.entries(),
      synergy: this.squads.synergy(),
      needsOf: this.squads.needsOf(),
      known: KNOWN_META,
      defenses: WAR_DEFENSES,
      keyCharacters: KEY_CHARACTERS,
    }),
  );
  protected readonly teams = computed(() => {
    const plan = this.plan();
    return this.view() === 'offense' ? plan.offense : plan.defense;
  });
  protected readonly summary = computed(() => ({
    defense: usable(this.plan().defense),
    offense: usable(this.plan().offense),
    answered: this.plan().answers.filter((a) => a.best !== undefined).length,
    defenses: this.plan().answers.length,
  }));
  /** The roster's strongest teams that no War meta team is built on. */
  protected readonly alternatives = computed(() =>
    rosterTeams({
      roster: this.roster.entries(),
      synergy: this.squads.synergy(),
      known: KNOWN_META,
    })
      .teams.filter((t) => !t.known.some((k) => k.modes.includes('war')))
      .slice(0, ALTERNATIVES),
  );

  constructor() {
    // Roster, readiness (stars, gear stage), kits and saved squads.
    this.squads.load();
  }

  protected select(view: View): void {
    this.view.set(view);
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Remembering the view is optional.
    }
  }
}

/** Teams the player can field now (ready, to develop or with a substitute). */
function usable(fits: TeamFit[]): number {
  return fits.filter((f) => f.verdict !== 'far').length;
}

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'offense' || v === 'counters' ? v : 'defense';
  } catch {
    return 'defense';
  }
}
