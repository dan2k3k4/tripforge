// axe-core (WCAG 2.2 AA) on every built page, at phone and desktop width, light and dark,
// plus each builder step, the mobile preview dialog and the wheel result.
// Also fails on console errors (including CSP violations) and horizontal page scroll.
// Usage: pnpm build && pnpm a11y
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { preview } from 'vite';

const PAGES = ['/', '/build', '/how', '/safe', '/hosting', '/examples', '/faq'];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1366, height: 900 },
];
const SCHEMES = ['light', 'dark'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const server = await preview({ preview: { port: 4173, strictPort: true } });
const base = 'http://localhost:4173';
const browser = await chromium.launch();
let failures = 0;

function report(where, results) {
  for (const v of results.violations) {
    failures++;
    console.log(`✗ ${where}: [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 4)) console.log(`    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
  }
}

const axe = (page) => new AxeBuilder({ page }).withTags(TAGS);

for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: 'reduce' });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const where = `${path} ${vp.name} ${scheme}`;

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) {
        failures++;
        console.log(`✗ ${where}: page scrolls sideways by ${overflow}px`);
      }

      report(where, await axe(page).analyze());

      if (path === '/build') {
        for (let i = 1; i < 6; i++) {
          await page.click(`[data-goto="${i}"]`);
          // reveal conditional parts so they get checked too
          if (i === 1) {
            await page.check('input[name="multiStay"]');
            await page.click('[data-add="legs"]');
          }
          if (i === 2) {
            await page.check('input[name="runs"]');
            await page.check('input[name="hikes"]');
          }
          if (i === 4) await page.check('input[name="format"][value="site"]');
          report(`${where} step ${i + 1}`, await axe(page).analyze());
        }
        // error summary
        await page.click('[data-goto="0"]');
        await page.locator('[data-copy]').filter({ visible: true }).first().click();
        report(`${where} errors`, await axe(page).analyze());
        if (vp.name === 'phone') {
          await page.click('#open-preview');
          report(`${where} dialog`, await axe(page).include('#preview-dialog').analyze());
          await page.click('#close-preview');
        }
      }

      if (path === '/') {
        await page.click('#spin');
        await page.waitForSelector('#wheel-use:not([hidden])');
        await page.click('#globe-random');
        await page.waitForSelector('#globe-use:not([hidden])');
        report(`${where} postcards`, await axe(page).analyze());
      }

      for (const e of errors) {
        failures++;
        console.log(`✗ ${where}: console error: ${e}`);
      }
      await page.close();
    }
    await ctx.close();
  }
}

await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(failures ? `\n${failures} problem(s)` : '✓ axe: no violations, no console errors, no sideways scroll');
process.exit(failures ? 1 : 0);
