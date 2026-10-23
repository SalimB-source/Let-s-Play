/** Régression navigateur : npm run dev, puis npm run check:rpg-combat-controls.
 * Installez Chromium avec npx playwright install chromium, ou renseignez
 * CHROMIUM_EXECUTABLE_PATH. RPG_URL et CHROMIUM_ARGS sont facultatifs.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS?.split(/ +/) || ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    Math.random = () => .425;
    // Le plein écran natif ne doit pas neutraliser les formats testés.
    for (const key of ['requestFullscreen', 'webkitRequestFullscreen']) {
      Object.defineProperty(Element.prototype, key, { value: undefined, configurable: true });
    }
  });
  await page.goto(process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el');
  await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
  await page.getByRole('button', { name: 'Deck', exact: true }).click();
  await page.locator('.rpg-deck-choice__button').first().click();
  await page.locator('.rpg-deck-detail__play').click();
  await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
  await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });

  // Fixture de présentation, pas de modification des règles : sur la vraie
  // table, remplir la barre avec les commandes et attributs de la phase
  // d'attaque. Cela exerce aussi le ResizeObserver réel de RpgDuelPage.
  await page.evaluate(() => {
    const combat = document.querySelector('.rpg-actions__combat');
    combat.innerHTML = `
      <button class="rpg-btn rpg-btn--attaque rpg-btn--confirmer-attaque" data-key-hint="Espace">Confirmer l’attaque (3)</button>
      <button class="rpg-btn rpg-btn--ghost rpg-btn--cancel-attack" data-key-hint="Z">Annuler l’attaque</button>`;
    document.querySelector('.rpg-btn--endturn').disabled = true;
    window.confirmationsTest = 0;
    combat.firstElementChild.onclick = () => { window.confirmationsTest += 1; };
  });

  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const multiline of [false, true]) {
      await page.locator('.rpg-btn--confirmer-attaque').evaluate((button, multiline) => {
        button.style.minHeight = multiline ? '150px' : '';
      }, multiline);
      await page.waitForFunction(() => {
        const table = document.querySelector('.card-table');
        return Number.parseFloat(table.style.getPropertyValue('--rpg-controles-h'))
          === table.querySelector('.rpg-bottombar').offsetHeight;
      });
      const boxes = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        return { rail: rect('.rpg-turn-rail'), combat: rect('.rpg-bottombar') };
      });
      assert.ok(boxes.rail.bottom + 11 <= boxes.combat.top,
        `${width}×${height}: le rail laisse 12 px au-dessus du combat, même si sa hauteur change`);
      for (const selector of ['.rpg-btn--confirmer-attaque', '.rpg-btn--cancel-attack']) {
        const reachable = await page.locator(selector).evaluate(button => {
          const r = button.getBoundingClientRect();
          return [.2, .5, .8].every(y =>
            button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height * y)));
        });
        assert.ok(reachable, `${width}×${height}: ${selector} est accessible sur toute sa hauteur`);
      }
      const previous = await page.evaluate(() => window.confirmationsTest);
      await page.locator('.rpg-btn--confirmer-attaque').click();
      assert.equal(await page.evaluate(() => window.confirmationsTest), previous + 1);
    }
    console.log(`✓ ${width}×${height}: confirmation et annulation sans chevauchement, clic reçu`);
  }
  // La mesure suit aussi la disparition des commandes, pas seulement leur ajout.
  await page.locator('.rpg-actions__combat').evaluate(e => e.replaceChildren());
  await page.waitForFunction(() =>
    document.querySelector('.card-table').style.getPropertyValue('--rpg-controles-h') === '0px');
  console.log('✓ La réserve mesurée se réinitialise après la phase de combat');
} finally {
  await browser.close();
}
