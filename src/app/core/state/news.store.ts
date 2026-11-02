import { Injectable, computed, effect, inject, linkedSignal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { mockPreviousSnapshot } from '../data/mock/mock-news';
import { KitsStore } from './kits.store';
import { GameNews, GameSnapshot, newsSince, snapshotOf } from './news';
import { PlayerStore } from './player.store';
import { RosterStore } from './roster.store';

const KEY = 'msf.news.snapshot';

function read(key: string): GameSnapshot | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as GameSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * What changed in the game since the player last marked news as seen: new characters,
 * reworked kits, new events and new team traits. The first visit just remembers the game.
 */
@Injectable({ providedIn: 'root' })
export class NewsStore {
  private readonly auth = inject(AuthService);
  private readonly roster = inject(RosterStore);
  private readonly kits = inject(KitsStore);
  private readonly player = inject(PlayerStore);

  private readonly key = computed(() => `${KEY}.${this.auth.mode() ?? 'none'}`);
  private readonly saved = linkedSignal(() => read(this.key()));

  /** Everything the snapshot is made of has loaded (or failed for good). */
  private readonly ready = computed(() => {
    const settled = (s: string) => s === 'loaded' || s === 'error';
    return (
      this.roster.status() === 'loaded' &&
      settled(this.player.status()) &&
      settled(this.player.gameEventsStatus()) &&
      settled(this.kits.status())
    );
  });

  private readonly current = computed(() =>
    this.ready()
      ? snapshotOf(this.roster.entries(), this.kits.kits(), this.player.allEvents())
      : undefined,
  );

  /** When the remembered state is from (undefined before the first visit is saved). */
  readonly since = computed(() => this.previous()?.at);

  private readonly previous = computed(() => {
    const saved = this.saved();
    if (saved) return saved;
    const current = this.current();
    return this.auth.mode() === 'demo' && current ? mockPreviousSnapshot(current) : undefined;
  });

  readonly news = computed<GameNews | undefined>(() => {
    const previous = this.previous();
    const current = this.current();
    return previous && current
      ? newsSince(previous, current, this.roster.entries(), this.player.allEvents())
      : undefined;
  });

  constructor() {
    // The first visit has nothing to compare with: remember the game as it is.
    effect(() => {
      if (this.current() && !this.saved() && this.auth.mode() === 'api') this.markSeen();
    });
  }

  load(): void {
    this.roster.load();
    this.kits.load();
    this.player.load();
  }

  /** Remembers the game as it is now; news start from here. */
  markSeen(): void {
    const current = this.current();
    if (!current) return;
    try {
      localStorage.setItem(this.key(), JSON.stringify(current));
    } catch {
      // Without storage news cannot be remembered between visits.
    }
    this.saved.set(current);
  }
}
