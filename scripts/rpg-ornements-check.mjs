import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const probe = { name: 'ornements-probe', enforce: 'pre', transform(code, id) {
  if (id.endsWith('RpgMobaBoard.jsx')) {
    const anchor = '  const [version, redraw] = useReducer((n) => n + 1, 0);';
    if (!code.includes(anchor)) throw Error('sonde Conquête introuvable');
    return code.replace(anchor, `${anchor}\n  window.__ornementsDuel = duel; window.__ornementsRedraw = redraw;`);
  }
  if (id.endsWith('RpgDuelPage.jsx')) {
    const anchor = '  const duel = duelRef.current;';
    if (!code.includes(anchor)) throw Error('sonde duel introuvable');
    return code.replace(anchor, `${anchor}\n  window.__ornementsDuel = duel; window.__ornementsRedraw = force;`);
  }
  return null;
} };
const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, autonome, reduit] of [[1440, 900, false, false], [844, 390, false, false], [844, 390, true, false], [844, 390, true, true], [1440, 900, false, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.goto(`${base}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
    await page.locator('.moba__mulligan .moba__primary').click();
    const bord = page.locator('.moba > .rpg-bordure');
    assert.equal(await bord.getAttribute('data-bordure-plateau'), 'pierre');
    assert.equal(await bord.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.evaluate(() => window.preparerCarte('ashigaru-des-braises'));
    await page.locator('.moba__hand-cards .moba__card').first().click();
    await page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)').first().click();
    await page.waitForFunction(() => window.__ornementsDuel.joueur.creatures.length > 0);
    const portail = page.locator('[data-portail-invocation="braise"]').first();
    if (!reduit) {
      await portail.waitFor({ state: 'attached' });
      assert.equal(await portail.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    } else if (await portail.count()) {
      assert.equal(await portail.evaluate(el => getComputedStyle(el).display), 'none');
    }
    await page.evaluate(() => { const duel = window.__ornementsDuel; duel.joueur.creatures[0].armes = ['sabre-maudit']; window.__ornementsRedraw(); });
    if (!reduit) {
      const eclat = page.locator('[data-arme-attachee]');
      await eclat.waitFor({ state: 'attached' });
      assert.equal(await eclat.evaluate(el => getComputedStyle(el.parentElement).pointerEvents), 'none');
      if (autonome) assert.equal(await page.locator('.rpg-arme-eclat--autonome img').count(), 1);
    } else assert.equal(await page.locator('[data-arme-attachee]').count(), 0);
    await page.evaluate(() => { window.__ornementsDuel.joueur.cimetiere.push('poigne-de-givre'); window.__ornementsRedraw(); });
    const pile = page.locator('.moba__piles--joueur');
    if (!reduit) {
      const grains = pile.locator('[data-cimetiere-arrivee]');
      await grains.waitFor({ state: 'attached' });
      assert.equal(await grains.evaluate(el => getComputedStyle(el.parentElement).pointerEvents), 'none');
      const element = await grains.elementHandle();
      await page.evaluate(() => { window.__ornementsDuel.joueur.cimetiere.pop(); window.__ornementsRedraw(); });
      assert.equal(await element.evaluate(el => el.isConnected), true, 'un retrait ne relance pas les grains');
    } else assert.equal(await pile.locator('[data-cimetiere-arrivee]').count(), 0);
    await page.close();
    console.log(`${width}×${height} Conquête ${autonome ? 'autonome' : 'partagé'}${reduit ? ' réduit' : ''} : ornements vérifiés`);
  }
  for (const [width, height] of [[1440, 900], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => { Math.random = () => .425; });
    await page.goto(`${base}/scripts/rpg-plateau-visuel.html?split`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    assert.ok(await page.locator('.card-table > .rpg-bordure').count() >= 1);
    await page.evaluate(async () => {
      const engine = await import('/src/games/rpgDuel.js');
      const duel = window.__ornementsDuel;
      duel.joueur.main = ['ashigaru-des-braises'];
      for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
      const res = engine.rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises');
      if (!res.ok) throw Error(res.raison);
      window.__ornementsRedraw();
    });
    await page.locator('[data-portail-invocation="braise"]').first().waitFor({ state: 'attached' });
    await page.evaluate(() => { window.__ornementsDuel.joueur.creatures[0].armes = ['sabre-maudit']; window.__ornementsRedraw(); });
    await page.locator('[data-arme-attachee]').first().waitFor({ state: 'attached' });
    await page.evaluate(() => { window.__ornementsDuel.joueur.cimetiere.push('poigne-de-givre'); window.__ornementsRedraw(); });
    const zone = width < 1000 ? '.rpg-wizard-plate--joueur .rpg-mobile-zones' : '.rpg-card-piles--player';
    await page.locator(`${zone} [data-cimetiere-arrivee]`).waitFor({ state: 'attached' });
    await page.close(); console.log(`${width}×${height} duel : ornements vérifiés`);
  }
  for (const [width, height, reduit] of [[1440, 900, false], [390, 844, false], [390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.goto(`${base}/scripts/rpg-ornements-visuel.html`);
    const chargement = page.getByRole('status');
    assert.match(await chargement.innerText(), /Chargement du duel.*Astuce/is);
    assert.match(await chargement.evaluate(el => getComputedStyle(el).backgroundImage), /sablier-chargement/);
    assert.equal(await page.locator('.chargement-duel__sable i').first().evaluate(el => getComputedStyle(el).animationName === 'none'), reduit);
    const dimensions = await chargement.boundingBox();
    assert.ok(dimensions.width <= width && dimensions.height > 0);
    await page.close(); console.log(`${width}×${height} chargement${reduit ? ' réduit' : ''} vérifié`);
  }
  const force = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await force.addInitScript(() => localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on'));
  await force.goto(`${base}/scripts/rpg-ornements-visuel.html`);
  assert.equal(await force.locator('.chargement-duel__sable i').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await force.close();
  console.log('chargement : préférence de mouvement réduit du jeu vérifiée');
} finally { if (browser) await browser.close(); await server.close(); }
