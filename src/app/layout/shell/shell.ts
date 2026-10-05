import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FarmingStore } from '../../core/state/farming.store';
import { PlayerStore } from '../../core/state/player.store';
import { RosterStore } from '../../core/state/roster.store';
import { TeamsStore } from '../../core/state/teams.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  soon?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CompactNumberPipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly player = inject(PlayerStore);
  protected readonly menuOpen = signal(false);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly roster = inject(RosterStore);
  private readonly farming = inject(FarmingStore);
  private readonly teams = inject(TeamsStore);

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Pulpit', icon: '◈' },
    { path: '/roster', label: 'Roster', icon: '☰' },
    { path: '/events', label: 'Eventy', icon: '⚑' },
    { path: '/teams', label: 'Drużyny', icon: '★' },
    { path: '/farming', label: 'Farmienie', icon: '⛏' },
    { path: '/alliance', label: 'Sojusz', icon: '⚔', soon: true },
  ];

  constructor() {
    this.player.load();
  }

  /** Re-fetches player data (cheap thanks to `since`) and revalidates cached game data. */
  protected refresh(): void {
    this.player.refresh();
    this.roster.refresh();
    this.farming.refresh();
    this.teams.refresh();
  }

  protected login(): void {
    void this.auth.login(this.router.url);
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    // Full reload so stores loaded for this session are discarded.
    this.document.location.assign('/login');
  }
}
