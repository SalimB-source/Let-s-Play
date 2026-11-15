// Vérifie le vrai plateau de duel et ses états, sans connexion ni données de jeu réelles.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[568, 320, true], [640, 280, true], [640, 340, true], [700, 341, true], [784, 355, true], [844, 390, true], [1024, 600, true], [1440, 900, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      Math.random = () => .425;
      for (const key of ['requestFullscreen', 'webkitRequestFullscreen']) Object.defineProperty(Element.prototype, key, { value: undefined, configurable: true });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-plateau-visuel.html`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    const compteurs = page.locator('.rpg-table-zones');
    if (touch) {
      assert.equal(await compteurs.count(), 2);
      for (const camp of ['ennemi', 'joueur']) {
        const zone = page.locator(`.rpg-table-zones--${camp}`);
        const mesures = await zone.evaluate((el) => {
          const box = el.getBoundingClientRect(), css = getComputedStyle(el);
          const rects = [...el.querySelectorAll('.rpg-table-zones__item')].map((n) => n.getBoundingClientRect());
          const reserve = document.querySelector(`.rpg-ascension-placement--${el.classList.contains('rpg-table-zones--joueur') ? 'joueur' : 'sorcier'}`).getBoundingClientRect();
          const main = document.querySelector('.rpg-hand-dock').getBoundingClientRect();
          const cartesAdverses = [...document.querySelectorAll('.rpg-hidden-hand__card')].map((n) => n.getBoundingClientRect());
          const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          return { rect: box.toJSON(), lisible: rects.every((r) => r.left >= box.left && r.right <= box.right + 1 && r.top >= box.top && r.bottom <= box.bottom + 1),
            reserve: overlap(box, reserve), main: overlap(box, main), eventail: cartesAdverses.some((carte) => overlap(box, carte)),
            background: css.backgroundColor, fontSize: parseFloat(css.fontSize), pointerEvents: css.pointerEvents, overflow: el.scrollWidth - el.clientWidth };
        });
        assert.ok(mesures.lisible && mesures.overflow <= 1, `${width}×${height} ${camp} : aucun compteur tronqué`);
        assert.ok(!mesures.reserve && !mesures.main && !mesures.eventail, `${width}×${height} ${camp} : plaque sans chevauchement`);
        assert.ok(mesures.fontSize >= 9 && mesures.background !== 'rgba(0, 0, 0, 0)');
        assert.equal(mesures.pointerEvents, 'none', 'la plaque ne bloque aucun geste');
        assert.match(await zone.getAttribute('aria-label'), /main 5, paquet 25, cimetière 0/);
        const valeursVisibles = await zone.evaluate((el) => {
          const nombres = [...el.querySelectorAll('b')], avant = nombres.map((n) => n.textContent);
          nombres.forEach((n, i) => { n.textContent = ['12', '30', '30'][i]; });
          const box = el.getBoundingClientRect();
          const sansTroncature = el.scrollWidth <= el.clientWidth + 1 && [...el.querySelectorAll('.rpg-table-zones__item')]
            .every((n) => n.getBoundingClientRect().right <= box.right + 1 && n.getBoundingClientRect().bottom <= box.bottom + 1);
          nombres.forEach((n, i) => { n.textContent = avant[i]; });
          return sansTroncature;
        });
        assert.ok(valeursVisibles, `${width}×${height} ${camp} : compteurs à deux chiffres visibles`);
      }
    } else assert.equal(await compteurs.first().isVisible(), false, 'les compteurs tactiles ne changent pas la table PC');
    const vide = page.locator('.rpg-creature-slots--joueur .rpg-creature-slot.is-empty').first();
    assert.equal(await vide.evaluate((el) => getComputedStyle(el, '::before').content), '""', 'repère discret sur une case libre');
    await page.locator('.card-table').evaluate((el) => el.classList.add('is-dragging-creature'));
    assert.equal(await vide.evaluate((el) => getComputedStyle(el, '::before').content), 'none', 'le décor s’efface pendant un glisser-déposer');
    await page.locator('.card-table').evaluate((el) => el.classList.remove('is-dragging-creature'));
    const carte = page.locator('.rpg-hand__card[data-card-id="tislit-des-aures"]').first();
    if (touch) await carte.tap(); else await carte.click();
    const choix = page.locator('.rpg-creature-slot--choix');
    assert.equal(await choix.count(), 5, 'les cinq choix restent disponibles');
    assert.equal(await choix.first().evaluate((el) => getComputedStyle(el, '::before').content), 'none', 'le décor ne remplace pas le signal de choix');
    const troisieme = choix.filter({ hasText: '3' });
    if (touch) await troisieme.tap(); else await troisieme.click();
    await page.waitForSelector('.rpg-creature-slots--joueur [data-creature-slot="3"].is-occupied');
    assert.match(await page.locator('.rpg-table-zones--joueur').getAttribute('aria-label'), /main 4, paquet 25, cimetière 0/, 'les nombres suivent le jeu');
    await page.close();
    console.log(`${width}×${height} : plateau, compteurs et choix de case vérifiés`);
  }
} finally {
  await browser?.close();
  await server.close();
}
