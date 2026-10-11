/** Browser regression: npm run dev, then npm run check:rpg-mobile.
 * Install the browser once: npx playwright install chromium.
 * RPG_URL and CHROMIUM_EXECUTABLE_PATH may override the local defaults.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'],
});
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  // Exercise Safari/older-WebView fallback deterministically: these APIs are optional.
  await page.addInitScript(() => {
    for (const key of ['requestFullscreen', 'webkitRequestFullscreen']) {
      Object.defineProperty(Element.prototype, key, { value: undefined, configurable: true });
    }
    if (screen.orientation) Object.defineProperty(screen.orientation, 'lock', { value: () => Promise.reject(new Error('unsupported')), configurable: true });
    Math.random = () => 0.42;
  });
  await page.goto(process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el');
  await page.getByRole('button', { name: /Lancer le duel/i }).click();
  await page.locator('.rpg-hand__card').first().waitFor();
  // Let the initial card-draw animation finish before measuring the cards.
  await page.waitForTimeout(1400);
  await page.locator('.rpg-rotate-prompt').waitFor();
  assert.equal(await page.locator('.card-table').getAttribute('inert'), '');
  console.log('✓ Portrait requests rotation and prevents playing behind the prompt');
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const result = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
      const table = document.querySelector('.card-table');
      return {
        overflow: table.scrollWidth > table.clientWidth,
        areas: ['.card-row--ennemi', '.card-row--equipe', '.rpg-bottombar', '.rpg-hand-dock'].map(rect),
        hand: rect('.rpg-hand'),
        card: rect('.rpg-hand__card'),
        endTurn: rect('.rpg-btn--endturn'),
      };
    });
    assert.equal(result.overflow, false, `${width}: no page-wide horizontal overflow`);
    for (let i = 0; i < result.areas.length; i++) {
      for (let j = i + 1; j < result.areas.length; j++) {
        const a = result.areas[i], b = result.areas[j];
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        assert.equal(overlap, false, `${width}: lanes, controls and hand do not overlap (${i}, ${j})`);
      }
    }
    assert.ok(result.card.top >= result.hand.top - 1 && result.card.bottom <= result.hand.bottom + 1, `${width}: hand cards are not clipped vertically`);
    assert.ok(result.endTurn.height >= 44, `${width}: touch-sized end-turn button`);
    // Layout-only fixtures: test populated lanes without changing game state.
    const groups = await page.evaluate(() => {
      const results = [];
      for (const row of document.querySelectorAll('.card-row')) {
        const original = [...row.childNodes];
        try {
          for (const count of [1, 3, 12]) {
            const cards = Array.from({ length: count }, () => {
              const card = document.createElement('button');
              card.className = 'rpg-card rpg-card--img';
              return card;
            });
            row.replaceChildren(...cards);
            row.scrollLeft = 0;
            const lane = row.getBoundingClientRect();
            const first = cards[0].getBoundingClientRect();
            const last = cards.at(-1).getBoundingClientRect();
            const overflowing = row.scrollWidth > row.clientWidth;
            const centred = Math.abs((first.left + last.right) / 2 - (lane.left + lane.right) / 2) < 1;
            row.scrollLeft = row.scrollWidth;
            const end = cards.at(-1).getBoundingClientRect();
            results.push({ count, overflowing, centred, reachable: first.left >= lane.left && end.right <= lane.right + 1 });
          }
        } finally { row.replaceChildren(...original); row.scrollLeft = 0; }
      }
      return results;
    });
    for (const group of groups) {
      assert.ok(group.overflowing ? group.reachable : group.centred, `${width}: group of ${group.count} cards is centred or fully scrollable`);
    }
    console.log(`✓ Layout ${width} × ${height}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.rpg-rotate-prompt').waitFor({ state: 'detached' });
  const terrain = page.locator('.rpg-hand__card--terrain.is-playable').first();
  await terrain.scrollIntoViewIfNeeded();
  // Tap opens a preview, not a play. Its contextual action plays the card.
  await terrain.tap();
  await page.locator('.rpg-card-preview').waitFor();
  const preview = await page.locator('.rpg-card-preview').boundingBox();
  assert.ok(preview.x >= 0 && preview.y >= 0 && preview.x + preview.width <= 844 && preview.y + preview.height <= 390);
  const labels = await page.locator('.rpg-card-preview__actions .rpg-btn').evaluateAll(buttons => buttons.map(button => {
    const range = document.createRange();
    range.selectNodeContents(button);
    const label = range.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    return { text: button.textContent, offset: Math.abs((label.top + label.bottom) / 2 - (box.top + box.bottom) / 2) };
  }));
  for (const label of labels) assert.ok(label.offset <= 2, `Vertically centred button: ${label.text}`);
  console.log('✓ Tap preview fits the landscape viewport');
  if (process.env.RPG_SCREENSHOT) await page.screenshot({ path: process.env.RPG_SCREENSHOT });
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 0);
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.rpg-terrains--joueur .rpg-terrain').length === 1);
  await page.locator('.rpg-hand__card--terrain').first().tap();
  assert.equal(await page.getByRole('button', { name: 'Jouer la carte', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Annuler la dernière action', exact: true }).last().click();
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 0);
  console.log('✓ Preview plays a terrain, disables a second terrain, and undoes the action');
  const before = await page.locator('.rpg-terrains--joueur .rpg-terrain').count();
  const card = await terrain.boundingBox();
  const lane = await page.locator('.card-row--equipe').boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = card.x + card.width / 2, y = card.y + card.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: lane.y + lane.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction((count) => document.querySelectorAll('.rpg-terrains--joueur .rpg-terrain').length === count + 1, before);
  assert.equal(await page.locator('.rpg-touch-drag-ghost').count(), 0);
  console.log('✓ Touch drag plays a terrain after orientation changes');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rpg-rotate-prompt').waitFor();
  await page.getByRole('button', { name: 'Retour au menu', exact: true }).click();
  await page.locator('.rpg-mode-menu').waitFor();
  console.log('✓ Returning to portrait keeps the duel and allows leaving for the menu');
} finally {
  await browser.close();
}
