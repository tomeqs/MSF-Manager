import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="fill" [style.width.%]="percent()"></span>`,
  host: {
    role: 'progressbar',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemax]': 'max()',
    'aria-valuemin': '0',
  },
  styles: `
    :host {
      display: block;
      height: 6px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--c-surface-3);
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--bar-color, var(--c-accent));
      border-radius: inherit;
    }
  `,
})
export class ProgressBar {
  readonly value = input(0);
  readonly max = input(100);

  protected readonly percent = computed(() =>
    this.max() > 0 ? Math.min(100, Math.max(0, (this.value() / this.max()) * 100)) : 0,
  );
}
