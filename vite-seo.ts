// Build-time SEO and GEO: canonical + social tags, JSON-LD, pre-rendered examples, sitemap.xml, robots.txt, llms.txt.
// The site origin comes from SITE_URL (set it in Cloudflare Pages when moving to a custom domain).
import type { Plugin } from 'vite';
import { FEATURES, FORMATS, INTERESTS, label, PACE, PARTY } from './src/data/options.ts';
import { PRESETS } from './src/data/presets.ts';
import { buildPrompt, fmtDate, wordCount } from './src/lib/prompt.ts';

declare const process: { env: Record<string, string | undefined> }; // Node global, only used at build time
export const SITE = (process.env.SITE_URL ?? 'https://trip-forge.pages.dev').replace(/\/+$/, '');
const NAME = 'TripForge';
const OG_IMAGE = `${SITE}/og.png`;

// Order = sitemap order. 404 is never listed or canonicalised.
export const SEO_PAGES: { file: string; path: string; name: string }[] = [
  { file: 'index', path: '/', name: 'Home' },
  { file: 'build', path: '/build', name: 'Build my prompt' },
  { file: 'how', path: '/how', name: 'How it works' },
  { file: 'examples', path: '/examples', name: 'Examples' },
  { file: 'safe', path: '/safe', name: 'Stay safe with AI' },
  { file: 'hosting', path: '/hosting', name: 'Hosting guides' },
  { file: 'faq', path: '/faq', name: 'FAQ' },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (html: string) => unesc(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
// JSON inside <script> must not be able to close the tag.
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const meta = (html: string, name: string) => unesc(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? '');

function headTags(html: string, file: string): string {
  const title = unesc(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? NAME);
  const description = meta(html, 'description');
  const page = SEO_PAGES.find((p) => p.file === file);
  const tags = [
    '<meta name="theme-color" content="#f4fbff" media="(prefers-color-scheme: light)" />',
    '<meta name="theme-color" content="#0b1430" media="(prefers-color-scheme: dark)" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  ];
  if (!page) return [...tags, '<meta name="robots" content="noindex, follow" />'].join('\n    ');

  const url = `${SITE}${page.path}`;
  tags.push(
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="An open passport covered in colourful visa stamps, with a small plane flying between them" />`,
    '<meta property="og:locale" content="en_GB" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
  );

  if (file === 'index') {
    tags.push(
      ld({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', '@id': `${SITE}/#website`, name: NAME, url: `${SITE}/`, description, inLanguage: 'en' },
          {
            '@type': 'WebApplication',
            name: NAME,
            url: `${SITE}/`,
            description,
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Any (runs in a web browser)',
            browserRequirements: 'Requires JavaScript',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            featureList: [
              'Builds a trip-planning prompt for Claude, ChatGPT, Gemini or any AI',
              'Day-by-day itinerary, weather, webcams, runs, hikes and packing lists',
              'Single HTML file, chat page, printable PDF or private website',
              'Holiday-theme wheel and pixel globe for destination ideas',
              'Runs entirely in the browser; nothing is sent anywhere',
            ],
          },
        ],
      }),
    );
  } else {
    tags.push(
      ld({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: page.name, item: url },
        ],
      }),
    );
  }

  // FAQ structured data comes from the visible <details> on the page, so the two can never drift apart.
  if (file === 'faq') {
    const qa = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div>([\s\S]*?)<\/div>\s*<\/details>/g)].map((m) => ({
      '@type': 'Question',
      name: text(m[1]),
      acceptedAnswer: { '@type': 'Answer', text: text(m[2]) },
    }));
    tags.push(ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa }));
  }
  return tags.join('\n    ');
}

/** The examples page as static HTML, so crawlers and AI search see the trips and prompts without running JS. */
function examplesHtml(): string {
  return PRESETS.map((p) => {
    const s = p.state;
    const prompt = buildPrompt(s);
    const rows: [string, string][] = [
      ['Where', s.multiStay ? s.stays.map((x) => x.place).join(' → ') : s.destination],
      ['When', s.dateKind === 'fixed' ? `${fmtDate(s.start)} to ${fmtDate(s.end)}` : `${s.nights} nights in ${s.month}`],
      ['Who', `${s.travellers} ${s.travellers === '1' ? 'traveller' : 'travellers'}, ${label(PARTY, s.party).toLowerCase()}${s.kidAges ? ` (kids aged ${s.kidAges})` : ''}`],
      ['Pace', label(PACE, s.pace)],
      ['Loves', s.interests.map((i) => label(INTERESTS, i)).join(', ')],
      ['Extras', s.features.map((f) => label(FEATURES, f)).join(', ')],
      ['Format', label(FORMATS, s.format)],
    ];
    const dl = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
      .join('');
    return `<article class="example" id="ex-${p.id}">
          <h2>${esc(p.title)}</h2>
          <p class="muted">${esc(p.blurb)}</p>
          <dl>${dl}</dl>
          <div class="actions"><a class="btn" href="/build?example=${p.id}">Load into builder</a></div>
          <details><summary>Show the prompt (${wordCount(prompt)} words)</summary><pre tabindex="0">${esc(prompt)}</pre></details>
        </article>`;
  }).join('\n        ');
}

function llmsTxt(descriptions: Record<string, string>): string {
  const pages = SEO_PAGES.map((p) => `- [${p.name}](${SITE}${p.path === '/' ? '/' : p.path}): ${descriptions[p.file] ?? ''}`).join('\n');
  const examples = PRESETS.map((p) => `- [${p.title}](${SITE}/examples#ex-${p.id}): ${p.blurb}`).join('\n');
  return `# ${NAME}

> ${NAME} is a free, browser-only trip-planning prompt builder. People answer a few questions about a holiday (dates, where they stay, how they travel, what they enjoy, budget) and ${NAME} writes one prompt to paste into their own AI assistant (Claude, ChatGPT, Gemini, Copilot, Le Chat or a local model). That AI researches the trip with them, asks follow-up questions, and then builds a private trip planner.

Key facts:

- Free, no account, no backend. Nothing typed into ${NAME} leaves the browser (the page's Content-Security-Policy sets connect-src 'none'). Answers are stored only in the browser's localStorage and can be exported as a JSON file.
- Output formats the AI can build: a single offline HTML file, a page inside the AI chat (artifact or canvas), a printable PDF, or a hosted website kept behind a login (Cloudflare Pages with Cloudflare Zero Trust Access email one-time PIN is recommended).
- Planner features: day-by-day itinerary, weather (Yr.no / MET Norway and Open-Meteo, with climate fallback), webcams, maps, morning runs, hikes, packing lists, pre-trip checklist, public holidays, local events, phrases, currency converter, emergency card, calendar export.
- Privacy by design: the prompt tells the AI never to ask for booking references, flight numbers, passport numbers, names, phone numbers or addresses, and to leave placeholders the traveller fills in on their own device. ${NAME} warns users when text they type looks like personal information.
- Destination ideas: a holiday-theme wheel (Christmas markets, New Year's Eve, Easter and spring blossom, summer sun, autumn colours, ski and snow, carnival and festivals, northern lights) and a pixel globe with about 300 destinations.
- The source code will be published under the MIT licence.

## Pages

${pages}

## Example trips

${examples}
`;
}

export function seo(): Plugin {
  const descriptions: Record<string, string> = {};
  return {
    name: 'tripforge-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = ctx.path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
        descriptions[file] = meta(html, 'description');
        return html.replace('<!-- @seo -->', headTags(html, file)).replace('<!-- @examples -->', examplesHtml());
      },
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = SEO_PAGES.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
      // AI crawlers are welcome: being cited in AI answers is the point of GEO.
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt(descriptions) });
    },
  };
}

/** Preload the Latin font file (its name is hashed), which removes most of the font-swap layout shift. */
export function fontPreload(): Plugin {
  return {
    name: 'tripforge-font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /bricolage-grotesque-latin-opsz-normal.*\.woff2$/.test(f));
        if (!font) return html;
        return html.replace('</title>', `</title>\n    <link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin />`);
      },
    },
  };
}
