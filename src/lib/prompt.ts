import {
  AIS, BUDGET_COVERS, BUDGET_STYLE, HIKE_LEVEL, INTERESTS, PACE, PARTY, REACH, RUN_SURFACE, STAY_TYPES,
  TIME_OF_DAY, TRAVEL_MODES, VIBES, label, type FeatureId,
} from '../data/options';
import { findTheme } from '../data/themes';
import { publicSafe, type TripState } from './state';

// Builds the prompt from blocks. Each block is a function of the state that returns markdown or ''.
// Only enabled sections end up in the prompt, so it stays short enough for free AI tiers.

const DAY = 86_400_000;
const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const fmtDate = (iso: string) =>
  utc(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const nightsBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / DAY);

const list = (items: (string | false | undefined | null)[]) => items.filter(Boolean).map((x) => `- ${x}`).join('\n');
const section = (title: string, body: string) => (body.trim() ? `## ${title}\n\n${body.trim()}` : '');
const has = (s: TripState, f: FeatureId) => s.features.includes(f);
// Free text from the user goes on one line so it cannot start its own heading or list.
const one = (t: string) => t.replace(/\s*\n\s*/g, ' / ');
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

type Ctx = {
  s: TripState;
  hosted: boolean;
  agent: boolean; // a coding agent working in a git repo
  pdf: boolean;
  safe: boolean;
  aiName: string;
};

const AI_HINTS: Record<string, { surface: string; temp: string; train: string; search: string }> = {
  claude: {
    surface: 'a Claude Artifact',
    temp: 'an incognito chat',
    train: 'the privacy settings, and switch off the option that lets your chats help improve Claude',
    search: 'make sure web search is switched on',
  },
  chatgpt: {
    surface: 'ChatGPT Canvas',
    temp: 'a Temporary Chat',
    train: 'Settings → Data controls and switch off “Improve the model for everyone”',
    search: 'make sure web search is switched on for this chat',
  },
  gemini: {
    surface: 'Gemini Canvas',
    temp: 'a temporary chat',
    train: 'your Gemini activity settings and switch off activity saving',
    search: 'Gemini can search the web; make sure it does for this chat',
  },
  copilot: {
    surface: 'a Copilot Page',
    temp: 'a private conversation if one is offered',
    train: 'the privacy settings and switch off model training',
    search: 'make sure web search is allowed',
  },
  lechat: {
    surface: 'a Le Chat Canvas',
    temp: 'an incognito chat',
    train: 'the privacy settings and switch off training on your chats',
    search: 'make sure web search is switched on',
  },
  local: {
    surface: 'a single HTML page',
    temp: 'a fresh conversation',
    train: 'your model settings (a local model usually keeps everything on your machine already)',
    search: 'if your setup has a web search tool, switch it on',
  },
  other: {
    surface: 'an artifact or canvas, if your chat has one',
    temp: 'a temporary or incognito chat, if your AI offers one',
    train: 'the privacy settings and switch off training on your chats, if you can',
    search: 'switch on web search if your AI has it',
  },
};

// ---------------- Blocks ----------------

function intro({ s, aiName }: Ctx): string {
  const goal = {
    file: 'a private trip planner as a single HTML file I keep on my own device',
    artifact: `a private trip planner page inside this chat${aiName ? ` (${AI_HINTS[s.ai]?.surface ?? 'an artifact'})` : ''}`,
    pdf: 'a clean, printable trip plan (PDF or print-ready document)',
    site: 'a private trip planner website that only my travel group can log in to',
  }[s.format];
  const steps = s.mode === 'inspire' ? 'help me choose where to go, then research it, plan it with me and build' : 'research my trip, plan it with me and build';
  return `# Plan my trip and build my trip planner

You are my travel planner and web designer. Please ${steps} ${goal}. Below is what I already know. Work through it with me step by step, and ask me before you build anything.`;
}

function privacy({ s }: Ctx): string {
  const h = AI_HINTS[s.ai] ?? AI_HINTS.other;
  return section(
    'Privacy rules (follow these the whole time)',
    `${list([
      'Do not ask me for booking references, confirmation numbers, flight or train numbers, seat numbers, passport or ID numbers, full names, birthdays, phone numbers, email addresses, my home address or payment details. You do not need them to plan a trip.',
      'If I share something like that anyway, tell me straight away that I did not need to, do not repeat it, and keep it out of everything you build.',
      'Where the plan would normally hold such a detail (check-in codes, booking references, insurance policy numbers), put a clear placeholder like `[[ADD LOCALLY: hotel booking reference]]`. I will fill it in myself on my own device after you hand the result over.',
      'Describe where we stay at neighbourhood level. A hotel name is fine if I give it; room numbers and door codes are not.',
    ])}

**Start your first reply** with a two- or three-sentence reminder for me: use ${h.temp}; open ${h.train}; and never paste booking confirmations, tickets or screenshots of them into an AI chat.`,
  );
}

function trip({ s }: Ctx): string {
  const dates =
    s.dateKind === 'fixed' && s.start && s.end
      ? `${fmtDate(s.start)} to ${fmtDate(s.end)} (${nightsBetween(s.start, s.end)} nights)`
      : s.dateKind === 'flex' && s.month
        ? `Flexible: about ${s.nights || 'some'} nights in ${s.month}. Suggest the best dates for weather, crowds and price.`
        : '';
  const who = [
    s.travellers && `${s.travellers} traveller${s.travellers === '1' ? '' : 's'}`,
    s.party && label(PARTY, s.party).toLowerCase(),
    s.party === 'family' && s.kidAges && `kids aged ${s.kidAges}`,
  ].filter(Boolean);
  const theme = findTheme(s.theme);
  const stays = s.multiStay ? s.stays.filter((x) => x.place) : [];
  const single = !s.multiStay ? s.stays[0] : undefined;

  const stayLines = stays.map((x) => {
    const when = x.from && x.to ? `${fmtDate(x.from)} to ${fmtDate(x.to)}` : x.from ? `from ${fmtDate(x.from)}` : 'dates to be decided';
    const kind = x.type ? label(STAY_TYPES, x.type) : '';
    return `${x.place}: ${when}${kind ? `, ${kind}` : ''}${x.area ? ` (${x.area})` : ''}`;
  });
  const legLines = s.legs
    .filter((l) => l.from || l.to)
    .map((l) =>
      [
        `${l.from || '?'} → ${l.to || '?'}`,
        l.mode && `by ${label(TRAVEL_MODES, l.mode).toLowerCase()}`,
        l.date && `on ${fmtDate(l.date)}`,
        l.time && `in the ${label(TIME_OF_DAY, l.time).toLowerCase()}`,
      ]
        .filter(Boolean)
        .join(' '),
    );

  const body = list([
    dates && `**When:** ${dates}`,
    s.home && `**Travelling from:** ${s.home}`,
    who.length > 0 && `**Who:** ${who.join(', ')}`,
    s.mode === 'know' && s.destination && `**Where:** ${one(s.destination)}`,
    theme && `**The idea:** ${theme.name}${s.mode === 'inspire' ? '' : ` (${theme.when})`}`,
    single && (single.type || single.area) &&
      `**Staying:** ${[single.type && label(STAY_TYPES, single.type), single.area && `in/near ${single.area}`].filter(Boolean).join(', ')}`,
  ]);
  const staysBlock = stayLines.length ? `\n\n**We stay in different places:**\n${list(stayLines)}` : '';
  const legsBlock = legLines.length ? `\n\n**Getting there and around:**\n${list(legLines)}` : '';
  return section('My trip', body + staysBlock + legsBlock);
}

function inspire({ s }: Ctx): string {
  if (s.mode !== 'inspire') return '';
  const theme = findTheme(s.theme);
  return section(
    'First: help me choose where to go',
    `I have not decided where to go yet. Suggest **3 to 5 destinations** that fit${s.reach ? ` (${label(REACH, s.reach).toLowerCase()} from ${s.home || 'home'})` : ''}${theme && theme.id !== 'surprise' ? `, in the spirit of “${theme.name}”` : ''}, my dates, what we enjoy and our budget. For each one give:

${list([
  'why it fits us, in two sentences',
  `how to get there${s.home ? ` from ${s.home}` : ''} and roughly how long it takes`,
  'typical weather at that time of year',
  'a rough cost per day for us, clearly labelled as an estimate (not a live price)',
  'one thing that could spoil it (crowds, weather, closures, a long journey)',
])}

Then ask me to pick one, or to see more. Only continue with the steps below once I have chosen.`,
  );
}

function enjoy({ s }: Ctx): string {
  const interests = s.interests.map((i) => label(INTERESTS, i).toLowerCase());
  const pace = s.pace ? PACE.find((p) => p.id === s.pace) : undefined;
  const body = list([
    pace && `**Pace:** ${pace.label.toLowerCase()} (${pace.hint.toLowerCase()})`,
    interests.length > 0 && `**We love:** ${andList(interests)}`,
    s.diet && `**Food needs:** ${one(s.diet)}`,
    s.access && `**Accessibility / mobility:** ${one(s.access)}. Take this into account everywhere and say clearly when something is not suitable.`,
    s.notes && `**In my own words:** ${one(s.notes)}`,
  ]);
  return section('What we enjoy', body);
}

function budget({ s }: Ctx): string {
  if (!s.budgetStyle && !s.budgetMax) return '';
  const covers = s.budgetCovers.map((c) => label(BUDGET_COVERS, c).toLowerCase());
  return section(
    'Budget',
    `${list([
      s.budgetStyle && `**Style:** ${label(BUDGET_STYLE, s.budgetStyle).toLowerCase()}`,
      s.budgetMax &&
        `**Maximum:** ${Number(s.budgetMax).toLocaleString('en-GB')} ${s.currency} ${s.budgetPer === 'person' ? 'per person' : 'for the whole group'}${covers.length ? `, covering ${andList(covers)}` : ''}`,
    ])}

Keep suggestions within this budget, flag anything that would break it, and give a rough cost per day. Label prices as estimates and say when you last checked them.`,
  );
}

function runs({ s, agent, hosted }: Ctx): string {
  if (!s.runs) return '';
  const routes =
    agent && hosted
      ? 'Generate each route as GPX with BRouter (brouter.de, a free routing engine) using a running or hiking profile, check it does not double back on itself, and draw it on the map.'
      : 'Link to existing, published routes you actually found (Strava routes or segments, Komoot, AllTrails, parkrun, local running clubs, official city routes) and describe them. Never invent GPS coordinates or route lines.';
  return section(
    'Runs',
    `Plan ${label(TIME_OF_DAY, s.runTime).toLowerCase()} runs for each place we stay: loops that start and finish near where we sleep${s.runDistance ? `, ${s.runDistance}` : ''}${s.runSurface !== 'any' ? `, ${label(RUN_SURFACE, s.runSurface).toLowerCase()}` : ''}. For each run give distance, climb, surface, how safe and well-lit it is, a highlight on the way, and a “back by” time that fits that day's plan. ${routes}`,
  );
}

function hikes({ s, agent, hosted }: Ctx): string {
  if (!s.hikes) return '';
  const routes =
    agent && hosted
      ? 'Build a GPX for each hike with BRouter and show it on the map, plus links to the official or published route.'
      : 'Link to the official or published route (tourism office, national park, Komoot, AllTrails); never invent GPS coordinates.';
  return section(
    'Hikes',
    `Suggest ${label(HIKE_LEVEL, s.hikeLevel).toLowerCase()} hikes${s.hikeMax ? ` (at most ${s.hikeMax})` : ''}. For each: distance, climb, the official walking time next to times from other sources (they often disagree), how to get to the start and back, huts or water on the way, and a **plan B** for bad weather. ${routes}`,
  );
}

function workflow({ s }: Ctx): string {
  const h = AI_HINTS[s.ai] ?? AI_HINTS.other;
  return section(
    'How to work with me',
    `1. **Research** (use web search; ${h.search}): what there is to do around each place for us, at our pace, during our dates. Check opening days, seasonal closures and events.
2. **Propose**: a short day-by-day outline with options, plus anything that needs booking ahead.
3. **Ask**: one batch of up to 10 clarifying questions about gaps (times we arrive and leave, what is not booked yet, must-sees, things we want to avoid). Keep the privacy rules in mind.
4. **Wait** for my answers and my OK on the outline.
5. **Build** it as described below.
6. **Hand over**: tell me how to open or publish it, list every \`[[ADD LOCALLY: …]]\` placeholder, and list anything I should double-check.

If you cannot search the web, say so at the very start. Then do not invent places, opening hours, prices, links or webcams: mark anything you are unsure of “check yourself”, and ask me to turn on web search if I can.`,
  );
}

function accuracy({ s }: Ctx): string {
  return section(
    'Accuracy rules',
    list([
      'Only use links you found by searching and actually opened. If you cannot verify a link, list it under “check yourself” instead of using it.',
      'Opening hours, prices and timetables change: show them as “last checked <date>” and link the official source.',
      has(s, 'webcams') &&
        'Webcams: only real, working webcams you found. Show them as a still image or a link, never in an iframe. If a place has no webcam, leave the webcam part out for that place; do not substitute a different place.',
      'Prefer official sources (tourism boards, operators, national parks) over blogs.',
    ]),
  );
}

function format(c: Ctx): string {
  const { s, agent, safe } = c;
  const h = AI_HINTS[s.ai] ?? AI_HINTS.other;
  const imperial = s.units === 'imperial';
  switch (s.format) {
    case 'file':
      return section(
        'What to build: one HTML file',
        list([
          'One self-contained `.html` file: all CSS and JavaScript inline, no external libraries, fonts or build step. I will download it and open it in my browser, and it should keep working offline (live data like weather can say “offline”).',
          'Put all the trip content in one `const TRIP = { … }` object at the top of the script so I can edit it later without touching the rest.',
          'Add a `<meta http-equiv="Content-Security-Policy">` that only allows what the page really needs (for example `connect-src` for the weather API and `img-src` for webcam hosts).',
          'If you cannot create downloadable files, put the whole file in one code block and tell me how to save it as `my-trip.html`.',
          'Remind me: this file is private only as long as I keep it on my own devices. Sharing the file shares everything in it.',
        ]),
      );
    case 'artifact':
      return section(
        'What to build: a page in this chat',
        list([
          `Build it as ${h.surface}: one interactive page with its own HTML, CSS and JavaScript.`,
          '**Warn me clearly: do not press Publish or Share.** Published artifacts and canvases are public links that anyone can open. Keep it in this chat, and offer me a downloadable copy if I want it offline.',
          'Some chat previews block network requests and storage. If live weather or saving ticks does not work there, bake in a climate summary, link out instead, and tell me.',
        ]),
      );
    case 'pdf':
      return section(
        'What to build: a printable plan',
        list([
          'A clean printable plan: a cover page with the overview, then one page per day, then the lists.',
          `Paper size ${imperial ? 'US Letter' : 'A4'}. Use tick boxes for lists and leave space for handwritten notes.`,
          'If you can create files, give me a PDF. Otherwise give me print-ready HTML (with `@media print` styles) or a document I can paste into Google Docs or Word and export as PDF.',
          'Write important links out in short form, and add QR codes only if you can generate real ones.',
        ]),
      );
    default:
      return section('What to build: a private website', [siteBuild(agent), host(c), safe ? publicSafeRules() : ''].filter(Boolean).join('\n\n'));
  }
}

function siteBuild(agent: boolean): string {
  return agent
      ? `Work in a new git repository: plain HTML, CSS and JavaScript in \`public/\` (no framework, no build step), trip content in \`public/data/*.json\`, a \`README.md\` with the hosting and security steps, and \`scripts/check.mjs\` (see the technical rules below). Keep the repository **private**.`
      : 'Give me every file as its own code block with its path (and a zip if you can create files). Plain HTML, CSS and JavaScript only, no build step, so I can upload the folder exactly as it is. Put the trip content in `data/*.json` files.';
}

function host({ s, agent }: Ctx): string {
  const never =
    'Never protect the site with a JavaScript password or a “secret” URL: on a static site that is not security. The login must happen on the server before any page is sent.';
  switch (s.host) {
    case 'cloudflare':
    case 'unsure':
      return `${s.host === 'unsure' ? 'I do not know where to host it yet: recommend **Cloudflare Pages with Cloudflare Zero Trust Access** (free for small groups, email one-time PIN login), unless there is a strong reason to choose something else, then use these steps.\n\n' : ''}**Hosting: Cloudflare Pages, locked with Cloudflare Zero Trust Access.** Dashboards change, so search the current Cloudflare docs first, then walk me through step by step:

${list([
  agent ? 'Create a Pages project connected to the private git repository (build output folder `public`).' : 'Create a Pages project with **Direct Upload** and drag in the folder.',
  'In Zero Trust → Access → Applications, add a **self-hosted application** for the `<project>.pages.dev` domain (and my custom domain, if I add one).',
  'Policy: **Allow**, include **Emails**: the addresses of everyone travelling. I will type these into the Cloudflare dashboard myself; never ask me for them here.',
  'Login method: **One-time PIN** (a code sent by email). Session duration: **1 month**, so we are not logging in every day on holiday.',
  'Add a second Access application for `*.<project>.pages.dev` so preview deployments are locked too.',
  'Test it in a private browser window: I should see the Cloudflare login page, not the trip.',
])}

${never}`;
    case 'netlify':
    case 'vercel': {
      const name = s.host === 'netlify' ? 'Netlify' : 'Vercel';
      return `**Hosting: ${name}.** ${name}'s password protection is a paid feature. Unless I tell you I have a plan that includes it, treat the site as **public** and follow the public-safe rules below. Also tell me once that Cloudflare Pages with Zero Trust Access gives a free email login, in case I want to switch.\n\n${never}`;
    }
    case 'github':
      return `**Hosting: GitHub Pages.** GitHub Pages sites are public on the internet, even when the repository is private (unless I say I have GitHub Enterprise with private Pages). Tell me that clearly once before you build, then follow the public-safe rules below.\n\n${never}`;
    case 'own':
      return `**Hosting: my own server.** Ask me which web server I use, then protect the whole site with real server-side login over HTTPS (HTTP basic auth, or an auth proxy such as oauth2-proxy or Authelia). Add the same security headers as below in the server config.\n\n${never}`;
    default:
      return '';
  }
}

function publicSafeRules(): string {
  return `**Public-safe rules** (this site will be public, so these override anything else in this prompt):

${list([
  'No names of anyone travelling, not even first names.',
  'No accommodation names or exact addresses: say “central Bergen”, not the hotel. Map pins and weather coordinates at town level only (2 decimal places).',
  'No calendar dates anywhere on the site: use “Day 1, Day 2…”, no countdown, no month names. Keep the real dates in our chat only.',
  'No home town or home country anywhere on the site: show time differences as “+1 h”, and keep entry or visa notes generic.',
  'Add `<meta name="robots" content="noindex, nofollow">` and a `robots.txt` that disallows everything.',
])}`;
}

function sections(c: Ctx): string {
  const { s, hosted, agent, pdf, safe } = c;
  const home = safe ? 'my home country (do not name it on the site)' : s.home;
  const live = !pdf;
  const weather = (() => {
    if (!has(s, 'weather')) return '';
    if (pdf)
      return '**Weather:** for each place, the typical weather for our dates (average high and low, rain days, daylight), with a link to the place on yr.no for the live forecast.';
    if (hosted && agent)
      return `**Weather:** use MET Norway's free Locationforecast API (the data behind yr.no). Browsers cannot send the User-Agent header MET requires, so fetch it in a GitHub Actions workflow every 3 hours into \`public/data/weather.json\`, with \`User-Agent: <app-name>/1.0 (<contact URL>)\`, where the contact URL is a public page that reaches me (a public profile or project page, not a private repository). Never use my email address there. Give that workflow job only \`permissions: contents: write\`. Cache politely (If-Modified-Since), round coordinates to 4 decimals, and credit “Weather data from MET Norway”. Also fetch Open-Meteo (free, no key) live in the browser for the freshest view, and show typical climate for dates beyond the forecast range from a baked-in \`climate.json\`. Link each place to its yr.no page.`;
    return '**Weather:** fetch the forecast live in the browser from Open-Meteo (free, no key, allows browser requests) for each place, only for dates within its forecast range. Before that, show the typical climate for those dates, baked in. Link each place to its page on yr.no (MET Norway) for the detailed forecast. If the request fails, say “forecast unavailable” and keep the climate summary.';
  })();

  const lines: (string | false)[] = [
    `**Itinerary (day by day):** for every day: where we sleep, morning / afternoon / evening, travel that day, a bad-weather plan B, and links. ${live && !safe ? 'During the trip it opens on today; before the trip it shows a countdown.' : ''}`,
    weather,
    has(s, 'packing') &&
      `**Packing list** for ${s.travellers && s.travellers !== '1' ? `each of the ${s.travellers} travellers (labelled Traveller 1, 2… unless I give you nicknames)` : 'me'}, based on the climate and our activities. ${live ? 'Ticks are saved on the device (localStorage).' : 'With tick boxes.'}`,
    has(s, 'checklist') &&
      `**Pre-trip checklist** with “do by” dates counting back from departure: documents still valid (check the expiry date, never write down numbers), visa or entry rules for travellers from ${home || 'my home country'} (official government sources only), travel insurance, bank cards, chargers and adapters, offline maps, home, plants and pets.`,
    has(s, 'webcams') && '**Webcams:** live views near each place, following the accuracy rules above.',
    has(s, 'map') &&
      (hosted
        ? '**Map:** a Leaflet map (copy the library into the site, no CDN) with OpenStreetMap tiles and attribution: stays, places, and any routes.'
        : '**Map links:** for every place, “Open in OpenStreetMap · Google Maps · Apple Maps” links using coordinates. No embedded map.'),
    has(s, 'today') &&
      `**Today view:** sunrise, sunset and golden hour for where we are (calculate them in the page, no API needed), and the time difference from ${safe ? 'home (as “+N h”, no place name)' : s.home || 'home'}.`,
    has(s, 'rainy') && '**Rainy-day ideas:** indoor options for each place, with opening days.',
    has(s, 'holidays') &&
      `**Public holidays & closures:** holidays during our dates${live ? ' (Nager.Date has a free API: date.nager.at)' : ''}, plus usual closures (museums shut on Mondays, Sunday shopping, siesta). Flag the days they affect.`,
    has(s, 'events') && '**Local events** during our dates (festivals, concerts, markets, sports), with dates, source links and “check before you go”.',
    has(s, 'tips') &&
      `**Local tips:** currency, card or cash, tipping, etiquette, common scams, and entry rules for travellers from ${home || 'my country'} (link official sources).`,
    has(s, 'phrases') && '**Phrases:** 20 to 30 handy phrases in the local language(s) with simple pronunciation.',
    has(s, 'plugs') && '**Plugs, power & SIM:** plug type, voltage, whether we need an adapter, and mobile data, roaming or eSIM options.',
    has(s, 'emergency') &&
      '**Emergency card** (must work offline): local emergency numbers, the nearest hospital to each stay area, my country’s embassy or consulate (link), and the placeholder `[[ADD LOCALLY: travel insurance hotline and policy number]]`.',
    has(s, 'money') &&
      (live
        ? `**Money:** a currency converter using Frankfurter (free, no key: api.frankfurter.app), and a simple expense tracker saved only on the device${s.budgetMax ? `, with our budget of ${s.budgetMax} ${s.currency} as the target` : ''}.`
        : '**Money:** an exchange-rate table (dated) and a page to note spending.'),
    has(s, 'calendar') && live && '**Add to calendar:** an `.ics` download for the whole trip and for each day, generated in the browser.',
    has(s, 'marine') &&
      `**Sea or snow conditions:** whichever fits the trip: waves and water temperature (Open-Meteo Marine API) or snow depth and fresh snow, with a simple good / so-so / skip call for swimming, snorkelling or skiing.`,
    has(s, 'tides') && '**Tide times:** link the official local tide tables for each coastal place, and point out tide-dependent plans.',
    has(s, 'accessnotes') && '**Accessibility notes** for each venue: step-free access, lifts, accessible toilets, from official sources.',
    has(s, 'souvenirs') && `**Souvenir & shopping list** ${live ? 'saved on the device' : 'with space to write'}.`,
    has(s, 'notes') && `**Trip notes** ${live ? 'page saved on the device (localStorage)' : 'pages left blank'}.`,
    has(s, 'offline') && hosted &&
      '**Works offline:** make it an installable web app with a service worker. Behind a login, the service worker must never cache an HTML response that is the login page (check the response URL and type), load the manifest with `crossorigin="use-credentials"`, and version the cache so updates come through.',
  ];
  return section('What to include', list(lines));
}

function look({ s, pdf }: Ctx): string {
  const vibe = s.vibe === 'match' ? 'match the destination' : label(VIBES, s.vibe).toLowerCase();
  return section(
    'Look and feel',
    list([
      `**Vibe:** ${vibe}. Use a few simple SVG illustrations and motifs that fit, ${pdf ? 'kept print-friendly' : 'and small, gentle animations that switch off when the device asks for reduced motion'}.`,
      !pdf && `**Theme:** ${s.scheme === 'auto' ? 'light and dark, following the device setting' : `${s.scheme} theme`}${s.accent ? `, accent colour ${s.accent}` : ''}.`,
      pdf && s.accent && `**Accent colour:** ${s.accent}.`,
      `**Language:** ${s.language}. **Units:** ${s.units === 'imperial' ? 'miles, °F' : 'km, °C'}. **Times:** ${s.clock === '12h' ? '12-hour' : '24-hour'}.`,
      'Mobile-first, easy to read in sunlight, big tap targets.',
      'Accessible (WCAG 2.2 AA): real headings, good colour contrast, keyboard-friendly, alt text on images.',
    ]),
  );
}

function headerFile(host: string): string {
  switch (host) {
    case 'github':
      return 'GitHub Pages cannot set HTTP headers, so put the policy in a `<meta http-equiv="Content-Security-Policy">` tag on every page (frame-ancestors does not work there), together';
    case 'vercel':
      return 'A `vercel.json` `headers` section (Vercel ignores `_headers`)';
    case 'own':
      return 'Security headers in the web server config';
    default:
      return 'A `_headers` file (Cloudflare Pages and Netlify read it)';
  }
}

function technical({ s, hosted, agent }: Ctx): string {
  if (!hosted) return '';
  return section(
    'Technical rules for the website',
    list([
      'All trip content in JSON files under `data/`; the pages render from them, so I can update the plan without touching the HTML.',
      `${headerFile(s.host)} with a strict Content-Security-Policy: ` +
        "`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: <only the hosts you use>; connect-src 'self' <only the APIs you use>; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` and `X-Robots-Tag: noindex, nofollow` (where the host allows headers).",
      'A `robots.txt` that disallows everything.',
      'No inline scripts, no CDNs, no analytics or trackers, no third-party fonts.',
      agent &&
        '`scripts/check.mjs` that fails if: days are missing or weekdays do not match dates, a link is not https, the CSP is missing, or the data contains anything that looks like an email address, phone number or booking code. Run it in a GitHub Actions workflow with actions pinned to a commit SHA.',
      s.host === 'cloudflare' || s.host === 'unsure' ? 'Behind Cloudflare Access, fetch your own JSON with `credentials: \'same-origin\'` and treat an HTML response as “logged out”.' : false,
    ]),
  );
}

function start({ s }: Ctx): string {
  return `---\n\nStart now: give me the privacy reminder, then ${s.mode === 'inspire' ? 'your destination suggestions' : 'step 1 (research)'}.`;
}

// ---------------- Assembly ----------------

export function buildPrompt(s: TripState): string {
  const hosted = s.format === 'site';
  const c: Ctx = {
    s,
    hosted,
    agent: hosted && s.builder === 'agent',
    pdf: s.format === 'pdf',
    safe: publicSafe(s),
    aiName: s.ai !== 'other' ? label(AIS, s.ai) : '',
  };
  return [intro, privacy, trip, inspire, enjoy, budget, runs, hikes, workflow, accuracy, format, sections, look, technical, start]
    .map((b) => b(c))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .concat('\n');
}

export const wordCount = (text: string) => (text.match(/\S+/g) ?? []).length;
