import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const probe = { name: 'duel-scene-probe', enforce: 'pre', transform(code, id) {
  if (!id.endsWith('RpgDuelPage.jsx')) return null;
  const anchor = '  const duel = duelRef.current;';
  if (!code.includes(anchor)) throw new Error('ancre de sonde introuvable');
  return code.replace(anchor, `${anchor}\n  if (typeof window !== 'undefined') { window.__duelScene = duel; window.__actualiserScene = force; }`);
} };
const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, autonome, reduit] of [[1440, 900, false, false], [844, 390, false, false], [844, 390, true, false], [844, 390, false, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
    await page.locator('.moba__mulligan .moba__primary').click();
    await page.evaluate(() => window.preparerCible());
    await page.locator('.moba__hand-cards .moba__card').first().click();
    const guide = page.locator('.rpg-guide-cibles');
    await guide.waitFor({ state: 'attached' });
    assert.equal(await guide.locator('line').count(), 1, 'une seule cible légale');
    assert.equal(await guide.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.locator('.moba__cancel-choice').click();
    await guide.waitFor({ state: 'detached' });
    await page.evaluate(() => window.preparerCarte('yamina'));
    await page.locator('.moba__hand-cards .moba__card').first().click();
    await page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)').first().click();
    const entree = page.locator('.rpg-entree-legendaire');
    await entree.first().waitFor({ state: 'attached' });
    assert.equal(await entree.first().evaluate(el => getComputedStyle(el).display === 'none'), reduit);
    await page.evaluate(() => window.conquerir('right'));
    const fait = page.locator('.rpg-temps-forts__fait.is-conquete');
    await fait.waitFor({ state: 'attached' });
    assert.match(await fait.innerText(), /Voie droite conquise par vous/);
    const infos = await page.evaluate(() => {
      const parent = document.querySelector('.moba');
      const element = document.createElement('span'); element.className = 'rpg-entree-legendaire'; parent.append(element);
      const verdict = document.createElement('span'); verdict.className = 'rpg-verdict-scene is-nul'; parent.append(verdict);
      const infos = { entree: getComputedStyle(element).display, verdict: getComputedStyle(verdict).display, pointer: getComputedStyle(element).pointerEvents };
      element.remove(); verdict.remove(); return infos;
    });
    assert.equal(infos.pointer, 'none');
    assert.equal(infos.entree === 'none', reduit); assert.equal(infos.verdict === 'none', reduit);
    for (const [resultat, classe, nom] of [['joueur', 'victoire', 'Victoire'], ['sorcier', 'defaite', 'Défaite'], ['nul', 'nul', 'Match nul']]) {
      await page.evaluate((value) => window.terminerPartie(value), resultat);
      const verdict = page.locator(`.rpg-verdict-scene.is-${classe}`);
      await verdict.waitFor({ state: 'attached' });
      const bilan = page.getByRole('dialog', { name: nom });
      await bilan.waitFor({ state: 'attached' });
      assert.equal(await verdict.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      assert.equal(await verdict.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
      if (resultat !== 'joueur') assert.equal(await bilan.locator('.moba__end-panel').evaluate(el => getComputedStyle(el).animationName.includes('rpg-bilan-voile')), !reduit);
    }
    await page.close(); console.log(`${width}×${height} ${autonome ? 'autonome' : 'partagé'}${reduit ? ' réduit' : ''} : cible, annulation et conquête vérifiées`);
  }
  for (const [width, height] of [[1440, 900], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => { Math.random = () => .425; });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html?split`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    await page.evaluate(async () => {
      const engine = await import('/src/games/rpgDuel.js');
      const duel = window.__duelScene;
      engine.rpgFinDeTour(duel); duel.sorcier.manaChoixEnAttente = null;
      duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
      const result = engine.rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises');
      if (!result.ok) throw new Error(`Préparation duel : ${result.reason ?? result.erreur}`);
      engine.rpgFinDeTour(duel); duel.joueur.manaChoixEnAttente = null;
      duel.joueur.main = ['poigne-de-givre'];
      for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
      window.__actualiserScene();
    });
    const carte = page.locator('.rpg-hand__card[data-card-id="poigne-de-givre"]');
    await carte.click();
    const guide = page.locator('.rpg-guide-cibles');
    await guide.waitFor({ state: 'attached' });
    assert.equal(await guide.locator('line').count(), 1);
    assert.equal(await guide.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.locator('.card-row--ennemi .rpg-card.is-ciblable').first().click();
    await guide.waitFor({ state: 'detached' });
    await page.close(); console.log(`${width}×${height} duel : cible et sélection vérifiées`);
  }
} finally { if (browser) await browser.close(); await server.close(); }
