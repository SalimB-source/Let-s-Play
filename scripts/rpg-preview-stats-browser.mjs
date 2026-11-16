import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from 'playwright';

// Render the real components, then inspect their layout in Chromium at both
// pointer sizes. The fixture includes a wounded, buffed acquired Défenseur.
const env = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-preview-creature-smoke.jsx', outDir: 'node_modules/.cache/rpg-preview-creature', emptyOutDir: true } });
if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
const { table, apercu, defenseurMain } = await import('../node_modules/.cache/rpg-preview-creature/rpg-preview-creature-smoke.js');
const files = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css', 'rpg-moba.css', 'rpg-bouclier.css', 'rpg-cadre-carte.css'];
const css = (await Promise.all(files.map(name => readFile(new URL(`../src/games/${name}`, import.meta.url), 'utf8')))).join('\n');
const browser = await chromium.launch({ ...(process.env.RPG_TEST_CHROMIUM ? { executablePath: process.env.RPG_TEST_CHROMIUM } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  for (const mobile of [false, true]) for (const mode of ['duel', 'moba']) {
    const page = await browser.newPage({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const layout = mode === 'moba' ? 'rpg-battle rpg-battle--moba' : `rpg-battle${mobile ? ' rpg-battle--touch' : ''}`;
    const terrain = mode === 'moba' ? `<div class="moba"><div class="moba__slots"><div class="moba__real-slot">${table()}</div></div></div>` : `<div class="card-table"><div class="card-row">${table()}</div></div>`;
    await page.setContent(`<div class="${layout}" data-scene="${mode}">${terrain}<div class="fixture-previews ${mode === 'moba' ? 'moba__preview-layer' : ''}"></div></div>`);
    await page.addStyleTag({ content: css });
    await page.addStyleTag({ content: `.rpg-battle { position: static !important; } .card-table,.moba,.card-row,.moba__slots,.moba__real-slot { position: static !important; display: block !important; width: auto !important; height: auto !important; } .card-row .rpg-card,.moba__real-slot .rpg-card { position: relative !important; width: 140px !important; height: 175px !important; } .fixture-previews { position: static !important; display: flex; gap: 20px; } .fixture-previews .rpg-hover-card-preview { position: relative !important; inset: auto !important; width: 360px !important; max-height: none !important; } .fixture-previews .rpg-hover-card-preview__face { width: 200px !important; } *,*::before,*::after { animation: none !important; transition: none !important; }` });
    const snap = JSON.parse(await page.locator('.rpg-card[data-apercu-entite]').getAttribute('data-apercu-entite'));
    await page.locator('.fixture-previews').evaluate((el, html) => { el.innerHTML = html; }, apercu(snap) + defenseurMain());
    const couleursPlateau = await page.locator('.rpg-card[data-apercu-entite] .rpg-card__foot > span').evaluateAll(ns => ns.map(n => getComputedStyle(n).backgroundImage));
    for (const [i, type] of ['Défenseur posé', 'Défenseur en main'].entries()) {
      const result = await page.locator('.rpg-hover-card-preview__face').nth(i).evaluate(face => {
        const a = face.querySelector('.rpg-card__stat--atk'), d = face.querySelector('.rpg-card__pt');
        const f = face.getBoundingClientRect(), ar = a.getBoundingClientRect(), dr = d.getBoundingClientRect();
        const img = face.querySelector(':scope > img'), cadre = face.querySelector(':scope > .rpg-cadre-carte');
        return { face: { x:f.x, y:f.y, right:f.right, bottom:f.bottom }, atk: { x:ar.x, y:ar.y, right:ar.right, bottom:ar.bottom }, def: { x:dr.x, y:dr.y, right:dr.right, bottom:dr.bottom }, imageMask: getComputedStyle(img).maskImage, cadreMask: getComputedStyle(cadre).maskImage, columns: getComputedStyle(a.parentElement).gridTemplateColumns, translate: getComputedStyle(a.parentElement).translate, valeurs: [a.querySelector('.rpg-stat-value').textContent,d.querySelector('.rpg-stat-value').textContent], couleurs: [getComputedStyle(a).backgroundImage,getComputedStyle(d).backgroundImage] };
      });
      assert.ok(result.atk.bottom <= result.def.y + 1, `${mode}, ${type} : attaque au-dessus de défense`);
      for (const rect of [result.atk, result.def]) assert.ok(rect.x >= result.face.x - 1 && rect.right <= result.face.right + 1 && rect.y >= result.face.y - 1 && rect.bottom <= result.face.bottom + 1, `${mode}, ${type} : stats dans la face`);
      assert.equal(result.imageMask, 'none', `${type} : peinture rectangulaire`);
      assert.equal(result.cadreMask, 'none', `${type} : cadre rectangulaire`);
      if (!i) { assert.deepEqual(result.valeurs, ['7','0']); assert.notEqual(result.translate, 'none'); assert.deepEqual(result.couleurs, couleursPlateau, 'bonus et malus reprennent les couleurs du plateau'); }
      else assert.equal(result.translate, 'none', 'la carte en main reste au bas de sa face');
    }
    const dimensions = await page.locator('.rpg-card[data-apercu-entite]').evaluate(card => {
      const img = card.querySelector('.rpg-card__img'), frame = card.querySelector('.rpg-cadre-carte');
      const c = card.getBoundingClientRect(), f = frame.getBoundingClientRect();
      return { mask: getComputedStyle(img).maskImage, cadre: getComputedStyle(frame).maskImage, scale: getComputedStyle(frame).scale, cardWidth: c.width, frameWidth: f.width };
    });
    assert.equal(dimensions.mask, 'none'); assert.equal(dimensions.cadre, 'none');
    assert.equal(dimensions.scale, '1'); assert.ok(Math.abs(dimensions.cardWidth - dimensions.frameWidth) < 2, 'le cadre suit toute la face');
    await page.close();
  }
  console.log('Aperçus Duel/MOBA PC et tactile : statistiques empilées et faces Défenseur rectangulaires.');
} finally { await browser.close(); }
