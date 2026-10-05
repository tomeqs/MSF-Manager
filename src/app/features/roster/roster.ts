import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RosterStore } from '../../core/state/roster.store';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { CharacterCard } from './character-card/character-card';
import { DEFAULT_FILTERS, RosterFilters, RosterSort, filterRoster } from './roster-filter';

@Component({
  selector: 'app-roster',
  imports: [CharacterCard, CompactNumberPipe],
  templateUrl: './roster.html',
  styleUrl: './roster.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roster {
  protected readonly store = inject(RosterStore);

  protected readonly filters = signal<RosterFilters>({ ...DEFAULT_FILTERS });
  protected readonly visible = computed(() => filterRoster(this.store.entries(), this.filters()));
  protected readonly visiblePower = computed(() =>
    this.visible().reduce((sum, e) => sum + e.power, 0),
  );
  protected readonly isFiltered = computed(
    () => JSON.stringify(this.filters()) !== JSON.stringify(DEFAULT_FILTERS),
  );

  protected readonly sortOptions: { value: RosterSort; label: string }[] = [
    { value: 'power', label: 'Moc' },
    { value: 'stars', label: 'Gwiazdki' },
    { value: 'gear', label: 'Gear tier' },
    { value: 'level', label: 'Poziom' },
    { value: 'name', label: 'Nazwa' },
  ];
  protected readonly starOptions = [0, 3, 4, 5, 6, 7];
  protected readonly gearOptions = [0, 10, 13, 15, 17, 19, 20];

  constructor() {
    this.store.load();
  }

  protected patch<K extends keyof RosterFilters>(key: K, value: RosterFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  protected reset(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
  }
}
