import { describe, expect, it } from 'vitest';
import { findPii, piiMessage } from './pii.ts';

describe('findPii', () => {
  it.each([
    ['mail me at sam.doe@example.com', 'email'],
    ['call +41 79 123 45 67', 'phone'],
    ['my number is 555-123-4567', 'phone'],
    ['flight LX1234 lands at 10', 'flight'],
    ['on BA 287 out of London', 'flight'],
    ['taking the ICE 578', 'flight'],
    ['booking ref: XKQWZP', 'booking'],
    ['PNR X7YQ2P', 'booking'],
    ['passport number C01X00T47', 'passport'],
    ['we stay at 221B Baker Street', 'address'],
    ['Airbnb on Hauptstrasse 12', 'address'],
    ['apartment at 99 rue de Rivoli', 'address'],
    ['hotel on Via Roma 12', 'address'],
    ['card 4111 1111 1111 1111', 'card'],
  ])('flags %s', (text, kind) => {
    expect(findPii(text)).toContain(kind);
  });

  it.each([
    'Hotel in Bergen centre, arriving in the afternoon by train',
    'Want to hike 10 km a day, maybe 15 km on one day',
    '2 adults, kids aged 6 and 9, from 2026-12-24 to 2026-12-31',
    'Stay near the old town, we like UNESCO sites and markets',
    'We want 2 days on the way and 3 nice places to eat',
    'travel via Zurich, 2 nights there',
    'Booking the hotel later, no reservation yet',
    'Vegetarian, no nuts. A 10 km Rundweg would be lovely',
    '20 days in total, 14 people',
  ])('leaves alone: %s', (text) => {
    expect(findPii(text)).toEqual([]);
  });

  it('does not report a card as a phone too', () => {
    expect(findPii('4111 1111 1111 1111')).toEqual(['card']);
  });
});

describe('piiMessage', () => {
  it('is empty when nothing found', () => expect(piiMessage([])).toBe(''));
  it('joins kinds', () => expect(piiMessage(['email', 'phone'])).toContain('an email address or a phone number'));
});
