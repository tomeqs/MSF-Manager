import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { EventInfo, LoadStatus, PlayerCard } from '../models';

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly data = inject(MsfDataSource);

  private readonly _card = signal<PlayerCard | null>(null);
  private readonly _events = signal<EventInfo[]>([]);
  private readonly _status = signal<LoadStatus>('idle');

  readonly card = this._card.asReadonly();
  readonly events = this._events.asReadonly();
  readonly status = this._status.asReadonly();

  /** Events running now, soonest-ending first. */
  readonly activeEvents = computed(() => {
    const now = Date.now() / 1000;
    return this._events()
      .filter((e) => e.startTime <= now && e.endTime > now)
      .sort((a, b) => a.endTime - b.endTime);
  });

  readonly upcomingEvents = computed(() => {
    const now = Date.now() / 1000;
    return this._events()
      .filter((e) => e.startTime > now)
      .sort((a, b) => a.startTime - b.startTime);
  });

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
  }
}
