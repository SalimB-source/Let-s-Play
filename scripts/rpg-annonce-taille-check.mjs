// Contrôle géométrique des vraies faces et commandes React en Chromium.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[568, 320, true], [844, 390, true], [640, 360, false], [800, 400, false], [1024, 500, false], [1280, 720, false], [1568, 882, false], [1920, 1080, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/rpg-annonce-taille.html`);
    await page.waitForSelector('.rpg-hover-card-preview__name');
    const verifier = async (longue) => {
      await page.evaluate((v) => window.annonceLongue(v), longue);
      await page.waitForTimeout(150);
      return page.evaluate(() => {
        const rect = (s) => document.querySelector(s).getBoundingClientRect().toJSON();
        const style = (s, prop) => getComputedStyle(document.querySelector(s))[prop];
        const layout = rect('.rpg-hover-card-preview__layout');
        const details = document.querySelector('.rpg-hover-card-preview__details');
        const controls = [...document.querySelectorAll('.rpg-annonce-sort__controls button')].map((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { rect: r.toJSON(), cliquable: el.contains(hit) };
        });
        return { layout, face: rect('.rpg-hover-card-preview__face'), details: rect('.rpg-hover-card-preview__details'), controls,
          nameSize: parseFloat(style('.rpg-hover-card-preview__name', 'fontSize')), rulesSize: parseFloat(style('.rpg-hover-card-preview__rules', 'fontSize')),
          detailsOverflow: getComputedStyle(details).overflowY, contenu: details.textContent, target: details.querySelector('.rpg-hover-card-preview__target')?.textContent };
      });
    };
    for (const longue of [false, true]) {
      const m = await verifier(longue);
      assert.ok(m.layout.left >= 0 && m.layout.top >= 0 && m.layout.right <= width && m.layout.bottom <= height, `${width}×${height} : fenêtre dans l'écran`);
      for (const { rect: r, cliquable } of m.controls) {
        assert.ok(r.left >= m.layout.left && r.right <= m.layout.right && r.top >= m.layout.top && r.bottom <= m.layout.bottom, `${width}×${height} : boutons dans la fenêtre`);
        assert.ok(cliquable, `${width}×${height} : bouton accessible`);
      }
      assert.equal(m.detailsOverflow, 'auto', 'le détail reste défilable');
      assert.match(m.contenu, /Trait de braise/i);
      assert.match(m.target, /Créature ciblée/);
      if (longue) {
        assert.ok((m.contenu.match(/Inflige 2 dégâts/g) ?? []).length === 12, 'le texte long reste entier');
        const lecture = await page.evaluate(() => {
          const details = document.querySelector('.rpg-hover-card-preview__details');
          const rules = details.querySelector('.rpg-hover-card-preview__rules');
          rules.scrollTop = rules.scrollHeight;
          details.scrollTop = details.scrollHeight;
          const box = details.getBoundingClientRect();
          const cible = details.querySelector('.rpg-hover-card-preview__target').getBoundingClientRect();
          return { scrollRules: rules.scrollTop, maxRules: rules.scrollHeight - rules.clientHeight,
            cibleVisible: cible.bottom <= box.bottom + 1 && cible.top >= box.top - 1 };
        });
        assert.ok(lecture.maxRules <= 1 || lecture.scrollRules > 0, 'le texte long est défilable');
        assert.ok(lecture.cibleVisible, 'la cible reste accessible après défilement');
      }
      if (!touch) {
        assert.ok(m.details.right <= m.layout.right && m.details.left >= m.layout.left, 'la fiche tient dans la fenêtre');
        assert.ok(m.layout.width >= Math.min(650, width - 32) - 1 && m.face.width >= Math.min(180, height * .37), `${width}×${height} : fenêtre et carte agrandies`);
        assert.ok(m.nameSize >= 20 && m.rulesSize >= 16, 'texte lisible sur ordinateur');
      } else assert.ok(m.layout.width <= 424 && m.face.width <= 140, 'format tactile inchangé');
    }
    if (!touch) {
      const mobaWidth = await page.evaluate(() => {
        const battle = document.querySelector('.rpg-battle');
        battle.dataset.scene = 'moba';
        const largeur = document.querySelector('.rpg-hover-card-preview__layout').getBoundingClientRect().width;
        battle.dataset.scene = 'duel';
        return largeur;
      });
      assert.ok(mobaWidth <= 424, 'le format MOBA ne change pas');
    }
    await page.locator('.rpg-annonce-sort__respond').click();
    assert.equal(await page.locator('#choix').textContent(), 'répondre');
    await page.locator('.rpg-annonce-sort__pass').click();
    assert.equal(await page.locator('#choix').textContent(), 'passer');
    console.log(`${width}×${height} : annonce, texte long et commandes vérifiés`);
    await page.close();
  }
} finally { await browser?.close(); await server.close(); }
