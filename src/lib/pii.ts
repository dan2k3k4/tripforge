// Spots things people should not paste into an AI chat. It only warns, it never blocks:
// false positives are fine, the point is a nudge.
// ponytail: regex heuristics, not a real PII classifier. Good enough for a "did you mean to share that?" hint.

export type PiiKind = 'email' | 'phone' | 'flight' | 'booking' | 'passport' | 'address' | 'card';

export const PII_LABELS: Record<PiiKind, string> = {
  email: 'an email address',
  phone: 'a phone number',
  flight: 'a flight or train number',
  booking: 'a booking or confirmation code',
  passport: 'a passport or ID number',
  address: 'a street address',
  card: 'a card number',
};

// Street names start with a capital letter; the suffix list spells out both cases so the rest stays case-sensitive.
const STREET_WORDS = '[Ss]treet|St\\.?|[Rr]oad|Rd\\.?|[Aa]venue|Ave\\.?|[Ll]ane|Ln\\.?|[Dd]rive|Dr\\.?|[Bb]oulevard|Blvd\\.?|[Cc]rescent|[Tt]errace';
const STREET_SUFFIXES = 'stra(?:ss|ß)e|str\\.|gasse|weg|platz|allee|vej|gata|gatan|veien|vegen|laan|straat|gracht|ulica';
const NOT_UNIT = '(?!\\s*(?:km|mi|m|min|h|hours?|nights?|days?|people|kg|%|°))';

const PATTERNS: [PiiKind, RegExp][] = [
  ['email', /[^\s@]+@[^\s@]+\.[a-z]{2,}/i],
  ['phone', /(?:\+|\b00)\d{1,3}[\s().-]*\d(?:[\s().-]*\d){6,}/],
  ['phone', /\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/],
  ['passport', /\b(?:[Pp]assport|ID|[Aa]usweis|[Pp]asseport)\b.{0,20}?\b[A-Z0-9]{6,9}\b/],
  ['booking', /\b(?:[Bb]ooking|[Cc]onfirmation|[Rr]eservation|PNR|[Rr]ef(?:erence)?|[Cc]ode)\b.{0,15}?\b[A-Z0-9]{5,10}\b/],
  // Two-character airline code (or a train type) + 1-4 digits: LX 1234, BA287, U2 4021, ICE 578.
  ['flight', new RegExp(`\\b(?:[A-Z]{2}|[A-Z]\\d|\\d[A-Z]|ICE|TGV|IC|EC|RJ)\\s?\\d{2,4}\\b${NOT_UNIT}`)],
  // 6-10 uppercase letters and digits, mixed: looks like a PNR / booking code.
  ['booking', /\b(?=[A-Z0-9]{6,10}\b)(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,10}\b/],
  ['address', new RegExp(`\\b\\d{1,5}[A-Za-z]?,?\\s+(?:\\p{Lu}[\\p{L}'’-]*\\s+){1,3}(?:${STREET_WORDS})(?=[\\s,.]|$)`, 'u')],
  ['address', new RegExp(`\\p{L}+(?:${STREET_SUFFIXES})\\s+\\d{1,5}[a-z]?\\b${NOT_UNIT}`, 'iu')],
  ['address', /\b\d{1,5},?\s+(?:rue|avenue|boulevard|calle|avenida|piazza|plaza)\s/iu],
  ['address', /\b(?:Via|Calle|Rua|Piazza|Rue)\s+\p{Lu}[\p{L}'’ -]{1,40}?,?\s\d{1,5}\b/u],
];

// Card numbers: 13-19 digits that pass the Luhn check, so dates and phone numbers do not trip it.
function hasCard(text: string): boolean {
  for (const m of text.matchAll(/(?:\d[ -]?){13,19}/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 13) continue;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let n = Number(digits[digits.length - 1 - i]);
      if (i % 2) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
      sum += n;
    }
    if (sum % 10 === 0) return true;
  }
  return false;
}

/** Kinds of personal info found in the text, deduplicated, in a stable order. */
export function findPii(text: string): PiiKind[] {
  if (!text) return [];
  const found = new Set<PiiKind>();
  if (hasCard(text)) found.add('card');
  for (const [kind, re] of PATTERNS) if (re.test(text)) found.add(kind);
  if (found.has('card')) found.delete('phone');
  return [...found];
}

export function piiMessage(kinds: PiiKind[]): string {
  if (kinds.length === 0) return '';
  const list = kinds.map((k) => PII_LABELS[k]);
  const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} or ${list.at(-1)}`;
  return `This looks like it might contain ${joined}. Your AI does not need it to plan your trip. Keep details like this on your own device.`;
}
