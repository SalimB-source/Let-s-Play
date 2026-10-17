/** Browser regression for shared marker diameters and frameless cards.
 * node scripts/rpg-card-markers-check.mjs
 * CHROMIUM_EXECUTABLE_PATH can override Playwright's browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-card-guide.css', 'rpg-deck-atelier.css']
  .map((name) => readFileSync(new URL(`../src/games/${name}`, import.meta.url), 'utf8')).join('\n');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const markers = (hybrid, catalogue = false, preview = false) => `
  <span class="rpg-card-element-badge rpg-card-element-badge--${hybrid ? 'hybride' : 'braise'}">${hybrid
    ? '<i class="rpg-card-element-badge__pip">🔥</i><i class="rpg-card-element-badge__pip">⏳</i>' : '🔥'}</span>
  ${catalogue ? '<span class="rpg-card-catalogue__cost">3</span>'
    : preview ? '<span class="rpg-mana-cost rpg-mana-cost--braise"><b>3</b></span><span class="rpg-sort-sceau rpg-sort-sceau--rapide rpg-hover-card-preview__sceau rpg-hover-card-preview__sort"></span><footer class="rpg-card__foot"><span class="rpg-card__stat--atk"><svg class="rpg-stat-icon" viewBox="0 0 24 24"></svg><span class="rpg-stat-value">4</span></span><span class="rpg-card__pt"><svg class="rpg-stat-icon" viewBox="0 0 24 24"></svg><span class="rpg-stat-value">3</span></span></footer>'
    : '<header class="rpg-card__title rpg-hand__title"><span class="rpg-mana-cost is-compact"><b>3</b></span></header>'}`;
try {
  const page = await browser.newPage();
  for (const width of [1440, 844, 568, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const touch of [false, true]) {
      const faces = ['rpg-card rpg-card--img', 'rpg-hand__card rpg-hand__card--img',
        'rpg-mulligan__card', 'rpg-card-catalogue__art'];
      await page.setContent(`<style>* { box-sizing: border-box; } ${css}</style>
        <main class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}">
          ${faces.flatMap((classes) => [false, true].map((hybrid) => `
            <div data-face="${classes} ${hybrid ? 'hybride' : 'mono'}" class="${classes} rpg-card--frame-braise"
              style="position: relative; width: ${width < 620 ? 80 : 160}px; height: 200px;">
              ${markers(hybrid, classes === 'rpg-card-catalogue__art')}
            </div>`)).join('')}
          ${['', 'catalogue', 'annonce'].flatMap((variant) => [false, true].map((hybrid) => `
            <aside class="rpg-hover-card-preview ${variant ? `rpg-hover-card-preview--${variant}` : ''}"
              style="position: relative; display: block; width: 340px;">
              <div data-face="aperçu ${variant || 'rapide'} ${hybrid ? 'hybride' : 'mono'}"
                class="rpg-hover-card-preview__face rpg-card--frame-braise" style="width: 280px;">
                ${markers(hybrid, false, true)}
              </div>
            </aside>`)).join('')}
          ${['rpg-spell-played__art', 'rpg-terrain',
            'rpg-card-pile__card--top', 'rpg-card-guide__example', 'rpg-atelier__carte-art']
            .map((name) => `<div data-face="${name}" class="${name} rpg-card--frame-braise"></div>`).join('')}
        </main>`);
      const results = await page.locator('[data-face]').evaluateAll((faces) => faces.map((face) => {
        const size = (node) => node ? (() => {
          const rect = node.getBoundingClientRect();
          return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        })() : null;
        const style = getComputedStyle(face);
        const hybrid = face.querySelector('.rpg-card-element-badge__pip');
        const atk = face.querySelector('.rpg-card__stat--atk');
        return {
          name: face.dataset.face,
          color: size(hybrid || face.querySelector('.rpg-card-element-badge')),
          cost: size(face.querySelector('.rpg-mana-cost, .rpg-card-catalogue__cost')),
          sceau: size(face.querySelector('.rpg-hover-card-preview__sceau')),
          face: size(face),
          costFont: parseFloat(getComputedStyle(face.querySelector('.rpg-mana-cost') || face).fontSize),
          statFont: atk ? parseFloat(getComputedStyle(atk).fontSize) : 0,
          border: parseFloat(style.borderTopWidth),
          background: style.backgroundImage,
        };
      }));
      for (const result of results) {
        const label = `${width}px ${touch ? 'mobile/APK' : 'souris'} ${result.name}`;
        if (result.cost) {
          assert.ok(Math.abs(result.color.width - result.cost.width) < 0.1, `${label}: même diamètre`);
          assert.ok(Math.abs(result.color.height - result.cost.height) < 0.1, `${label}: même hauteur`);
          assert.ok(Math.abs(result.cost.width - result.cost.height) < 0.1, `${label}: coût rond`);
          assert.ok(result.cost.width >= 16, `${label}: repères visibles`);
        }
        if (result.name.startsWith('aperçu')) {
          assert.ok(Math.abs(result.color.top - result.cost.top) < 0.1, `${label}: couleur et coût alignés en haut`);
          const leftInset = result.color.left - result.face.left;
          const rightInset = result.face.right - result.cost.right;
          assert.ok(Math.abs(leftInset - rightInset) < 0.1, `${label}: marges symétriques`);
          assert.ok(Math.abs(result.sceau.left - result.color.left) < 0.1, `${label}: sceau de sort aligné sur la couleur`);
          assert.ok(Math.abs((result.face.bottom - result.sceau.bottom) - (result.color.top - result.face.top)) < 0.5, `${label}: marge verticale du sceau symétrique à la couleur`);
          assert.ok(Math.abs(result.sceau.width - result.color.width) < 0.1, `${label}: même diamètre pour le sceau et la couleur`);
          assert.ok(result.costFont >= result.cost.width * .45, `${label}: chiffre à l'échelle du disque`);
          assert.ok(result.statFont >= result.color.width * .6, `${label}: statistiques ATQ/DÉF agrandies à l'échelle de l'aperçu`);
        }
        // L'essai sans cadre s'applique désormais aussi à l'ordinateur.
        assert.equal(result.border, 0, `${label}: aucun cadre`);
        // Le guide conserve son fond de texte, qui n'est pas un cadre.
        if (result.name !== 'rpg-card-guide__example') {
          assert.equal(result.background, 'none', `${label}: aucune matière de cadre`);
        }
      }
    }
  }
  console.log('✓ Diamètres couleur/coût identiques (mono et hybride), catalogue et aperçus inclus ; alignement, marges et chiffre des aperçus vérifiés ; cadres retirés sur souris et mobile/APK.');
} finally {
  await browser.close();
}
