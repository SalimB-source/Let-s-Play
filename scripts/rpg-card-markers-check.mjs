/** Browser regression for shared marker diameters and frameless mobile cards.
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
const markers = (hybrid, catalogue = false) => `
  <span class="rpg-card-element-badge rpg-card-element-badge--${hybrid ? 'hybride' : 'braise'}">${hybrid
    ? '<i class="rpg-card-element-badge__pip">🔥</i><i class="rpg-card-element-badge__pip">⏳</i>' : '🔥'}</span>
  ${catalogue ? '<span class="rpg-card-catalogue__cost">3</span>'
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
          ${['rpg-hover-card-preview__face', 'rpg-spell-played__art', 'rpg-terrain',
            'rpg-card-pile__card--top', 'rpg-card-guide__example', 'rpg-atelier__carte-art']
            .map((name) => `<div data-face="${name}" class="${name} rpg-card--frame-braise"></div>`).join('')}
        </main>`);
      const results = await page.locator('[data-face]').evaluateAll((faces) => faces.map((face) => {
        const size = (node) => node ? { width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height } : null;
        const style = getComputedStyle(face);
        const hybrid = face.querySelector('.rpg-card-element-badge__pip');
        return {
          name: face.dataset.face,
          color: size(hybrid || face.querySelector('.rpg-card-element-badge')),
          cost: size(face.querySelector('.rpg-mana-cost, .rpg-card-catalogue__cost')),
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
        if (touch) {
          assert.equal(result.border, 0, `${label}: aucun cadre`);
          assert.equal(result.background, 'none', `${label}: aucune matière de cadre`);
        } else {
          assert.ok(result.border > 0, `${label}: cadre ordinateur conservé`);
        }
      }
    }
  }
  console.log('✓ Diamètres couleur/coût identiques (mono et hybride), catalogue inclus ; cadres retirés sur mobile/APK uniquement.');
} finally {
  await browser.close();
}
