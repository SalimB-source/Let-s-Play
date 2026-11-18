// Compare les cases réelles aux anciennes positions sur le même plateau et
// vérifie que le placement reste accessible en tactile et sur PC.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[568, 320, true], [844, 390, true], [1024, 600, true], [1440, 900, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    await page.addInitScript(() => { Math.random = () => .425; for (const key of ['requestFullscreen', 'webkitRequestFullscreen']) Object.defineProperty(Element.prototype, key, { value: undefined, configurable: true }); });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    const mesurer = () => page.evaluate(() => {
      const ennemi = document.querySelector('.rpg-creature-slots--ennemi .rpg-creature-slot').getBoundingClientRect();
      const joueur = document.querySelector('.rpg-creature-slots--joueur .rpg-creature-slot').getBoundingClientRect();
      return { gap: joueur.top - ennemi.bottom, enemy: ennemi.toJSON(), player: joueur.toJSON(), klass: document.querySelector('.rpg-battle').className, offset: getComputedStyle(document.querySelector('.card-table')).getPropertyValue('--rpg-field-center-offset'), top1: getComputedStyle(document.querySelector('.card-row--ennemi')).top, top2: getComputedStyle(document.querySelector('.card-row--equipe')).top };
    });
    const actuel = await mesurer();
    const avant = await page.addStyleTag({ content: `
      .rpg-battle[data-scene="duel"].rpg-battle--touch .card-table > .card-row--ennemi { top: -4px !important; }
      .rpg-battle[data-scene="duel"].rpg-battle--touch .card-table > .card-row--equipe { top: 4px !important; }
      .rpg-battle[data-scene="duel"]:not(.rpg-battle--touch) .card-table > .card-row--ennemi { bottom: calc(50% + 10px) !important; }
      .rpg-battle[data-scene="duel"]:not(.rpg-battle--touch) .card-table > .card-row--equipe { top: calc(50% + 10px) !important; }
    ` });
    const ancien = await mesurer(); await avant.evaluate(el => el.remove());
    assert.ok(actuel.gap > ancien.gap + 3, `${width}×${height} : espace accru (${ancien.gap} → ${actuel.gap})`);
    assert.ok(actuel.enemy.top >= 0 && actuel.player.bottom <= height, `${width}×${height} : cases dans la fenêtre`);
    const carte = page.locator('.rpg-hand__card[data-card-id="tislit-des-aures"]').first();
    if (touch) await carte.tap(); else await carte.click();
    const choix = page.locator('.rpg-creature-slot--choix').filter({ hasText: '3' });
    if (touch) await choix.tap(); else await choix.click();
    await page.waitForSelector('.rpg-creature-slots--joueur [data-creature-slot="3"].is-occupied');
    console.log(`${width}×${height} : duel, espace ${ancien.gap.toFixed(1)} → ${actuel.gap.toFixed(1)} px et pose vérifiée`);
    await page.close();
  }
  for (const [width, height, touch] of [[568, 320, true], [844, 390, true], [1440, 900, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test`);
    await page.locator('.moba__mulligan .moba__primary').click();
    await page.locator('.moba__mulligan').waitFor({ state: 'detached' });
    const mesurer = () => page.evaluate(() => {
      const lane = document.querySelector('.moba__lane');
      const [a, b] = [...lane.querySelectorAll('.moba__side')].map(side => side.querySelector('.moba__slot').getBoundingClientRect()).sort((x, y) => x.top - y.top);
      return b.top - a.bottom;
    });
    const actuel = await mesurer();
    const avant = await page.addStyleTag({ content: '.moba .moba__lane { gap: clamp(8px, 1.5vh, 12px) !important; }' });
    const ancien = await mesurer(); await avant.evaluate(el => el.remove());
    assert.ok(actuel > ancien + 1, `${width}×${height} : espace Conquête accru (${ancien} → ${actuel})`);
    console.log(`${width}×${height} : Conquête, espace ${ancien.toFixed(1)} → ${actuel.toFixed(1)} px`);
    await page.close();
  }
} finally { await browser?.close(); await server.close(); }
