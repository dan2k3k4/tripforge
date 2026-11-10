// Every choice the builder offers. state.ts validates against these, prompt.ts reads the labels.

export type Option<T extends string = string> = { id: T; label: string; hint?: string };

export const PARTY = [
  { id: 'solo', label: 'Solo' },
  { id: 'couple', label: 'Couple' },
  { id: 'family', label: 'Family with kids' },
  { id: 'friends', label: 'Group of friends' },
] as const satisfies readonly Option[];

export const REACH = [
  { id: 'train', label: 'A train ride away' },
  { id: 'short', label: 'A short flight' },
  { id: 'long', label: 'Long-haul is fine' },
  { id: 'anywhere', label: 'Anywhere in the world' },
] as const satisfies readonly Option[];

export const STAY_TYPES = [
  { id: 'hotel', label: 'Hotel' },
  { id: 'rental', label: 'Holiday rental / Airbnb' },
  { id: 'hut', label: 'Mountain hut' },
  { id: 'camping', label: 'Camping' },
  { id: 'friends', label: 'Friends or family' },
  { id: 'undecided', label: 'Not booked yet' },
] as const satisfies readonly Option[];

export const TRAVEL_MODES = [
  { id: 'flight', label: 'Flight' },
  { id: 'train', label: 'Train' },
  { id: 'car', label: 'Car' },
  { id: 'bus', label: 'Bus' },
  { id: 'ferry', label: 'Ferry' },
  { id: 'bike', label: 'Bike' },
  { id: 'foot', label: 'On foot' },
] as const satisfies readonly Option[];

export const TIME_OF_DAY = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
] as const satisfies readonly Option[];

export const PACE = [
  { id: 'chill', label: 'Chill', hint: 'Long breakfasts, one thing a day, lots of free time' },
  { id: 'balanced', label: 'Balanced', hint: 'A plan for each day with room to wander' },
  { id: 'packed', label: 'Packed', hint: 'See and do as much as possible' },
] as const satisfies readonly Option[];

export const INTERESTS = [
  { id: 'museums', label: 'Museums & history' },
  { id: 'food', label: 'Food & drink' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'running', label: 'Running' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'beach', label: 'Swimming & beaches' },
  { id: 'snow', label: 'Skiing & snow' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'shopping', label: 'Shopping & markets' },
  { id: 'nature', label: 'Nature & wildlife' },
  { id: 'photo', label: 'Photography' },
  { id: 'kids', label: 'Things for kids' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'events', label: 'Concerts, shows & events' },
] as const satisfies readonly Option[];

export const RUN_SURFACE = [
  { id: 'any', label: 'Any' },
  { id: 'paved', label: 'Paved / city' },
  { id: 'trail', label: 'Trails & parks' },
  { id: 'flat', label: 'Flat, please' },
] as const satisfies readonly Option[];

export const HIKE_LEVEL = [
  { id: 'easy', label: 'Easy walks' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'hard', label: 'Challenging' },
] as const satisfies readonly Option[];

export const BUDGET_STYLE = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid', label: 'Mid-range' },
  { id: 'splurge', label: 'Splurge' },
] as const satisfies readonly Option[];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'CAD', 'AUD', 'NZD', 'JPY', 'INR', 'ZAR', 'BRL', 'MXN', 'SGD'] as const;

export const BUDGET_COVERS = [
  { id: 'travel', label: 'Travel there and back' },
  { id: 'stay', label: 'Accommodation' },
  { id: 'food', label: 'Food' },
  { id: 'activities', label: 'Activities' },
] as const satisfies readonly Option[];

export const AIS = [
  { id: 'other', label: 'Other / not sure' },
  { id: 'claude', label: 'Claude' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'copilot', label: 'Microsoft Copilot' },
  { id: 'lechat', label: 'Le Chat (Mistral)' },
  { id: 'local', label: 'A local / self-hosted model' },
] as const satisfies readonly Option[];

export const FORMATS = [
  { id: 'file', label: 'A single HTML file', hint: 'Keep it on your phone or laptop and open it offline. Nothing to host, nothing to lock down.' },
  { id: 'artifact', label: 'A page inside my AI chat', hint: 'Claude Artifacts, ChatGPT Canvas or Gemini Canvas. Nothing to host.' },
  { id: 'pdf', label: 'A printable document / PDF', hint: 'A clean itinerary to print or keep as a PDF.' },
  { id: 'site', label: 'A hosted website', hint: 'A full multi-page site on the web. Technical: you must keep it behind a login.' },
] as const satisfies readonly Option[];

export const BUILDERS = [
  { id: 'chat', label: 'A chat AI', hint: 'It writes the files, I upload them' },
  { id: 'agent', label: 'A coding agent', hint: 'Claude Code, Cursor, Codex… it works in a git repo' },
] as const satisfies readonly Option[];

export const HOSTS = [
  { id: 'cloudflare', label: 'Cloudflare Pages + Zero Trust login (recommended)' },
  { id: 'netlify', label: 'Netlify' },
  { id: 'vercel', label: 'Vercel' },
  { id: 'github', label: 'GitHub Pages' },
  { id: 'own', label: 'My own server' },
  { id: 'unsure', label: 'Not sure yet' },
] as const satisfies readonly Option[];

export const VIBES = [
  { id: 'match', label: 'Match my destination' },
  { id: 'beach', label: 'Beach' },
  { id: 'mountain', label: 'Mountains' },
  { id: 'city', label: 'City' },
  { id: 'snow', label: 'Snow' },
  { id: 'desert', label: 'Desert' },
  { id: 'forest', label: 'Forest' },
] as const satisfies readonly Option[];

export const SCHEMES = [
  { id: 'auto', label: 'Follow my device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const satisfies readonly Option[];

export const UNITS = [
  { id: 'metric', label: 'Metric (km, °C)' },
  { id: 'imperial', label: 'Imperial (miles, °F)' },
] as const satisfies readonly Option[];

export const CLOCKS = [
  { id: '24h', label: '24-hour (18:30)' },
  { id: '12h', label: '12-hour (6:30 pm)' },
] as const satisfies readonly Option[];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export type FeatureId = (typeof FEATURES)[number]['id'];

// `on`: ticked by default. Itinerary is always included and not listed here.
export const FEATURES = [
  { id: 'weather', label: 'Weather forecast', hint: 'Yr.no / Open-Meteo, with a climate fallback', on: true },
  { id: 'packing', label: 'Packing list', hint: 'Tick-off list per traveller', on: true },
  { id: 'checklist', label: 'Pre-trip checklist', hint: 'Documents, insurance, chargers, house sitting…', on: false },
  { id: 'webcams', label: 'Webcams', hint: 'Live views of where you are going, when they exist', on: false },
  { id: 'map', label: 'Map', hint: 'Places, stays and routes', on: false },
  { id: 'today', label: 'Today view', hint: 'Sunrise, sunset, golden hour, time difference from home', on: false },
  { id: 'rainy', label: 'Rainy-day ideas', hint: 'Indoor backups for each place', on: false },
  { id: 'holidays', label: 'Public holidays & closures', hint: 'What is shut on which day', on: false },
  { id: 'events', label: 'Local events', hint: 'Festivals, concerts, markets during your dates', on: false },
  { id: 'tips', label: 'Local tips', hint: 'Money, tipping, visa, customs, emergency numbers', on: false },
  { id: 'phrases', label: 'Phrases', hint: 'Handy words in the local language', on: false },
  { id: 'plugs', label: 'Plugs, power & SIM', hint: 'Adapter type, voltage, eSIM options', on: false },
  { id: 'emergency', label: 'Offline emergency card', hint: 'Emergency numbers, embassy, insurance placeholder', on: false },
  { id: 'money', label: 'Currency converter & spending', hint: 'Exchange rates and a private expense tracker', on: false },
  { id: 'calendar', label: 'Add to calendar (.ics)', hint: 'Put each day on your phone calendar', on: false },
  { id: 'marine', label: 'Sea or snow conditions', hint: 'Waves, water temperature, or snow depth', on: false },
  { id: 'tides', label: 'Tide times', hint: 'For coastal trips', on: false },
  { id: 'accessnotes', label: 'Accessibility notes', hint: 'Step-free access, lifts, toilets per venue', on: false },
  { id: 'souvenirs', label: 'Souvenir & shopping list', hint: 'Who to bring what', on: false },
  { id: 'notes', label: 'Trip notes', hint: 'A free notes page on your device', on: false },
  { id: 'offline', label: 'Works offline', hint: 'Install it like an app (hosted sites only)', on: false },
] as const satisfies readonly (Option & { on: boolean })[];

export const LANGUAGES = [
  'English', 'Deutsch', 'Français', 'Español', 'Italiano', 'Nederlands', 'Português', 'Norsk', 'Svenska', 'Dansk', 'Suomi', 'Polski', 'Čeština', 'Türkçe', 'Ελληνικά', '日本語', '中文', '한국어', 'العربية', 'हिन्दी',
] as const;

export const label = (list: readonly Option[], id: string) => list.find((o) => o.id === id)?.label ?? id;
