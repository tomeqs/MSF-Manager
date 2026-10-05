import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { CharacterPotential, PotentialTarget, RosterEntry } from '../models';

const MAX_CONCURRENT = 4;

interface Job {
  key: string;
  characterId: string;
  target: PotentialTarget;
}

/** Max power per character for the player's level, fetched lazily and in small batches. */
@Injectable({ providedIn: 'root' })
export class PotentialStore {
  private readonly data = inject(MsfDataSource);
  private readonly _values = signal<Record<string, CharacterPotential>>({});
  private readonly requested = new Set<string>();
  private readonly queue: Job[] = [];
  private active = 0;

  /** Potential for the entry's current red stars and ISO-8 class, if loaded. */
  get(entry: RosterEntry, level: number | undefined): CharacterPotential | undefined {
    return this._values()[keyOf(entry, level)];
  }

  /** Requests whatever is not loaded or in flight yet. */
  ensure(entries: RosterEntry[], level: number | undefined): void {
    for (const entry of entries) {
      const key = keyOf(entry, level);
      if (this.requested.has(key)) continue;
      this.requested.add(key);
      this.queue.push({ key, characterId: entry.id, target: targetOf(entry, level) });
    }
    this.pump();
  }

  private pump(): void {
    while (this.active < MAX_CONCURRENT && this.queue.length) {
      const job = this.queue.shift()!;
      this.active++;
      this.data
        .getPotential(job.characterId, job.target)
        .pipe(finalize(() => this.done()))
        .subscribe({
          next: (value) => this._values.update((all) => ({ ...all, [job.key]: value })),
          // Failed lookups leave `requested` so a later ensure() retries them.
          error: () => this.requested.delete(job.key),
        });
    }
  }

  private done(): void {
    this.active--;
    this.pump();
  }
}

function targetOf(entry: RosterEntry, level: number | undefined): PotentialTarget {
  return { level, red: entry.redStars + entry.diamonds, isoClass: entry.iso.active };
}

function keyOf(entry: RosterEntry, level: number | undefined): string {
  return `${entry.id}:${level ?? 'cap'}:${entry.redStars + entry.diamonds}:${entry.iso.active ?? '-'}`;
}
