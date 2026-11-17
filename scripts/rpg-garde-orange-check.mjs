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
        const aura = el.querySelector('.rpg-card__resonance--garde');
        return { liseret: Boolean(el.querySelector('.rpg-card__liseret-garde')),
          ombre: Boolean(el.querySelector('.rpg-card__ombre-garde')),
          cadre: Boolean(el.querySelector('.rpg-cadre-carte')),
          cadreCouleur: [...el.classList].some(nom => nom.startsWith('rpg-card--frame-')),
          aura: getComputedStyle(aura).backgroundImage,
          onde: getComputedStyle(aura.querySelector('.rpg-card__resonance-onde')).borderColor,
          outline: getComputedStyle(el).outlineColor, outlineStyle: getComputedStyle(el).outlineStyle,
          boxShadow: getComputedStyle(el).boxShadow };
      });
      assert.equal(etat.liseret, false, `${id}: pas de cadre Défenseur`);
      assert.equal(etat.ombre, false, `${id}: pas de silhouette d’écu`);
      assert.equal(etat.cadre, false, `${id}: pas de cadre SVG sur la créature`);
      assert.equal(etat.cadreCouleur, false, `${id}: pas de classe de cadre coloré`);
      assert.match(etat.aura, /238, 111, 20/, `${id}: aura orange conservée`);
      assert.equal(etat.onde, 'rgba(255, 151, 47, 0.92)', `${id}: ondes orange conservées`);
      if (id === 'selection') {
        if (touch) { assert.equal(etat.outline, 'rgb(255, 224, 130)'); assert.equal(etat.outlineStyle, 'solid'); }
        else assert.match(etat.boxShadow, /255, 107, 94/, 'sélection visible');
      }
    }
    assert.equal(await page.locator('#normal .rpg-card__liseret-garde').count(), 0);
    await page.locator('#provocation .rpg-card').click();
    assert.equal(await page.locator('body').getAttribute('data-clicked'), 'oui');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#gele .rpg-card__ombre-garde').count(), 0,
      'aucune ombre de contour sous mouvement réduit');
    assert.ok(await page.locator('#gele .rpg-card__resonance--garde').count(),
      'le repère sonar reste présent sous mouvement réduit');
    await page.close();
    console.log(`${width}×${height} : aura, absence de cadre, sélection et interaction vérifiées`);
  }
} finally {
  await browser?.close();
  await server.close();
}
