// Géométrie et interactions du vrai plateau Conquête dans les deux rendus.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });

async function verifierLibelles(page, contexte) {
  const labels = await page.locator('.moba__slot.is-empty').evaluateAll((slots) => slots.map((slot) => {
    const long = slot.querySelector('.moba__empty-label-long');
    const court = slot.querySelector('.moba__empty-label-short');
    const visible = getComputedStyle(court).display === 'none' ? long : court;
    const texte = visible.getBoundingClientRect();
    const cadre = slot.getBoundingClientRect();
    return {
      nom: slot.getAttribute('aria-label'), action: !slot.disabled,
      texte: visible.textContent, largeur: cadre.width,
      complet: texte.left >= cadre.left - .5 && texte.right <= cadre.right + .5 && texte.top >= cadre.top - .5 && texte.bottom <= cadre.bottom + .5,
      taille: parseFloat(getComputedStyle(visible).fontSize),
    };
  }));
  assert.equal(labels.length, 10);
  for (const label of labels) {
    assert.ok(label.complet && label.taille >= 6, `${contexte}: libellé tronqué ou illisible ${JSON.stringify(label)}`);
    assert.match(label.nom, /Voie (gauche|centrale|droite), (Vous|IA), emplacement [12]/);
    if (label.action) {
      assert.match(label.nom, /invoquer/);
      assert.equal(label.texte, label.largeur <= 72 ? 'POSER' : 'INVOQUER');
    } else assert.equal(label.texte, label.largeur <= 72 ? 'LIBRE' : 'EMPLACEMENT');
  }
}

let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[568, 320, true], [640, 280, true], [640, 340, true], [700, 341, true], [784, 355, true], [844, 390, true], [1024, 600, true], [320, 568, true], [390, 844, true], [1440, 900, false]]) {
    for (const autonome of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
      await page.locator('.moba__mulligan .moba__primary').click();
      await page.locator('.moba__mulligan').waitFor({ state: 'detached' });
      await verifierLibelles(page, `${width}×${height}, repos`);
      // Allonger les mains après le mulligan normal, puis provoquer un rendu.
      await page.evaluate(() => window.allongerMains());
      if (touch) await page.locator('.moba__hand-cards .moba__card').first().tap(); else await page.locator('.moba__hand-cards .moba__card').first().click();
      await verifierLibelles(page, `${width}×${height}, choix de pose`);
      if (width === 1440) {
        await page.setViewportSize({ width: 568, height: 320 });
        await verifierLibelles(page, 'redimensionnement en paysage compact');
        await page.setViewportSize({ width, height });
        await verifierLibelles(page, 'retour à la grande table');
      }
      assert.equal(await page.locator('.moba__hand-cards .moba__card').count(), 6);
      assert.equal(await page.locator('.moba__health-bar[role="progressbar"]').count(), 6);
      assert.deepEqual(await page.locator('.moba__health-bar').evaluateAll((bars) => bars.map((bar) => Number(bar.getAttribute('aria-valuenow')))), [20, 20, 15, 15, 20, 20]);
      if (width > height && height <= 500) {
        const geometrie = await page.evaluate((autonome) => {
          const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
          const intersecte = (a, b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
          const hp = [...document.querySelectorAll('.moba__health')].map((el) => el.getBoundingClientRect());
          const labelMain = rect(autonome ? '.moba__hidden-hand small' : '.rpg-hidden-hand__count');
          const mainAdverse = [...document.querySelectorAll(autonome ? '.moba__hidden-hand > div span' : '.rpg-hidden-hand__card')].map((el) => el.getBoundingClientRect());
          const pioche = rect('.moba__deck-count');
          const cartes = [...document.querySelectorAll('.moba__hand-cards .moba__card')].map((el) => el.getBoundingClientRect());
          const pagination = [...document.querySelectorAll('.moba__hand-pages button')].map((el) => el.getBoundingClientRect());
          const panneaux = [...document.querySelectorAll('.moba__player, .moba__piles, .moba__journal')].map((el) => el.getBoundingClientRect());
          return { conflitPV: hp.some((r) => [labelMain, pioche, ...mainAdverse].some((n) => intersecte(r, n))), conflitCartes: cartes.some((r) => [pioche, ...pagination].some((n) => intersecte(r, n))), conflitPanneaux: panneaux.some((r) => [pioche, ...pagination].some((n) => intersecte(r, n))), boutonsDansEcran: pagination.every((r) => r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight), labelDansEcran: labelMain.left >= 0 && labelMain.right <= innerWidth && labelMain.top >= 0, piocheDansEcran: pioche.left >= 0 && pioche.right <= innerWidth && pioche.bottom <= innerHeight };
        }, autonome);
        assert.ok(!geometrie.conflitPV && !geometrie.conflitCartes && !geometrie.conflitPanneaux && geometrie.boutonsDansEcran && geometrie.labelDansEcran && geometrie.piocheDansEcran, `${width}×${height} ${autonome ? 'autonome' : 'partagé'} : ${JSON.stringify(geometrie)}`);
      }
      if (touch) await page.getByRole('button', { name: 'Page suivante de la main' }).tap(); else await page.getByRole('button', { name: 'Page suivante de la main' }).click();
      assert.equal(await page.locator('.moba__hand-cards .moba__card').count(), 1, 'la pagination affiche la dernière carte');
      if (touch) await page.getByRole('button', { name: 'Page précédente de la main' }).tap(); else await page.getByRole('button', { name: 'Page précédente de la main' }).click();
      assert.equal(await page.locator('.moba__hand-cards .moba__card').count(), 6);
      const cases = page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)');
      assert.equal(await cases.count(), 5, 'les cinq cases restent disponibles');
      if (touch) await cases.nth(2).tap(); else await cases.nth(2).click();
      await page.waitForSelector('[data-moba-side="joueur"][data-moba-lane="center"] [class*="has-creature"]');
      assert.match(await page.locator('.moba__deck-count').innerText(), /23/);
      await page.close();
    }
    console.log(`${width}×${height} : jauges, légendes, pagination et pose vérifiées`);
  }
  // Les variantes de pose conservent leur sens et leur nom accessible.
  for (const [width, height] of [[568, 320], [1440, 900]]) {
    for (const autonome of [false, true]) {
      for (const [id, nom, long, court, accessible] of [
        ['reanimation', 'Réanimation', 'RÉANIMER', 'RANIMER', /réanimer ici/],
        ['lame-des-ergs', 'Lame des ergs', 'CRÉER LE CHIEN', 'CHIEN', /créer le Chien porteur ici/],
        ['le-tresor-de-lima', 'Trésor de Lima', 'INSTALLER', 'SITE', /installer le Site ici/],
      ]) {
        const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
        await page.locator('.moba__mulligan .moba__primary').click();
        await page.locator('.moba__mulligan').waitFor({ state: 'detached' });
        await page.evaluate((id) => window.preparerCarte(id), id);
        const card = page.locator('.moba__hand-cards .moba__card');
        await page.waitForFunction(([id, nom]) => { const card = document.querySelector('.moba__hand-cards .moba__card'); return card?.dataset.cardId === id || card?.textContent.includes(nom); }, [id, nom]);
        await card.click();
        const choices = page.locator('[data-moba-side="joueur"] .moba__slot.is-empty:not(:disabled)');
        assert.equal(await choices.count(), 5, `${nom} : cinq cases accessibles`);
        const label = choices.first();
        assert.match(await label.getAttribute('aria-label'), accessible);
        const visible = label.locator(width < 700 ? '.moba__empty-label-short' : '.moba__empty-label-long');
        assert.equal(await visible.innerText(), width < 700 ? court : long);
        const fits = await visible.evaluate((el) => { const a = el.getBoundingClientRect(), b = el.closest('button').getBoundingClientRect(); return a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5; });
        assert.ok(fits, `${width}×${height} : ${nom} sans troncature`);
        await page.close();
      }
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
      await page.locator('.moba__mulligan .moba__primary').click();
      await page.locator('.moba__mulligan').waitFor({ state: 'detached' });
      await page.evaluate(() => window.conquerir('left'));
      const fermees = page.locator('.moba__lane.is-conquered .moba__slot.is-empty');
      await fermees.first().waitFor({ state: 'attached' });
      assert.equal(await fermees.count(), 4);
      assert.equal(await fermees.first().isDisabled(), true);
      assert.equal(await fermees.first().isVisible(), false, 'les voies conquises restent masquées');
      assert.equal(await fermees.first().locator('.moba__empty-label-long').textContent(), 'VOIE FERMÉE');
      assert.equal(await fermees.first().locator('.moba__empty-label-short').textContent(), 'FERMÉE');
      await page.close();
    }
    console.log(`${width}×${height} : réanimation, Chien, Site et voie fermée vérifiés`);
  }
} finally {
  await browser?.close();
  await server.close();
}
