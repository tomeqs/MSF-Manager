import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { EventInfo, LoadStatus, PlayerCard } from '../models';
import { RosterStore } from './roster.store';

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly data = inject(MsfDataSource);
  private readonly roster = inject(RosterStore);

  private readonly _card = signal<PlayerCard | null>(null);
  private readonly _events = signal<EventInfo[]>([]);
  private readonly _gameEvents = signal<EventInfo[]>([]);
  private readonly _status = signal<LoadStatus>('idle');

  readonly card = this._card.asReadonly();
  /** Events the player qualifies for, with their progress. */
  readonly events = this._events.asReadonly();
  /**
   * Every scheduled and running event in the game: the player's own (with progress) plus
   * those they do not qualify for yet (`/game/v1/events`).
   */
  readonly allEvents = computed(() => {
    const own = new Set(this._events().map((e) => e.id));
    return [...this._events(), ...this._gameEvents().filter((e) => !own.has(e.id))];
  });
  /** Ids of events the player qualifies for (the rest of `allEvents` they do not). */
  readonly ownEventIds = computed(() => new Set(this._events().map((e) => e.id)));
  /**
   * Player level — no character can be levelled past it, so max powers and upgrade targets
   * are computed for it. The highest character level is a floor and stands in when the card
   * has no level. Undefined while the card is loading.
   */
  readonly level = computed(() => {
    const status = this._status();
    if (status !== 'loaded' && status !== 'error') return undefined;
    const highest = Math.max(0, ...this.roster.entries().map((e) => e.level));
    const level = Math.max(this._card()?.level?.completedTier ?? 0, highest);
    return level || undefined;
  });
  readonly status = this._status.asReadonly();

  /** Events running now (the player's and the rest of the game's), soonest-ending first. */
  readonly activeEvents = computed(() => {
    const now = Date.now() / 1000;
    return this.allEvents()
      .filter((e) => e.startTime <= now && e.endTime > now)
      .sort((a, b) => a.endTime - b.endTime);
  });

  readonly upcomingEvents = computed(() => {
    const now = Date.now() / 1000;
    return this.allEvents()
      .filter((e) => e.startTime > now)
      .sort((a, b) => a.startTime - b.startTime);
  });

  /** Reloads only if something was loaded before. */
  refresh(): void {
    if (this._status() !== 'idle') this.load(true);
  }

  load(force = false): void {
    const status = this._status();
    if (!force && (status === 'loading' || status === 'loaded')) return;
    this._status.set('loading');
    forkJoin({ card: this.data.getPlayerCard(), events: this.data.getEvents() }).subscribe({
      next: ({ card, events }) => {
        this._card.set(card);
        this._events.set(events);
        this._status.set('loaded');
      },
      error: () => this._status.set('error'),
    });
    // Optional: without it only the player's own events are known.
    this.data.getGameEvents().subscribe({
      next: (events) => this._gameEvents.set(events),
      error: () => this._gameEvents.set([]),
    });
  }
}
