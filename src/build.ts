import * as O from './data/options.ts';
import { PRESETS } from './data/presets.ts';
import { ALL_THEMES, findDestination, findTheme } from './data/themes.ts';
import { findPii, piiMessage } from './lib/pii.ts';
import { buildPrompt, wordCount } from './lib/prompt.ts';
import { defaults, emptyLeg, emptyStay, missing, normalize, type TripState } from './lib/state.ts';

const STORE = 'tripforge:answers:v1';
const STEP_TITLES = ['Basics', 'Stays & travel', 'What you love', 'Features', 'Format', 'Look & feel'];
const MAX_IMPORT_BYTES = 200_000;

type Opt = { id: string; label: string; hint?: string };
const asOpts = (xs: readonly (string | Opt)[]): Opt[] => xs.map((x) => (typeof x === 'string' ? { id: x, label: x } : x));
const SOURCES: Record<string, Opt[]> = {
  REACH: asOpts(O.REACH),
  THEMES: ALL_THEMES.map((t) => ({ id: t.id, label: t.name })),
  MONTHS: asOpts(O.MONTHS),
  PARTY: asOpts(O.PARTY),
  STAY_TYPES: asOpts(O.STAY_TYPES),
  TRAVEL_MODES: asOpts(O.TRAVEL_MODES),
  TIME_OF_DAY: asOpts(O.TIME_OF_DAY),
  PACE: asOpts(O.PACE),
  INTERESTS: asOpts(O.INTERESTS),
  RUN_SURFACE: asOpts(O.RUN_SURFACE),
  HIKE_LEVEL: asOpts(O.HIKE_LEVEL),
  BUDGET_STYLE: asOpts(O.BUDGET_STYLE),
  CURRENCIES: asOpts(O.CURRENCIES),
  BUDGET_COVERS: asOpts(O.BUDGET_COVERS),
  FEATURES: asOpts(O.FEATURES),
  AIS: asOpts(O.AIS),
  FORMATS: asOpts(O.FORMATS),
  BUILDERS: asOpts(O.BUILDERS),
  HOSTS: asOpts(O.HOSTS),
  VIBES: asOpts(O.VIBES),
  LANGUAGES: asOpts(O.LANGUAGES),
  SCHEMES: asOpts(O.SCHEMES),
  UNITS: asOpts(O.UNITS),
  CLOCKS: asOpts(O.CLOCKS),
};

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];

const form = $<HTMLFormElement>('#trip-form');
const steps = $$<HTMLElement>('.step', form);
const errorsBox = $('#errors');
let uid = 0;
let current = 0;

// ---------------- Rendering option lists ----------------

function renderOptions(root: ParentNode) {
  for (const el of $$<HTMLElement>('[data-options]', root)) {
    if (el.dataset.rendered) continue;
    el.dataset.rendered = '1';
    const opts = SOURCES[el.dataset.options!] ?? [];
    if (el instanceof HTMLSelectElement) {
      if (el.dataset.empty !== undefined) el.append(new Option(el.dataset.empty, ''));
      for (const o of opts) el.append(new Option(o.label, o.id));
      continue;
    }
    const type = el.dataset.type!;
    const name = el.dataset.name!;
    for (const o of opts) {
      const label = document.createElement('label');
      label.className = 'opt';
      const input = Object.assign(document.createElement('input'), { type, name, value: o.id });
      const text = document.createElement('span');
      const t = Object.assign(document.createElement('span'), { className: 't', textContent: o.label });
      text.append(t);
      if (o.hint) text.append(Object.assign(document.createElement('span'), { className: 'hint', textContent: o.hint }));
      label.append(input, text);
      el.append(label);
    }
  }
}

// ---------------- Personal-info hints ----------------

function attachPii(root: ParentNode) {
  for (const input of $$<HTMLInputElement | HTMLTextAreaElement>('input[type="text"], textarea', root)) {
    if (input.dataset.pii) continue;
    const id = `pii-${++uid}`;
    input.dataset.pii = id;
    // Linked via aria-describedby only (read on focus); a live region here would interrupt typing.
    const box = Object.assign(document.createElement('div'), { id, className: 'pii' });
    input.after(box);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  }
}

function checkPii(input: HTMLInputElement | HTMLTextAreaElement) {
  const box = input.dataset.pii ? document.getElementById(input.dataset.pii) : null;
  if (!box) return;
  const msg = piiMessage(findPii(input.value.slice(0, 2000))); // maxlength can be bypassed; keep regex cost bounded
  if (box.textContent !== msg) box.textContent = msg;
}

// ---------------- Repeatable rows ----------------

function addRow(kind: 'stays' | 'legs', data: Record<string, string> = {}) {
  const tpl = $<HTMLTemplateElement>(`#tpl-${kind}`);
  const row = (tpl.content.firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;
  const n = ++uid;
  for (const el of $$<HTMLInputElement | HTMLSelectElement>('[data-key]', row)) {
    el.id = `${kind}-${n}-${el.dataset.key}`;
    const label = $<HTMLLabelElement>(`label[data-for="${el.dataset.key}"]`, row);
    if (label) label.htmlFor = el.id;
  }
  renderOptions(row);
  attachPii(row);
  for (const el of $$<HTMLInputElement | HTMLSelectElement>('[data-key]', row)) el.value = data[el.dataset.key!] ?? '';
  $(`#${kind}`).append(row);
  renumber(kind);
  return row;
}

function renumber(kind: string) {
  $$('.repeat-row', $(`#${kind}`)).forEach((r, i) => ($('[data-n]', r).textContent = String(i + 1)));
}

function readRows(kind: string) {
  return $$('.repeat-row', $(`#${kind}`)).map((r) =>
    Object.fromEntries($$<HTMLInputElement | HTMLSelectElement>('[data-key]', r).map((el) => [el.dataset.key!, el.value])),
  );
}

// ---------------- Form <-> state ----------------

const BOOLS = ['multiStay', 'runs', 'hikes'] as const;
const MULTI = ['interests', 'budgetCovers', 'features'] as const;
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;

function readForm(): TripState {
  const fd = new FormData(form);
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd) if (typeof v === 'string' && !(MULTI as readonly string[]).includes(k)) raw[k] = v;
  for (const k of MULTI) raw[k] = fd.getAll(k);
  for (const k of BOOLS) raw[k] = fd.has(k);
  raw.accent = fd.has('accentOn') ? fd.get('accent') : '';
  raw.stays = raw.multiStay ? readRows('stays') : [{ ...emptyStay(), type: fd.get('stayType'), area: fd.get('stayArea') }];
  raw.legs = readRows('legs');
  return normalize(raw);
}

function writeForm(s: TripState) {
  form.reset();
  for (const [k, v] of Object.entries(s)) {
    if (k === 'stays' || k === 'legs' || k === 'accent') continue;
    const el = field(k);
    if (!el) continue;
    if (Array.isArray(v)) {
      const on = v as string[];
      for (const box of $$<HTMLInputElement>(`input[name="${k}"]`, form)) box.checked = on.includes(box.value);
    } else if (typeof v === 'boolean') {
      (el as HTMLInputElement).checked = v;
    } else {
      el.value = String(v); // inputs, selects and radio groups (RadioNodeList) all take .value
    }
  }
  (field('accentOn') as HTMLInputElement).checked = Boolean(s.accent);
  (field('accent') as HTMLInputElement).value = s.accent || '#0b5f7a';
  const single = !s.multiStay ? s.stays[0] : undefined;
  (field('stayType') as HTMLInputElement).value = single?.type ?? '';
  (field('stayArea') as HTMLInputElement).value = single?.area ?? '';
  $('#stays').replaceChildren();
  $('#legs').replaceChildren();
  if (s.multiStay) for (const st of s.stays) addRow('stays', st);
  for (const l of s.legs) addRow('legs', l);
  for (const el of $$<HTMLInputElement | HTMLTextAreaElement>('[data-pii]', form)) checkPii(el);
}

// ---------------- Conditional sections ----------------

function updateVisibility(s: TripState) {
  const values: Record<string, string> = Object.fromEntries(
    Object.entries(s).map(([k, v]) => [k, typeof v === 'boolean' ? String(v) : Array.isArray(v) ? v.join(' ') : String(v)]),
  );
  values.accentOn = String((field('accentOn') as HTMLInputElement).checked);
  for (const el of $$<HTMLElement>('[data-when]', form)) {
    const [key, opts] = el.dataset.when!.split(':');
    el.hidden = !opts.split('|').includes(values[key]);
  }
}

// ---------------- Steps ----------------

const navList = $('#step-nav');
STEP_TITLES.forEach((t, i) => {
  const li = document.createElement('li');
  const b = Object.assign(document.createElement('button'), { type: 'button' });
  b.dataset.goto = String(i);
  const num = Object.assign(document.createElement('span'), { className: 'num', textContent: `${i + 1}` });
  b.append(num, t);
  li.append(b);
  navList.append(li);
});

function placePlane() {
  const track = document.getElementById('progress-track') as unknown as SVGPathElement | null;
  const plane = document.getElementById('progress-plane') as unknown as SVGGElement | null;
  if (!track || !plane) return;
  const len = track.getTotalLength();
  const at = (len * current) / (steps.length - 1);
  const p = track.getPointAtLength(Math.min(at, len - 0.5));
  const q = track.getPointAtLength(Math.min(at + 1, len));
  const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  plane.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
}

function go(i: number, focus = true) {
  current = Math.max(0, Math.min(steps.length - 1, i));
  steps.forEach((s, j) => (s.hidden = j !== current));
  $$<HTMLButtonElement>('button', navList).forEach((b, j) => {
    if (j === current) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  $<HTMLButtonElement>('#prev').hidden = current === 0;
  const next = $<HTMLButtonElement>('#next');
  next.textContent = current === steps.length - 1 ? 'Preview prompt' : `Next: ${STEP_TITLES[current + 1]}`;
  placePlane();
  if (focus) {
    $('h2', steps[current]).focus();
    steps[current].scrollIntoView({ block: 'nearest' });
  }
}

navList.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-goto]');
  if (b) go(Number(b.dataset.goto));
});
$('#prev').addEventListener('click', () => go(current - 1));
$('#next').addEventListener('click', () => {
  if (current < steps.length - 1) return go(current + 1);
  if (matchMedia('(min-width: 1100px)').matches) $('.preview-side .preview-body').focus();
  else openDialog();
});

// ---------------- Render loop ----------------

const REMEMBER = 'tripforge:remember';
const rememberBox = $<HTMLInputElement>('#remember');
const remember = () => rememberBox.checked;
// defaultChecked, not checked: form.reset() in writeForm() must not untick it.
try {
  rememberBox.defaultChecked = rememberBox.checked = localStorage.getItem(REMEMBER) !== 'no';
} catch {
  rememberBox.defaultChecked = rememberBox.checked = false;
}
rememberBox.addEventListener('change', () => {
  rememberBox.defaultChecked = rememberBox.checked;
  try {
    if (rememberBox.checked) {
      localStorage.removeItem(REMEMBER);
      localStorage.setItem(STORE, JSON.stringify(state));
    } else {
      localStorage.setItem(REMEMBER, 'no');
      localStorage.removeItem(STORE);
    }
  } catch {
    /* ignore */
  }
  $('#tools-status').textContent = rememberBox.checked
    ? 'Your answers will be remembered on this device.'
    : 'Your answers will be forgotten when you leave this page.';
});

let state = defaults();
let promptText = '';

function render() {
  state = readForm();
  promptText = buildPrompt(state);
  const words = String(wordCount(promptText));
  for (const pre of $$('[data-prompt]')) {
    if (pre.textContent !== promptText) for (const st of $$('.copied-stamp')) st.classList.remove('stamped'); // changed since copying
    pre.textContent = promptText;
  }
  for (const w of $$('[data-words]')) w.textContent = words;
  updateVisibility(state);
  try {
    if (remember()) localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    /* storage blocked: the form still works, it just will not be remembered */
  }
  // Clear error marks once fixed.
  const open = new Set(missing(state).flatMap((m) => RELATED[m.field] ?? [m.field]));
  for (const el of $$('[aria-invalid="true"]', form)) {
    if (!open.has((el as HTMLInputElement).name || el.id)) el.removeAttribute('aria-invalid');
  }
  if (errorsBox.childElementCount && open.size === 0) errorsBox.replaceChildren();
}

let timer = 0;
form.addEventListener('input', (e) => {
  const t = e.target as HTMLElement;
  if (t.matches('[data-pii]')) checkPii(t as HTMLInputElement);
  clearTimeout(timer);
  timer = window.setTimeout(render, 120);
});
form.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'multiStay' && t.checked && !$('#stays').childElementCount) {
    const dest = (field('destination') as HTMLInputElement).value;
    addRow('stays', { place: dest, from: (field('start') as HTMLInputElement).value, to: (field('end') as HTMLInputElement).value });
  }
  render();
});
form.addEventListener('submit', (e) => e.preventDefault());

form.addEventListener('click', (e) => {
  const t = e.target as Element;
  const add = t.closest<HTMLButtonElement>('[data-add]');
  if (add) {
    const kind = add.dataset.add as 'stays' | 'legs';
    const row = addRow(kind, kind === 'legs' ? (emptyLeg() as unknown as Record<string, string>) : {});
    $<HTMLInputElement>('[data-key]', row).focus();
    render();
    return;
  }
  const rm = t.closest('[data-remove]');
  if (rm) {
    const row = rm.closest('.repeat-row')!;
    const list = row.parentElement!;
    const kind = list.id;
    row.remove();
    renumber(kind);
    const rows = $$('.repeat-row', list);
    (rows.length ? $<HTMLInputElement>('[data-key]', rows.at(-1)!) : $<HTMLButtonElement>(`[data-add="${kind}"]`)).focus();
    render();
  }
});

// ---------------- Validation, copy & download ----------------

// Every control an error is about, so all of them get aria-invalid.
const RELATED: Record<string, string[]> = { start: ['start', 'end'], end: ['start', 'end'], month: ['month', 'nights'] };

function showMissing(): boolean {
  const miss = missing(state);
  errorsBox.replaceChildren();
  if (miss.length === 0) return true;
  const p = Object.assign(document.createElement('p'), { textContent: 'A few things are still needed before the prompt is ready:' });
  const ul = document.createElement('ul');
  for (const m of miss) {
    const li = document.createElement('li');
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'link-btn', textContent: m.message });
    b.addEventListener('click', () => {
      go(m.step, false);
      const el = document.getElementById(m.field) ?? $<HTMLInputElement>(`[name="${m.field}"]`, form);
      el?.focus();
    });
    li.append(b);
    ul.append(li);
    for (const name of RELATED[m.field] ?? [m.field]) {
      for (const el of $$(`[name="${name}"]`, form)) el.setAttribute('aria-invalid', 'true');
    }
  }
  errorsBox.append(p, ul);
  if (dialog.open) dialog.close();
  errorsBox.focus();
  errorsBox.scrollIntoView({ block: 'center' });
  return false;
}

function status(msg: string) {
  for (const s of $$('[data-status]')) s.textContent = msg;
}

async function copy() {
  render();
  if (!showMissing()) return status('');
  try {
    await navigator.clipboard.writeText(promptText);
    status('Copied. Paste it into a new chat with your AI.');
    for (const st of $$('.copied-stamp')) {
      st.classList.remove('stamped');
      void st.getBoundingClientRect(); // restart the stamp animation
      st.classList.add('stamped');
    }
  } catch {
    // Clipboard blocked: select the text so the person can copy it by hand.
    const side = $('.preview-side');
    if (!dialog.open && side.offsetParent === null) dialog.showModal(); // side panel is hidden on small screens
    const pre = $(dialog.open ? '#preview-dialog [data-prompt]' : '.preview-side [data-prompt]');
    const range = document.createRange();
    range.selectNodeContents(pre);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    status('Your browser blocked copying. The prompt is selected: press Ctrl+C (or ⌘C) to copy it.');
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-copy]')) void copy();
  if (t.closest('[data-download]')) {
    render();
    if (!showMissing()) return;
    download('tripforge-prompt.md', promptText, 'text/markdown');
    status('Downloaded tripforge-prompt.md.');
  }
});

// ---------------- Mobile preview dialog ----------------

const dialog = $<HTMLDialogElement>('#preview-dialog');
function openDialog() {
  render();
  status('');
  dialog.showModal();
}
$('#open-preview').addEventListener('click', openDialog);
$('#close-preview').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close(); // click on the backdrop
});

// ---------------- Save / load / reset ----------------

const toolsStatus = $('#tools-status');
$('#export').addEventListener('click', () => {
  render();
  download('tripforge-answers.json', `${JSON.stringify(state, null, 2)}\n`, 'application/json');
  toolsStatus.textContent = 'Saved tripforge-answers.json to your device.';
});

$<HTMLInputElement>('#import').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    toolsStatus.textContent = 'That file is too big to be TripForge answers.';
    return;
  }
  try {
    const s = normalize(JSON.parse(await file.text()));
    writeForm(s);
    render();
    toolsStatus.textContent = 'Answers loaded.';
  } catch {
    toolsStatus.textContent = 'That file could not be read. Is it a TripForge answers file?';
  }
});

$('#start-over').addEventListener('click', () => {
  if (!confirm('Clear all your answers and start over?')) return;
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
  writeForm(defaults());
  errorsBox.replaceChildren();
  render();
  go(0);
  toolsStatus.textContent = 'Cleared.';
});

// ---------------- Start-up ----------------

function loadSaved(): TripState {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? normalize(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

// Only these URL params are read, and only values from the static lists are accepted.
function fromUrl(s: TripState): TripState {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return s;
  const example = PRESETS.find((p) => p.id === q.get('example'));
  history.replaceState(null, '', location.pathname);
  // A link must never silently wipe a draft.
  const hasDraft = JSON.stringify(s) !== JSON.stringify(defaults());
  if ((example || q.has('dest')) && hasDraft && !confirm('Replace your saved answers with this trip?')) return s;
  let next = example ? structuredClone(example.state) : s;
  const theme = findTheme(q.get('theme') ?? '');
  const dest = findDestination(q.get('theme') ?? '', q.get('dest') ?? '');
  if (dest) next = { ...next, mode: 'know', destination: `${dest.name}, ${dest.country}`, theme: theme!.id, multiStay: false };
  else if (q.get('mode') === 'inspire') next = { ...next, mode: 'inspire', theme: theme?.id ?? next.theme };
  return next;
}

renderOptions(document);
attachPii(form);
writeForm(fromUrl(loadSaved()));
render();
go(0, false);
