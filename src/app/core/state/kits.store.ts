import { Injectable, computed, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { CharacterKit, LoadStatus } from '../models';

/** Ability descriptions and adoption (ISO-8 classes, T4 abilities) per character. */
@Injectable({ providedIn: 'root' })
export class KitsStore {
  private readonly data = inject(MsfDataSource);
  private readonly _kits = signal<CharacterKit[]>([]);
  private readonly _status = signal<LoadStatus>('idle');

  readonly kits = this._kits.asReadonly();
  readonly status = this._status.asReadonly();
  readonly byId = computed(() => new Map(this._kits().map((k) => [k.id, k])));

  /** Loads once (retries after an error); the cache follows the game data hash. */
  load(): void {
    const status = this._status();
    if (status === 'loading' || status === 'loaded') return;
    this._status.set('loading');
    this.data.getAbilityKits().subscribe({
      next: (kits) => {
        this._kits.set(kits);
        this._status.set('loaded');
      },
      error: () => this._status.set('error'),
    });
  }
}
