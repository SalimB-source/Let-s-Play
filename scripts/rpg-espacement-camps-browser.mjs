// Vérifie la séparation sur le vrai plateau et la sélection d'un emplacement.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { creerServeurAscension } from './rpg-ascension-preview.mjs';

const port = Number(process.env.RPG_TEST_PORT ?? 4186);
const serveur = await creerServeurAscension(port);
let navigateur;
try {
  navigateur = await chromium.launch({ headless: true, ...(process.env.RPG_TEST_CHROMIUM ? { executablePath: process.env.RPG_TEST_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const mode of ['duel', 'moba']) for (const [width, height, tactile] of [[1440, 900, false], [1280, 720, false], [844, 390, true], [568, 320, true], [640, 280, true]]) {
    const page = await navigateur.newPage({ viewport: { width, height }, hasTouch: tactile, isMobile: tactile, reducedMotion: 'reduce' });
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=${mode}`, { waitUntil: 'networkidle' });
      const mesurer = () => page.evaluate((mode) => {
        const select = mode === 'duel'
          ? ['.card-row--ennemi .rpg-creature-slot', '.card-row--equipe .rpg-creature-slot']
          : ['[data-moba-lane="left"][data-moba-side="sorcier"][data-moba-slot="0"] .moba__slot', '[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] .moba__slot'];
        const [adverse, joueur] = select.map((s) => document.querySelector(s)?.getBoundingClientRect());
        if (!adverse || !joueur) throw new Error('Emplacement absent');
        return { espace: joueur.top - adverse.bottom, haut: adverse.top, bas: joueur.bottom };
      }, mode);
      const actuel = await mesurer();
      assert.ok(actuel.espace >= 12, `${mode} ${width}×${height} : espace visible (${actuel.espace}px)`);
      assert.ok(actuel.haut >= 0 && actuel.bas <= height, 'les emplacements restent à l’écran');
      const ancienStyle = await page.addStyleTag({ content: `
        .rpg-battle[data-scene="duel"]:not(.rpg-battle--touch) .card-table > .card-row--ennemi { bottom: calc(50% + 4px) !important; }
        .rpg-battle[data-scene="duel"]:not(.rpg-battle--touch) .card-table > .card-row--equipe { top: calc(50% + 4px) !important; }
        .rpg-battle[data-scene="duel"].rpg-battle--touch .card-table > .card-row--ennemi,
        .rpg-battle[data-scene="duel"].rpg-battle--touch .card-table > .card-row--equipe { top: 0 !important; }
        .moba .moba__lane { gap: 0 !important; }
      ` });
      const ancien = await mesurer();
      assert.ok(actuel.espace - ancien.espace >= (mode === 'duel' ? 7 : 3), `${mode} ${width} : les camps sont bien écartés`);
      await ancienStyle.evaluate((e) => e.remove());
      if (mode === 'duel') {
        const carte = page.locator('.rpg-hand__card[data-card-id="viking-des-neiges"]').first();
        if (tactile) await carte.tap(); else await carte.click();
        const slot = page.locator('[data-creature-slot-choix="true"]').first();
        await slot.waitFor({ state: 'visible' });
        if (tactile) await slot.tap(); else await slot.click();
        await page.waitForFunction(() => window.__ASCENSION_TEST_DUEL__.joueur.creatures.some((e) => e.carteId === 'viking-des-neiges'));
      } else {
        const carte = page.locator('.rpg-hand__card[data-card-id="viking-des-neiges"]').first();
        if (tactile) await carte.tap(); else await carte.click();
        const slot = page.locator('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="1"] button.moba__slot');
        await slot.waitFor({ state: 'visible' });
        if (tactile) await slot.tap(); else await slot.click();
        await page.waitForFunction(() => window.__ASCENSION_TEST_DUEL__.joueur.creatures.some((e) => e.carteId === 'viking-des-neiges'));
      }
      console.log(`✓ ${mode} ${width}×${height} : espace entre les camps et emplacements accessibles`);
    } finally { await page.close(); }
  }
} finally {
  await navigateur?.close();
  await serveur.close();
}
