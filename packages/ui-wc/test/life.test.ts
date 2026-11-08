import { describe, expect, it } from 'vitest';

import { arcPoint, formatPercent, statusFor } from '../src/utils/life';

describe('statusFor', () => {
  it.each([
    [0, 'Ok'],
    [79.9, 'Ok'],
    [80, 'Warning'],
    [99.9, 'Warning'],
    [100, 'Expired'],
    [150, 'Expired'],
  ] as const)('%s%% is %s (same thresholds as the API)', (percent, expected) => {
    expect(statusFor(percent)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('keeps at most one decimal', () => {
    expect(formatPercent(82.46)).toBe('82.5%');
    expect(formatPercent(40)).toBe('40%');
  });
});

describe('arcPoint', () => {
  it('puts 0 on the left end and 1 on the right end of the half circle', () => {
    expect(arcPoint(0, 50)).toEqual({ x: 10, y: expect.closeTo(60, 6) as number });
    expect(arcPoint(1, 50).x).toBeCloseTo(110, 6);
    expect(arcPoint(0.5, 50)).toEqual({ x: expect.closeTo(60, 6) as number, y: 10 });
  });
});
