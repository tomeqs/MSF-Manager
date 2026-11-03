import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

/** One tab of a section: a child route path (relative) and its label. */
export interface SectionTab {
  path: string;
  label: string;
}

/**
 * A menu section with several pages (e.g. "Składy": the assistant and the meta teams): the
 * tabs from the route's `data.tabs`, then the active page.
 */
@Component({
  selector: 'app-section',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <nav class="section-tabs" aria-label="Widok">
      @for (t of tabs(); track t.path) {
        <a
          [routerLink]="t.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          {{ t.label }}
        </a>
      }
    </nav>
    <router-outlet />
  `,
  styles: `
    .section-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: -8px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--c-border);
    }
    a {
      padding: 6px 12px;
      border-radius: var(--radius);
      color: var(--c-text-muted);
      font-size: 0.88rem;
      font-weight: 600;
      text-decoration: none;
    }
    a.active {
      background: var(--c-accent-soft);
      color: var(--c-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Section {
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = toSignal(
    this.route.data.pipe(map((data) => (data['tabs'] as SectionTab[] | undefined) ?? [])),
    { initialValue: [] },
  );
}
