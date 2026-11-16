import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], base: '/Let-s-Play/', server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const port = server.httpServer.address().port;
  for (const [width, height, touch] of [[390, 844, true], [1280, 720, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${port}/Let-s-Play/scripts/rpg-garde-orange.html`, { waitUntil: 'networkidle' });
    for (const id of ['provocation', 'selection', 'gele', 'moba']) {
      const card = page.locator(`#${id} .rpg-card`);
      const etat = await card.evaluate(el => {
        const trait = el.querySelector('.rpg-card__liseret-garde');
        const aura = el.querySelector('.rpg-card__resonance--garde');
        const ombre = el.querySelector('.rpg-card__ombre-garde');
        return { filter: getComputedStyle(ombre).filter, ombreEvents: getComputedStyle(ombre).pointerEvents, ombreZ: getComputedStyle(ombre).zIndex, couleur: getComputedStyle(trait).backgroundColor,
          traitZ: getComputedStyle(trait).zIndex, traitEvents: getComputedStyle(trait).pointerEvents,
          aura: getComputedStyle(aura).backgroundImage, onde: getComputedStyle(aura.querySelector('.rpg-card__resonance-onde')).borderColor,
          priorite: getComputedStyle(el, '::before').backgroundColor };
      });
      assert.match(etat.filter, /drop-shadow\(rgba\(0, 0, 0, 0\.85\) 0px 7px 12px\)/, `${id}: ombre renforcée`);
      assert.equal(etat.couleur, 'rgb(255, 152, 47)', `${id}: contour orange`);
      assert.match(etat.aura, /238, 111, 20/, `${id}: aura orange`);
      assert.equal(etat.onde, 'rgba(255, 151, 47, 0.92)', `${id}: ondes orange`);
      assert.equal(etat.ombreEvents, 'none');
      assert.equal(etat.ombreZ, '-1');
      assert.equal(etat.traitEvents, 'none');
      assert.equal(etat.traitZ, '5');
      if (id === 'selection') assert.equal(etat.priorite, touch ? 'rgb(255, 224, 130)' : 'rgb(255, 107, 94)', 'sélection prioritaire');
    }
    assert.equal(await page.locator('#normal .rpg-card__liseret-garde').count(), 0);
    await page.locator('#provocation .rpg-card').click();
    assert.equal(await page.locator('body').getAttribute('data-clicked'), 'oui');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const gele = await page.locator('#gele .rpg-card__ombre-garde').evaluate(el => getComputedStyle(el).filter);
    assert.match(gele, /drop-shadow/, 'ombre conservée en mouvement réduit');
    await page.close();
    console.log(`${width}×${height} : aura, contour, ombre, sélection et interaction vérifiés`);
  }
} finally {
  await browser?.close();
  await server.close();
}
