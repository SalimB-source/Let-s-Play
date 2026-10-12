/** Browser regression: npm run dev, then npm run check:rpg-mobile.
 * Install the browser once: npx playwright install chromium.
 * RPG_URL and CHROMIUM_EXECUTABLE_PATH may override the local defaults.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// `--no-zygote --single-process` n'est plus toléré par les Chromium récents :
// le navigateur meurt au moment de fermer le dernier contexte, donc le check
// échouait après avoir tout vérifié. Les deux drapeaux de conteneur suffisent ;
// CHROMIUM_ARGS permet d'en ajouter pour un environnement particulier.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(/ +/) : ['--no-sandbox', '--disable-dev-shm-usage'],
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
        table: table.getBoundingClientRect().toJSON(),
        areas: ['.card-row--ennemi', '.card-row--equipe', '.rpg-bottombar', '.rpg-hand-dock'].map(rect),
        rail: rect('.rpg-turn-rail'),
        hand: rect('.rpg-hand'),
        card: rect('.rpg-hand__card'),
        endTurn: rect('.rpg-btn--endturn'),
        attackAll: rect('.rpg-btn--attaque-tous'),
        phases: rect('.rpg-phase-track'),
      };
    });
    // Le rail du tour vit au milieu de la table : centré à l'horizontale, calé
    // entre la navigation et la main — il ne recouvre jamais le dock de la main.
    assert.ok(Math.abs((result.rail.left + result.rail.right) / 2 - (result.table.left + result.table.right) / 2) <= 2,
      `${width}: le rail du tour est centré sur la table`);
    assert.ok(result.rail.top >= result.table.top - 1 && result.rail.bottom <= result.hand.top + 1,
      `${width}: le rail du tour tient dans la bande de jeu, au-dessus de la main`);
    assert.ok(result.phases.height > 0 && result.phases.bottom <= result.endTurn.y && result.endTurn.y - result.phases.bottom <= 10,
      `${width}: phases sit immediately above the end-turn button, inside the rail`);
    assert.ok(result.endTurn.left >= result.rail.left - 1 && result.endTurn.right <= result.rail.right + 1,
      `${width}: Fin du tour prend la largeur du rail du tour`);
    assert.ok(result.attackAll.width >= 44 && result.attackAll.left >= result.areas[2].left - 1
      && result.attackAll.right <= result.areas[2].right + 1,
      `${width}: attack-all is in the controls column`);
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
  // Le duel s'ouvre sur son volet de mulligan : la mise en page se mesure
  // dessus, le jeu commence une fois la main de départ validée.
  // La main de départ se lit d'un seul coup : cinq cartes 4:5, entières,
  // touchables, sans un mot dessus — du téléphone en paysage au grand moniteur.
  for (const [width, height, plaqueMin] of [[844, 390, 18], [1024, 768, 22], [1440, 900, 30]]) {
    await page.setViewportSize({ width, height });
    const hand = await page.evaluate(() => {
      const row = document.querySelector('.rpg-mulligan__cards');
      const panel = document.querySelector('.rpg-mulligan__panel').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.rpg-mulligan__card')];
      const boxes = cards.map((card) => card.getBoundingClientRect().toJSON());
      return {
        count: boxes.length,
        scrolls: row.scrollWidth > row.clientWidth + 1 || row.scrollHeight > row.clientHeight + 1,
        inside: boxes.every((box) => box.left >= panel.left - 1 && box.right <= panel.right + 1
          && box.top >= panel.top - 1 && box.bottom <= panel.bottom + 1),
        touchable: boxes.every((box) => box.width >= 44 && box.height >= 44),
        // Chaque carte garde le 4:5 du jeu, au pixel près sur les arrondis.
        faces45: boxes.every((box) => Math.abs(box.width / box.height - 0.8) < 0.02),
        // Rien à lire sur la carte, hors la ligne de type : ni nom, ni effet, ni drapeau.
        muettes: cards.every((card) => !card.querySelector('.rpg-mulligan__name, .rpg-mulligan__rules, .rpg-mulligan__flag')
          && [...card.childNodes].every((node) => node.nodeType !== 3 || !node.textContent.trim())),
        // L'attaque et la défense sont les plaques du jeu : deux icônes
        // dessinées (épée, bouclier), aux valeurs de la carte.
        plaquesDuJeu: cards.every((card) => {
          const creature = Boolean(card.querySelector('.rpg-mulligan__stats'));
          if (!creature) return card.querySelectorAll('.rpg-mulligan__stats .rpg-stat-icon').length === 0;
          return card.querySelectorAll('.rpg-mulligan__stats .rpg-stat-icon').length === 2
            && Boolean(card.querySelector('.rpg-mulligan__stats .rpg-card__stat--atk .rpg-stat-value')?.textContent.trim())
            && Boolean(card.querySelector('.rpg-mulligan__stats .rpg-card__pt .rpg-stat-value')?.textContent.trim());
        }),
        // Le bas de la carte : les plaques pour une créature (jamais de ligne de
        // type), la ligne de type seule et centrée pour un terrain ou un sort.
        basDeCarte: cards.every((card) => {
          const box = card.getBoundingClientRect();
          const type = card.querySelector('.rpg-mulligan__bas .rpg-mulligan__type')?.getBoundingClientRect();
          const stats = card.querySelector('.rpg-mulligan__stats')?.getBoundingClientRect();
          const centree = (r) => Math.abs((r.left + r.right) / 2 - (box.left + box.right) / 2) < 2;
          const enBas = (r) => box.bottom - r.bottom < box.height * .35;
          if (type && stats) return centree(type) && type.bottom <= stats.top + 1;
          if (stats) return enBas(stats) && stats.bottom <= box.bottom + 1;
          if (type) return centree(type) && enBas(type);
          return false;
        }),
        // Les plaques d'attaque et de défense : grandes, sur la largeur de la
        // carte, l'attaque contre le bord gauche et la défense contre le droit.
        plaques: [...document.querySelectorAll('.rpg-mulligan__stats')].map((stats) => {
          const card = stats.closest('.rpg-mulligan__card').getBoundingClientRect();
          const box = stats.getBoundingClientRect();
          const [attaque, defense] = [...stats.children].map((plaque) => plaque.getBoundingClientRect().toJSON());
          return {
            hauteur: Math.min(attaque.height, defense.height),
            largeur: Math.min(attaque.width, defense.width),
            dansLaCarte: box.right <= card.right + 1 && box.bottom <= card.bottom + 1 && box.top >= card.top - 1,
            attaqueAGauche: Math.abs(attaque.left - box.left) < 2 && attaque.left - card.left < card.width * .15,
            defensedADroite: Math.abs(defense.right - box.right) < 2 && card.right - defense.right < card.width * .15,
            enBas: card.bottom - box.bottom < card.height * .3,
          };
        }),
        illustrees: cards.every((card) => card.querySelector('img.rpg-mulligan__img')?.complete === true),
        // Les repères des cartes du jeu : la couleur en haut à gauche, le coût
        // en haut à droite, l'attaque et la défense en bas à droite.
        reperes: cards.every((card) => {
          const box = card.getBoundingClientRect();
          const coin = (noeud) => noeud?.getBoundingClientRect();
          const enHautAGauche = (r) => !r || (r.left - box.left < box.width * .35 && r.top - box.top < box.height * .25);
          const enHautADroite = (r) => !r || (box.right - r.right < box.width * .35 && r.top - box.top < box.height * .25);
          const enBasADroite = (r) => !r || (box.right - r.right < box.width * .35 && box.bottom - r.bottom < box.height * .25);
          return enHautAGauche(coin(card.querySelector('.rpg-card-element-badge')))
            && enHautADroite(coin(card.querySelector('.rpg-mana-cost')))
            && enBasADroite(coin(card.querySelector('.rpg-mulligan__stats')));
        }),
      };
    });
    assert.equal(hand.count, 5, `${width}×${height}: les cinq cartes de la main de départ sont présentées`);
    assert.equal(hand.scrolls, false, `${width}×${height}: la rangée du mulligan ne défile pas`);
    assert.ok(hand.inside, `${width}×${height}: les cinq cartes tiennent entières dans le volet`);
    assert.ok(hand.touchable, `${width}×${height}: chaque carte de la main reste touchable`);
    assert.ok(hand.faces45, `${width}×${height}: chaque carte garde le format 4:5 du jeu`);
    assert.ok(hand.muettes && hand.illustrees, `${width}×${height}: la carte est son illustration, sans texte par-dessus`);
    assert.ok(hand.reperes, `${width}×${height}: couleur en haut à gauche, coût en haut à droite, statistiques en bas à droite`);
    assert.ok(hand.basDeCarte, `${width}×${height}: les plaques pour les créatures, la ligne de type centrée pour les terrains et les sorts`);
    assert.ok(hand.plaquesDuJeu, `${width}×${height}: l’attaque et la défense portent les plaques et les icônes du jeu`);
    assert.equal(hand.plaques.every((p) => p.dansLaCarte && p.enBas), true,
      `${width}×${height}: les plaques tiennent dans la carte, en bas`);
    assert.equal(hand.plaques.every((p) => p.attaqueAGauche && p.defensedADroite), true,
      `${width}×${height}: l’attaque est à gauche, la défense à droite`);
    assert.equal(hand.plaques.every((p) => p.hauteur >= plaqueMin && p.largeur >= 34), true,
      `${width}×${height}: les plaques sont grandes (≥ ${plaqueMin}px de haut, ≥ 34px de large)`);
    console.log(`✓ Mulligan complet ${width} × ${height}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: /Garder cette main/i }).click();
  await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
  // Tap a creature without mana: nothing is played, and no hint banner explains it.
  const creature = page.locator('.rpg-hand__card:has(.rpg-hand__stats)').first();
  await creature.tap();
  assert.equal(await page.locator('.rpg-actions__wait').count(), 0, 'the duel carries no hint banner');
  assert.equal(await page.locator('.rpg-card--equipe').count(), 0, 'the refused creature stays in hand');
  assert.equal(await page.locator('.rpg-spell-confirm, .rpg-card-preview').count(), 0, 'a tap opens no dialog for a creature');
  if (process.env.RPG_CREATURE_SCREENSHOT) await page.screenshot({ path: process.env.RPG_CREATURE_SCREENSHOT });
  const terrain = page.locator('.rpg-hand__card--terrain.is-playable').first();
  await terrain.scrollIntoViewIfNeeded();
  // Tap plays the card immediately.
  await terrain.tap();
  await page.waitForFunction(() => document.querySelectorAll('.rpg-terrains--joueur .rpg-terrain').length === 1);
  const terrainBox = await page.locator('.rpg-terrains--joueur .rpg-terrain').boundingBox();
  assert.ok(terrainBox && terrainBox.x >= 0 && terrainBox.x + terrainBox.width <= 844,
    'the played terrain stays inside the landscape viewport');
  await page.locator('.rpg-hand__card--terrain').first().tap();
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 1,
    'the second terrain of the turn is refused without being played');
  console.log('✓ Tap plays a terrain at once and silently refuses the second one');
  if (process.env.RPG_SCREENSHOT) await page.screenshot({ path: process.env.RPG_SCREENSHOT });
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const undo = await page.locator('.rpg-actions__turn .rpg-btn--undo').boundingBox();
    const end = await page.locator('.rpg-actions__turn .rpg-btn--endturn').boundingBox();
    assert.ok(undo && end && undo.width >= 44 && undo.height >= 44, `${width}: undo is visible on the table`);
    assert.ok(Math.abs((undo.x + undo.width / 2) - (end.x + end.width / 2)) <= 2 && undo.y + undo.height <= end.y + 1,
      `${width}: undo is stacked above end-turn, in the same rail column`);
    assert.ok(end.x + end.width <= width && end.y + end.height <= height, `${width}: turn buttons fit the screen`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Annuler la dernière action', exact: true }).click();
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 0);
  console.log('✓ Tap plays a terrain and undoes the action');
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
  await page.waitForFunction(() => document.querySelector('.rpg-terrains--joueur .rpg-terrain[data-terrain-count="2"]'));
  const stack = page.locator('.rpg-terrains--joueur .rpg-terrain');
  assert.equal(await stack.count(), 1, 'identical terrains share one pile');
  assert.equal(await stack.locator('.rpg-terrain-stack__available').count(), 0);
  assert.equal((await stack.textContent()).trim(), '×2', 'only the total count is printed over the terrain');
  assert.equal(await stack.getAttribute('data-available-count'), '2');
  for (const remaining of [1, 0]) {
    await stack.click();
    await page.waitForFunction((r) => {
      const pile = document.querySelector('.rpg-terrains--joueur .rpg-terrain');
      return pile?.dataset.availableCount === String(r);
    }, remaining);
    assert.equal(await stack.getAttribute('data-terrain-count'), '2');
    assert.equal(await stack.getAttribute('data-tapped-count'), String(2 - remaining), 'a mana click taps only one terrain');
  }
  const counts = {
    available: await stack.getAttribute('data-available-count'),
    tapped: await stack.getAttribute('data-tapped-count'),
  };
  // La pile est épuisée : le bouton porte `aria-disabled`, donc Playwright
  // refuserait le clic. On force le geste — c'est justement le but du test : un
  // clic de trop ne produit rien (available/tapped inchangés).
  await stack.click({ force: true });
  assert.deepEqual({
    available: await stack.getAttribute('data-available-count'),
    tapped: await stack.getAttribute('data-tapped-count'),
  }, counts, 'an exhausted stack produces nothing');
  console.log('✓ Identical terrain stack counts and one-at-a-time mana production');
  // Clic-action direct : le clic sur la carte la pose, il n'y a plus de bouton
  // « Jouer la carte » à confirmer pour une créature.
  await page.locator('.rpg-hand__card[data-card-id="fennec-des-decombres"]').click();
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
    assert.ok(cancel.width >= 44 && cancel.height >= 44, `${width}: cancel attack is a touch target`);
    assert.ok(confirm.x + confirm.width <= cancel.x, `${width}: confirm and cancel attack do not overlap`);
    assert.ok(cancel.x >= phases.x + phases.width, `${width}: the combat controls keep their right-hand column, clear of the central rail`);
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
  console.log('✓ Attack-all, cancellation and confirmation share the controls column; the turn rail keeps the phases, undo and end-turn above the hand');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.rpg-rotate-prompt').waitFor();
  await page.getByRole('button', { name: 'Retour au menu', exact: true }).click();
  await page.locator('.rpg-mode-menu').waitFor();
  console.log('✓ Returning to portrait keeps the duel and allows leaving for the menu');

// L'aperçu rapide : c'est lui qui porte le nom, le type, le coût et les effets
// que les cartes du mulligan n'impriment plus. Il se vérifie à la souris, dans
// un contexte de bureau — le doigt, lui, garde l'appui long.
{
  const bureau = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const pageBureau = await bureau.newPage();
    await pageBureau.goto(process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el');
    await pageBureau.getByRole('button', { name: /Lancer le duel/i }).click();
    const carte = pageBureau.locator('.rpg-mulligan__card').first();
    await carte.waitFor();
    const nom = (await carte.getAttribute('aria-label')).split(' — ')[0];
    // Le curseur est resté sur « Lancer le duel », donc sur une carte du volet
    // qui vient de s'ouvrir : on l'écarte avant de mesurer l'état de repos.
    await pageBureau.mouse.move(4, 4);
    await pageBureau.locator('.rpg-hover-card-preview').waitFor({ state: 'detached' });
    assert.equal(await pageBureau.locator('.rpg-hover-card-preview').count(), 0,
      'aucun aperçu tant que rien n’est survolé');
    await carte.hover();
    const apercu = pageBureau.locator('.rpg-hover-card-preview--mulligan');
    await apercu.waitFor();
    assert.ok((await apercu.getAttribute('aria-label'))?.startsWith(`Aperçu de ${nom}`),
      'l’aperçu décrit la carte survolée');
    assert.equal(await pageBureau.evaluate(() => getComputedStyle(document.querySelector('.rpg-hover-card-preview--mulligan')).zIndex), '1200',
      'l’aperçu passe au-dessus du volet du mulligan (1150)');
    await pageBureau.mouse.move(4, 4);
    await pageBureau.locator('.rpg-hover-card-preview').waitFor({ state: 'detached' });
    await pageBureau.getByRole('button', { name: /Garder cette main/i }).click();
    await pageBureau.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    console.log('✓ Mulligan : survoler une carte ouvre son aperçu rapide, au-dessus du volet');
  } finally {
    await bureau.close();
  }
}

} finally {
  await browser.close();
}
