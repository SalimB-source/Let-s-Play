// Géométrie tactile et interactions des deux variantes de l'annonce MOBA.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[568, 320, true], [640, 280, true], [784, 355, true], [844, 390, true], [1024, 600, true], [390, 844, true], [1280, 720, false]]) {
    for (const autonome of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-annonce-moba-taille.html${autonome ? '?autonome' : ''}`);
      await page.waitForSelector('.rpg-annonce-sort__respond');
      const regionSelector = autonome ? '.moba__announcement-fallback > div' : '.rpg-hover-card-preview__details';
      const region = page.locator(regionSelector);
      for (const longue of [false, true]) {
        await page.evaluate((v) => window.annonceLongue(v), longue);
        if (longue) await page.waitForFunction(() => document.querySelector('[aria-label="Détails de la carte annoncée"]')?.textContent.includes('Inflige 2 dégâts'));
        await region.evaluate((el) => { el.scrollTop = 0; });
        const m = await page.evaluate((autonome) => {
          const details = document.querySelector(autonome ? '.moba__announcement-fallback > div' : '.rpg-hover-card-preview__details');
          const title = details.querySelector(autonome ? 'strong' : '.rpg-hover-card-preview__name');
          const rules = details.querySelector(autonome ? 'p' : '.rpg-hover-card-preview__rules');
          const cible = details.querySelector(autonome ? 'p:last-of-type' : '.rpg-hover-card-preview__target');
          const box = details.getBoundingClientRect(), nom = title.getBoundingClientRect(), texte = rules.getBoundingClientRect();
          const boutons = [...document.querySelectorAll('.rpg-annonce-sort__controls button')].map((el) => {
            const rect = el.getBoundingClientRect();
            return { rect: rect.toJSON(), hit: el.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) };
          });
          const layout = document.querySelector('.rpg-hover-card-preview__layout')?.getBoundingClientRect().toJSON();
          const hint = details.querySelector('.rpg-hover-card-preview__hint-tactile');
          const result = { nomVisible: nom.top >= box.top && nom.bottom <= box.bottom, nomComplet: title.clientHeight >= title.scrollHeight - 1,
            debutVisible: texte.top + parseFloat(getComputedStyle(rules).lineHeight) <= box.bottom,
            texte: rules.textContent, overflow: getComputedStyle(details).overflowY,
            hint: hint ? getComputedStyle(hint).display : null, boutons, layout };
          details.scrollTop = details.scrollHeight;
          const cibleRect = cible.getBoundingClientRect(), barre = document.querySelector('.rpg-annonce-sort__controls').getBoundingClientRect();
          result.cibleVisible = cibleRect.top >= box.top - 1 && cibleRect.bottom <= Math.min(box.bottom, barre.top) + 1;
          result.scrollMax = details.scrollHeight - details.clientHeight;
          return result;
        }, autonome);
        assert.ok(m.nomVisible && m.nomComplet && m.debutVisible, `${width}×${height} : titre et début visibles (${autonome ? 'autonome' : 'partagé'})`);
        assert.equal(m.overflow, 'auto');
        assert.match(m.texte, longue ? /Inflige 2 dégâts/ : /cale/);
        assert.ok(m.cibleVisible, 'la cible est lisible après défilement, au-dessus des commandes');
        if (touch && width > height) {
          if (!autonome) assert.ok(m.layout.width >= Math.min(680, width - 24) - 1, 'largeur disponible en paysage');
          for (const { rect, hit } of m.boutons) {
            assert.ok(rect.height >= 48 && rect.top >= 0 && rect.bottom <= height && hit, 'chaque bouton reste visible et accessible');
          }
        }
        if (!autonome) assert.equal(m.hint, touch ? 'inline' : 'none', 'consigne adaptée au toucher ou à la souris');
        if (longue && touch && width === 568) {
          assert.ok(m.scrollMax > 0, 'la longue description peut défiler');
          await region.evaluate((el) => { el.scrollTop = 0; });
          const r = await region.boundingBox();
          const cdp = await page.context().newCDPSession(page);
          const x = Math.round(r.x + r.width * .75), y = Math.round(r.y + r.height * .75);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (let delta = 20; delta <= 100; delta += 20) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - delta }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          assert.ok(await region.evaluate((el) => el.scrollTop) > 0, 'le geste tactile fait défiler la fiche');
          await region.focus(); await page.keyboard.press('End');
          await page.waitForFunction((sel) => { const el = document.querySelector(sel); return el.scrollTop >= el.scrollHeight - el.clientHeight - 2; }, regionSelector);
          await cdp.detach();
        }
      }
      if (touch && width > height && !autonome) {
        await region.evaluate((el) => { el.scrollTop = 0; });
        const pastille = page.locator('.rpg-pastille--explicable').first();
        const bulle = page.locator('.rpg-pastille-bulle');
        await pastille.tap();
        await bulle.waitFor({ state: 'visible' });
        if (width === 568) {
          await region.evaluate((el) => { el.scrollTop = el.scrollHeight; });
          await bulle.waitFor({ state: 'hidden' });
          await region.evaluate((el) => { el.scrollTop = 0; });
          await pastille.tap();
          await bulle.waitFor({ state: 'visible' });
        }
        await pastille.press('Escape');
      }
      await page.locator('.rpg-annonce-sort__respond').click();
      assert.equal(await page.locator('#choix').textContent(), 'répondre');
      await page.locator('.rpg-annonce-sort__pass').click();
      assert.equal(await page.locator('#choix').textContent(), 'passer');
      await page.close();
    }
    console.log(`${width}×${height} : annonces MOBA et commandes vérifiées`);
  }
} finally { await browser?.close(); await server.close(); }
