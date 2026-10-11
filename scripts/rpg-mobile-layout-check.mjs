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
    Math.random = () => 0.425;
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
        attackAll: rect('.rpg-btn--attaque-tous'),
        phases: rect('.rpg-phase-track'),
      };
    });
    assert.ok(result.attackAll.width >= 44 && Math.abs(result.attackAll.y - result.endTurn.y) <= 1, `${width}: attack-all is beside end-turn`);
    assert.ok(result.phases.height > 0 && result.phases.bottom <= result.endTurn.y && result.endTurn.y - result.phases.bottom <= 10, `${width}: phases sit immediately above the buttons`);
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
              const card = document.querySelector('.rpg-hand__card:has(.rpg-hand__stats)').cloneNode(true);
              card.className = 'rpg-card rpg-card--img';
              card.querySelector('.rpg-hand__stats').className = 'rpg-card__foot';
              card.querySelector('.rpg-hand__stat--atk').className = 'rpg-card__stat--atk';
              card.querySelector('.rpg-hand__stat--def').className = 'rpg-card__pt';
              if (count === 3) card.querySelectorAll('.rpg-stat-value').forEach(node => { node.textContent = '12'; });
              return card;
            });
            row.replaceChildren(...cards);
            row.scrollLeft = 0;
            const lane = row.getBoundingClientRect();
            const first = cards[0].getBoundingClientRect();
            const last = cards.at(-1).getBoundingClientRect();
            const metrics = cards[0].querySelector('.rpg-card__foot').getBoundingClientRect();
            const cells = [...cards[0].querySelectorAll('.rpg-card__foot > span')].map(e => e.getBoundingClientRect());
            const badgesFit = metrics.left >= first.left && metrics.right <= first.right
              && cells[0].right <= cells[1].left && cells[1].right <= first.right;
            const valuesFit = [...cards[0].querySelectorAll('.rpg-stat-value')].every(node => {
              const cell = node.parentElement.getBoundingClientRect(), value = node.getBoundingClientRect();
              return value.left >= cell.left && value.right <= cell.right;
            });
            const overflowing = row.scrollWidth > row.clientWidth;
            const centred = Math.abs((first.left + last.right) / 2 - (lane.left + lane.right) / 2) < 1;
            row.scrollLeft = row.scrollWidth;
            const end = cards.at(-1).getBoundingClientRect();
            results.push({ count, overflowing, centred, badgesFit, valuesFit, reachable: first.left >= lane.left && end.right <= lane.right + 1 });
          }
        } finally { row.replaceChildren(...original); row.scrollLeft = 0; }
      }
      return results;
    });
    for (const group of groups) {
      assert.ok(group.badgesFit && group.valuesFit, `${width}: battlefield ATK/DEF fit inside the card without overlap`);
      assert.ok(group.overflowing ? group.reachable : group.centred, `${width}: group of ${group.count} cards is centred or fully scrollable`);
    }
    const rails = await page.evaluate(() => {
      const results = [];
      for (const row of document.querySelectorAll('.rpg-terrains')) {
        const original = [...row.childNodes];
        try {
          for (const count of [1, 2, 3, 8, 26]) {
            const cards = Array.from({ length: count }, (_, index) => {
              const card = document.createElement('button');
              card.dataset.cardId = `terrain-type-${index}`;
              card.className = 'rpg-terrain rpg-terrain-stack rpg-card--frame-sable is-tapped';
              card.innerHTML = '<span class="rpg-terrain-stack__count">×26</span>';
              card.style.animation = 'none';
              card.style.transition = 'none';
              return card;
            });
            row.replaceChildren(...cards);
            row.scrollTop = 0;
            row.scrollLeft = 0;
            const rail = row.getBoundingClientRect();
            const first = cards[0].getBoundingClientRect();
            const table = document.querySelector('.card-table').getBoundingClientRect();
            const lane = document.querySelector(row.classList.contains('rpg-terrains--ennemi')
              ? '.card-row--ennemi' : '.card-row--equipe').getBoundingClientRect();
            results.push(first.left >= table.left + Math.min(160, Math.max(44, innerWidth * .08))
              && first.top >= lane.top && first.bottom <= lane.bottom
              && rail.right <= lane.left);
            const positions = cards.map(card => card.getBoundingClientRect());
            results.push(positions.every((rect, index) => Math.abs(rect.top - first.top) < 1
              && rect.width >= 44 && (!index || rect.left >= positions[index - 1].right + 7)));
            // Even the smallest landscape shows two distinct types side by side.
            if (count >= 2) results.push(positions[1].right <= rail.right);
            row.scrollLeft = row.scrollWidth;
            const last = cards.at(-1).getBoundingClientRect();
            results.push(first.left >= rail.left && first.right <= rail.right && first.top >= rail.top
              && last.left >= rail.left && last.right <= rail.right && last.bottom <= rail.bottom
              && row.scrollHeight <= row.clientHeight);
          }
        } finally { row.replaceChildren(...original); row.scrollTop = 0; row.scrollLeft = 0; }
      }
      const card = document.querySelector('.rpg-hand__card:has(.rpg-hand__stats)');
      const rect = card.getBoundingClientRect();
      const badges = [...card.querySelectorAll('.rpg-hand__stat')].map(e => e.getBoundingClientRect());
      results.push(badges[0].left >= rect.left && badges[0].right <= badges[1].left
        && badges[1].right <= rect.right && badges.every(r => r.bottom <= rect.bottom));
      return results;
    });
    assert.ok(rails.every(Boolean), `${width}: terrain stacks stay side by side, scroll horizontally without clipped corners, and hand stats fit`);
    console.log(`✓ Layout ${width} × ${height}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.rpg-rotate-prompt').waitFor({ state: 'detached' });
  await page.locator('.rpg-hand__card:has(.rpg-hand__stats)').first().tap();
  const creaturePreview = page.locator('.rpg-card-preview');
  await creaturePreview.waitFor();
  const visual = await creaturePreview.locator('.rpg-card-preview__art').boundingBox();
  const stats = await creaturePreview.locator('.rpg-card-preview__stats').boundingBox();
  const compact = await creaturePreview.boundingBox();
  assert.ok(compact.width <= 560, 'Preview is compact, not a full-width banner');
  assert.ok(stats.y >= visual.y + visual.height && Math.abs(stats.x + stats.width / 2 - visual.x - visual.width / 2) < 1, 'ATK/DEF appear immediately below the illustration');
  assert.ok(Math.abs(visual.width / visual.height - .8) < .01, 'Preview artwork keeps its card aspect ratio');
  assert.equal(await creaturePreview.locator('.rpg-card-preview__details .rpg-card-preview__stats').count(), 0);
  if (process.env.RPG_CREATURE_SCREENSHOT) await page.screenshot({ path: process.env.RPG_CREATURE_SCREENSHOT });
  await page.getByRole('button', { name: 'Retour au plateau', exact: true }).click();
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
  assert.equal(await page.locator('.rpg-card-preview__hint').count(), 0);
  console.log('✓ Tap preview fits the landscape viewport');
  if (process.env.RPG_SCREENSHOT) await page.screenshot({ path: process.env.RPG_SCREENSHOT });
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 0);
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.rpg-terrains--joueur .rpg-terrain').length === 1);
  await page.locator('.rpg-hand__card--terrain').first().tap();
  assert.equal(await page.getByRole('button', { name: 'Jouer la carte', exact: true }).isDisabled(), true);
  assert.equal(await page.locator('.rpg-card-preview__actions .rpg-btn--undo').count(), 0);
  await page.getByRole('button', { name: 'Retour au plateau', exact: true }).click();
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const undo = await page.locator('.rpg-actions__turn .rpg-btn--undo').boundingBox();
    const end = await page.locator('.rpg-actions__turn .rpg-btn--endturn').boundingBox();
    assert.ok(undo && end && undo.width >= 44 && undo.height >= 44, `${width}: undo is visible on the table`);
    assert.ok(undo.x + undo.width <= end.x && Math.abs(undo.y - end.y) <= 1, `${width}: undo is beside end-turn, not stacked`);
    assert.ok(end.x + end.width <= width && end.y + end.height <= height, `${width}: turn buttons fit the screen`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Annuler la dernière action', exact: true }).click();
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
  await page.locator('.rpg-btn--endturn').click();
  await page.locator('.rpg-turn-indicator.is-player').waitFor();
  await page.locator('.rpg-hand__card--terrain.is-playable').first().click();
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.rpg-terrains--joueur .rpg-terrain[data-terrain-count="2"]'));
  const stack = page.locator('.rpg-terrains--joueur .rpg-terrain');
  assert.equal(await stack.count(), 1, 'identical terrains share one pile');
  assert.equal(await stack.locator('.rpg-terrain-stack__available').count(), 0);
  assert.equal((await stack.textContent()).trim(), '×2', 'only the total count is printed over the terrain');
  assert.equal(await stack.getAttribute('data-available-count'), '2');
  for (const remaining of [1, 0]) {
    await stack.click();
    assert.equal(await page.locator('.rpg-card-preview__hint').count(), 0, 'no blue explanatory hint in the preview');
    await page.getByRole('button', { name: 'Produire du mana Sable', exact: true }).click();
    assert.equal(await stack.getAttribute('data-terrain-count'), '2');
    assert.equal(await stack.getAttribute('data-available-count'), String(remaining), 'a mana action taps only one terrain');
    assert.equal(await stack.getAttribute('data-tapped-count'), String(2 - remaining));
  }
  await stack.click();
  assert.equal(await page.getByRole('button', { name: 'Produire du mana Sable', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Retour au plateau', exact: true }).click();
  console.log('✓ Identical terrain stack counts and one-at-a-time mana production');
  await page.locator('.rpg-hand__card[data-card-id="fennec-des-decombres"]').click();
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click();
  await page.locator('.rpg-card--equipe[data-card-id="fennec-des-decombres"]').waitFor();
  await page.locator('.rpg-btn--attaque-tous').click();
  assert.equal(await page.locator('.rpg-phase-step.is-active').getAttribute('data-phase'), 'combat');
  const waitForTilt = async (selector, expected) => page.waitForFunction(({ selector, expected }) => {
    const card = document.querySelector(selector);
    if (!card) return false;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    return Math.abs(angle - expected) < .5;
  }, { selector, expected });
  await waitForTilt('.rpg-card--equipe.is-declared-attacker', 90);
  assert.equal(await page.locator('.card-row .rpg-card__type').count(), 0, 'table cards do not print their type');
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const cancel = await page.locator('.rpg-btn--cancel-attack').boundingBox();
    const confirm = await page.locator('.rpg-btn--confirmer-attaque').boundingBox();
    const end = await page.locator('.rpg-btn--endturn').boundingBox();
    const phases = await page.locator('.rpg-phase-track').boundingBox();
    const attacker = await page.locator('.rpg-card--equipe.is-declared-attacker').boundingBox();
    const lane = await page.locator('.card-row--equipe').boundingBox();
    assert.ok(attacker.x >= lane.x && attacker.x + attacker.width <= lane.x + lane.width
      && attacker.y >= lane.y && attacker.y + attacker.height <= lane.y + lane.height, `${width}: tilted attacker corners remain visible`);
    assert.ok(cancel.width >= 44 && cancel.height >= 44 && Math.abs(cancel.y - end.y) <= 1, `${width}: cancel attack is beside end-turn`);
    assert.ok(confirm.x + confirm.width <= cancel.x && cancel.x + cancel.width <= end.x, `${width}: combat buttons do not overlap`);
    assert.ok(phases.y + phases.height <= cancel.y && cancel.y - phases.y - phases.height <= 10, `${width}: phases are directly above combat controls`);
    assert.ok(end.y + end.height <= height && end.x + end.width <= width, `${width}: combat controls fit the screen`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  if (process.env.RPG_CONTROLS_SCREENSHOT) await page.screenshot({ path: process.env.RPG_CONTROLS_SCREENSHOT });
  await page.locator('.rpg-btn--cancel-attack').click();
  assert.equal(await page.locator('.rpg-phase-step.is-active').getAttribute('data-phase'), 'principal');
  assert.equal(await page.locator('.rpg-card--equipe.is-selected').count(), 0);
  await waitForTilt('.rpg-card--equipe', 0);
  await page.locator('.rpg-btn--attaque-tous').click();
  await page.locator('.rpg-btn--confirmer-attaque').click();
  await waitForTilt('.rpg-card--equipe.is-attacked', 90);
  const angles = await page.locator('.rpg-card--equipe.is-attacked').evaluate(async card => {
    const values = [];
    // Sample the lunge/impact animation and its cleanup, not just the resting state.
    for (let index = 0; index < 8; index++) {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
      values.push(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    return values;
  });
  assert.ok(angles.every(angle => Math.abs(angle - 90) < .5), 'combat animations never straighten the attacker');
  console.log('✓ Attackers tilt on declaration, straighten on cancellation and stay tilted after attacking');
  console.log('✓ Attack-all, cancellation and end-turn share a row; phases follow combat and cancellation');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rpg-rotate-prompt').waitFor();
  await page.getByRole('button', { name: 'Retour au menu', exact: true }).click();
  await page.locator('.rpg-mode-menu').waitFor();
  console.log('✓ Returning to portrait keeps the duel and allows leaving for the menu');
} finally {
  await browser.close();
}
