import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TraitObject } from '../../core/models';

const ORIGIN_COLORS: Record<string, string> = {
  Bio: 'var(--c-origin-bio)',
  Mutant: 'var(--c-origin-mutant)',
  Mystic: 'var(--c-origin-mystic)',
  Skill: 'var(--c-origin-skill)',
  Tech: 'var(--c-origin-tech)',
};

/** Portrait from the API when available, otherwise initials tinted by origin trait. */
@Component({
  selector: 'app-character-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (portrait()) {
      <img [src]="portrait()" [alt]="name()" loading="lazy" />
    } @else {
      <span class="initials" [style.background]="color()">{{ initials() }}</span>
    }
  `,
  styles: `
    :host {
      display: block;
      width: var(--avatar-size, 56px);
      aspect-ratio: 1;
      border-radius: var(--radius);
      overflow: hidden;
      flex-shrink: 0;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .initials {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      font-weight: 700;
      font-size: calc(var(--avatar-size, 56px) * 0.36);
      color: #fff;
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
    }
  `,
})
export class CharacterAvatar {
  readonly name = input.required<string>();
  readonly portrait = input<string>();
  readonly traits = input<TraitObject[]>([]);

  protected readonly initials = computed(() =>
    this.name()
      .replace(/\(.*?\)/g, '')
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected readonly color = computed(() => {
    const origin = this.traits().find((t) => ORIGIN_COLORS[t.id]);
    return origin ? ORIGIN_COLORS[origin.id] : 'var(--c-surface-3)';
  });
}
