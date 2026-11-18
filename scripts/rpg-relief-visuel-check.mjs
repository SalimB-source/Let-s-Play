// Contrôle du vrai plateau Conquête et de ses rendus, sans compte ni WebGL.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch, reduit, autonome, vitesse] of [
    [1440, 900, false, false, false, 2], [844, 390, true, false, false, 1],
    [844, 390, true, false, true, 1], [1440, 900, false, true, false, 1],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.addInitScript((v) => localStorage.setItem('letsplay_sablier_anim_vitesse_v1', String(v)), vitesse);
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
    await page.locator('.rpg-battle').evaluate((el, v) => el.style.setProperty('--rpg-anim-scale', v), vitesse);
    await page.locator('.moba__mulligan .moba__primary').click();
    await page.locator('.moba__mulligan').waitFor({ state: 'detached' });
    await page.locator('.moba__hand-cards .moba__card').first().click();
    await page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)').nth(2).click();
    const glow = page.locator('.rpg-lumiere-invocation').first();
    await glow.waitFor({ state: 'attached' });
    const state = await glow.evaluate(el => {
      const anim = el.getAnimations()[0];
      if (anim) { anim.pause(); anim.currentTime = anim.effect.getTiming().duration * .42; }
      const style = getComputedStyle(el);
      return { display: style.display, pointer: style.pointerEvents, couleur: style.getPropertyValue('--rpg-lumiere-fond'), opacity: style.opacity, duration: anim?.effect.getTiming().duration };
    });
    assert.equal(state.pointer, 'none');
    assert.match(state.couleur, /#ff925e/);
    if (reduit) assert.equal(state.display, 'none');
    else { assert.notEqual(state.display, 'none'); assert.ok(Number(state.opacity) > .5); assert.equal(state.duration, 600 * vitesse); }
    if (!touch && !reduit && !autonome) {
      const card = page.locator('[data-moba-side="joueur"] .rpg-card').first();
      // La carte fraîchement invoquée n'est pas jouable : autoriser seulement
      // pour ce contrôle le déplacement du pointeur (les règles restent intactes).
      await card.evaluate(el => { el.disabled = false; el.classList.remove('fx-enter'); });
      await card.hover({ position: { x: 8, y: 8 }, force: true });
      await card.dispatchEvent('pointermove', { pointerType: 'mouse', clientX: (await card.boundingBox()).x + 8, clientY: (await card.boundingBox()).y + 8 });
      assert.equal(await card.getAttribute('data-relief-survol'), 'true');
      assert.notEqual(await card.evaluate(el => getComputedStyle(el).transform), 'none');
      const shadow = card.locator('.rpg-relief-ombre');
      assert.notEqual(await shadow.evaluate(el => getComputedStyle(el).boxShadow), 'none');
      await shadow.evaluate(el => { el.style.transition = 'none'; });
      await card.evaluate(el => { el.style.transition = 'none'; el.dataset.combatTilted = 'true'; });
      assert.match(await card.evaluate(el => getComputedStyle(el).transform), /^matrix\(0\.9848/);
      assert.equal(await shadow.evaluate(el => getComputedStyle(el).opacity), '0');
      await card.evaluate(el => { el.dataset.combatTilted = 'false'; });
      await page.mouse.move(0, 0);
      assert.equal(await card.getAttribute('data-relief-survol'), null);
    }
    if (process.env.RPG_RELIEF_SCREENSHOT && !reduit) await page.screenshot({ path: `${process.env.RPG_RELIEF_SCREENSHOT}-${width}-${autonome ? 'autonome' : 'partage'}.png` });
    await page.close();
    console.log(`${width}×${height} ${autonome ? 'autonome' : 'partagé'}${reduit ? ', mouvement réduit' : ''} : invocation et gestes vérifiés`);
  }
  for (const [width, height, touch] of [[1440, 900, false], [844, 390, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.addInitScript(() => { Math.random = () => .425; localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '2'); });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    await page.locator('.rpg-hand__card[data-card-id="tislit-des-aures"]').first().click();
    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        const glow = document.querySelector('.card-row--equipe .rpg-lumiere-invocation');
        if (glow) { window.lumierePose = getComputedStyle(glow).pointerEvents; observer.disconnect(); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    await page.locator('.rpg-creature-slot--choix').filter({ hasText: '3' }).click();
    await page.waitForFunction(() => window.lumierePose);
    assert.equal(await page.evaluate(() => window.lumierePose), 'none');
    await page.locator('.card-row--equipe .rpg-lumiere-invocation').waitFor({ state: 'detached', timeout: 2500 });
    await page.close();
    console.log(`${width}×${height} duel : lumière d'invocation créée puis nettoyée`);
  }
} finally {
  await browser?.close();
  await server.close();
}
