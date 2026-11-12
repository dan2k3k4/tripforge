# TripForge

Answer a few questions about a trip, get a prompt to paste into your own AI (Claude, ChatGPT, Gemini, …). The AI researches the trip with you and builds a private trip planner: a single HTML file, a page in the chat, a printable PDF, or a website behind an email login.

TripForge itself is a static site with no backend. Nothing typed into it leaves the browser: the CSP sets `connect-src 'none'`.

See [SPEC.md](SPEC.md) for every product decision.

## Develop

Use **pnpm** (not yarn or npm). `packageManager` pins the version and pnpm switches to it automatically; Node 24+.

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests: prompt assembly, validation, PII hints, wheel maths
pnpm build        # type-check + build to dist/
pnpm check        # static checks on dist/: CSP, no inline code, no third-party loads, no network calls
pnpm exec playwright install chromium-headless-shell   # once
pnpm a11y         # axe WCAG 2.2 AA on every page/step, 390 + 1366 px, light + dark, CSP errors, sideways scroll
```

`pnpm preview` serves `dist/` with the same headers as production (read from `public/_headers`).

## Layout

| Path | What |
|---|---|
| `*.html` | The eight pages. `<!-- @header -->` / `<!-- @footer -->` are filled from `partials/` at build time. |
| `src/lib/prompt.ts` | Builds the prompt from the answers. Pure, fully unit-tested. |
| `src/lib/state.ts` | Answer schema, defaults, validation of anything loaded (storage, imported file, URL), required fields. |
| `src/lib/pii.ts` | "Looks like a booking code / phone / address" hints. Warns, never blocks. |
| `src/data/` | Options, ~300 holiday destinations with coordinates (wheel + globe), example presets, `land.ts` (generated). |
| `src/globe.ts` | Pixel globe: a 168 px canvas scaled up with `image-rendering: pixelated`, drag/keyboard to spin. |
| `scripts/landmask.mjs` | Regenerates `src/data/land.ts`, a 2° land bitmap from Natural Earth (`world-atlas`). |
| `src/build.ts` | The builder form. `src/home.ts` the wheel and globe. The examples page is pre-rendered by `vite-seo.ts`. |
| `public/_headers` | Cloudflare Pages headers: strict CSP and friends. |

No runtime dependencies. Vanilla TypeScript, native `<dialog>`, `popover`, `<template>`, `<details>`, CSS custom properties and view transitions.

## Deploy

The site URL used for canonical links, social tags, `sitemap.xml`, `robots.txt` and `llms.txt` comes from the `SITE_URL` build variable (default `https://trip-forge.pages.dev`). When you move to a custom domain, set `SITE_URL=https://your.domain` in the Pages environment variables and redeploy.

`node scripts/brand-assets.mjs` (after `pnpm build`) re-renders the PNG icons and the 1200x630 share image `public/og.png` from the real hero.

Cloudflare Pages, git-connected: framework preset *None*, build command `pnpm build`, output directory `dist`. The site is public on purpose: it holds no data. Pages picks pnpm from `pnpm-lock.yaml`; if a build log shows `yarn` or an old pnpm, set the environment variables `NODE_VERSION=24` and `PNPM_VERSION=12.18.0`.

## Privacy, by construction

- No server, no analytics, no fonts or scripts from other origins.
- Answers live in `localStorage` only; "Save my answers" downloads a JSON file; "Start over" clears it.
- The only URL parameters read are `mode`, `theme`, `dest` and `example`, and only values from the static lists are accepted.
- Imported files are size-capped and every field is validated against the schema.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first. Security issues: see [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE). Made by [Dan Lemon](https://danlemon.com).

### Cloudflare zone settings

If you put TripForge on a custom domain, keep **Rocket Loader**, **Email Address Obfuscation**, **Web Analytics auto-injection** and JS challenges **off** for it. They inject inline scripts, which the CSP blocks (and Rocket Loader would break every page).
