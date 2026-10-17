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
// Le bouton principal de l'écran Jouer ouvre le mode Histoire : une partie
// rapide démarre depuis l'onglet Deck (« Jouer avec ce deck »).
const demarrerDuel = async (page) => {
  await page.getByRole('button', { name: 'Deck', exact: true }).click();
  await page.locator('.rpg-deck-choice__button').first().click();
  await page.locator('.rpg-deck-detail__play').click();
};
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
  await demarrerDuel(page);
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
    assert.ok(result.rail.left >= result.areas[2].left - 1 && result.table.right - result.rail.right <= 20,
      `${width}: les phases sont dans la colonne de droite`);
    assert.ok(Math.abs(result.attackAll.top - result.endTurn.top) <= 1 && result.attackAll.right <= result.endTurn.left,
      `${width}: attaque générale et fin du tour sont côte à côte`);
    // La main : une carte = une cible. Les cartes ne se recouvrent jamais — le
    // doigt qui touche une carte joue celle-là — et toute carte visible dans la
    // rangée répond en son centre. Si la main déborde (plancher tactile atteint :
    // beaucoup de cartes hétéronymes sur un écran étroit), la rangée défile
    // horizontalement et chaque carte reste atteignable en la faisant glisser.
    const main = await page.evaluate(() => {
      const hand = document.querySelector('.rpg-hand');
      const box = hand.getBoundingClientRect();
      const cards = [...document.querySelectorAll('.rpg-hand__card')];
      const boxes = cards.map((card) => card.getBoundingClientRect());
      const overlaps = boxes.slice(1).filter((r, index) => boxes[index].right > r.left + .5).length;
      const visibles = cards
        .map((card, index) => ({ card, box: boxes[index] }))
        .filter(({ box: r }) => r.left >= box.left - 1 && r.right <= box.right + 1);
      // Le volet de mulligan couvre la table au début d'un duel : le doigt n'y
      // atteint pas encore la main, on mesure alors la seule géométrie.
      const mulliganOuvert = Boolean(document.querySelector('.rpg-mulligan'));
      const muettes = mulliganOuvert ? 0 : visibles.filter(({ card, box: r }) => {
        const dessous = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return dessous?.closest('.rpg-hand__card') !== card;
      }).length;
      return {
        overlaps,
        muettes,
        visibles: visibles.length,
        total: cards.length,
        largeurs: boxes.map((r) => Math.round(r.width)),
        tient: boxes.every((r) => r.width >= 34),
        premiereVisible: !boxes.length || boxes[0].left >= box.left - 1,
        scrollable: hand.scrollWidth > hand.clientWidth + 1,
        scrollLeft: hand.scrollLeft,
      };
    });
    assert.equal(main.overlaps, 0, `${width}: aucune carte de la main n'en recouvre une autre`);
    assert.equal(main.muettes, 0, `${width}: chaque carte visible de la main répond au doigt, en son centre`);
    assert.ok(main.tient, `${width}: chaque carte de la main garde une largeur touchable (${main.largeurs.join(' × ')})`);
    assert.ok(main.premiereVisible, `${width}: la première carte de la main reste atteignable`);
    assert.ok(result.rail.top >= result.table.top - 1 && result.rail.bottom <= result.hand.top + 1,
      `${width}: le rail du tour tient dans la bande de jeu, au-dessus de la main`);
    assert.ok(result.phases.height > 0 && result.phases.bottom <= result.endTurn.y && result.endTurn.y - result.phases.bottom <= 10,
      `${width}: phases sit immediately above the end-turn button, inside the rail`);
    assert.ok(result.endTurn.left >= result.rail.left - 1 && result.endTurn.right <= result.rail.right + 1,
      `${width}: Fin du tour prend la largeur du rail du tour`);
    assert.ok(result.attackAll.width >= 32 && result.attackAll.left >= result.areas[2].left - 1
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
    // Boutons de droite compacts (32 px), mais encore au doigt.
    assert.ok(result.endTurn.height >= 32 && result.endTurn.height <= 40, `${width}: compact, touch-sized end-turn button (${result.endTurn.height})`);
    // Les phases, comme sur PC : une rangée d'icônes, noms masqués à l'écran.
    const phases = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('.rpg-turn-rail .rpg-phase-step__icon')].map((icon) => icon.getBoundingClientRect());
      const label = document.querySelector('.rpg-turn-rail .rpg-phase-step__label').getBoundingClientRect();
      return { row: icons.every((r) => Math.abs(r.top - icons[0].top) < 1), ordered: icons.every((r, i) => !i || r.left >= icons[i - 1].right), label: label.width <= 1 };
    });
    assert.ok(phases.row && phases.ordered && phases.label, `${width}: phases form a single row of icons, as on desktop`);
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
            // Plus de zone de défilement autour des cartes posées : le groupe
            // tient dans sa rangée, centré, et chaque carte reste dans le champ.
            const scrollable = row.scrollWidth > row.clientWidth + 1 || /auto|scroll/.test(getComputedStyle(row).overflowX);
            const centred = Math.abs((first.left + last.right) / 2 - (lane.left + lane.right) / 2) < 1.5;
            const inside = first.left >= lane.left - 1 && last.right <= lane.right + 1;
            results.push({ count, scrollable, centred, inside, badgesFit, valuesFit });
          }
        } finally { row.replaceChildren(...original); row.scrollLeft = 0; }
      }
      return results;
    });
    for (const group of groups) {
      assert.ok(group.badgesFit && group.valuesFit, `${width}: battlefield ATK/DEF fit inside the card without overlap`);
      assert.ok(!group.scrollable && group.centred && group.inside, `${width}: group of ${group.count} cards is centred inside its lane, without a scroll area`);
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
        // Le bas de la carte : exactement comme la face de l'aperçu — les plaques
        // d'attaque et de défense pour une créature, le sceau de sort aligné
        // en bas à gauche pour un sort, rien pour un terrain ou une arme.
        basDeCarte: cards.every((card) => {
          const box = card.getBoundingClientRect();
          const stats = card.querySelector('.rpg-mulligan__stats')?.getBoundingClientRect();
          const sceau = card.querySelector('.rpg-mulligan__sceau')?.getBoundingClientRect();
          const enBas = (r) => box.bottom - r.bottom < box.height * .35;
          if (stats) return enBas(stats) && stats.bottom <= box.bottom + 1;
          if (sceau) return enBas(sceau) && sceau.left - box.left < box.width * .35;
          return true;
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
  // Le menu hamburger du duel : au doigt, la barre ne montre que lui. Un appui
  // déplie ses six commandes — les trois modes (Menu, Deck, Catalogue) et les
  // trois réglages — dans un panneau sous la barre, au-dessus de la table.
  const burger = page.locator('.rpg-duel-nav__burger');
  const navMenu = page.locator('.rpg-duel-nav__menu');
  await burger.tap();
  await navMenu.waitFor({ state: 'visible' });
  assert.equal(await navMenu.evaluate((element) => getComputedStyle(element).position), 'fixed',
    'the hamburger panel is fixed to the viewport, outside the scrolling table clip');
  const panneau = await navMenu.boundingBox();
  assert.ok(panneau && panneau.x >= 0 && panneau.y >= 0
    && panneau.x + panneau.width <= 844 && panneau.y + panneau.height <= 390,
  'the duel hamburger opens its menu inside the landscape viewport');
  for (const mode of ['Menu', 'Deck', 'Catalogue']) {
    const bouton = navMenu.getByRole('button', { name: mode, exact: true });
    assert.equal(await bouton.isVisible(), true, `the ${mode} mode is visible in the hamburger menu`);
    const box = await bouton.boundingBox();
    const auDessus = await page.evaluate(({ x, y }) => Boolean(
      document.elementFromPoint(x, y)?.closest('.rpg-duel-nav__menu'),
    ), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    assert.equal(auDessus, true, `the ${mode} mode sits above the battlefield, within reach`);
  }
  assert.equal(await navMenu.getByRole('button').count(), 6, 'the panel keeps all six commands');
  await burger.tap();
  await navMenu.waitFor({ state: 'hidden' });
  // Écran court : le panneau se cale sous la capsule et tient dans 320 px de
  // haut — ses six commandes restent visibles sans dépendre du défilement.
  await page.setViewportSize({ width: 568, height: 320 });
  await burger.tap();
  await navMenu.waitFor({ state: 'visible' });
  const court = await navMenu.boundingBox();
  assert.ok(court && court.x >= 0 && court.y >= 0
    && court.x + court.width <= 568 && court.y + court.height <= 320,
  'the hamburger menu fits inside a 568 × 320 landscape phone');
  for (const mode of ['Menu', 'Deck', 'Catalogue']) {
    assert.equal(await navMenu.getByRole('button', { name: mode, exact: true }).isVisible(), true,
      `the ${mode} mode stays visible on a 568 × 320 phone`);
  }
  await burger.tap();
  await navMenu.waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 844, height: 390 });
  console.log('✓ The duel hamburger opens its six commands inside the landscape viewport');
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
  const terrainPoseSeul = page.locator('.rpg-terrains--joueur .rpg-terrain');
  const terrainBox = await terrainPoseSeul.boundingBox();
  assert.ok(terrainBox && terrainBox.x >= 0 && terrainBox.x + terrainBox.width <= 844,
    'the played terrain stays inside the landscape viewport');
  assert.equal(await terrainPoseSeul.getAttribute('data-terrain-count'), '1');
  assert.equal(await terrainPoseSeul.evaluate((element) => element.classList.contains('is-stacked')), false,
    'a single terrain is shown as one card, without a fake stack underneath');
  assert.equal(await terrainPoseSeul.locator('.rpg-terrain-stack__count').count(), 0,
    'a single terrain has no ×1 stack counter');
  await page.locator('.rpg-hand__card--terrain').first().tap();
  assert.equal(await page.locator('.rpg-terrains--joueur .rpg-terrain').count(), 1,
    'the second terrain of the turn is refused without being played');
  console.log('✓ Tap plays a terrain at once and silently refuses the second one');
  // La main au doigt : une carte = une cible, même quand elle se remplit. On
  // remplace la rangée par huit cartes factices — la plus longue main d'un duel
  // — puis on touche chacune en son centre, après l'avoir amenée dans le champ.
  const mainPleine = await page.evaluate(async () => {
    const hand = document.querySelector('.rpg-hand');
    const original = [...hand.childNodes];
    const compte = hand.style.getPropertyValue('--hand-count');
    try {
      const carte = document.querySelector('.rpg-hand__card');
      const emballage = carte.closest('.rpg-hand__pile');
      const cartes = Array.from({ length: 8 }, (_, index) => {
        const clone = (emballage ?? carte).cloneNode(true);
        const face = clone.classList.contains('rpg-hand__card') ? clone : clone.querySelector('.rpg-hand__card');
        face.dataset.cardId = `sonde-${index}`;
        face.classList.add('is-playable');
        face.classList.remove('is-flying', 'is-dragging');
        for (const propriete of ['left', 'top', 'width', 'height']) face.style.removeProperty(propriete);
        return clone;
      });
      hand.replaceChildren(...cartes);
      hand.style.setProperty('--hand-count', '8');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const boxes = cartes.map((element) => element.getBoundingClientRect());
      const largeurs = boxes.map((box) => Math.round(box.width));
      const chevauchements = boxes.slice(1).filter((box, index) => boxes[index].right > box.left + .5).length;
      const atteintes = [];
      for (let index = 0; index < cartes.length; index += 1) {
        cartes[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const box = cartes[index].getBoundingClientRect();
        const dessous = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        const face = dessous?.closest('.rpg-hand__card');
        atteintes.push(face?.dataset.cardId === `sonde-${index}`);
      }
      return {
        largeurs,
        chevauchements,
        defile: hand.scrollWidth > hand.clientWidth + 1,
        atteintes: atteintes.filter(Boolean).length,
        total: cartes.length,
      };
    } finally {
      hand.replaceChildren(...original);
      if (compte) hand.style.setProperty('--hand-count', compte);
      else hand.style.removeProperty('--hand-count');
    }
  });
  assert.equal(mainPleine.chevauchements, 0,
    `une main de ${mainPleine.total} cartes ne se recouvre pas (largeurs ${mainPleine.largeurs.join(' × ')})`);
  assert.ok(mainPleine.largeurs.every((largeur) => largeur >= 34),
    `chaque carte d'une main pleine garde sa largeur touchable (${mainPleine.largeurs.join(' × ')})`);
  assert.equal(mainPleine.atteintes, mainPleine.total,
    'chaque carte d’une main pleine répond au doigt, en son centre, une fois amenée dans le champ');
  console.log(`✓ Hand of ${mainPleine.total}: no overlap, touchable cards${mainPleine.defile ? ', scrollable row' : ''}`);
  if (process.env.RPG_SCREENSHOT) await page.screenshot({ path: process.env.RPG_SCREENSHOT });
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const undo = await page.locator('.rpg-actions__turn .rpg-btn--undo').boundingBox();
    const end = await page.locator('.rpg-actions__turn .rpg-btn--endturn').boundingBox();
    const attackAll = await page.locator('.rpg-actions__turn .rpg-btn--attaque-tous').boundingBox();
    assert.ok(undo && end && undo.width >= 32 && undo.height >= 32, `${width}: undo is visible on the table`);
    // Depuis que l'attaque générale a rejoint le rail, les deux commandes du bas
    // partagent la dernière rangée ; l'annulation occupe la rangée du dessus, sur
    // toute la largeur du rail — elle reste donc au-dessus d'elles.
    assert.ok(attackAll && Math.abs(attackAll.y - end.y) <= 1 && attackAll.x + attackAll.width <= end.x,
      `${width}: attaque générale et fin du tour partagent la rangée du bas`);
    assert.ok(undo.y + undo.height <= Math.min(end.y, attackAll.y) + 1
      && undo.x <= Math.min(end.x, attackAll.x) + 1 && undo.x + undo.width >= Math.max(end.x + end.width, attackAll.x + attackAll.width) - 1,
      `${width}: annuler la dernière action occupe la rangée au-dessus, sur toute la largeur du rail`);
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
  const terrainSeul = page.locator('.rpg-terrains--joueur .rpg-terrain');
  await terrainSeul.click();
  await page.waitForFunction(() => document.querySelector('.rpg-terrains--joueur .rpg-terrain')?.classList.contains('is-tapped'));
  assert.equal(await terrainSeul.getAttribute('data-tapped-count'), '1', 'using a single land taps it');
  const angleTerrainEngage = await terrainSeul.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
  });
  assert.ok(Math.abs(angleTerrainEngage - 12) < .5, 'a tapped terrain stays visibly tilted on touch screens');
  console.log('✓ Touch drag plays a terrain and using it visibly taps the single card');
  await page.locator('.rpg-btn--endturn').click();
  await page.locator('.rpg-turn-indicator.is-player').waitFor();
  await page.locator('.rpg-hand__card--terrain.is-playable').first().click();
  await page.waitForFunction(() => document.querySelector('.rpg-terrains--joueur .rpg-terrain[data-terrain-count="2"]'));
  const stack = page.locator('.rpg-terrains--joueur .rpg-terrain');
  assert.equal(await stack.count(), 1, 'identical terrains share one pile');
  assert.equal(await stack.evaluate((element) => element.classList.contains('is-stacked')), true,
    'a second identical terrain adds the stacked-card visual');
  assert.equal(await stack.locator('.rpg-terrain-stack__available').count(), 0);
  assert.equal((await stack.locator('.rpg-terrain-stack__count').textContent()).trim(), '×2',
    'the stacked terrain shows its total count');
  assert.equal(await stack.getAttribute('data-available-count'), '2');
  for (const remaining of [1, 0]) {
    await stack.click();
    await page.waitForFunction((r) => {
      const pile = document.querySelector('.rpg-terrains--joueur .rpg-terrain');
      return pile?.dataset.availableCount === String(r);
    }, remaining);
    assert.equal(await stack.getAttribute('data-terrain-count'), '2');
    assert.equal(await stack.getAttribute('data-tapped-count'), String(2 - remaining), 'a mana click taps only one terrain');
    if (remaining === 1) {
      assert.equal(await stack.evaluate((element) => element.classList.contains('is-partially-tapped')), true,
        'a partly used terrain pile shows its tapped state');
      assert.equal((await stack.locator('.rpg-terrain-stack__engagement').textContent()).trim(), '↻1');
    }
  }
  assert.equal(await stack.evaluate((element) => element.classList.contains('is-tapped')), true,
    'a fully used terrain pile is visibly tapped');
  assert.equal((await stack.locator('.rpg-terrain-stack__engagement').textContent()).trim(), '↻2');
  const angleStackEngage = await stack.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
  });
  assert.ok(Math.abs(angleStackEngage - 12) < .5, 'an exhausted terrain pile stays visibly tilted on touch screens');
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
  // La face posée, au doigt : le coût ne s'imprime plus — il reste dans le
  // libellé accessible —, la carte prend 95 % de la mesure de la main, et dans
  // la main la pastille de couleur est plus petite que le disque de coût.
  const facePosee = await page.evaluate(() => {
    const table = document.querySelector('.card-table');
    const posee = document.querySelector('.card-row--equipe .rpg-card');
    const main = document.querySelector('.rpg-hand__card:has(.rpg-card-element-badge)');
    const cout = posee?.querySelector('.rpg-card__title .rpg-mana-cost');
    const rect = (node) => node?.getBoundingClientRect().width ?? 0;
    // `--duel-card` est un `clamp()` : la propriété personnalisée ne se résout
    // qu'à l'usage — une sonde invisible la mesure en px, sans rien déranger.
    const sonde = document.createElement('div');
    sonde.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:var(--duel-card);height:0;';
    table.appendChild(sonde);
    const duelCard = sonde.getBoundingClientRect().width;
    sonde.remove();
    return {
      largeur: posee?.offsetWidth ?? 0,
      duelCard,
      coutImprime: Boolean(cout) && getComputedStyle(cout).display !== 'none' && rect(cout) > 0,
      coutAnnonce: (posee?.getAttribute('aria-label') ?? '').includes('coût'),
      pastille: rect(main?.querySelector('.rpg-card-element-badge')),
      disque: rect(main?.querySelector('.rpg-mana-cost')),
    };
  });
  assert.equal(facePosee.coutImprime, false, 'a placed card no longer prints its cost');
  assert.equal(facePosee.coutAnnonce, true, 'the cost stays in the accessible label of the placed card');
  assert.ok(Math.abs(facePosee.largeur - facePosee.duelCard * .95) < 1.5,
    `the placed card takes 95 % of the hand measure (${facePosee.largeur} px for ${facePosee.duelCard} px)`);
  // Si la main ne porte plus que des terrains à cet instant, elle n'a ni
  // pastille ni disque à comparer — le diamètre réduit est vérifié sur faces
  // synthétiques dans `check:rpg-card-markers`.
  assert.ok(facePosee.pastille === 0 || (facePosee.disque > 0 && facePosee.pastille <= facePosee.disque - 4),
    `the color badge of the hand is smaller than the cost disc (${facePosee.pastille} px vs ${facePosee.disque} px)`);
  await page.locator('.rpg-btn--attaque-tous').click();
  assert.equal(await page.locator('.rpg-phase-step.is-active').getAttribute('data-phase'), 'attaque');
  const waitForTilt = async (selector, expected) => page.waitForFunction(({ selector, expected }) => {
    const card = document.querySelector(selector);
    if (!card) return false;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    return Math.abs(angle - expected) < .5;
  }, { selector, expected });
  await waitForTilt('.rpg-card--equipe.is-declared-attacker', 15);
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
    assert.ok(cancel.y >= phases.y + phases.height, `${width}: the combat controls keep their right-hand column, below the phases`);
    assert.ok(end.y + end.height <= height && end.x + end.width <= width, `${width}: combat controls fit the screen`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  if (process.env.RPG_CONTROLS_SCREENSHOT) await page.screenshot({ path: process.env.RPG_CONTROLS_SCREENSHOT });
  await page.locator('.rpg-btn--cancel-attack').click();
  assert.equal(await page.locator('.rpg-phase-step.is-active').getAttribute('data-phase'), 'principale');
  assert.equal(await page.locator('.rpg-card--equipe.is-selected').count(), 0);
  await waitForTilt('.rpg-card--equipe', 0);
  await page.locator('.rpg-btn--attaque-tous').click();
  await page.locator('.rpg-btn--confirmer-attaque').click();
  await waitForTilt('.rpg-card--equipe.is-attacked', 15);
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
  assert.ok(angles.every(angle => Math.abs(angle - 15) < .5), 'combat animations preserve the 15-degree clockwise attacker tilt');
  console.log('✓ Attackers tilt 15° to the right on declaration, straighten on cancellation and keep the tilt after attacking');
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
    await demarrerDuel(pageBureau);
    const carte = pageBureau.locator('.rpg-mulligan__card').first();
    await carte.waitFor();
    await pageBureau.mouse.move(4, 4);
    assert.equal(await pageBureau.locator('.rpg-hover-card-preview').count(), 0,
      'aucun aperçu tant que rien n’est survolé');
    await carte.hover();
    assert.equal(await pageBureau.locator('.rpg-hover-card-preview').count(), 0,
      'survoler une carte du mulligan n’ouvre pas d’aperçu rapide');
    await pageBureau.getByRole('button', { name: /Garder cette main/i }).click();
    await pageBureau.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    console.log('✓ Mulligan : aucun aperçu rapide ne s’ouvre au survol d’une carte');
  } finally {
    await bureau.close();
  }
}

} finally {
  await browser.close();
}
