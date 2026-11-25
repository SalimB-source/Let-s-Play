#!/usr/bin/env node
// Chromium requis : npx playwright install chromium ou RPG_TEST_CHROMIUM=/chemin/vers/chromium.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const plugin = {
  name: 'actions-creature-fixture',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/__actions-test')) return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/__actions-fixture.jsx"></script>');
    });
  },
  resolveId(id) { return id === '/__actions-fixture.jsx' ? '\0actions-fixture' : null; },
  load(id) {
    if (id !== '\0actions-fixture') return null;
    return `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { TableCard } from '/src/games/RpgDuelPage.jsx';
      window.actions = [];
      function App() {
        const [ouvert, setOuvert] = useState(false);
        const [utilise, setUtilise] = useState(false);
        const entite = { id: 'salem-1', carteId: 'salem', name: 'Salem', atk: 2, pv: 3, pvMax: 3, ready: true,
          activationUtiliseeMatch: utilise, arme: { carteId: 'sabre-maudit', durabilite: 2 }, enCale: { carteId: 'chien-du-guet', name: 'Chien du guet' } };
        return <div className="rpg-battle" data-scene="duel" data-mode-mana="essai">
          <div className="card-table"><div className="card-row card-row--equipe" style={{left: 0, top: '35%', width: 80, height: 100, overflow: 'hidden'}}>
            <TableCard entite={entite} cote="joueur" activationDispo={!utilise} effetMenuOuvert={ouvert}
              onClick={() => { if (ouvert) { window.actions.push('attaque'); setOuvert(false); } else setOuvert(true); }}
              onActiver={() => { window.actions.push('effet'); setUtilise(true); setOuvert(false); }} onFermerMenuEffet={() => setOuvert(false)} />
          </div><div style={{position:'absolute', inset: 0, zIndex: 30, pointerEvents: 'none'}} /></div>
        </div>;
      }
      createRoot(document.getElementById('root')).render(<App />);
    `;
  },
};

const server = await createServer({ configFile: false, plugins: [plugin], server: { host: '127.0.0.1', port: 0 }, appType: 'custom', logLevel: 'silent' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true], [568, 320, true], [320, 240, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__actions-test`);
    const carte = page.locator('.rpg-card[data-entity-id]');
    const ouvrir = async () => { if (touch) await carte.tap(); else await carte.click(); };
    for (const [nom, attendu] of [['Attaquer', 'attaque'], ['Activer l’effet', 'effet']]) {
      await ouvrir();
      await page.waitForTimeout(200); // fin de l’apparition des boutons
      const bouton = page.getByRole('button', { name: nom, exact: true });
      const box = await bouton.boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${nom} hors écran ${width}x${height}`);
      assert.ok(box.width >= 50 && box.height >= 50);
      assert.equal(await bouton.evaluate(el => document.elementFromPoint(el.getBoundingClientRect().x + el.offsetWidth / 2, el.getBoundingClientRect().y + el.offsetHeight / 2)?.closest('button') === el), true, `${nom} recouvert`);
      if (touch) await bouton.tap(); else await bouton.click();
      assert.equal((await page.evaluate(() => window.actions)).at(-1), attendu);
    }
    assert.equal(await page.locator('.rpg-card .rpg-card__effet-badge').count(), 0, 'badge consommé');
    await page.reload();
    await ouvrir();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.rpg-card__effet-menu').count(), 0);
    assert.equal(await carte.evaluate(el => el === document.activeElement), true);
    console.log(`✓ ${width}x${height} ${touch ? 'tactile' : 'souris'} : commandes accessibles`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
