import { formatTimeLeft } from './event.utils';

describe('formatTimeLeft', () => {
  const now = 1_000_000 * 1000;

  it('formats days and hours', () => {
    expect(formatTimeLeft(1_000_000 + 2 * 86_400 + 5 * 3600, now)).toBe('2d 5h');
  });

  it('formats hours and minutes', () => {
    expect(formatTimeLeft(1_000_000 + 3 * 3600 + 12 * 60, now)).toBe('3h 12m');
  });

  it('never goes negative', () => {
    expect(formatTimeLeft(0, now)).toBe('0m');
  });
});
