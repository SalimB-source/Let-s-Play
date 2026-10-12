/**
 * Vrai rendu WebGL du décor 3D de la table : npm run dev, puis
 * npm run check:rpg-table-3d-ui.
 * Chromium : npx playwright install chromium. RPG_URL,
 * CHROMIUM_EXECUTABLE_PATH et CHROMIUM_ARGS suivent les autres checks RPG.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(/ +/) : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const url = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';
const errors = [];

// Compte les vrais appels GPU, seulement dans le harnais : on vérifie l'arrêt
// de la boucle et la destruction des contextes sans hook dans le jeu.
const watchContexts = () => {
  window.__tableContexts = [];
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = original.call(this, type, ...args);
    if (context && String(type).includes('webgl') && !window.__tableContexts.some((entry) => entry.context === context)) {
      const record = { context, canvas: this, draws: 0 };
      window.__tableContexts.push(record);
      for (const name of ['drawArrays', 'drawElements']) {
        const draw = context[name];
        context[name] = function (...params) { record.draws += 1; return draw.apply(this, params); };
      }
    }
    return context;
  };
};
const draws = (page) => page.evaluate(() => window.__tableContexts.filter((entry) => entry.canvas.isConnected).map((entry) => entry.draws));
const live = (page) => page.evaluate(() => window.__tableContexts.filter((entry) => !entry.context.isContextLost()).length);

const openDuel = async (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: /Lancer le duel/i }).click();
  await page.locator('.rpg-hand__card').first().waitFor({ timeout: 30000 });
  await page.locator('.rpg-mulligan__valider').click();
  await page.waitForTimeout(600);
  if (await page.locator('.rpg-mulligan__commencer').count()) await page.locator('.rpg-mulligan__commencer').click();
};
const wait3d = (page) => page.locator('[data-table-3d][data-renderer="3d"]').waitFor({ timeout: 20000 });

try {
  // 1. Rendu réel, sous le chrome, sans capter aucun geste.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.addInitScript(watchContexts);
    await page.addInitScript(() => { Math.random = () => 0.425; });
    await openDuel(page);
    await wait3d(page);
    const layers = await page.evaluate(() => {
      const host = document.querySelector('[data-table-3d]');
      const style = getComputedStyle(host);
      const table = document.querySelector('.card-table');
      const nav = document.querySelector('.rpg-duel-nav').getBoundingClientRect();
      const under = document.elementFromPoint(nav.left + nav.width / 2, nav.top + nav.height / 2);
      const centre = document.elementFromPoint(table.clientWidth / 2, table.clientHeight / 3);
      return {
        pointerEvents: style.pointerEvents, zIndex: style.zIndex, hidden: host.getAttribute('aria-hidden'),
        navOnTop: Boolean(under?.closest('.rpg-duel-nav')), canvasHit: Boolean(centre?.closest('[data-table-3d]')),
        parent: host.parentElement === table, first: table.firstElementChild === host,
        size: host.querySelector('canvas').getBoundingClientRect().toJSON(),
      };
    });
    assert.equal(layers.pointerEvents, 'none', 'le canvas ne capte aucun geste');
    assert.equal(layers.zIndex, '-1', 'le canvas est sous tout le chrome');
    assert.equal(layers.hidden, 'true');
    assert.ok(layers.parent, 'le décor vit dans la table, dans son isolat');
    assert.ok(layers.navOnTop, 'la barre du duel reste au-dessus du canvas');
    assert.ok(!layers.canvasHit, 'aucun clic n\'atteint le canvas');
    assert.ok(layers.size.width > 1000 && layers.size.height > 600, 'le canvas couvre la table');
    console.log('✓ Rendu WebGL réel, sous le chrome, sans geste capté');

    // 2. La boucle tourne, se suspend pendant un glisser et à l'onglet caché.
    const first = await draws(page);
    await page.waitForTimeout(700);
    const second = await draws(page);
    assert.ok(second[0] > first[0], 'le décor s\'anime (images rendues)');
    assert.equal(await page.locator('.rpg-table-3d__canvas').getAttribute('data-motion'), 'animated');
    // Un vrai dragstart sur une carte jouable (la main est fixée par Math.random).
    const card = page.locator('.rpg-hand__card[draggable="true"]').first();
    await card.dispatchEvent('dragstart', { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
    await page.waitForTimeout(300);
    const during = await draws(page);
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.rpg-table-3d__canvas').getAttribute('data-motion'), 'paused');
    assert.deepEqual(await draws(page), during, 'aucun rendu pendant un glisser de carte');
    await card.dispatchEvent('dragend');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.rpg-table-3d__canvas').getAttribute('data-motion'), 'animated', 'la boucle reprend après le dépôt');
    const resumed = await draws(page);
    await page.waitForTimeout(700);
    assert.ok((await draws(page))[0] > resumed[0], 'et rend de nouveau des images');
    console.log(`✓ Boucle animée (${second[0] - first[0]} appels), suspendue pendant le glisser, reprise ensuite`);

    // 3. Le bouton 3D coupe le décor, libère le contexte, et le choix persiste.
    const toggle = page.locator('.rpg-duel-nav__decor3d');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    await toggle.click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-table-3d]').count(), 0, 'plus de canvas une fois coupé');
    assert.equal(await live(page), 0, 'le contexte WebGL est libéré');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => localStorage.getItem('letsplay_sablier_decor3d_v1')), 'off');
    await page.reload();
    await page.getByRole('button', { name: /Lancer le duel/i }).click();
    await page.locator('.rpg-hand__card').first().waitFor({ timeout: 30000 });
    assert.equal(await page.locator('[data-table-3d]').count(), 0, 'le réglage coupé est retenu');
    console.log('✓ Bouton 3D : coupe, libère le contexte, mémorisé');
    await context.close().catch(() => {});
  }

  // 4. Sans WebGL2 : la peinture CSS reste, rien ne casse.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.addInitScript(() => { delete window.WebGL2RenderingContext; });
    await openDuel(page);
    await page.waitForTimeout(800);
    assert.equal(await page.locator('[data-table-3d]').getAttribute('data-renderer'), 'fallback');
    assert.match(await page.locator('.card-table').evaluate((el) => el.style.backgroundImage), /url\(/, 'la peinture CSS reste le fond');
    console.log('✓ Sans WebGL2 : repli sur la peinture CSS');
    await context.close().catch(() => {});
  }

  // 5. prefers-reduced-motion : une vraie vue 3D, mais fixe.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(watchContexts);
    await openDuel(page);
    await wait3d(page);
    assert.equal(await page.locator('.rpg-table-3d__canvas').getAttribute('data-motion'), 'still');
    const before = await draws(page);
    await page.waitForTimeout(700);
    assert.deepEqual(await draws(page), before, 'aucune boucle de rendu sous reduced-motion');
    console.log('✓ prefers-reduced-motion : image 3D fixe');
    await context.close().catch(() => {});
  }

  // 6. Téléphone en paysage : le décor suit la table, sans déborder.
  {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(watchContexts);
    await openDuel(page);
    await wait3d(page);
    const fit = await page.evaluate(() => {
      const table = document.querySelector('.card-table').getBoundingClientRect();
      const canvas = document.querySelector('.rpg-table-3d__canvas');
      const rect = canvas.getBoundingClientRect();
      return { dx: Math.abs(rect.width - table.width), dy: Math.abs(rect.height - table.height), pixels: canvas.width * canvas.height, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(fit.dx < 2 && fit.dy < 2, 'le canvas suit la table');
    assert.ok(fit.pixels <= 520000 * 1.05, `budget de pixels tactile (${fit.pixels})`);
    assert.ok(!fit.overflow, 'aucun débordement horizontal');
    console.log('✓ Téléphone paysage : canvas à la taille de la table, budget tenu');
    await context.close().catch(() => {});
  }

  assert.deepEqual(errors, [], `aucune erreur de page : ${errors.join(' | ')}`);
  console.log('Décor 3D de la table : toutes les vérifications passent.');
} finally {
  await browser.close().catch(() => {});
}
process.exit(0);
