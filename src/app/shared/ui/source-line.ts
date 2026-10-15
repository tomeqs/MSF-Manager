import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CharacterSource, SOURCE_STATUS_LABELS } from '../../core/data/character-sources';
import { SOURCE_TONE } from '../../core/state/sources';

/** Where a character's shards come from: a coloured status and the source (± next window). */
@Component({
  selector: 'app-source-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (source(); as s) {
      <span class="status" [attr.data-tone]="tone()">{{ label() }}</span>
      <span class="text" [attr.title]="compact() ? s.source : null">{{ s.source }}</span>
      @if (!compact() && s.next) {
        <span class="next">· {{ s.next }}</span>
      }
      @if (!compact() && s.url) {
        <a class="link" [href]="s.url" target="_blank" rel="noopener">źródło ↗</a>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      font-size: 0.78rem;
      color: var(--c-text-muted);
      line-height: 1.4;
    }
    :host([compact]) .text {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    :host([compact]) {
      display: flex;
      gap: 6px;
      align-items: baseline;
      min-width: 0;
    }
    .status {
      flex-shrink: 0;
      margin-right: 6px;
      font-weight: 700;
    }
    :host([compact]) .status {
      margin-right: 0;
    }
    .status[data-tone='good'] {
      color: var(--c-success);
    }
    .status[data-tone='warn'] {
      color: var(--c-warning);
    }
    .status[data-tone='bad'] {
      color: var(--c-accent);
    }
    .next {
      margin-left: 4px;
    }
    .link {
      margin-left: 6px;
      color: inherit;
    }
  `,
})
export class SourceLine {
  readonly source = input<CharacterSource | undefined>();
  /** One line: status + clipped source text (full text in the tooltip). */
  readonly compact = input(false, { transform: (v: boolean | string) => v !== false });

  protected readonly label = computed(() => {
    const s = this.source();
    return s ? SOURCE_STATUS_LABELS[s.status] : '';
  });
  protected readonly tone = computed(() => {
    const s = this.source();
    return s ? SOURCE_TONE[s.status] : 'warn';
  });
}
