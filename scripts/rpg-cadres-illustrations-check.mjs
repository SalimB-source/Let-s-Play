/** Vérifie que les portraits ne dépendent pas d’un SVG de découpe externe. */
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
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
    const sansCadre = new Set(['creature', 'hero', 'defenseur', 'ascension']);
    for (const id of ['magie', 'arme', 'creature', 'hero', 'defenseur', 'site', 'terrain', 'ascension', 'braise', 'eau', 'sable', 'neige', 'tenebres', 'hybride']) {
      const face = page.locator(`#${id}`);
      await face.scrollIntoViewIfNeeded();
      const result = await face.evaluate((el) => {
        const img = el.querySelector('img');
        const cadre = el.querySelector('.rpg-cadre-carte');
        const icone = el.querySelector('.icone-test');
        const rect = el.getBoundingClientRect();
        const point = document.elementFromPoint(rect.left + rect.width * .5, rect.top + rect.height * .48);
        const coin = document.elementFromPoint(rect.left + rect.width * .02, rect.top + rect.height * .02);
        return { loaded: img.naturalWidth, visible: point === img && getComputedStyle(img).visibility === 'visible' && Number(getComputedStyle(img).opacity) > 0, coinRogne: coin !== img, clip: getComputedStyle(img).clipPath, frameZ: cadre && getComputedStyle(cadre).zIndex, iconZ: getComputedStyle(icone).zIndex, frameEvents: cadre && getComputedStyle(cadre).pointerEvents, cadre: Boolean(cadre) };
      });
      assert.ok(result.loaded > 0, `${id} : illustration chargée`);
      assert.ok(result.visible, `${id} : illustration visible au centre (${result.clip})`);
      assert.equal(result.cadre, !sansCadre.has(id), `${id} : cadre selon le type`);
      if (sansCadre.has(id)) {
        assert.equal(result.clip, 'none', `${id} : peinture non découpée`);
        assert.equal(await face.locator(':scope > .rpg-cadre-carte--sablier').count(), 0, `${id} : sans cadre Le Sablier`);
      } else {
        assert.match(result.clip, /^polygon\(/, `${id} : découpe CSS locale`);
        assert.ok(result.coinRogne, `${id} : coins de l’illustration contenus dans le cadre`);
        assert.ok(Number(result.frameZ) < Number(result.iconZ), `${id} : icône au-dessus du cadre`);
        assert.equal(result.frameEvents, 'none', `${id} : cadre non interactif`);
        assert.equal(await face.locator(':scope > .rpg-cadre-carte--sablier').count(), 1, `${id} : cadre Le Sablier`);
      }
      await face.click({ position: { x: 60, y: 80 } });
      assert.equal(await page.locator('body').getAttribute('data-carte-cliquee'), id, `${id} : clic conservé`);
    }
    // Décoder le SVG coloré et vérifier ses coins effectivement peints : cela
    // détecte notamment un dégradé SVG non résolu dans une image data URL.
    for (const [id, debut, fin] of [
      ['braise', [224, 65, 42], [224, 65, 42]], ['eau', [63, 159, 232], [63, 159, 232]],
      ['sable', [216, 188, 134], [216, 188, 134]], ['neige', [169, 224, 245], [169, 224, 245]],
      ['tenebres', [75, 46, 131], [75, 46, 131]], ['hybride', [224, 65, 42], [63, 159, 232]],
    ]) {
      const pixels = await page.locator(`#${id} .rpg-cadre-carte`).evaluate(async el => {
        const url = getComputedStyle(el).backgroundImage.slice(5, -2);
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 179; canvas.height = 256;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 179, 256);
        return [[6, 6], [173, 249]].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
      });
      for (const [pixel, attendu] of [[pixels[0], debut], [pixels[1], fin]]) {
        assert.deepEqual(pixel.slice(0, 3), attendu, `${id} : couleur réellement peinte`);
        assert.ok(pixel[3] > 240, `${id} : coin opaque`);
      }
    }
    // Les composants de production sont aussi exercés avec leurs feuilles
    // complètes : annonces de sorts, armes, créatures et table Défenseur.
    for (const [surface, id] of [['apercu', 'appel-des-marees'], ['apercu', 'sabre-maudit'], ['apercu', 'amani-des-ksour'], ['table', 'amani-des-ksour'], ['table', 'guerrier-au-bouclier-rond'], ['apercu', 'samourai-du-dragon-rouge'], ['table', 'samourai-du-dragon-rouge'], ['apercu', 'source-de-bimini'], ['table', 'source-de-bimini'], ['apercu', 'jarl-du-dernier-rempart'], ['table', 'jarl-du-dernier-rempart']]) {
      await page.goto(`http://127.0.0.1:${port}/Let-s-Play/scripts/rpg-cadres-illustrations.html?${surface}=${id}`, { waitUntil: 'networkidle' });
      const face = page.locator(surface === 'table' ? '.rpg-card--img' : '.rpg-hover-card-preview__face').first();
      await face.waitFor();
      const image = face.locator(':scope > img').first();
      await image.waitFor({ state: 'visible' });
      const etat = await image.evaluate((img) => ({
        chargee: img.naturalWidth,
        clip: getComputedStyle(img).clipPath,
        opacite: Number(getComputedStyle(img).opacity),
        cadre: Boolean(img.nextElementSibling?.matches('.rpg-cadre-carte')),
        classeCadre: [...img.parentElement.classList].some(nom => nom.startsWith('rpg-card--frame-')),
      }));
      const carte = cardById(id);
      assert.ok(carte, `${id} : définition de carte`);
      const sansCadreCarte = ['creature', 'hero'].includes(carte.kind);
      assert.ok(etat.chargee > 0 && etat.opacite > 0, `${surface} ${id} : illustration présente`);
      assert.equal(etat.cadre, !sansCadreCarte, `${surface} ${id} : cadre selon le type`);
      assert.equal(etat.classeCadre, !sansCadreCarte, `${surface} ${id} : classe de cadre selon le type`);
      const cadre = face.locator(':scope > .rpg-cadre-carte--sablier');
      assert.equal(await cadre.count(), sansCadreCarte ? 0 : 1, `${surface} ${id} : cadre Le Sablier selon le type`);
      if (sansCadreCarte) assert.equal(etat.clip, 'none', `${surface} ${id} : illustration rectangulaire sans découpe`);
      else {
        assert.match(etat.clip, /^polygon\(/, `${surface} ${id} : découpe CSS autonome`);
        assert.equal(await cadre.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
        assert.notEqual(await cadre.evaluate(el => getComputedStyle(el).backgroundImage), 'none');
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
