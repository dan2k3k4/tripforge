// Static checks on the built site (dist/). Run after `pnpm build`. Fails loudly, fixes nothing.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const fail = (msg) => problems.push(msg);

if (!existsSync(DIST)) {
  console.error('dist/ not found: run `pnpm build` first');
  process.exit(1);
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const files = walk(DIST);
const html = files.filter((f) => f.endsWith('.html'));

// Headers: strict CSP that blocks every network request.
const headers = readFileSync(join(DIST, '_headers'), 'utf8');
const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? '';
if (!csp) fail('_headers: no Content-Security-Policy');
for (const must of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "connect-src 'none'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'none'"]) {
  if (!csp.includes(must)) fail(`_headers: CSP is missing ${must}`);
}
if (/unsafe-(inline|eval)/.test(csp)) fail('_headers: CSP allows unsafe-inline / unsafe-eval');
for (const h of ['X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer', 'Strict-Transport-Security']) {
  if (!headers.includes(h)) fail(`_headers: missing ${h}`);
}

for (const f of html) {
  const s = readFileSync(f, 'utf8');
  // Inline scripts and styles would be blocked by the CSP.
  for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/ld\+json"/.test(m[1])) {
      try {
        JSON.parse(m[2]);
      } catch {
        fail(`${f}: invalid JSON-LD`);
      }
    } else if (!/\bsrc=/.test(m[1])) fail(`${f}: inline <script>`);
  }
  if (/<style\b/.test(s)) fail(`${f}: inline <style>`);
  if (/\sstyle="/.test(s)) fail(`${f}: inline style attribute`);
  if (/\son[a-z]+="/.test(s)) fail(`${f}: inline event handler`);
  // Nothing loaded from other origins (links to other sites are fine).
  for (const m of s.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*\s(?:src|href)="(https?:)?\/\/[^"]+"/g)) if (!m[0].includes('rel="canonical"')) fail(`${f}: loads a third-party resource: ${m[0].slice(0, 80)}`);
  if (!/<html lang="[a-z-]+"/.test(s)) fail(`${f}: missing <html lang>`);
  if (!/<title>[^<]+<\/title>/.test(s)) fail(`${f}: missing <title>`);
  if (!/<main id="main"/.test(s)) fail(`${f}: missing <main id="main"> (skip link target)`);
  if (/<!-- @(header|footer|seo|examples) -->/.test(s)) fail(`${f}: placeholder not replaced`);
  const is404 = f.endsWith('404.html');
  const desc = s.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (desc.length < 50 || desc.length > 160) fail(`${f}: meta description is ${desc.length} characters (want 50-160)`);
  if (is404) {
    if (!/<meta name="robots" content="noindex/.test(s)) fail(`${f}: 404 must be noindex`);
  } else {
    for (const tag of ['<link rel="canonical" href="https://', 'property="og:image" content="https://', 'name="twitter:card"', 'application/ld+json', 'rel="manifest"']) {
      if (!s.includes(tag)) fail(`${f}: missing ${tag}`);
    }
  }
  // Every in-site link points at a page that exists.
  for (const m of s.matchAll(/href="(\/[a-z-]*)(?:[?#][^"]*)?"/g)) {
    const p = m[1] === '/' ? 'index' : m[1].slice(1);
    if (p && !p.includes('.') && !existsSync(join(DIST, `${p}.html`))) fail(`${f}: link to missing page ${m[1]}`);
  }
}

// FAQ structured data must cover every visible question.
{
  const faq = readFileSync(join(DIST, 'faq.html'), 'utf8');
  const shown = (faq.match(/<summary>/g) ?? []).length;
  const marked = (faq.match(/"@type":"Question"/g) ?? []).length;
  if (shown !== marked) fail(`faq.html: ${shown} questions shown but ${marked} in FAQPage JSON-LD`);
}

// Crawl files and share assets.
for (const file of ['404.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'og.png', 'manifest.webmanifest', 'apple-touch-icon.png']) {
  if (!existsSync(join(DIST, file))) fail(`missing dist/${file}`);
}
if (existsSync(join(DIST, 'robots.txt')) && !/^Sitemap: https:\/\//m.test(readFileSync(join(DIST, 'robots.txt'), 'utf8'))) fail('robots.txt has no absolute Sitemap line');

// JS must not phone home either: no fetch / XHR / beacons / websockets in the bundle.
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const s = readFileSync(f, 'utf8');
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'innerHTML', 'eval(', 'new Function']) {
    if (s.includes(bad)) fail(`${f}: uses ${bad}`);
  }
}

// House style: no em dashes in anything a reader sees.
for (const f of [...html, ...files.filter((x) => x.endsWith('.js'))]) {
  if (readFileSync(f, 'utf8').includes('—')) fail(`${f}: contains an em dash`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`✓ check: ${html.length} pages, CSP strict, no inline code, no third-party loads, no network calls`);
