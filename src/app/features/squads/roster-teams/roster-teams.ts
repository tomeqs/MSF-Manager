import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { KNOWN_META } from '../../../core/data/known-meta';
import { RosterEntry } from '../../../core/models';
import { KitsStore } from '../../../core/state/kits.store';
import { RosterStore } from '../../../core/state/roster.store';
import { BenchMember, RosterTeam, rosterTeams } from '../../../core/state/roster-teams';
import { SquadsStore } from '../../../core/state/squads.store';
import { SquadCard } from '../squad-card/squad-card';
import { MODE_LABELS } from '../squad-labels';

const EXCLUSIVE_KEY = 'msf.rosterTeams.exclusive';
const PAGE = 12;
/** Names listed before "+N". */
const NAMES_SHOWN = 4;

/**
 * Every team (trait) the player can build from the roster, mode by mode aside: the best five
 * by power, kit synergy and essential mechanics, the bench and why, fillers when the team is
 * short, and the line-up. "Bez powtórzeń" builds them all at once, one character per team.
 */
@Component({
  selector: 'app-roster-teams',
  imports: [SquadCard],
  templateUrl: './roster-teams.html',
  styleUrl: './roster-teams.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RosterTeams {
  private readonly roster = inject(RosterStore);
  private readonly kits = inject(KitsStore);
  private readonly squads = inject(SquadsStore);

  protected readonly status = this.roster.status;
  protected readonly kitsStatus = this.kits.status;
  protected readonly exclusive = signal(readFlag());
  protected readonly query = signal('');
  protected readonly limit = signal(PAGE);

  protected readonly result = computed(() => {
    const kits = this.kits.byId();
    return rosterTeams({
      roster: this.roster.entries(),
      synergy: this.squads.synergy(),
      kitOf: kits.size ? (id) => kits.get(id) : undefined,
      known: KNOWN_META,
      exclusive: this.exclusive(),
    });
  });
  /** Teams matching the search (team or member name). */
  protected readonly matching = computed(() => {
    const q = this.query().trim().toLowerCase();
    const teams = this.result().teams;
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.owned.some((m) => m.name.toLowerCase().includes(q)) ||
        t.fillers.some((m) => m.name.toLowerCase().includes(q)),
    );
  });
  protected readonly shown = computed(() => this.matching().slice(0, this.limit()));
  protected readonly hidden = computed(() => this.matching().length - this.shown().length);

  constructor() {
    this.roster.load();
    this.kits.load();
  }

  protected search(value: string): void {
    this.query.set(value);
    this.limit.set(PAGE);
  }

  protected toggleExclusive(): void {
    const value = !this.exclusive();
    this.exclusive.set(value);
    try {
      localStorage.setItem(EXCLUSIVE_KEY, JSON.stringify(value));
    } catch {
      // Remembering the choice is optional.
    }
  }

  protected more(): void {
    this.limit.update((n) => n + PAGE);
  }

  protected names(entries: RosterEntry[]): string {
    const names = entries.slice(0, NAMES_SHOWN).map((e) => e.name);
    const rest = entries.length - names.length;
    return names.join(', ') + (rest > 0 ? ` +${rest}` : '');
  }

  protected knownText(team: RosterTeam): string {
    return team.known
      .map((k) => `${k.name} (${k.tier}: ${k.modes.map((m) => MODE_LABELS[m]).join(', ')})`)
      .join('; ');
  }

  /** "za Hydra Sniper, −3%" — what it would replace and what the swap costs. */
  protected swapText(b: BenchMember): string {
    const pct = Math.round(b.loss * 100);
    const cost = pct > 0 ? `−${pct}%` : 'prawie bez straty';
    return b.replaces ? `za ${b.replaces.name}, ${cost}` : cost;
  }
}

function readFlag(): boolean {
  try {
    return JSON.parse(localStorage.getItem(EXCLUSIVE_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
}
