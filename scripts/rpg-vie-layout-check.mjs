/** Vérifie la barre de vie réelle et les PV bonus, sur PC et au doigt.
 * npx playwright install chromium, puis node scripts/rpg-vie-layout-check.mjs
 * CHROMIUM_EXECUTABLE_PATH et CHROMIUM_ARGS permettent un navigateur externe.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { chromium } from 'playwright';

await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-vie-compteurs-smoke.jsx', outDir: 'node_modules/.cache/rpg-vie-layout', emptyOutDir: true },
});
const { plaquesViePourLayout } = await import('../node_modules/.cache/rpg-vie-layout/rpg-vie-compteurs-smoke.js');
const plaques = await plaquesViePourLayout();
// Même ordre de cascade que RpgDuelPage : la compatibilité de la jauge doit
// prendre le relais du fond et des dimensions de l'ancien compteur extérieur.
const css = ['rpg-battle', 'rpg-mobile', 'rpg-mana-essai', 'rpg-soins', 'rpg-vie-compteurs', 'rpg-avatars-plateau']
  .map(nom => readFileSync(new URL(`../src/games/${nom}.css`, import.meta.url), 'utf8')).join('\n');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS?.split(/ +/) || ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  for (const [width, height, tactile] of [[1440, 900, false], [844, 390, true], [568, 320, true]]) {
    await page.setViewportSize({ width, height });
    await page.setContent(`<style>${css}</style>
      <style>
        :root { --display: Georgia; --mono: monospace; --duel-card: 60px; }
        .rpg-battle { position: static !important; display: block !important; }
        .rpg-wizard-plate { position: static !important; display: flex !important; width: 200px; height: 70px; }
      </style>
      <div class="rpg-battle${tactile ? ' rpg-battle--touch' : ''}" data-mode-mana="essai" data-scene="duel"><div class="card-table">${plaques}</div></div>`);
    const mesures = await page.locator('[data-cas]').evaluateAll(plaques => plaques.map(plaque => {
      const pv = plaque.querySelector('.rpg-jauge-vie');
      const rond = pv.querySelector('.rpg-jauge-vie__rond');
      const sable = pv.querySelector('.rpg-jauge-vie__sable');
      const dimensions = e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height });
      return { id: plaque.dataset.cas, pv: dimensions(pv), rond: dimensions(rond),
        part: pv.style.getPropertyValue('--rpg-jauge-part'), remplissage: dimensions(sable), valeur: pv.querySelector('.rpg-wizard-plate__hp-value').textContent,
        rayon: getComputedStyle(rond).borderRadius, decoupe: getComputedStyle(rond).clipPath, transition: getComputedStyle(sable).transitionDuration,
        bouclier: pv.querySelector('.rpg-wizard-plate__shield-value')?.textContent ?? '',
        fond: getComputedStyle(pv).backgroundImage };
    }));
    for (const camp of ['joueur', 'ennemi']) {
      const reference = mesures.find(m => m.id === `25-${camp}`);
      for (const cas of ['25', 'bonus', 'record', '100', 'blesse', 'demi', 'zero', 'bouclier']) {
        const mesure = mesures.find(m => m.id === `${cas}-${camp}`);
        assert.deepEqual(mesure.pv, reference.pv, `${width}: le compteur ${mesure.id} garde ses dimensions`);
        assert.deepEqual(mesure.rond, reference.rond, `${width}: la barre ${mesure.id} garde ses dimensions`);
        assert.ok(mesure.rond.width > mesure.rond.height * 2, 'la jauge est une barre horizontale');
        assert.equal(mesure.decoupe, 'none', 'aucun masque circulaire');
        const valeur = { '25': 25, bonus: 30, record: 25, '100': 100, blesse: 20, demi: 12.5, zero: 0, bouclier: 25 }[cas];
        const part = Math.min(valeur / 25, 1);
        assert.equal(mesure.valeur, String(valeur), 'la valeur réelle reste lisible');
        assert.equal(mesure.bouclier.includes('4'), cas === 'bouclier', 'bouclier affiché séparément sans déplacer la barre');
        assert.equal(Number(mesure.part), part);
        assert.ok(Math.abs(mesure.remplissage.width - (mesure.rond.width - 2) * part) < 1, `${cas}: la largeur représente les PV`);
        assert.equal(mesure.transition, '0s', 'le mouvement réduit coupe la transition');
        if (tactile) {
          assert.equal(mesure.fond, 'none', 'aucun second fond de vie extérieur qui s’élargit');
          assert.deepEqual(mesure.pv, mesure.rond, 'le compteur extérieur épouse la barre intérieure');
        }
      }
    }
    console.log(`✓ ${width}×${height}: barre proportionnelle, dimensions constantes et pleine à partir de 25 PV, pour les deux camps`);
  }
} finally {
  await browser.close();
}
