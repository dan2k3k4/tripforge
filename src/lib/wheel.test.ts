import { describe, expect, it } from 'vitest';
import { ALL_THEMES, findDestination, PLACES, THEMES, themeOf } from '../data/themes';
import { flingTarget, sample, segmentAt, snapToSegment, spinTarget } from './wheel';

describe('spinTarget', () => {
  it('lands on the chosen segment from any start, always moving forward', () => {
    for (const n of [8, 10, 12]) {
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

describe('fling', () => {
  it('snaps to a segment centre without changing segment', () => {
    for (let r = -1000; r < 1000; r += 37) {
      const { rotation, index } = snapToSegment(r, 10);
      expect(index).toBe(segmentAt(r, 10));
      expect(Math.abs(rotation - r)).toBeLessThanOrEqual(18);
      expect(segmentAt(rotation, 10)).toBe(index);
      expect(Math.abs((((rotation + (index + 0.5) * 36) % 360) + 360) % 360)).toBeLessThan(1e-9);
    }
  });

  it('keeps the flick direction and spins at least two turns', () => {
    expect(flingTarget(0, 2, 10).rotation).toBeGreaterThan(700);
    expect(flingTarget(0, -2, 10).rotation).toBeLessThan(-700);
    expect(flingTarget(0, 100, 10).rotation).toBeLessThan(8 * 360 + 20);
  });
});

describe('sample', () => {
  it('returns k distinct items', () => {
    const s = sample(PLACES, 10);
    expect(s).toHaveLength(10);
    expect(new Set(s).size).toBe(10);
  });
});

describe('themes', () => {
  it('has plenty of places per theme with unique ids and valid coordinates', () => {
    for (const th of THEMES) expect(th.destinations.length, th.id).toBeGreaterThanOrEqual(30);
    const all = THEMES.flatMap((th) => th.destinations);
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const d of all) {
      expect(Math.abs(d.lat), d.id).toBeLessThanOrEqual(90);
      expect(Math.abs(d.lon), d.id).toBeLessThanOrEqual(180);
      expect(d.pitch.length, d.id).toBeGreaterThan(10);
      expect(d.pitch, d.id).not.toContain('—');
    }
    expect(PLACES.length).toBeGreaterThan(250);
    expect(ALL_THEMES.at(-1)?.id).toBe('surprise');
  });

  it('only resolves known theme + destination pairs', () => {
    expect(findDestination('christmas', 'vienna')?.name).toBe('Vienna');
    expect(findDestination('christmas', 'sydney')).toBeUndefined();
    expect(findDestination('nope', 'vienna')).toBeUndefined();
    expect(themeOf(findDestination('surprise', 'sydney')!)?.id).toBe('newyear');
  });
});
