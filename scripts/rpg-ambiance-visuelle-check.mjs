import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Sonde locale de test : accès à l'état de vie, jamais incluse dans le jeu.
const probe = { name: 'duel-vie-probe', enforce: 'pre', transform(code, id) {
  if (!id.endsWith('RpgDuelPage.jsx')) return null;
  const anchor = '  const duel = duelRef.current;';
  if (!code.includes(anchor)) throw new Error('ancre de sonde introuvable');
  return code.replace(anchor, `${anchor}\n  if (typeof window !== 'undefined') window.__RPG_DUEL_TEST__ = duel;`);
} };
const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch, reduit, autonome] of [
    [1440, 900, false, false, false], [844, 390, true, false, false],
    [844, 390, true, false, true], [1440, 900, false, true, false],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
    await page.locator('.moba__mulligan .moba__primary').click();
    const ambiance = page.locator('.rpg-ambiance');
    assert.equal(await ambiance.count(), 1);
    assert.equal(await ambiance.getAttribute('data-ambiance-plateau'), 'trois-voies');
    assert.equal(await ambiance.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await ambiance.evaluate(el => getComputedStyle(el).display === 'none'), reduit);
    const particules = await page.evaluate(() => {
      const parent = document.createElement('span'); parent.className = 'rpg-carte-delitee';
      document.querySelector('.rpg-battle').append(parent);
      const result = {};
      for (const element of ['sable', 'braise', 'eau', 'neige', 'tenebres']) {
        const grain = document.createElement('i'); grain.className = 'rpg-carte-delitee__grain'; grain.dataset.element = element;
        parent.append(grain); const css = getComputedStyle(grain);
        result[element] = { animation: css.animationName, color: css.backgroundColor, height: css.height };
      }
      parent.remove(); return result;
    });
    if (reduit) for (const p of Object.values(particules)) assert.equal(p.animation, 'none');
    else {
      assert.equal(particules.braise.animation, 'rpg-adieu-braise');
      assert.equal(particules.neige.animation, 'rpg-adieu-glace');
      assert.equal(particules.tenebres.animation, 'rpg-adieu-brume');
      assert.equal(particules.eau.height, '8px');
      assert.equal(particules.sable.animation, 'rpg-carte-delitee-grain');
    }
    await page.locator('.rpg-battle').evaluate(el => el.classList.add('is-reduced'));
    assert.equal(await ambiance.evaluate(el => getComputedStyle(el).display), 'none');
    await page.locator('.rpg-battle').evaluate(el => el.classList.remove('is-reduced'));
    assert.equal(await page.locator('.rpg-danger-vie').count(), 0);
    await page.evaluate(() => window.reglerVie('left', 'joueur', 5));
    const danger = page.locator('.moba__lane').first().locator('.rpg-danger-vie');
    await danger.waitFor({ state: 'attached' });
    assert.equal(await danger.getAttribute('data-danger-vie'), 'joueur');
    assert.equal(await danger.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await danger.evaluate(el => getComputedStyle(el).animationName === 'none'), reduit);
    assert.equal(await page.locator('.rpg-danger-vie').count(), 1);
    if (process.env.RPG_AMBIANCE_SCREENSHOT && !reduit) await page.screenshot({ path: `${process.env.RPG_AMBIANCE_SCREENSHOT}-${width}-${autonome ? 'autonome' : 'partage'}.png` });
    await page.evaluate(() => window.reglerVie('left', 'joueur', 6));
    await danger.waitFor({ state: 'detached' });
    await page.evaluate(() => window.reglerVie('right', 'sorcier', 5));
    await page.locator('.rpg-danger-vie[data-danger-vie="sorcier"]').waitFor({ state: 'attached' });
    await page.evaluate(() => window.conquerir('right'));
    await page.locator('.rpg-danger-vie[data-danger-vie="sorcier"]').waitFor({ state: 'detached' });
    // Les calques ne bloquent pas une invocation normale.
    await page.locator('.moba__hand-cards .moba__card').first().click();
    await page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)').first().click();
    await page.locator('[data-moba-side="joueur"] .has-creature').first().waitFor({ state: 'attached' });
    await page.close();
    console.log(`${width}×${height} ${autonome ? 'autonome' : 'partagé'}${reduit ? ', mouvement réduit' : ''} : ambiance, alerte, soin et conquête vérifiés`);
  }
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.addInitScript(() => { Math.random = () => .425; });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html?split`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    const table = page.locator('.card-table');
    const decoupee = await table.evaluate(el => el.classList.contains('card-table--decoupee'));
    assert.ok(decoupee, 'deux plateaux différents');
    const ambiances = page.locator('.card-table > .rpg-ambiance');
    assert.equal(await ambiances.count(), 2);
    for (const cote of ['joueur', 'adverse']) {
      const ambiance = page.locator(`.rpg-ambiance--${cote}`);
      assert.equal(await ambiance.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      assert.match(await ambiance.evaluate(el => getComputedStyle(el).clipPath), /^inset/);
    }
    await page.evaluate(() => { window.__RPG_DUEL_TEST__.joueur.pv = 1; });
    // Un geste normal provoque un nouveau rendu sans modifier les règles de vie.
    await page.locator('.rpg-hand__card[data-card-id="tislit-des-aures"]').first().click();
    await page.locator('.rpg-danger-vie--joueur').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.rpg-danger-vie--adverse').count(), 0);
    await page.locator('.rpg-creature-slot--choix').filter({ hasText: '3' }).click();
    await page.locator('.card-row--equipe .rpg-card').first().waitFor({ state: 'attached' });
    if (process.env.RPG_AMBIANCE_SCREENSHOT) await page.screenshot({ path: `${process.env.RPG_AMBIANCE_SCREENSHOT}-${width}-duel.png` });
    await page.close();
    console.log(`${width}×${height} duel découpé : deux ambiances, vie critique et interaction vérifiées`);
  }
} finally { await browser?.close(); await server.close(); }
