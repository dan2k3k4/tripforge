import { ALL_THEMES, findTheme, type Destination, type Theme } from './data/themes';
import { spinTarget } from './lib/wheel';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

const chips = document.getElementById('theme-chips') as HTMLFieldSetElement;
const wheel = document.getElementById('wheel') as unknown as SVGSVGElement;
const spinBtn = document.getElementById('spin') as HTMLButtonElement;
const useLink = document.getElementById('use-dest') as HTMLAnchorElement;
const aiLink = document.getElementById('ai-suggest') as HTMLAnchorElement;
const postcard = document.getElementById('postcard') as HTMLDivElement;
const spinStatus = document.getElementById('spin-status') as HTMLParagraphElement;

let theme: Theme = ALL_THEMES[0];
let rotation = 0;
let last = -1;
let spinning = false;
let spinGroup: SVGGElement;

// Theme chips (radio group)
for (const t of ALL_THEMES) {
  const label = document.createElement('label');
  label.className = 'chip';
  const input = Object.assign(document.createElement('input'), { type: 'radio', name: 'theme', value: t.id, checked: t === theme });
  const span = document.createElement('span');
  span.textContent = t.name;
  label.append(input, span);
  chips.append(label);
}
chips.addEventListener('change', (e) => {
  const t = findTheme((e.target as HTMLInputElement).value);
  if (!t) return;
  theme = t;
  last = -1;
  useLink.hidden = true;
  aiLink.href = `/build?mode=inspire&theme=${encodeURIComponent(t.id)}`;
  drawWheel();
});

// Surprise me has ~80 places; the wheel shows 12 of them, picked fresh each draw.
function wheelPlaces(t: Theme): Destination[] {
  if (t.destinations.length <= 12) return t.destinations;
  const copy = [...t.destinations];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 12);
}

let places: Destination[] = [];

function drawWheel() {
  places = wheelPlaces(theme);
  wheel.replaceChildren();
  rotation = 0;
  spinGroup = svgEl('g', { class: 'wheel-spin' });
  const n = places.length;
  const a = (2 * Math.PI) / n;
  const r = 148;
  places.forEach((p, i) => {
    // Segment i spans clockwise from the top: angles measured from 12 o'clock.
    const a0 = i * a - Math.PI / 2;
    const a1 = (i + 1) * a - Math.PI / 2;
    const x0 = 150 + r * Math.cos(a0);
    const y0 = 150 + r * Math.sin(a0);
    const x1 = 150 + r * Math.cos(a1);
    const y1 = 150 + r * Math.sin(a1);
    const large = a > Math.PI ? 1 : 0;
    spinGroup.append(svgEl('path', { d: `M150 150L${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}Z`, class: `seg seg-${i % 5}` }));
    const mid = ((i + 0.5) * 360) / n;
    // Labels on the left half are flipped so they never read upside down.
    const left = mid > 180;
    const text = svgEl('text', {
      x: left ? 150 - 62 : 150 + 62,
      y: 150,
      transform: `rotate(${left ? mid + 90 : mid - 90} 150 150)`,
      class: 'seg-label',
      'text-anchor': left ? 'end' : 'start',
      'dominant-baseline': 'middle',
    });
    text.textContent = p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name;
    spinGroup.append(text);
  });
  wheel.append(spinGroup, svgEl('circle', { cx: 150, cy: 150, r: 18, class: 'wheel-hub' }));
}

function showPostcard(p: Destination) {
  const h = document.createElement('h3');
  h.textContent = p.name;
  const c = Object.assign(document.createElement('p'), { className: 'country', textContent: p.country });
  const pitch = Object.assign(document.createElement('p'), { textContent: p.pitch });
  const when = Object.assign(document.createElement('p'), { className: 'muted', textContent: `${theme.id === 'surprise' ? 'Any time' : theme.when} · ${theme.name}` });
  const stamp = postcard.querySelector('.stamp');
  postcard.replaceChildren(...(stamp ? [stamp] : []), when, h, c, pitch);
  postcard.classList.remove('is-new');
  void postcard.offsetWidth; // restart the pop animation
  postcard.classList.add('is-new');

  // Surprise picks keep the real theme of the place, so the AI gets the right mood.
  const realTheme = theme.id === 'surprise' ? ALL_THEMES.find((t) => t.id !== 'surprise' && t.destinations.includes(p)) ?? theme : theme;
  useLink.href = `/build?theme=${encodeURIComponent(realTheme.id)}&dest=${encodeURIComponent(p.id)}`;
  useLink.textContent = `Plan a trip to ${p.name}`;
  useLink.hidden = false;
}

spinBtn.addEventListener('click', () => {
  if (spinning) return;
  const n = places.length;
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === last) i = (i + 1) % n;
  last = i;
  rotation = spinTarget(rotation, i, n);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  spinning = true;
  spinBtn.setAttribute('aria-disabled', 'true');
  spinGroup.style.transform = `rotate(${rotation}deg)`;
  spinStatus.textContent = reduce ? '' : 'Spinning…';
  const done = () => {
    spinning = false;
    spinBtn.removeAttribute('aria-disabled');
    showPostcard(places[i]);
    spinStatus.textContent = `Landed on ${places[i].name}, ${places[i].country}.`;
  };
  if (reduce) done();
  else setTimeout(done, 3200);
});

drawWheel();
