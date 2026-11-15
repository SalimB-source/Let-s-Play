import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 280 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-pastille-position.html`);
  const pastille = page.locator('.rpg-pastille--explicable').first();
  await pastille.focus();
  const bulle = page.locator('[role="tooltip"]');
  await bulle.waitFor({ state: 'visible' });
  const avant = await bulle.boundingBox();
  await page.locator('#defilement').evaluate((el) => { el.scrollTop = 40; });
  await page.waitForFunction((top) => Math.abs(document.querySelector('[role="tooltip"]').getBoundingClientRect().top - (top - 40)) < 2, avant.y);
  const apres = await bulle.boundingBox();
  assert.ok(Math.abs(apres.y - avant.y + 40) < 2, 'la bulle suit le défilement interne');

  await page.setViewportSize({ width: 250, height: 160 });
  await page.locator('#defilement').evaluate((el) => { el.scrollTop = 100; });
  await page.waitForFunction(() => {
    const r = document.querySelector('[role="tooltip"]').getBoundingClientRect();
    const a = document.querySelector('.rpg-pastille--explicable').getBoundingClientRect();
    return a.top - r.height - 8 < 8 && a.bottom + 8 + r.height > innerHeight - 8
      && r.left >= 7 && r.right <= innerWidth - 7 && r.top >= 7 && r.bottom <= innerHeight - 7;
  });
  const rect = await bulle.boundingBox();
  assert.ok(rect.x >= 7 && rect.x + rect.width <= 243 && rect.y >= 7 && rect.y + rect.height <= 153,
    'la bulle reste dans l’écran même si aucune des deux positions ne rentre entièrement');
  await pastille.press('Escape');
  await bulle.waitFor({ state: 'hidden' });
  assert.equal(await pastille.evaluate((el) => el === document.activeElement), true, 'Échap conserve le focus');
  await pastille.press('Enter');
  await bulle.waitFor({ state: 'visible' });
  const scrollAvantEspace = await page.locator('#defilement').evaluate((el) => el.scrollTop);
  await pastille.press('Space');
  await bulle.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#defilement').evaluate((el) => el.scrollTop), scrollAvantEspace, 'Espace ne fait pas défiler la fiche');
  await pastille.press('Space');
  await bulle.waitFor({ state: 'visible' });
  await page.close();

  // L'Abordage est l'une des explications les plus longues du catalogue.
  for (const [width, height] of [[568, 320], [640, 280], [390, 844]]) {
    const mobile = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await mobile.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-pastille-position.html`);
    const abordage = mobile.locator('[data-pastille="abordage"]');
    await abordage.tap();
    const bulleMobile = mobile.locator('[role="tooltip"]');
    await bulleMobile.waitFor({ state: 'visible' });
    assert.match(await bulleMobile.innerText(), /s’il est renvoyé ou exilé, elle revient en main/);
    const r = await bulleMobile.boundingBox();
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height,
      `${width}×${height} : l'explication complète tient dans l'écran`);
    await mobile.locator('#defilement').evaluate((el) => { el.scrollTop = 180; });
    await mobile.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const visibleEnPartie = await abordage.evaluate((el) => {
      const a = el.getBoundingClientRect(), parent = document.querySelector('#defilement').getBoundingClientRect();
      return a.top < parent.top && a.bottom > parent.top;
    });
    assert.ok(visibleEnPartie, 'la pastille est partiellement visible');
    assert.equal(await bulleMobile.isVisible(), true, 'sa bulle reste lisible tant qu’une partie de la pastille est visible');
    await mobile.locator('#defilement').evaluate((el) => { el.scrollTop = 300; });
    await bulleMobile.waitFor({ state: 'hidden' });
    await mobile.locator('#defilement').evaluate((el) => { el.scrollTop = 0; });
    await abordage.tap();
    await bulleMobile.waitFor({ state: 'visible' });
    await mobile.locator('[data-pastille="test"]').tap();
    assert.equal(await mobile.locator('[role="tooltip"]').count(), 1, 'une seule bulle tactile reste ouverte');
    await mobile.touchscreen.tap(width - 10, height - 10);
    await mobile.locator('[role="tooltip"]').waitFor({ state: 'hidden' });
    await mobile.close();
  }
  console.log('Bulle : défilement, changement de taille, commandes clavier et lecture tactile vérifiés.');
} finally {
  await browser?.close();
  await server.close();
}
