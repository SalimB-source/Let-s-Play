/** Browser regression for booster artwork ratios and stretched status stamps.
 * Run: node scripts/rpg-booster-layout-check.mjs
 * Requires Playwright Chromium, or CHROMIUM_EXECUTABLE_PATH.
 * Interactive preview with real artwork: npm run preview:rpg-booster (no browser install).
 */
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const preview = process.argv.includes('--preview');

// Mount the real ceremony with deliberately different intrinsic image ratios.
// No wallet or randomness: both a five-card pack and a fifty-card chest.
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgBoosterOuverture from '/src/games/RpgBoosterOuverture.jsx';
import { cardArtId } from '/src/games/rpgCards.js';
import '/src/styles.css';
import '/src/games/rpg-battle.css';
const ids = ['baton-des-citernes', 'kraken', 'leviathan', 'masque-du-guetteur', 'pere-des-corbeaux'];
let generation = 0;
window.sons = [];
window.fermetures = 0;
const root = createRoot(document.getElementById('root'));
window.renderBooster = (count) => root.render(React.createElement(RpgBoosterOuverture, {
  key: ++generation,
  onPlaySfx: (son) => window.sons.push(son),
  onFermer: () => { window.fermetures++; if (${preview}) root.render(null); },
  ouverture: {
    prix: 140, nouvelles: 3, remboursement: 44, coffret: count > 5, paquets: count / 5,
    cartes: Array.from({ length: count }, (_, i) => ({ id: ids[i % 5], doublon: i % 5 > 2, remboursement: 22 })),
  },
  cardArt: (card) => ${preview} ? '/cards/' + cardArtId(card) + '.jpg' : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="176" height="' + (card.id === 'leviathan' ? 320 : 220) + '"><rect width="100%" height="100%" fill="#806535"/></svg>'),
}));
window.renderBooster(5);
if (${preview}) {
  const style = document.createElement('style');
  style.textContent = '.rpg-souk__ceremonie { padding-top: 64px; }';
  document.head.append(style);
  const replay = document.createElement('button');
  replay.textContent = '↻ Rejouer l’ouverture';
  replay.className = 'rpg-menu-button';
  replay.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100;background:#271c13;color:#ffe7af;border:1px solid #a77e37;';
  replay.onclick = () => window.renderBooster(5);
  document.body.append(replay);
}
`;
const server = await createServer({
  base: '/',
  server: { host: preview ? '0.0.0.0' : '127.0.0.1', port: preview ? 5173 : 0 },
  plugins: [{
    name: 'booster-layout-fixture',
    resolveId(id) { if (id === 'virtual:booster-layout') return '\0booster-layout'; },
    load(id) { if (id === '\0booster-layout') return fixture; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/__booster-layout' && !(preview && req.url === '/')) return next();
        res.setHeader('Content-Type', 'text/html');
        server.transformIndexHtml('/__booster-layout', '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/virtual:booster-layout"></script></body></html>')
          .then((html) => res.end(html));
      });
    },
  }],
});
if (preview) {
  await server.listen();
  server.printUrls();
} else {
  await checkLayout();
}

async function checkLayout() {
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__booster-layout`);
    await page.waitForSelector('[data-souk-phase=termine]');
    assert.equal(await page.locator('[data-souk-ceremonie-passer]').count(), 0, 'reduced motion reveals immediately');
    for (const count of [5, 50]) {
      if (count === 50) await page.evaluate(() => window.renderBooster(50));
      await page.waitForFunction((n) => document.querySelectorAll('[data-souk-carte]').length === n, count);
      for (const width of [1122, 820, 640, 481, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.locator('.rpg-souk__carte img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
        const cards = await page.locator('[data-souk-carte]').evaluateAll((nodes) => nodes.map((node) => {
          const rect = (selector) => node.querySelector(selector).getBoundingClientRect().toJSON();
          return {
            card: node.getBoundingClientRect().toJSON(), art: rect('.rpg-souk__carte-art'),
            body: rect('.rpg-souk__carte-corps'), stamp: rect('.rpg-souk__carte-tampon'),
          };
        }));
        for (const card of cards) {
          assert.ok(Math.abs(card.art.width / card.art.height - 176 / 238) < .01, 'common artwork ratio');
          assert.ok(card.body.bottom <= card.stamp.top, 'text does not overlap stamp');
          assert.ok(card.stamp.height >= 32 && card.stamp.height <= 34, 'status stamp stays compact');
          assert.ok(card.card.left >= 0 && card.card.right <= width, 'card stays within viewport');
          const row = cards.filter((other) => Math.abs(other.card.top - card.card.top) < 1);
          for (const other of row) {
            for (const edge of [other.art.bottom - card.art.bottom, other.body.top - card.body.top, other.stamp.top - card.stamp.top]) {
              assert.ok(Math.abs(edge) < 1, 'artwork, text and stamps align within each row');
            }
          }
        }
        console.log(`✓ ${count} cards at ${width}px: uniform art, aligned text and compact stamps`);
      }
    }
    // Real-time choreography, not just CSS/source assertions.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1122, height: 900 });
    const attendre = (phase) => page.waitForSelector(`[data-souk-phase="${phase}"]`);
    const remonter = async () => {
      await page.evaluate(() => { window.sons = []; window.renderBooster(5); });
      await attendre('scelle');
    };
    await remonter();
    assert.equal(await page.locator('[data-souk-carte-dos]').count(), 5, 'five hidden backs');
    assert.equal(await page.locator('[data-souk-ceremonie-ranger]').isDisabled(), true);
    await attendre('ouverture');
    await attendre('sortie');
    assert.equal(await page.locator('[data-souk-carte]').count(), 0, 'no faces exposed during extraction');
    const depart = await page.locator('.rpg-souk__carte-place').evaluateAll((nodes) => nodes.map((node) => node.style.getPropertyValue('--depart-x')));
    assert.ok(depart.every(Boolean) && new Set(depart).size === 5, 'each card departs from the pack towards its own column');
    await attendre('revelation');
    await attendre('termine');
    assert.equal(await page.locator('[data-souk-carte]').count(), 5);
    assert.equal(await page.locator('.rpg-souk__sachet-ancre').count(), 0, 'pack disappears');
    assert.equal(await page.locator('[data-souk-ceremonie-ranger]').isEnabled(), true);
    assert.equal(await page.locator('.rpg-souk__carte-flotte').first().evaluate((node) => getComputedStyle(node).animationName), 'rpg-souk-carte-suspension');
    assert.deepEqual(await page.evaluate(() => window.sons), ['pioche', 'victoire', 'victoire', 'pioche', 'victoire'], 'one sound per reveal');
    await page.locator('[data-souk-ceremonie-ranger]').click();
    assert.equal(await page.evaluate(() => window.fermetures), 1);
    console.log('✓ Complete opening: seal, extraction, staggered flips, floating cards and close');

    for (const phase of ['scelle', 'ouverture', 'sortie', 'revelation']) {
      await remonter();
      await attendre(phase);
      await page.locator('[data-souk-ceremonie-passer]').click();
      await attendre('termine');
      assert.equal(await page.locator('[data-souk-carte]').count(), 5);
      assert.equal(await page.locator('[data-souk-carte-dos]').count(), 0);
      assert.equal(await page.locator('[data-souk-ceremonie-ranger]').isEnabled(), true);
    }
    console.log('✓ Skip works during every stage');

    await page.setViewportSize({ width: 390, height: 844 });
    await remonter();
    const mobile = await page.locator('.rpg-souk__sachet-ancre').boundingBox();
    assert.ok(mobile.y >= 0 && mobile.y + mobile.height < 844, 'mobile pack visible without scrolling');
    const skip = await page.locator('[data-souk-ceremonie-passer]').boundingBox();
    assert.ok(skip.y >= 0 && skip.y + skip.height <= 844, 'mobile skip visible without scrolling');
    await attendre('sortie');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await attendre('termine');
    assert.equal(await page.locator('[data-souk-carte]').count(), 5, 'motion preference changes finish in-flight sequence');
    assert.equal(await page.locator('.rpg-souk__carte-flotte').first().evaluate((node) => getComputedStyle(node).animationName), 'none');
    console.log('✓ Mobile controls stay visible; live reduced-motion preference stops animation');
    assert.deepEqual(errors, [], 'no browser errors');

  } finally {
    await browser?.close();
    await server.close();
  }
}
