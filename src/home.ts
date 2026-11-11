import { ALL_THEMES, findTheme, PLACES, themeOf, type Destination, type Theme } from './data/themes.ts';
import { mountGlobe } from './globe.ts';
import { flingTarget, sample, snapToSegment, spinTarget } from './lib/wheel.ts';

const ON_WHEEL = 10;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------------- Postcards (shared by the wheel and the globe) ----------------

function postcard(prefix: string, d: Destination, theme: Theme) {
  const card = $(`${prefix}-card`);
  const real = theme.id === 'surprise' ? (themeOf(d) ?? theme) : theme;
  const when = Object.assign(document.createElement('p'), { className: 'pc-when', textContent: `${real.name} (${real.when})` });
  const h = Object.assign(document.createElement('h3'), { textContent: d.name });
  const c = Object.assign(document.createElement('p'), { className: 'pc-country', textContent: d.country });
  const pitch = Object.assign(document.createElement('p'), { className: 'pc-pitch', textContent: d.pitch });
  const stamp = card.querySelector('.pc-stamp');
  card.replaceChildren(...(stamp ? [stamp] : []), when, h, c, pitch);
  card.classList.remove('is-new');
  void card.offsetWidth; // restart the arrival animation
  card.classList.add('is-new');
  const link = $<HTMLAnchorElement>(`${prefix}-use`);
  link.href = `/build?theme=${encodeURIComponent(real.id)}&dest=${encodeURIComponent(d.id)}`;
  link.textContent = `Plan a trip to ${d.name}`;
  link.hidden = false;
  $(`${prefix}-status`).textContent = `${d.name}, ${d.country}.`;
}

// ---------------- Wheel ----------------

const chips = $<HTMLFieldSetElement>('theme-chips');
const wheel = document.getElementById('wheel') as unknown as SVGSVGElement;
const spinBtn = $<HTMLButtonElement>('spin');
const aiLink = $<HTMLAnchorElement>('ai-suggest');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

let theme: Theme = ALL_THEMES[0];
let places: Destination[] = [];
let rotation = 0;
let last = -1;
let spinning = false;
let spinGroup: SVGGElement;

for (const th of ALL_THEMES) {
  const label = document.createElement('label');
  label.className = 'chip';
  const input = Object.assign(document.createElement('input'), { type: 'radio', name: 'theme', value: th.id, checked: th === theme });
  const span = Object.assign(document.createElement('span'), { textContent: th.name });
  label.append(input, span);
  chips.append(label);
}
// click, not change: picking the same theme again reshuffles which places are on the wheel.
chips.addEventListener('click', (e) => {
  const input = (e.target as Element).closest('input');
  const th = input && findTheme(input.value);
  if (!th || spinning) return;
  theme = th;
  aiLink.href = `/build?mode=inspire&theme=${encodeURIComponent(th.id)}`;
  drawWheel();
  $('wheel-status').textContent = `${ON_WHEEL} new places from ${th.name} on the wheel.`;
});

function drawWheel() {
  places = sample(theme.destinations, ON_WHEEL);
  last = -1;
  wheel.replaceChildren();
  spinGroup = svgEl('g', { class: 'wheel-spin' });
  spinGroup.style.transform = `rotate(${rotation}deg)`;
  const n = places.length;
  const a = (2 * Math.PI) / n;
  const r = 148;
  places.forEach((p, i) => {
    const a0 = i * a - Math.PI / 2;
    const a1 = (i + 1) * a - Math.PI / 2;
    const d = `M150 150L${150 + r * Math.cos(a0)} ${150 + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${150 + r * Math.cos(a1)} ${150 + r * Math.sin(a1)}Z`;
    spinGroup.append(svgEl('path', { d, class: `seg seg-${i % 5}` }));
    const mid = ((i + 0.5) * 360) / n;
    const left = mid > 180; // flip labels on the left half so they never read upside down
    const text = svgEl('text', {
      x: left ? 150 - 40 : 150 + 40,
      y: 150,
      transform: `rotate(${left ? mid + 90 : mid - 90} 150 150)`,
      class: 'seg-label',
      'text-anchor': left ? 'end' : 'start',
      'dominant-baseline': 'middle',
    });
    text.textContent = p.name.length > 15 ? `${p.name.slice(0, 14)}…` : p.name;
    spinGroup.append(text);
  });
  wheel.append(spinGroup, svgEl('circle', { cx: 150, cy: 150, r: 22, class: 'wheel-hub' }));
}

function settle(target: number, index: number, ms: number) {
  spinning = true;
  spinBtn.setAttribute('aria-disabled', 'true');
  rotation = target;
  spinGroup.style.transitionDuration = `${reduce.matches ? 0 : ms}ms`;
  spinGroup.style.transform = `rotate(${rotation}deg)`;
  $('wheel-status').textContent = reduce.matches ? '' : 'Spinning…';
  const done = () => {
    spinning = false;
    spinBtn.removeAttribute('aria-disabled');
    last = index;
    postcard('wheel', places[index], theme);
  };
  if (reduce.matches) done();
  else setTimeout(done, ms);
}

function spinRandom() {
  if (spinning) return;
  const n = places.length;
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === last) i = (i + 1) % n;
  settle(spinTarget(rotation, i, n), i, 3200);
}
spinBtn.addEventListener('click', spinRandom);

// Drag or flick the wheel itself (mouse, pen or touch). A tap spins it like the button.
{
  const box = wheel.parentElement!;
  let dragging = false;
  let lastAngle = 0;
  let travelled = 0;
  let samples: { a: number; t: number }[] = [];
  const angleAt = (e: PointerEvent) => {
    const r = wheel.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  box.addEventListener('pointerdown', (e) => {
    if (spinning) return;
    dragging = true;
    travelled = 0;
    lastAngle = angleAt(e);
    samples = [{ a: rotation, t: e.timeStamp }];
    box.setPointerCapture(e.pointerId);
    spinGroup.classList.add('dragging');
  });
  box.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = angleAt(e);
    const delta = ((a - lastAngle + 540) % 360) - 180;
    lastAngle = a;
    travelled += Math.abs(delta);
    rotation += delta;
    spinGroup.style.transform = `rotate(${rotation}deg)`;
    samples.push({ a: rotation, t: e.timeStamp });
    samples = samples.filter((s) => e.timeStamp - s.t < 100);
  });
  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    spinGroup.classList.remove('dragging');
    if (travelled < 3) return spinRandom(); // a tap
    const first = samples[0];
    const v = first && e.timeStamp > first.t ? (rotation - first.a) / (e.timeStamp - first.t) : 0;
    if (Math.abs(v) > 0.25) {
      const { rotation: target, index } = flingTarget(rotation, v, places.length);
      settle(target, index, Math.min(4200, 1800 + Math.abs(v) * 900));
    } else {
      const { rotation: target, index } = snapToSegment(rotation, places.length);
      settle(target, index, 350); // gentle drag: land on whatever is under the pointer
    }
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
}

drawWheel();

// ---------------- Globe ----------------

const canvas = document.getElementById('globe') as HTMLCanvasElement | null;
if (canvas) {
  const hoverLine = $('globe-hover');
  const globe = mountGlobe({
    canvas,
    places: PLACES,
    onPick: (d) => postcard('globe', d, themeOf(d) ?? ALL_THEMES[0]),
    onHover: (d) => (hoverLine.textContent = d ? `${d.name}, ${d.country}` : 'Drag to spin. Tap a pink pixel.'),
  });
  $('globe-random').addEventListener('click', () => globe.random());
}
