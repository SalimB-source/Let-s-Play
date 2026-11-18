import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const probe = { name: 'duel-effets-probe', enforce: 'pre', transform(code, id) {
  if (!id.endsWith('RpgDuelPage.jsx')) return null;
  const anchor = '  const duel = duelRef.current;';
  if (!code.includes(anchor)) throw new Error('ancre de sonde introuvable');
  return code.replace(anchor, `${anchor}\n  if (typeof window !== 'undefined') { window.__duelEffets = duel; window.__actualiserEffets = force; }`);
} };
const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, autonome, reduit] of [[1440, 900, false, false], [844, 390, false, false], [844, 390, true, false], [844, 390, false, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    const url = `http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`;
    await page.goto(url);
    await page.locator('.moba__mulligan .moba__primary').click();
    const vague = page.locator('.rpg-vague-tour');
    await vague.waitFor({ state: 'attached' });
    assert.equal(await vague.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await vague.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
    await page.evaluate(() => window.reglerVie('left', 'joueur', 5));
    const jauge = page.locator('.moba__lane').first().locator('.moba__side--joueur .moba__health-bar');
    await jauge.evaluate(el => { if (!el.classList.contains('is-danger')) throw Error('jauge critique absente'); });
    assert.equal(await jauge.evaluate(el => getComputedStyle(el, '::after').animationName === 'none'), reduit);
    await page.evaluate(() => window.reglerVie('left', 'joueur', 6));
    await page.waitForFunction(() => !document.querySelector('.moba__lane .moba__side--joueur .moba__health-bar').classList.contains('is-danger'));
    await page.evaluate(() => window.preparerRecherche());
    await page.locator('.moba__search-item button').first().click();
    const trace = page.locator('.moba__card-flight--recherche .rpg-trace-recherche');
    await trace.waitFor({ state: 'attached' });
    assert.equal(await trace.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
    assert.equal(await trace.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.locator('.rpg-battle').evaluate(el => el.classList.add('is-reduced'));
    assert.equal(await trace.evaluate(el => getComputedStyle(el).display), 'none');
    await page.evaluate(() => window.reglerVie('left', 'joueur', 5));
    await page.waitForFunction(() => document.querySelector('.moba__lane .moba__side--joueur .moba__health-bar')?.classList.contains('is-danger'));
    assert.equal(await jauge.evaluate(el => getComputedStyle(el, '::after').animationName), 'none', 'option de mouvement réduit du jeu');
    await page.close();

    // Deux résolutions séparées : un vrai coup et une parade absorbée.
    for (const cas of ['blessure', 'parade', 'malus']) {
      const bouclier = cas === 'parade';
      const p = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
      await p.goto(url); await p.locator('.moba__mulligan .moba__primary').click();
      await p.evaluate(([protection, carte]) => window.preparerEffetCible(protection, carte), [bouclier, cas === 'malus' ? 'haut-fond' : 'poigne-de-givre']);
      await p.locator('.moba__hand-cards .moba__card').first().click();
      await p.locator('[data-moba-side="sorcier"][data-moba-entity] button').first().click();
      if (cas === 'malus') {
        await p.waitForTimeout(350);
        assert.equal(await p.locator('.rpg-fissure-impact').count(), 0, 'un malus sans blessure ne montre pas de fissure');
      } else {
        const effet = p.locator(bouclier ? (autonome ? '.rpg-eclats-bouclier-autonome' : '.rpg-bouclier-impact.is-brise') : '.rpg-fissure-impact');
        await effet.waitFor({ state: 'attached', timeout: 10000 });
        assert.equal(await effet.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
        if (!bouclier || autonome) assert.equal(await effet.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
        if (bouclier) assert.equal(await p.locator('.rpg-fissure-impact').count(), 0, 'parade ne provoque pas de fausse blessure');
      }
      await p.close();
    }
    console.log(`${width}×${height} ${autonome ? 'autonome' : 'partagé'}${reduit ? ' réduit' : ''} : recherche, jauge, blessure et parade vérifiées`);
  }
  for (const [width, height, reduit] of [[1440, 900, false], [844, 390, false], [844, 390, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.addInitScript(() => { Math.random = () => .425; });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html?split`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    await page.evaluate(async () => {
      const engine = await import('/src/games/rpgDuel.js');
      const duel = window.__duelEffets;
      duel.joueur.pv = 5; duel.joueur.pvMax = 25;
      duel.joueur.main = ['dune-marchante']; duel.joueur.deck = ['poigne-de-givre'];
      for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
      const result = engine.rpgJouerCreature(duel, 'joueur', 'dune-marchante');
      if (!result.ok) throw new Error(`Préparation recherche duel : ${result.raison}`);
      window.__actualiserEffets();
    });
    const jauge = page.locator('.rpg-wizard-plate--joueur .rpg-jauge-vie');
    await page.waitForFunction(() => document.querySelector('.rpg-wizard-plate--joueur .rpg-jauge-vie')?.classList.contains('is-danger'));
    assert.equal(await jauge.evaluate(el => getComputedStyle(el, '::after').animationName === 'none'), reduit);
    const choix = page.locator('.rpg-renfort-choix button').filter({ hasText: 'Poigne' });
    await choix.click();
    const trace = page.locator('.rpg-hand__card[data-card-id="poigne-de-givre"] .rpg-trace-recherche');
    await trace.waitFor({ state: 'attached' });
    assert.equal(await trace.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
    await page.close(); console.log(`${width}×${height} duel${reduit ? ' réduit' : ''} : jauge et recherche vérifiées`);
  }
} finally { if (browser) await browser.close(); await server.close(); }
