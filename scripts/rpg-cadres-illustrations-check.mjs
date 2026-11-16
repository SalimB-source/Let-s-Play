/** Vérifie que les portraits ne dépendent pas d’un SVG de découpe externe. */
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
    let requetesDecoupe = 0;
    await page.route('**/*decoupes-cartes*.svg*', (route) => { requetesDecoupe += 1; return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="magie"/><clipPath id="arme"/><clipPath id="creature"/></defs></svg>' }); });
    await page.goto(`http://127.0.0.1:${port}/Let-s-Play/scripts/rpg-cadres-illustrations.html`, { waitUntil: 'networkidle' });
    for (const id of ['magie', 'arme', 'creature', 'hero', 'defenseur', 'site', 'ascension']) {
      const face = page.locator(`#${id}`);
      await face.scrollIntoViewIfNeeded();
      const result = await face.evaluate((el) => {
        const img = el.querySelector('img');
        const cadre = el.querySelector('.rpg-cadre-carte');
        const icone = el.querySelector('.icone-test');
        const rect = el.getBoundingClientRect();
        const point = document.elementFromPoint(rect.left + rect.width * .5, rect.top + rect.height * .48);
        const coin = document.elementFromPoint(rect.left + rect.width * .02, rect.top + rect.height * .02);
        return { loaded: img.naturalWidth, visible: point === img && getComputedStyle(img).visibility === 'visible' && Number(getComputedStyle(img).opacity) > 0, coinRogne: coin !== img, clip: getComputedStyle(img).clipPath, frameZ: cadre && getComputedStyle(cadre).zIndex, iconZ: getComputedStyle(icone).zIndex, frameEvents: cadre && getComputedStyle(cadre).pointerEvents };
      });
      assert.ok(result.loaded > 0, `${id} : illustration chargée`);
      assert.ok(result.visible, `${id} : illustration visible au centre (${result.clip})`);
      if (!['site', 'ascension'].includes(id)) {
        assert.match(result.clip, /^polygon\(/, `${id} : découpe CSS locale`);
        assert.ok(result.coinRogne, `${id} : coins de l’illustration contenus dans le cadre`);
        assert.ok(Number(result.frameZ) < Number(result.iconZ), `${id} : icône au-dessus du cadre`);
        assert.equal(result.frameEvents, 'none', `${id} : cadre non interactif`);
      } else {
        assert.equal(result.frameZ, null, `${id} : aucun cadre`);
        assert.equal(result.clip, 'none', `${id} : illustration sans découpe de cadre`);
      }
      await face.click({ position: { x: 60, y: 80 } });
      assert.equal(await page.locator('body').getAttribute('data-carte-cliquee'), id, `${id} : clic conservé`);
    }
    // Les composants de production sont aussi exercés avec leurs feuilles
    // complètes : annonces de sorts, armes, créatures et table Défenseur.
    for (const [surface, id] of [['apercu', 'appel-des-marees'], ['apercu', 'sabre-maudit'], ['apercu', 'amani-des-ksour'], ['table', 'amani-des-ksour'], ['table', 'guerrier-au-bouclier-rond'], ['apercu', 'samourai-du-dragon-rouge'], ['table', 'samourai-du-dragon-rouge'], ['apercu', 'jarl-du-dernier-rempart'], ['table', 'jarl-du-dernier-rempart']]) {
      await page.goto(`http://127.0.0.1:${port}/Let-s-Play/scripts/rpg-cadres-illustrations.html?${surface}=${id}`, { waitUntil: 'networkidle' });
      const face = page.locator(surface === 'table' ? '.rpg-card--img' : '.rpg-hover-card-preview__face').first();
      await face.waitFor();
      const image = face.locator(':scope > img').first();
      await image.waitFor({ state: 'visible' });
      const etat = await image.evaluate((img) => ({ chargee: img.naturalWidth, clip: getComputedStyle(img).clipPath, opacite: Number(getComputedStyle(img).opacity), cadre: Boolean(img.nextElementSibling?.matches('.rpg-cadre-carte')) }));
      assert.ok(etat.chargee > 0 && etat.opacite > 0, `${surface} ${id} : illustration présente`);
      if (['samourai-du-dragon-rouge', 'jarl-du-dernier-rempart'].includes(id)) {
        assert.equal(etat.cadre, false, `${surface} ${id} : aucun cadre`);
        assert.equal(await face.locator(':scope > .rpg-cadre-carte').count(), 0);
      } else {
        assert.ok(etat.cadre, `${surface} ${id} : cadre présent`);
        assert.match(etat.clip, /^polygon\(/, `${surface} ${id} : découpe CSS autonome`);
      }
    }
    assert.equal(requetesDecoupe, 0, 'aucune requête de SVG de découpe externe');
    await page.close();
    console.log(`${width}×${height} : illustrations, cadres et interactions vérifiés`);
  }
} finally {
  await browser?.close();
  await server.close();
}
