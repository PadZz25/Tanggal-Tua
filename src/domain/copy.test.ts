import { describe, expect, it } from 'vitest';
import { getMascotCopy } from './copy';

describe('copy & deterministic mascot messages', () => {
  it('returns identical mascot message for the same date and state', () => {
    const first = getMascotCopy({ state: 'normal', today: '2026-11-18' });
    const second = getMascotCopy({ state: 'normal', today: '2026-11-18' });
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(10);
  });

  it('interpolates overAmount in over state', () => {
    const msg = getMascotCopy({
      state: 'over',
      today: '2026-11-18',
      remainingToday: -8_000,
    });
    expect(msg).toBe('Hari ini lewat Rp 8rb. Tenang, jatah besok kita sesuaikan.');
  });
});
