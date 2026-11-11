// Pixel globe: a low-resolution canvas scaled up with image-rendering: pixelated.
// Drag (mouse or touch) to spin, tap a yellow pixel to open its postcard, or use the arrow keys.
// ponytail: 2D orthographic projection on a canvas instead of three.js; a few KB instead of ~150 KB.

import type { Destination } from './data/themes';
import { angleDiff, landPoints, project, wrapLon } from './lib/globe-math';

const SIZE = 168; // internal pixels; CSS scales it up
const R = 78;
const C = SIZE / 2;

type Options = {
  canvas: HTMLCanvasElement;
  places: Destination[];
  onPick: (d: Destination) => void;
  onHover: (d: Destination | null) => void;
};

export function mountGlobe({ canvas, places, onPick, onHover }: Options) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const land = landPoints();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let lat0 = 25;
  let lon0 = 10;
  let vLon = 0;
  let vLat = 0;
  let picked: Destination | null = null;
  let hover: Destination | null = null;
  let tween: { fromLat: number; fromLon: number; dLat: number; dLon: number; t0: number; ms: number } | null = null;
  let lastInteract = 0;
  let visible = true;
  let frame = 0;
  let colors = readColors();

  function readColors() {
    const s = getComputedStyle(canvas);
    const v = (n: string) => s.getPropertyValue(n).trim();
    return { sea: v('--globe-sea'), sea2: v('--globe-sea-2'), land: v('--globe-land'), land2: v('--globe-land-2'), pin: v('--globe-pin'), pick: v('--globe-pick'), rim: v('--globe-rim') };
  }

  function screen(lat: number, lon: number) {
    const p = project(lat, lon, lat0, lon0);
    return { x: Math.round(C + R * p.x), y: Math.round(C - R * p.y), z: p.z };
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    // sea disc with a lit side
    ctx.fillStyle = colors.rim;
    ctx.beginPath();
    ctx.arc(C, C, R + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.sea;
    ctx.beginPath();
    ctx.arc(C, C, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.sea2;
    ctx.beginPath();
    ctx.arc(C - R * 0.28, C - R * 0.28, R * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // land pixels, two tones by how directly they face us
    for (let i = 0; i < land.length; i += 2) {
      const p = project(land[i], land[i + 1], lat0, lon0);
      if (p.z <= 0.02) continue;
      ctx.fillStyle = p.z > 0.55 ? colors.land : colors.land2;
      ctx.fillRect(Math.round(C + R * p.x - 1), Math.round(C - R * p.y - 1), 2, 2);
    }
    // destination pins
    for (const d of places) {
      const p = screen(d.lat, d.lon);
      if (p.z <= 0.1) continue;
      const isPick = d === picked;
      const isHover = d === hover;
      const size = isPick || isHover ? 4 : 2;
      ctx.fillStyle = isPick ? colors.pick : colors.pin;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }

  function nearest(px: number, py: number, maxDist = 6) {
    let best: Destination | null = null;
    let bestD = maxDist * maxDist;
    for (const d of places) {
      const p = screen(d.lat, d.lon);
      if (p.z <= 0.1) continue;
      const dd = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    return best;
  }

  const toInternal = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  function tick(now: number) {
    frame = 0;
    let moving = false;
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.ms);
      const e = 1 - (1 - k) ** 3;
      lat0 = tween.fromLat + tween.dLat * e;
      lon0 = wrapLon(tween.fromLon + tween.dLon * e);
      if (k >= 1) tween = null;
      moving = true;
    } else if (!dragging && (Math.abs(vLon) > 0.01 || Math.abs(vLat) > 0.01)) {
      lon0 = wrapLon(lon0 + vLon);
      lat0 = clampLat(lat0 + vLat);
      vLon *= 0.94;
      vLat *= 0.9;
      moving = true;
    } else if (!dragging && !reduce.matches && now - lastInteract > 4000) {
      lon0 = wrapLon(lon0 + 0.12); // slow idle drift
      moving = true;
    }
    draw();
    if ((moving || dragging) && visible) frame = requestAnimationFrame(tick);
  }

  const kick = () => {
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };
  const clampLat = (v: number) => Math.max(-65, Math.min(65, v));

  // ---- pointer: drag to spin with inertia, tap to pick ----
  let dragging = false;
  let start = { x: 0, y: 0 };
  let last = { x: 0, y: 0, t: 0 };
  let moved = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    tween = null;
    vLon = vLat = 0;
    moved = 0;
    start = toInternal(e);
    last = { ...start, t: e.timeStamp };
    canvas.setPointerCapture(e.pointerId);
    lastInteract = performance.now();
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toInternal(e);
    if (!dragging) {
      const d = nearest(p.x, p.y);
      if (d !== hover) {
        hover = d;
        onHover(d);
        canvas.style.cursor = d ? 'pointer' : 'grab';
        kick();
      }
      return;
    }
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    const degPerPx = 90 / R;
    lon0 = wrapLon(lon0 - dx * degPerPx);
    lat0 = clampLat(lat0 + dy * degPerPx);
    const dt = Math.max(1, e.timeStamp - last.t);
    vLon = (-dx * degPerPx * 16) / dt;
    vLat = (dy * degPerPx * 16) / dt;
    last = { ...p, t: e.timeStamp };
    lastInteract = performance.now();
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    lastInteract = performance.now();
    if (moved < 4) {
      vLon = vLat = 0;
      const d = nearest(start.x, start.y, 8);
      if (d) choose(d);
    } else if (e.timeStamp - last.t > 80) {
      vLon = vLat = 0; // held still before letting go: no fling
    }
    kick();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (hover) {
      hover = null;
      onHover(null);
      kick();
    }
  });

  // ---- keyboard ----
  canvas.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 30 : 10;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => (lon0 = wrapLon(lon0 - step)),
      ArrowRight: () => (lon0 = wrapLon(lon0 + step)),
      ArrowUp: () => (lat0 = clampLat(lat0 + step)),
      ArrowDown: () => (lat0 = clampLat(lat0 - step)),
      Enter: () => {
        const d = nearest(C, C, R);
        if (d) choose(d);
      },
    };
    keys[' '] = keys.Enter;
    if (!keys[e.key]) return;
    e.preventDefault();
    tween = null;
    vLon = vLat = 0;
    lastInteract = performance.now();
    keys[e.key]();
    kick();
  });

  function choose(d: Destination) {
    picked = d;
    onPick(d);
    flyTo(d);
  }

  function flyTo(d: Destination) {
    const toLat = clampLat(d.lat);
    if (reduce.matches) {
      lat0 = toLat;
      lon0 = d.lon;
      tween = null;
    } else {
      tween = { fromLat: lat0, fromLon: lon0, dLat: toLat - lat0, dLon: angleDiff(lon0, d.lon), t0: performance.now(), ms: 1100 };
    }
    lastInteract = performance.now();
    kick();
  }

  // Pause when off-screen; recolour when the theme changes.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  }).observe(canvas);
  const recolor = () => {
    colors = readColors();
    kick();
  };
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  reduce.addEventListener('change', kick);

  kick();
  return {
    /** Spin to a random place and open it. */
    random() {
      let d = places[Math.floor(Math.random() * places.length)];
      if (d === picked) d = places[(places.indexOf(d) + 1) % places.length];
      choose(d);
    },
  };
}
