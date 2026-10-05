import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Placeholder for sections that are planned but not built yet. Inputs come from route data. */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1>{{ heading() }}</h1>
        <p>{{ description() }}</p>
      </div>
    </header>
    <div class="card state-message">🚧 Ta sekcja jest w przygotowaniu.</div>
  `,
})
export class ComingSoon {
  readonly heading = input('Wkrótce');
  readonly description = input('');
}
