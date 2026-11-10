import { describe, expect, it } from 'vitest';
import { ALL_THEMES, findDestination, THEMES } from '../data/themes';
import { segmentAt, spinTarget } from './wheel';

describe('spinTarget', () => {
  it('lands on the chosen segment from any start, always moving forward', () => {
    for (const n of [8, 9, 10, 12]) {
      let rot = 0;
      for (let k = 0; k < 40; k++) {
        const i = (k * 7) % n;
        const next = spinTarget(rot, i, n);
        expect(next - rot).toBeGreaterThanOrEqual(5 * 360);
        expect(next - rot).toBeLessThan(6 * 360);
        expect(segmentAt(next, n)).toBe(i);
        rot = next;
      }
    }
  });
});

describe('themes', () => {
  it('has 8-12 places per theme with unique ids across all themes', () => {
    for (const t of THEMES) {
      expect(t.destinations.length).toBeGreaterThanOrEqual(8);
      expect(t.destinations.length).toBeLessThanOrEqual(12);
    }
    const ids = THEMES.flatMap((t) => t.destinations.map((d) => d.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_THEMES.at(-1)?.id).toBe('surprise');
  });

  it('only resolves known theme + destination pairs', () => {
    expect(findDestination('christmas', 'vienna')?.name).toBe('Vienna');
    expect(findDestination('christmas', 'sydney')).toBeUndefined();
    expect(findDestination('nope', 'vienna')).toBeUndefined();
  });
});
