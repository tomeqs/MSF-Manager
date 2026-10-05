import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, RosterEntry, TraitObject } from '../models';
import { buildRoster } from './roster.mapper';

@Injectable({ providedIn: 'root' })
export class RosterStore {
  private readonly data = inject(MsfDataSource);

  private readonly _entries = signal<RosterEntry[]>([]);
  private readonly _status = signal<LoadStatus>('idle');

  readonly entries = this._entries.asReadonly();
  readonly status = this._status.asReadonly();

  readonly unlocked = computed(() => this._entries().filter((e) => e.unlocked));

  readonly traits = computed<TraitObject[]>(() => {
    const map = new Map<string, TraitObject>();
    for (const entry of this._entries()) {
      for (const trait of entry.traits) map.set(trait.id, trait);
    }
    return [...map.values()].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  });

  readonly summary = computed(() => {
    const unlocked = this.unlocked();
    const totalPower = unlocked.reduce((sum, e) => sum + e.power, 0);
    return {
      unlocked: unlocked.length,
      total: this._entries().length,
      totalPower,
      averageGear: unlocked.length
        ? unlocked.reduce((sum, e) => sum + e.gearTier, 0) / unlocked.length
        : 0,
      maxYellow: unlocked.filter((e) => e.yellowStars === 7).length,
      withDiamonds: unlocked.filter((e) => e.diamonds > 0).length,
    };
  });

  readonly topByPower = computed(() =>
    [...this.unlocked()].sort((a, b) => b.power - a.power).slice(0, 5),
  );

  /** Reloads only if something was loaded before. */
  refresh(): void {
    if (this._status() !== 'idle') this.load(true);
  }

  /** Loads once; pass `force` to refresh. */
  load(force = false): void {
    const status = this._status();
    if (!force && (status === 'loading' || status === 'loaded')) return;
    this._status.set('loading');
    forkJoin({ characters: this.data.getCharacters(), roster: this.data.getRoster() }).subscribe({
      next: ({ characters, roster }) => {
        this._entries.set(buildRoster(characters, roster));
        this._status.set('loaded');
      },
      error: () => this._status.set('error'),
    });
  }

  entry(id: string): RosterEntry | undefined {
    return this._entries().find((e) => e.id === id);
  }
}
