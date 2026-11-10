import { label, FEATURES, FORMATS, INTERESTS, PACE } from './data/options';
import { PRESETS } from './data/presets';
import { buildPrompt, fmtDate, wordCount } from './lib/prompt';

const root = document.getElementById('examples')!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

for (const p of PRESETS) {
  const s = p.state;
  const prompt = buildPrompt(s);
  const when = s.dateKind === 'fixed' ? `${fmtDate(s.start)} to ${fmtDate(s.end)}` : `${s.nights} nights in ${s.month}`;
  const rows: [string, string][] = [
    ['Where', s.multiStay ? s.stays.map((x) => x.place).join(' → ') : s.destination],
    ['When', when],
    ['Who', `${s.travellers} · ${s.party}${s.kidAges ? ` (kids ${s.kidAges})` : ''}`],
    ['Pace', label(PACE, s.pace)],
    ['Loves', s.interests.map((i) => label(INTERESTS, i)).join(', ')],
    ['Extras', s.features.map((f) => label(FEATURES, f)).join(', ')],
    ['Format', label(FORMATS, s.format)],
  ];
  const dl = el('dl');
  for (const [k, v] of rows) if (v) dl.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
  const id = `ex-${p.id}`;
  root.append(
    el(
      'article',
      { className: 'card example', id },
      el('h2', { textContent: p.title }),
      el('p', { className: 'muted', textContent: p.blurb }),
      dl,
      el('div', { className: 'actions' }, el('a', { className: 'btn', href: `/build?example=${p.id}`, textContent: 'Load into builder' })),
      el('details', {}, el('summary', { textContent: `Show the prompt (${wordCount(prompt)} words)` }), el('pre', { tabIndex: 0, textContent: prompt })),
    ),
  );
}
