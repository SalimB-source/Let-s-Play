/**
 * Vrai rendu WebGL : npm run dev, puis npm run check:rpg-story-3d-ui.
 * Chromium : npx playwright install chromium. RPG_URL,
 * CHROMIUM_EXECUTABLE_PATH et CHROMIUM_ARGS suivent les autres checks RPG.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(/ +/) : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const url = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';
const errors = [];

// Compteur des vrais appels GPU, seulement dans le harnais de test : vérifie
// l'arrêt des rendus et la destruction des contextes sans hook dans le jeu.
const watchContexts = () => {
  // Le plein écran natif de Chromium interdit setViewportSize. Le plein
  // écran CSS du jeu reste actif ; on teste les formats, pas l'API native.
  for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) {
    Object.defineProperty(Element.prototype, name, { configurable: true, value: undefined });
  }
  window.__towerContexts = [];
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = original.call(this, type, ...args);
    if (context && type.includes('webgl') && !window.__towerContexts.some((entry) => entry.context === context)) {
      const record = { context, canvas: this, draws: 0 };
      window.__towerContexts.push(record);
      for (const name of ['drawArrays', 'drawElements']) {
        const draw = context[name];
        context[name] = function (...params) { record.draws += 1; return draw.apply(this, params); };
      }
    }
    return context;
  };
};
const counts = (page) => page.evaluate(() => window.__towerContexts.filter((entry) => entry.canvas.isConnected).map((entry) => entry.draws));
const enter = async (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: /^Histoire$/i }).click();
  await page.locator('.rpg-story-tower').first().waitFor();
};
const wait3d = (page, selector) => page.locator(`${selector}[data-renderer="3d"]`).waitFor({ timeout: 20000 });
const allDetachedLost = (page) => page.waitForFunction(() => window.__towerContexts.filter((entry) => !entry.canvas.isConnected).every((entry) => entry.context.isContextLost()));

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await desktop.addInitScript(watchContexts);
  const page = await desktop.newPage();
  await enter(page);
  await page.waitForFunction(() => document.querySelectorAll('.rpg-story-stage[data-renderer="3d"]').length === 5);
  assert.equal(await page.locator('.rpg-story-floor').count(), 0, 'la 3D ne dévoile pas les étages à l’avance');
  assert.equal(await page.locator('canvas[data-motion="still"]').count(), 5);
  await page.waitForTimeout(500);
  const fixed = await counts(page);
  await page.waitForTimeout(600);
  assert.deepEqual(await counts(page), fixed, 'mouvement réduit : vraie 3D fixe, aucune boucle GPU');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(500);
  const moving = await counts(page);
  await page.waitForTimeout(600);
  assert.ok((await counts(page)).every((count, i) => count > moving[i]), 'les cinq modèles tournent réellement');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await counts(page);
  await page.waitForTimeout(600);
  assert.deepEqual(await counts(page), hidden, 'onglet caché : aucun rendu inutile');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  console.log('✓ Cinq vrais modèles ; rotation, mouvement réduit et pause en arrière-plan');

  // Perte de contexte : le repli apparaît, mais la tour reste ouvrable.
  await page.evaluate(() => {
    window.__towerContexts.find((entry) => entry.canvas.closest('[data-tour="tour-des-listes"]')).context.getExtension('WEBGL_lose_context').loseContext();
  });
  await page.locator('[data-tour="tour-des-listes"] [data-renderer="fallback"]').waitFor();
  assert.equal(await page.locator('[data-tour="tour-des-listes"] .rpg-story-stage__badge').isVisible(), false);
  for (const tour of RPG_STORY_TOURS) {
    const card = page.locator(`[data-tour="${tour.id}"]`);
    await card.focus();
    await card.press('Enter');
    await wait3d(page, '.rpg-story-tour__banner');
    assert.equal(await page.locator('.rpg-story-tour__banner').getAttribute('data-tower-model'), tour.id);
    assert.equal(await page.locator('.rpg-story-floor').count(), tour.etages.length);
    assert.equal(await page.locator('.rpg-story-floor:not(:disabled)').count(), 1, 'le verrouillage des étages est conservé');
    await allDetachedLost(page);
    assert.equal(await page.evaluate(() => window.__towerContexts.filter((entry) => !entry.context.isContextLost()).length), 1, 'la page de tour ne garde pas les contextes de la galerie');
    await page.getByRole('button', { name: 'Retour aux tours' }).click();
    await wait3d(page, '[data-tour="tour-des-listes"] .rpg-story-stage');
  }
  await page.getByRole('button', { name: /^Jouer$/ }).click();
  await allDetachedLost(page);
  assert.equal(await page.locator('.rpg-story-stage').count(), 0);
  assert.equal(await page.evaluate(() => window.__towerContexts.filter((entry) => !entry.context.isContextLost()).length), 0, 'quitter Histoire libère tous les contextes');
  console.log('✓ Clavier, pages des cinq tours, étages/verrous, repli après perte de contexte et nettoyage des allers-retours');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.addInitScript(watchContexts);
  const phone = await mobile.newPage();
  await enter(phone);
  await wait3d(phone, '[data-tour="tour-des-listes"] .rpg-story-stage');
  assert.equal(await phone.locator('[data-tour="tour-du-fjord"] .rpg-story-stage').getAttribute('data-renderer'), 'fallback', 'les modèles hors champ ne sont pas chargés à l’avance');
  const firstContext = await phone.evaluate(() => window.__towerContexts.findIndex((entry) => entry.canvas.closest('[data-tour="tour-des-listes"]')));
  for (const tour of RPG_STORY_TOURS) {
    await phone.locator(`[data-tour="${tour.id}"]`).scrollIntoViewIfNeeded();
    await wait3d(phone, `[data-tour="${tour.id}"] .rpg-story-stage`);
  }
  await phone.waitForTimeout(300);
  const offscreen = await phone.evaluate((index) => window.__towerContexts[index].draws, firstContext);
  await phone.waitForTimeout(500);
  assert.equal(await phone.evaluate((index) => window.__towerContexts[index].draws, firstContext), offscreen, 'le modèle sorti de l’écran ne tourne plus');
  assert.equal(await phone.evaluate(() => document.querySelector('.rpg-mode-menu').scrollWidth > document.querySelector('.rpg-mode-menu').clientWidth + 1), false, 'pas de débordement horizontal sur téléphone');
  await phone.locator('[data-tour="tour-du-fjord"]').tap();
  await wait3d(phone, '.rpg-story-tour__banner');
  assert.ok(await phone.locator('.rpg-story__back').evaluate((button) => button.getBoundingClientRect().top >= 0), 'ouvrir la dernière tour ne conserve pas le défilement de la galerie');
  for (const [width, height] of [[390, 844], [844, 390], [320, 568]]) {
    await phone.setViewportSize({ width, height });
    const frame = await phone.locator('.rpg-story-tour__banner').evaluate((element) => {
      const canvas = element.querySelector('canvas'), rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, pixels: canvas.width * canvas.height, overflowing: rect.width > window.innerWidth };
    });
    assert.ok(frame.width > 0 && frame.height >= 240 && !frame.overflowing, `${width} : cadre responsive`);
    // ResizeObserver arrive à la prochaine frame : attendre avant le budget.
    await phone.waitForTimeout(100);
    assert.ok(await phone.locator('.rpg-story-tour__banner canvas').evaluate((canvas) => canvas.width * canvas.height <= 605000), 'la résolution est bornée, même avec un écran Retina');
  }
  console.log('✓ Téléphone : chargement à vue, défilement tactile, pause hors champ, portrait/paysage et budget pixels');

  const fallback = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => {
    Object.defineProperty(window, 'WebGL2RenderingContext', { configurable: true, value: undefined });
    for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) Object.defineProperty(Element.prototype, name, { configurable: true, value: undefined });
  });
  const noGl = await fallback.newPage();
  await enter(noGl);
  assert.equal(await noGl.locator('.rpg-story-stage[data-renderer="fallback"]').count(), 5);
  await noGl.locator('[data-tour="tour-des-listes"]').click();
  assert.equal(await noGl.locator('.rpg-story-tour__banner').getAttribute('data-renderer'), 'fallback');
  assert.equal(await noGl.locator('.rpg-story-floor:not(:disabled)').count(), 1);
  assert.equal(await noGl.locator('.rpg-story-stage__fallback').isVisible(), true);
  const gpuBlocked = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await gpuBlocked.addInitScript(() => {
    for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) Object.defineProperty(Element.prototype, name, { configurable: true, value: undefined });
    window.__failedGlAttempts = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes('webgl')) { window.__failedGlAttempts += 1; return null; }
      return original.call(this, type, ...args);
    };
  });
  const blocked = await gpuBlocked.newPage();
  await enter(blocked);
  await blocked.waitForFunction(() => window.__failedGlAttempts > 0);
  assert.equal(await blocked.locator('.rpg-story-stage[data-renderer="3d"]').count(), 0, 'un échec de création du contexte reste un repli, sans écran vide');
  await blocked.locator('[data-tour="tour-des-listes"]').click();
  assert.equal(await blocked.locator('.rpg-story-floor:not(:disabled)').count(), 1);
  assert.equal(await blocked.locator('.rpg-story-stage__fallback').isVisible(), true);
  assert.deepEqual(errors, [], 'aucune erreur JavaScript, avec ou sans WebGL');
  console.log('✓ Sans WebGL ou avec un GPU indisponible : peintures de repli et campagne toujours jouable');
} finally {
  await browser.close();
}
