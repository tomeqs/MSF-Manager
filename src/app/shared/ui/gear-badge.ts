import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Gear tier badge, colored by tier band. */
@Component({
  selector: 'app-gear-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `G{{ tier() }}`,
  host: { '[style.--gear-color]': 'color()', '[attr.title]': '"Gear tier " + tier()' },
  styles: `
    :host {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #0b0d17;
      background: var(--gear-color);
    }
  `,
})
export class GearBadge {
  readonly tier = input.required<number>();

  protected readonly color = computed(() => {
    const tier = this.tier();
    if (tier >= 20) return 'var(--c-gear-20)';
    if (tier >= 17) return 'var(--c-gear-17)';
    if (tier >= 13) return 'var(--c-gear-13)';
    if (tier >= 9) return 'var(--c-gear-9)';
    if (tier >= 5) return 'var(--c-gear-5)';
    return 'var(--c-gear-1)';
  });
}
