import {
  AIS, BUDGET_COVERS, BUDGET_STYLE, BUILDERS, CLOCKS, CURRENCIES, FEATURES, FORMATS, HIKE_LEVEL, HOSTS, INTERESTS,
  LANGUAGES, MONTHS, PACE, PARTY, REACH, RUN_SURFACE, SCHEMES, STAY_TYPES, TIME_OF_DAY, TRAVEL_MODES, UNITS, VIBES,
  type Option,
} from '../data/options.ts';
import { ALL_THEMES } from '../data/themes.ts';

export type Stay = { place: string; from: string; to: string; type: string; area: string };
export type Leg = { from: string; to: string; date: string; mode: string; time: string };

export type TripState = {
  mode: 'know' | 'inspire';
  dateKind: 'fixed' | 'flex';
  start: string;
  end: string;
  month: string;
  nights: string;
  destination: string;
  home: string;
  travellers: string;
  party: string;
  kidAges: string;
  reach: string;
  theme: string;
  multiStay: boolean;
  stays: Stay[];
  legs: Leg[];
  pace: string;
  interests: string[];
  runs: boolean;
  runDistance: string;
  runSurface: string;
  runTime: string;
  hikes: boolean;
  hikeLevel: string;
  hikeMax: string;
  diet: string;
  access: string;
  notes: string;
  budgetStyle: string;
  budgetMax: string;
  currency: string;
  budgetPer: 'group' | 'person';
  budgetCovers: string[];
  features: string[];
  ai: string;
  format: string;
  builder: string;
  host: string;
  vibe: string;
  scheme: string;
  accent: string;
  language: string;
  units: string;
  clock: string;
};

export const emptyStay = (): Stay => ({ place: '', from: '', to: '', type: '', area: '' });
export const emptyLeg = (): Leg => ({ from: '', to: '', date: '', mode: '', time: '' });

export const defaults = (): TripState => ({
  mode: 'know',
  dateKind: 'fixed',
  start: '',
  end: '',
  month: '',
  nights: '',
  destination: '',
  home: '',
  travellers: '',
  party: '',
  kidAges: '',
  reach: '',
  theme: '',
  multiStay: false,
  stays: [],
  legs: [],
  pace: '',
  interests: [],
  runs: false,
  runDistance: '',
  runSurface: 'any',
  runTime: 'morning',
  hikes: false,
  hikeLevel: 'moderate',
  hikeMax: '',
  diet: '',
  access: '',
  notes: '',
  budgetStyle: '',
  budgetMax: '',
  currency: 'EUR',
  budgetPer: 'group',
  budgetCovers: [],
  features: FEATURES.filter((f) => f.on).map((f) => f.id),
  ai: 'other',
  format: 'file',
  builder: 'chat',
  host: 'cloudflare',
  vibe: 'match',
  scheme: 'auto',
  accent: '',
  language: 'English',
  units: 'metric',
  clock: '24h',
});

// ---- Validation at the trust boundary (localStorage, imported files, URL params) ----

const MAX_TEXT = 300;
const MAX_LONG = 2000;
const MAX_ROWS = 20;

// Strip control and invisible format characters (zero-width, bidi overrides, Unicode tag characters): they would
// reach the AI unseen. Short fields become one line; long fields keep line breaks (prompt.ts flattens them).
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
const str = (v: unknown, max = MAX_TEXT) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').replace(INVISIBLE, '').slice(0, max).trim() : '';
const long = (v: unknown) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/(?!\n)[\p{Cc}\p{Cf}]/gu, '').slice(0, MAX_LONG).trim() : '';
const oneOf = (v: unknown, list: readonly Option[] | readonly string[], fallback = '') => {
  const ids = list.map((o) => (typeof o === 'string' ? o : o.id));
  return typeof v === 'string' && ids.includes(v) ? v : fallback;
};
const someOf = (v: unknown, list: readonly Option[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && list.some((o) => o.id === x)))] : [];
const isoDate = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : '');
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? String(Math.round(n)) : '';
};
const hexColor = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '');
const rows = <T>(v: unknown, f: (r: Record<string, unknown>) => T) =>
  Array.isArray(v) ? v.slice(0, MAX_ROWS).filter((r) => r && typeof r === 'object').map((r) => f(r as Record<string, unknown>)) : [];

/** Turn anything (parsed JSON, form data) into a valid TripState. Unknown keys and bad values are dropped. */
export function normalize(input: unknown): TripState {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const base = defaults();
  return {
    mode: o.mode === 'inspire' ? 'inspire' : 'know',
    dateKind: o.dateKind === 'flex' ? 'flex' : 'fixed',
    start: isoDate(o.start),
    end: isoDate(o.end),
    month: oneOf(o.month, MONTHS),
    nights: num(o.nights, 1, 90),
    destination: str(o.destination),
    home: str(o.home),
    travellers: num(o.travellers, 1, 30),
    party: oneOf(o.party, PARTY),
    kidAges: str(o.kidAges, 60),
    reach: oneOf(o.reach, REACH),
    theme: oneOf(o.theme, ALL_THEMES.map((t) => t.id)),
    multiStay: o.multiStay === true,
    stays: rows(o.stays, (r) => ({
      place: str(r.place),
      from: isoDate(r.from),
      to: isoDate(r.to),
      type: oneOf(r.type, STAY_TYPES),
      area: str(r.area),
    })),
    legs: rows(o.legs, (r) => ({
      from: str(r.from),
      to: str(r.to),
      date: isoDate(r.date),
      mode: oneOf(r.mode, TRAVEL_MODES),
      time: oneOf(r.time, TIME_OF_DAY),
    })),
    pace: oneOf(o.pace, PACE),
    interests: someOf(o.interests, INTERESTS),
    runs: o.runs === true,
    runDistance: str(o.runDistance, 40),
    runSurface: oneOf(o.runSurface, RUN_SURFACE, base.runSurface),
    runTime: oneOf(o.runTime, TIME_OF_DAY, base.runTime),
    hikes: o.hikes === true,
    hikeLevel: oneOf(o.hikeLevel, HIKE_LEVEL, base.hikeLevel),
    hikeMax: str(o.hikeMax, 40),
    diet: str(o.diet),
    access: long(o.access),
    notes: long(o.notes),
    budgetStyle: oneOf(o.budgetStyle, BUDGET_STYLE),
    budgetMax: num(o.budgetMax, 1, 10_000_000),
    currency: oneOf(o.currency, CURRENCIES, base.currency),
    budgetPer: o.budgetPer === 'person' ? 'person' : 'group',
    budgetCovers: someOf(o.budgetCovers, BUDGET_COVERS),
    features: Array.isArray(o.features) ? someOf(o.features, FEATURES) : base.features,
    ai: oneOf(o.ai, AIS, base.ai),
    format: oneOf(o.format, FORMATS, base.format),
    builder: oneOf(o.builder, BUILDERS, base.builder),
    host: oneOf(o.host, HOSTS, base.host),
    vibe: oneOf(o.vibe, VIBES, base.vibe),
    scheme: oneOf(o.scheme, SCHEMES, base.scheme),
    accent: hexColor(o.accent),
    language: oneOf(o.language, LANGUAGES, base.language),
    units: oneOf(o.units, UNITS, base.units),
    clock: oneOf(o.clock, CLOCKS, base.clock),
  };
}

export type Missing = { field: string; step: number; message: string };

/** Required: dates (fixed or flexible), a place (unless inspire mode), a pace or one interest. */
export function missing(s: TripState): Missing[] {
  const out: Missing[] = [];
  if (s.dateKind === 'fixed') {
    if (!s.start || !s.end) out.push({ field: 'start', step: 0, message: 'Add your start and end dates (or choose flexible dates).' });
    else if (s.end < s.start) out.push({ field: 'end', step: 0, message: 'The end date is before the start date.' });
  } else if (!s.month || !s.nights) {
    out.push({ field: 'month', step: 0, message: 'Pick a month and how many nights.' });
  }
  if (s.mode === 'know' && !s.destination && !(s.multiStay && s.stays.some((x) => x.place))) {
    out.push({ field: 'destination', step: 0, message: 'Say where you are going (or choose “Help me pick”).' });
  }
  if (!s.pace && s.interests.length === 0) {
    out.push({ field: 'pace', step: 2, message: 'Choose a pace or at least one interest.' });
  }
  return out;
}

/** Hosts without a free, real login: the generated site must not contain anything identifying. */
export const publicSafe = (s: TripState) => s.format === 'site' && ['netlify', 'vercel', 'github'].includes(s.host);
