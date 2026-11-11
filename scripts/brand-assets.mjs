// Renders the PNG icons and the 1200x630 social share image into public/. Run after changing the logo or hero:
//   pnpm build && node scripts/brand-assets.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { preview } from 'vite';

const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch();

async function icon(file, size, pad = 0, bg = 'transparent') {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = size - pad * 2;
  await page.setContent(
    `<body style="margin:0;background:${bg};display:grid;place-items:center;height:100vh">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body>',
  );
  await page.screenshot({ path: `public/${file}`, omitBackground: bg === 'transparent' });
  await page.close();
}

await icon('icon-192.png', 192);
await icon('icon-512.png', 512);
await icon('icon-maskable-512.png', 512, 80, '#10224a'); // safe zone for Android masks
await icon('apple-touch-icon.png', 180, 14, '#f4fbff');

// Share image: the real hero, static (reduced motion), header hidden.
const server = await preview({ preview: { port: 4190, strictPort: true } });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce', colorScheme: 'light', bypassCSP: true });
await page.goto('http://localhost:4190/', { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: `.site-header,.skip{display:none!important}
  .hero{padding:56px 0 0!important;min-height:630px}
  .hero-grid{grid-template-columns:.85fr 1.15fr!important;gap:36px!important}
  .hero .lead,.hero .actions,.hero-note{display:none!important}
  .hero h1{font-size:118px!important}
  .hero-copy::before{content:"TripForge";display:block;font-size:34px;font-weight:800;color:#d42a55;margin-bottom:8px}
  .hero-copy::after{content:"Plan the trip with your own AI. Free and private.";display:block;font-size:30px;font-weight:700;line-height:1.25;color:#46597f;max-width:420px}`,
});
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log('icons + og.png written to public/');
