import { Injectable, inject, signal } from '@angular/core';
import { MsfDataSource } from '../data/msf-data-source';
import { LoadStatus, ShardDrops } from '../models';

const EMPTY_DROPS: ShardDrops = { nodes: [], orbs: [] };

/** Where shards drop according to game data (campaign/event nodes and orbs). */
@Injectable({ providedIn: 'root' })
export class ShardDropsStore {
  private readonly data = inject(MsfDataSource);
  private readonly _drops = signal<ShardDrops>(EMPTY_DROPS);
  private readonly _status = signal<LoadStatus>('idle');

  readonly drops = this._drops.asReadonly();
  readonly status = this._status.asReadonly();

  /** Loads once (retries after an error). The first read crawls campaigns and is slow. */
  load(): void {
    const status = this._status();
    if (status === 'loading' || status === 'loaded') return;
    this._status.set('loading');
    this.data.getShardDrops().subscribe({
      next: (drops) => {
        this._drops.set(drops);
        this._status.set('loaded');
      },
      error: () => this._status.set('error'),
    });
  }
}
