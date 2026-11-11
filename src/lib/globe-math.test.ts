import { describe, expect, it } from 'vitest';
import { LAND_H, LAND_W } from '../data/land';
import { angleDiff, landPoints, project, wrapLon } from './globe-math';

describe('globe maths', () => {
  it('decodes a plausible land share (about 30% of cells)', () => {
    const n = landPoints().length / 2;
    expect(n / (LAND_W * LAND_H)).toBeGreaterThan(0.2);
    expect(n / (LAND_W * LAND_H)).toBeLessThan(0.4);
  });

  it('finds known land and sea', () => {
    const pts = landPoints();
    const near = (lat: number, lon: number) => {
      for (let i = 0; i < pts.length; i += 2) if (Math.abs(pts[i] - lat) <= 1 && Math.abs(pts[i + 1] - lon) <= 1) return true;
      return false;
    };
    expect(near(47, 9)).toBe(true); // Switzerland
    expect(near(-25, 133)).toBe(true); // Australia
    expect(near(0, -30)).toBe(false); // mid-Atlantic
  });

  it('projects the view centre to the middle, facing us', () => {
    const p = project(48.2, 16.4, 48.2, 16.4);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(1);
    expect(project(-48.2, 16.4 + 180, 48.2, 16.4).z).toBeCloseTo(-1); // antipode is behind
    expect(project(0, 90, 0, 0).x).toBeCloseTo(1); // east is to the right
  });

  it('wraps angles', () => {
    expect(angleDiff(170, -170)).toBe(20);
    expect(angleDiff(-170, 170)).toBe(-20);
    expect(wrapLon(190)).toBe(-170);
  });
});
