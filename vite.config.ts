import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Production headers live in public/_headers (Cloudflare Pages). `vite preview` serves the same `/*` block,
// so the CSP is exercised locally and in the a11y run.
function pagesHeaders(): Record<string, string> {
  const text = readFileSync(resolve(import.meta.dirname, 'public/_headers'), 'utf8');
  const block = text.split(/^\/\*\s*$/m)[1]?.split(/^\S/m)[0] ?? '';
  return Object.fromEntries(
    block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]),
  );
}

const PAGES = ['index', 'build', 'how', 'safe', 'hosting', 'examples', 'faq'];

// Shared header/footer without a framework: `<!-- @header -->` / `<!-- @footer -->` are swapped for the partials,
// and the current page's nav link gets aria-current="page".
function partials(): Plugin {
  const read = (n: string) => readFileSync(resolve(import.meta.dirname, `partials/${n}.html`), 'utf8');
  return {
    name: 'tripforge-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = ctx.path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
        const href = page === 'index' ? '/' : `/${page}`;
        const header = read('header').replace(`href="${href}"`, `href="${href}" aria-current="page"`);
        return html.replace('<!-- @header -->', header).replace('<!-- @footer -->', read('footer'));
      },
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [partials()],
  build: {
    rollupOptions: { input: Object.fromEntries(PAGES.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])) },
    // CSP has no 'unsafe-inline': never inline assets as data: scripts.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  preview: { headers: pagesHeaders() },
  server: {
    // Mirror production headers in dev, minus the CSP (Vite's HMR client needs inline/eval).
    headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  },
});
