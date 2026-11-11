import { LAND_BITS, LAND_H, LAND_STEP, LAND_W } from '../data/land.ts';

const RAD = Math.PI / 180;

/** Land cell centres as [lat, lon] pairs, decoded from the base64 bitmap. */
export function landPoints(): Float32Array {
  const bin = atob(LAND_BITS);
  const out: number[] = [];
  for (let i = 0; i < LAND_W * LAND_H; i++) {
    if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) {
      const y = Math.floor(i / LAND_W);
      const x = i % LAND_W;
      out.push(90 - (y + 0.5) * LAND_STEP, -180 + (x + 0.5) * LAND_STEP);
    }
  }
  return Float32Array.from(out);
}

/**
 * Orthographic projection with the view centred on (lat0, lon0).
 * x, y in [-1, 1] (y up); z > 0 means the point faces the viewer.
 */
export function project(lat: number, lon: number, lat0: number, lon0: number): { x: number; y: number; z: number } {
  const p = lat * RAD;
  const p0 = lat0 * RAD;
  const dl = (lon - lon0) * RAD;
  const cp = Math.cos(p);
  return {
    x: cp * Math.sin(dl),
    y: Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cp * Math.cos(dl),
    z: Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cp * Math.cos(dl),
  };
}

/** Shortest signed difference b - a in degrees, in (-180, 180]. */
export const angleDiff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
export const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
