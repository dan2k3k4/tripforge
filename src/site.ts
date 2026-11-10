// Shared by every page: CSS and the light / dark / auto theme toggle.
import './styles.css';

const KEY = 'tripforge:theme';
const MODES = ['auto', 'light', 'dark'] as const;
type Mode = (typeof MODES)[number];
const LABEL: Record<Mode, string> = { auto: 'follow device', light: 'light', dark: 'dark' };

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function apply(mode: Mode, announce = false) {
  if (mode === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    b.dataset.mode = mode;
    b.title = `Colour theme: ${LABEL[mode]}`;
  }
  const status = document.querySelector('[data-theme-status]');
  if (status && announce) status.textContent = `Colour theme: ${LABEL[mode]}`;
}

let current = read();
apply(current);

document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest('[data-theme-toggle]');
  if (!btn) return;
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
  current = next;
  try {
    if (next === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* private mode: the choice just lasts for this page */
  }
  apply(next, true);
});
