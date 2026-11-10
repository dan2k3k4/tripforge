# TripForge — Spec

TripForge is a static site. People fill in a form about a trip and it builds a **prompt** they copy into their own AI (Claude, ChatGPT, Gemini, …). Their AI then researches the trip, asks follow-up questions, and builds a private trip planner in the format they picked.

Nothing typed into TripForge leaves the browser.

## 1. Privacy principles

- TripForge is purely client-side. No backend, no analytics, no third-party requests. CSP `connect-src 'none'`.
- The form is autosaved to `localStorage`. Export/Import of answers is a `.json` file.
- Nothing personal goes in a URL. The only URL state is the wheel handoff (`mode`, `theme`, `dest`), and each value is validated against the static lists.
- The form asks for coarse info only: area or neighbourhood, time of day. Never flight numbers, booking refs, passport numbers, phone numbers, emails, full names or street addresses.
- **Live PII warning** on free-text fields: flight numbers, booking-ref-like codes, emails, phones, passport-like strings, street plus house number. It warns but never blocks, and is announced via `aria-live="polite"`.
- **Prompt preamble** (for the user): use temporary or incognito chat, turn off model training, never paste confirmations or ticket screenshots.
- **Prompt rules** (for the AI): never ask for these details. If the user volunteers them, warn them. Leave marked placeholders (e.g. `<!-- TODO: booking ref -->`) that the user fills in locally.

## 2. Pages

| Page | Content |
|---|---|
| Home | SVG hero, pitch, "I know where" / "Help me pick", holiday-theme wheel |
| Build | Stepped form with live prompt preview |
| How it works | Fill → copy → paste → AI researches, asks, builds; the output formats explained |
| Stay safe | What not to share and why; temporary chat and training opt-out per AI; public-safe mode |
| Hosting guides | Cloudflare Pages + Zero Trust email OTP step by step (links to current CF docs); why not GH Pages, Netlify or Vercel for private trips; keeping a single file safe |
| Examples | 3 fictional presets: filled answers, full prompt, "Load into builder" (prompts only, no screenshots) |
| FAQ | Do you store data (no, and how to verify), which AI, "my AI can't browse", … |

All pages share a header, footer and theme toggle (light, dark, auto).

## 3. Builder form

There are six steps, with a progress bar showing a plane on a dotted path. Every step can be jumped to.

- **Desktop:** sticky side panel with the prompt preview.
- **Mobile:** a "Preview prompt" button opens a `<dialog>`.

### Step 1: Trip basics (required core)
- **Mode:** "I know where I'm going" / "Help me pick (Inspire me)".
- **Dates:** fixed start and end, *or* flexible (month or season plus number of nights).
- **Home region:** country or city level.
- **Travellers:** count, plus type (solo, couple, family with kid ages, friends group).
- **Inspire mode adds:** how far (train-able, short-haul, long-haul, anywhere), and an optional holiday theme.
- **Required:** dates (fixed or flexible). A location is required in "know where" mode only.

### Step 2: Stays and travel
- **"I stay in different places":** reveals a repeatable **Stay** row with location, from and to dates, type (hotel, Airbnb, hut, camping, friends, undecided), and an optional name or area. Otherwise a single stay spans the trip.
- **Repeatable Leg:** from, to, date, mode (flight, train, car, bus, ferry, bike, foot), time of day. Numbers are never asked for.

### Step 3: What you love
- **Pace (radio):** chill / balanced / packed.
- **Interests (checkboxes):** museums and history, food and drink, hiking, running, cycling, swimming and beach, skiing and snow, nightlife, shopping, nature and wildlife, photography, kids' activities, architecture, live events.
- **Required:** a pace *or* at least one interest.
- **Optional:**
  - morning runs (distance range, surface, time of day)
  - hikes (difficulty, max length)
  - dietary needs (coarse)
  - accessibility or mobility needs
  - free text "how I like to travel"
- **Budget:**
  - style (budget, mid-range, splurge)
  - max amount plus currency
  - whole group or per person
  - covers: travel, accommodation, food, activities

### Step 4: Site features (checkboxes)
**On by default:** itinerary (always on), weather, packing list.

**Off by default:**
- Webcams
- Map / routes
- Morning runs
- Hikes (plan A/B)
- Pre-trip checklist
- Phrases
- Local tips (money, visa, emergency, tipping)
- Rainy-day ideas
- `.ics` export
- Offline PWA
- Marine/snorkel or snow conditions
- Public holidays and closures (Nager.Date)
- Currency converter (Frankfurter) and local expense tracker
- Today view (sunrise and sunset, golden hour, time-zone difference)
- Plug, voltage and SIM
- Local events
- Offline emergency card (with insurance placeholder)
- Tides
- Accessibility notes per venue
- Souvenir list
- Shared notes

### Step 5: Format and hosting
- **Your AI:** Claude, ChatGPT, Gemini, Copilot, Le Chat, other or local (default "other"). It tweaks the artifact/canvas wording, web-search and temporary-chat hints.
- **Output format:**
  1. Chat artifact or canvas. Warning: don't Publish/Share, because that makes it a public link.
  2. **Single HTML file (default).** Offline, nothing to host.
  3. Printable PDF or doc.
  4. Hosted website. Shows a "this is technical, you are responsible for login and security" warning and reveals:
     - Coding agent or chat AI.
     - Host:
       - **Cloudflare Pages + Zero Trust Access** (recommended): email OTP, allowlist, 1-month session, a separate Access app for `*.pages.dev` previews, and a service worker that never caches `text/html`.
       - **Netlify or Vercel:** password protection is paid. Pick another host or accept a public site.
       - **GitHub Pages:** always public. Hard warning.
       - **Own server:** basic auth or an auth proxy; the AI asks follow-up questions.
       - **Not sure:** the AI recommends Cloudflare.
     - **Public-safe mode** applies to any host without real login: no names, no accommodation names (area only), no "home empty" dates, noindex.

### Step 6: Look and feel (of the generated site)
- **Vibe:** beach, mountain, city, snow, desert, forest, or match destination.
- **Theme:** light, dark or auto, plus an optional accent colour.
- **Site language** and units (metric/imperial, 24h/12h).

## 4. Inspire me and the wheel

- **Themes:** Christmas markets & cosy winter, New Year's Eve, Easter & spring blossom, Summer sun, Autumn colours, Ski & snow, Carnival & festivals, Northern lights, Surprise me.
- Each theme has 8–12 hard-coded real destinations with a one-line pitch.
- **Spin:** the wheel animates and lands on a postcard. "Use this destination" goes to `/build?mode=inspire&theme=…&dest=…`. The postcard also offers "Spin again" and "Let my AI suggest instead".
- **Accessibility:** a real `<button>` with the result announced via `aria-live`. Under reduced motion the result appears instantly.
- **Prompt:** in Inspire mode the AI first proposes 3–5 destinations, each with fit, rough cost (labelled as an estimate), weather at that time, and travel from the home region. The user picks one, then the normal flow follows.

## 5. Generated prompt

- Built from modular blocks: only the enabled sections are included. Target length is about 1,500–3,000 words, with a live word count.
- **Flow:** research (web search) → propose activities, runs, hikes, webcams → batch of clarifying questions → confirm → build. If the AI has no web access, it must say so and must not invent anything.
- **Links and webcams:** every link is found by search and opened before it's used. Webcams are linked stills or links, never iframes, and each image host goes on the CSP `img-src` allowlist. If a link can't be verified, it's listed as "check yourself" and not embedded. No webcam found means no webcam section.
- **Routes:** a hosted site built by a coding agent uses BRouter to make GPX. Every other format links to existing published routes (Komoot, AllTrails, Strava, official trails) and never invents coordinates. Morning runs are loops from the stay's area, with distance, surface and a "back by" time.
- **Maps:** hosted sites get a Leaflet map with OSM tiles. Other formats get "Open in OSM / Google / Apple Maps" links per place.
- **Weather:**
  - **Hosted + git:** MET via GitHub Actions every 3 hours into `weather.json` (User-Agent contact is the repo URL, never an email), plus live Open-Meteo, plus ERA5 climate fallback.
  - **Single file or artifact:** live Open-Meteo, plus an "Open on Yr.no" link per location, plus a climate summary baked in at build time.
  - **PDF:** climate summary, plus Yr links and QR codes.
  - Sunrise and sunset are computed in the browser.
- **Budget:** keep suggestions within the budget, flag anything that breaks it, give a cost per day, and seed the expense tracker if that module is on.
- **House style** (fixed, not configurable):
  - All trip content in JSON data files.
  - Strict CSP `_headers` and noindex.
  - Mobile-first; opens on today, or a countdown before the trip.
  - Checklists in `localStorage`.
  - Vibe-matched SVG motifs and subtle motion that respects `prefers-reduced-motion`.
  - WCAG 2.2 AA.
  - A validation script.
  - The PWA never caches Access login HTML.
- **Delivery:** Copy button and `.md` download.

## 6. Tech

- **Build:** Vite multi-page, vanilla TypeScript, zero runtime dependencies.
- **Platform features:** native `<template>`, `<dialog>`, `<details>`, form validation, View Transitions.
- **Styling:** CSS custom properties for theming. Inline SVG illustrations, CSS animation, everything off under reduced motion. Self-hosted fonts.
- **Headers:** `_headers` with a strict CSP (`default-src 'none'`, `script-src 'self'`, `connect-src 'none'`), HSTS, nosniff and frame-ancestors none.
- **Deploy:** Cloudflare Pages (git-connect), public and indexable.

## 7. Quality

- **Unit tests (Vitest):** prompt assembly (each module on and off, both modes, all formats and hosts), required-field gating, PII detector patterns, URL-param whitelist, import/export round-trip.
- **`scripts/check.mjs`:** CSP present, no inline scripts, no CDN or external URLs in the build.
- **axe-core** against every built page at 390 and 1366 px.
- **GitHub Actions CI** with SHA-pinned actions.
- **Security review and a11y review** passes before release.

## 8. Repo

- `git init` on `main`; work on feature branches; GPG-signed commits.
- The repo is private for now and will be open-sourced (MIT) once it's live.
