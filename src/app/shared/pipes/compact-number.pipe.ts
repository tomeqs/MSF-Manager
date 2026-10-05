import { Pipe, PipeTransform } from '@angular/core';

const compact = new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 2 });
const full = new Intl.NumberFormat('pl-PL');

/** 8 727 400 → "8,73 mln"; pass `'full'` for grouped digits. */
@Pipe({ name: 'compactNumber' })
export class CompactNumberPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'compact' | 'full' = 'compact'): string {
    if (value === null || value === undefined) return '–';
    return (mode === 'full' ? full : compact).format(value);
  }
}
