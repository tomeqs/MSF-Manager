import { capAt, toLevelCaps } from './level-caps';

describe('level caps', () => {
  const caps = toLevelCaps([
    { id: 'c', level: 95, gearTier: 19, basic: 8, special: 8, ultimate: 8, passive: 6 },
    { id: 'a', level: 80, gearTier: 16, basic: 7, special: 7, ultimate: 7, passive: 5 },
    { id: 'b', level: 90, gearTier: 18 },
  ]);

  it('sorts the caps by level and fills missing values with 0', () => {
    expect(caps.map((c) => c.level)).toEqual([80, 90, 95]);
    expect(caps[1].abilities).toEqual({ basic: 0, special: 0, ultimate: 0, passive: 0 });
  });

  it('takes the highest cap not above the level', () => {
    expect(capAt(caps, 92)?.gearTier).toBe(18);
    expect(capAt(caps, 95)?.gearTier).toBe(19);
    expect(capAt(caps, 200)?.gearTier).toBe(19);
    expect(capAt(caps, 79)).toBeUndefined();
    expect(capAt(caps, undefined)).toBeUndefined();
  });
});
