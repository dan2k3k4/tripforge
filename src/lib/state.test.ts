import { describe, expect, it } from 'vitest';
import { defaults, missing, normalize, publicSafe } from './state.ts';

describe('normalize', () => {
  it('returns defaults for junk', () => {
    expect(normalize(null)).toEqual(defaults());
    expect(normalize('nope')).toEqual(defaults());
  });

  it('drops unknown keys and invalid values', () => {
    const s = normalize({ evil: '<script>', format: 'exe', start: '2027-13-45', interests: ['food', 'hacking', 'food'], accent: 'red' });
    expect(s).not.toHaveProperty('evil');
    expect(s.format).toBe('file');
    expect(s.start).toBe('');
    expect(s.interests).toEqual(['food']);
    expect(s.accent).toBe('');
  });

  it('caps text length and row count', () => {
    const s = normalize({ notes: 'x'.repeat(5000), stays: Array.from({ length: 50 }, () => ({ place: 'A' })) });
    expect(s.notes.length).toBe(2000);
    expect(s.stays.length).toBe(20);
  });

  it('round-trips through JSON (export / import)', () => {
    const s = normalize({ mode: 'inspire', theme: 'christmas', dateKind: 'flex', month: 'December', nights: '5', pace: 'chill', stays: [{ place: 'Vienna', type: 'hotel' }] });
    expect(normalize(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('keeps an explicitly empty feature list', () => {
    expect(normalize({ features: [] }).features).toEqual([]);
    expect(normalize({}).features).toEqual(defaults().features);
  });
});

describe('missing', () => {
  it('requires dates, place and pace or interest', () => {
    expect(missing(defaults()).map((m) => m.field)).toEqual(['start', 'destination', 'pace']);
  });

  it('is satisfied by a minimal trip', () => {
    expect(missing(normalize({ start: '2027-01-01', end: '2027-01-05', destination: 'Oslo', pace: 'chill' }))).toEqual([]);
  });

  it('catches end before start', () => {
    expect(missing(normalize({ start: '2027-01-05', end: '2027-01-01', destination: 'Oslo', pace: 'chill' }))[0].field).toBe('end');
  });

  it('does not need a place in inspire mode, and accepts flexible dates', () => {
    expect(missing(normalize({ mode: 'inspire', dateKind: 'flex', month: 'May', nights: '7', interests: ['food'] }))).toEqual([]);
  });

  it('accepts a stay in place of a destination', () => {
    expect(missing(normalize({ start: '2027-01-01', end: '2027-01-05', multiStay: true, stays: [{ place: 'Rome' }], pace: 'chill' }))).toEqual([]);
  });
});

describe('publicSafe', () => {
  it('applies to hosts without a free login', () => {
    expect(publicSafe(normalize({ format: 'site', host: 'github' }))).toBe(true);
    expect(publicSafe(normalize({ format: 'site', host: 'cloudflare' }))).toBe(false);
    expect(publicSafe(normalize({ format: 'file', host: 'github' }))).toBe(false);
  });
});
