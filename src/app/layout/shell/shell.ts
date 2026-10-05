import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PlayerStore } from '../../core/state/player.store';
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
  protected readonly player = inject(PlayerStore);
  protected readonly menuOpen = signal(false);

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Pulpit', icon: '◈' },
    { path: '/roster', label: 'Roster', icon: '☰' },
    { path: '/events', label: 'Eventy', icon: '⚑' },
    { path: '/farming', label: 'Farmienie', icon: '⛏', soon: true },
    { path: '/alliance', label: 'Sojusz', icon: '⚔', soon: true },
  ];

  constructor() {
    this.player.load();
  }
}
