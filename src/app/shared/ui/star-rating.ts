import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const SLOTS = [0, 1, 2, 3, 4, 5, 6];

/** Yellow stars on top, red stars below, diamonds appended after the red row. */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row" [attr.aria-label]="label()">
      @for (i of slots; track i) {
        <span class="star yellow" [class.on]="i < yellow()">★</span>
      }
    </div>
    <div class="row">
      @for (i of slots; track i) {
        <span class="star red" [class.on]="i < red()">★</span>
      }
      @for (d of diamondSlots(); track $index) {
        <span class="diamond">◆</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: 1px;
      line-height: 1;
    }
    .row {
      display: flex;
      gap: 1px;
    }
    .star {
      font-size: var(--star-size, 0.8rem);
      color: var(--c-star-off);
    }
    .yellow.on {
      color: var(--c-star-yellow);
    }
    .red.on {
      color: var(--c-star-red);
    }
    .diamond {
      font-size: var(--star-size, 0.8rem);
      color: var(--c-diamond);
      margin-left: 2px;
    }
  `,
})
export class StarRating {
  readonly yellow = input(0);
  readonly red = input(0);
  readonly diamonds = input(0);

  protected readonly slots = SLOTS;
  protected readonly diamondSlots = computed(() => Array.from({ length: this.diamonds() }));
  protected readonly label = computed(
    () =>
      `${this.yellow()} żółtych, ${this.red()} czerwonych gwiazdek, ${this.diamonds()} diamentów`,
  );
}
