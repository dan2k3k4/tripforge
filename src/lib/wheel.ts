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

/** Nudge a free rotation (after a fling) so it ends on the centre of whichever segment is under the pointer. */
export function snapToSegment(rotation: number, n: number): { rotation: number; index: number } {
  const index = segmentAt(rotation, n);
  const center = ((index + 0.5) * 360) / n;
  const off = (((rotation + center) % 360) + 540) % 360 - 180; // signed distance from that centre
  return { rotation: rotation - off, index };
}

/**
 * Where a fling ends: keeps spinning in the direction of the flick, at least `minTurns` turns,
 * further the faster the flick. `velocity` is degrees per millisecond.
 */
export function flingTarget(rotation: number, velocity: number, n: number, minTurns = 2): { rotation: number; index: number } {
  const dir = Math.sign(velocity) || 1;
  const travel = Math.max(minTurns * 360, Math.min(Math.abs(velocity) * 1400, 8 * 360));
  return snapToSegment(rotation + dir * travel, n);
}

/** `k` random items without repeats (Fisher-Yates on a copy). */
export function sample<T>(items: readonly T[], k: number, rand = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}
