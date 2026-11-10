/**
 * Rotation (degrees, clockwise) that lands segment `i` of `n` under the pointer at 12 o'clock,
 * after at least `turns` full turns from `prev`. Segments are laid out clockwise from the top.
 */
export function spinTarget(prev: number, i: number, n: number, turns = 5): number {
  const center = ((i + 0.5) * 360) / n;
  const delta = (((-center - prev) % 360) + 360) % 360;
  return prev + turns * 360 + delta;
}

/** Which segment sits under the pointer for a given rotation. */
export function segmentAt(rotation: number, n: number): number {
  const atTop = (((-rotation) % 360) + 360) % 360;
  return Math.floor(atTop / (360 / n)) % n;
}
