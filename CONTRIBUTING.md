# Contributing to TripForge

Thanks for helping. Bug reports, new destinations, better prompt wording, translations of ideas into plainer English and accessibility fixes are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Read [SPEC.md](SPEC.md). It records every product decision, and changes that go against it need a reason.
- Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ground rules

These are what make TripForge trustworthy, so pull requests that break them will not be merged:

- **Nothing leaves the browser.** No backend, no analytics, no fonts, scripts or images from other origins. The CSP sets `connect-src 'none'`.
- **No runtime dependencies.** Vanilla TypeScript and native HTML/CSS. Dev dependencies are fine when they earn their place.
- **No inline scripts or styles.** The CSP blocks them.
- **Accessible.** WCAG 2.2 AA, keyboard and screen reader friendly, light and dark, no sideways scroll at 390 px.
- **Plain English.** The site is for people who have never written a prompt.

## Set up

Use **pnpm** and Node 24+.

```sh
pnpm install
pnpm exec playwright install chromium-headless-shell   # once, for pnpm a11y
pnpm dev
```

## Before you open a pull request

All of these must pass; CI runs the same list:

```sh
pnpm test     # unit tests
pnpm build    # type-check and build
pnpm check    # CSP, no inline code, no third-party loads
pnpm a11y     # axe on every page, both widths, both themes
```

- Add or update a unit test when you change `src/lib/` (prompt, state, PII hints, wheel maths).
- Keep pull requests small and focused, and describe what you changed and why.
- Include a screenshot for visual changes.
- Commits should be signed.

## Adding destinations

Destinations live in `src/data/themes.ts` as `[id, name, country, lat, lon, pitch]`. Keep the pitch to one short, specific sentence, use real coordinates, and make sure the `id` is unique.

## Reporting security issues

Please do not open a public issue. See [SECURITY.md](SECURITY.md).
