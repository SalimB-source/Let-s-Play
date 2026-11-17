/** Browser regression for shared marker diameters and the global CSS zero-border experiment.
 * It intentionally keeps frame classes on every sample: it checks the global border width,
 * not the selective class/SVG policy for creature and hero cards (covered by frame tests).
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
  <span class="rpg-card-element-badge rpg-card-element-badge--${hybrid ? 'hybride' : 'braise'} is-plaque">${hybrid
    ? '<i class="rpg-card-element-badge__pip is-plaque">🔥</i><i class="rpg-card-element-badge__pip is-plaque">⏳</i>' : '🔥'}</span>
  ${catalogue ? '<span class="rpg-card-catalogue__cost">3</span>'
    : preview ? '<span class="rpg-mana-cost rpg-mana-cost--braise is-plaque"><b>3</b></span><span class="rpg-sort-sceau rpg-sort-sceau--rapide rpg-hover-card-preview__sceau rpg-hover-card-preview__sort"></span><footer class="rpg-card__foot"><span class="rpg-card__stat--atk"><svg class="rpg-stat-icon" viewBox="0 0 24 24"></svg><span class="rpg-stat-value">4</span></span><span class="rpg-card__pt"><svg class="rpg-stat-icon" viewBox="0 0 24 24"></svg><span class="rpg-stat-value">3</span></span></footer>'
    : '<header class="rpg-card__title rpg-hand__title"><span class="rpg-mana-cost is-compact is-plaque"><b>3</b></span></header>'}`;
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
          backgroundSize: style.backgroundSize,
        };
      }));
      for (const result of results) {
        const label = `${width}px ${touch ? 'mobile/APK' : 'souris'} ${result.name}`;
        if (result.cost) {
          if (result.name.startsWith('rpg-card-catalogue__art')) {
            // Dans le catalogue, le coût reste un disque indépendant de la
            // pierre de couleur ; les deux doivent être visibles et carrés.
            assert.ok(result.color.width >= 16 && result.color.height >= 16, `${label}: couleur lisible`);
          } else if (touch && result.name.startsWith('rpg-hand__card')) {
            // Le doigt réduit encore la couleur dans la main ; le losange du
            // coût reste un peu plus grand pour rester facile à lire.
            assert.ok(result.color.width <= result.cost.width - 2.5, `${label}: pastille de couleur réduite dans la main au doigt`);
            assert.ok(result.color.width >= 16 && result.color.height >= 16, `${label}: pastille de couleur encore lisible`);
          } else {
            // Le losange a une boîte 12 % plus grande que l'hexagone, afin que
            // les deux silhouettes aient un poids visuel comparable.
            assert.ok(Math.abs(result.cost.width / result.color.width - 1.12) < 0.02,
              `${label}: dimensions de la pierre de coût proportionnelles`);
            assert.ok(Math.abs(result.cost.height / result.color.height - 1.12) < 0.02,
              `${label}: hauteur de la pierre de coût proportionnelle`);
          }
          assert.ok(Math.abs(result.cost.width - result.cost.height) < 0.1, `${label}: coût carré`);
          assert.ok(result.color.width >= 16, `${label}: repère de couleur visible`);
          assert.ok(result.cost.width >= 16, `${label}: repère de coût visible`);
        }
        if (result.name.startsWith('aperçu')) {
          assert.ok(Math.abs(result.color.top - result.cost.bottom - 6) < 0.5,
            `${label}: la couleur suit le coût avec un espacement constant`);
          const centerColor = result.color.left + result.color.width / 2;
          const centerCost = result.cost.left + result.cost.width / 2;
          assert.ok(Math.abs(centerColor - centerCost) < 1.1, `${label}: couleur et coût centrés dans le même axe`);
          assert.ok(Math.abs(result.sceau.left - (result.face.left + result.face.width * .06)) < 0.5,
            `${label}: sceau de sort dans son coin inférieur gauche`);
          assert.ok(Math.abs((result.face.bottom - result.sceau.bottom) - (result.cost.top - result.face.top)) < 0.5,
            `${label}: sceau inférieur symétrique au coût supérieur`);
          assert.ok(Math.abs(result.sceau.width - result.sceau.height) < 0.1 && result.sceau.width >= 24,
            `${label}: sceau de sort carré et lisible`);
          assert.ok(result.costFont >= result.cost.width * .45, `${label}: chiffre à l'échelle du losange`);
          assert.ok(result.statFont >= result.color.width * .3, `${label}: statistiques ATQ/DÉF restent lisibles à l'échelle de l'aperçu`);
        }
        // Cette assertion porte uniquement sur l'expérimentation CSS globale :
        // tous les échantillons gardent volontairement leur classe de cadre.
        assert.equal(result.border, 0, `${label}: bordure CSS globale à zéro`);
        // La vignette de l'atelier n'a pas cette pile CSS historique ; sa
        // feuille garde un sélecteur local de bordure nulle, vérifié ci-dessus.
        if (result.name !== 'rpg-atelier__carte-art') {
          const couchesFond = result.backgroundSize.split(',').map((couche) => couche.trim());
          assert.equal(couchesFond.length, 3, `${label}: pile CSS historique en trois couches`);
          assert.equal(couchesFond[1], '0px 0px', `${label}: motif CSS de cadre neutralisé`);
          assert.equal(couchesFond[2], '0px 0px', `${label}: matière CSS de cadre neutralisée`);
        }
      }
    }
  }
  console.log('✓ Diamètres et alignement des marqueurs vérifiés ; expérimentation CSS globale de bordure nulle et neutralisation du motif/matière CSS vérifiées indépendamment de la sélection des cadres SVG.');
} finally {
  await browser.close();
}
