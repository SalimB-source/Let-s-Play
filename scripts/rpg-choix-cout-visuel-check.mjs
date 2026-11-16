#!/usr/bin/env node
/** Contrôle navigateur du dialogue partagé par les duels PvP et Conquête.
 * Installer Chromium avec `npx playwright install chromium`, ou renseigner
 * RPG_TEST_CHROMIUM pour utiliser un navigateur déjà installé. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const plugin = {
  name: 'rpg-choix-cout-visuel-fixture',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/__choix-cout-test')) return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#57463a"><div id="root"></div><script type="module" src="/__choix-cout-fixture.jsx"></script></body></html>');
    });
  },
  resolveId(id) { return id === '/__choix-cout-fixture.jsx' ? '\0rpg-choix-cout-fixture' : null; },
  load(id) {
    if (id !== '\0rpg-choix-cout-fixture') return null;
    return `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import Choix from '/src/games/RpgChoixCoutInvocation.jsx';
      const vide = new URLSearchParams(location.search).has('vide');
      const exil = new URLSearchParams(location.search).has('exil');
      const carteId = exil ? 'lecteur-du-dernier-nom' : 'veuve-des-urnes';
      const cartes = ['ecueil', 'contresort-des-abimes', 'trait-de-braise', 'rempart-de-dunes', 'poigne-de-givre', 'eclair-du-marteau', 'brisure-de-verre', 'grand-voile-blanc'];
      const duel = { joueur: { main: vide ? [carteId] : [carteId, ...cartes], cimetiere: vide ? [] : ['chien-du-guet', 'momie-de-lin'] }, sorcier: { main: [], cimetiere: [] } };
      window.resultat = null;
      createRoot(document.getElementById('root')).render(React.createElement(Choix, {
        duel, cote: 'joueur', carteId, onChoisir: id => { window.resultat = id; }, onAnnuler: () => { window.resultat = 'annule'; },
      }));
    `;
  },
};

const server = await createServer({ configFile: false, plugins: [plugin], server: { host: '127.0.0.1', port: 0 }, appType: 'custom', logLevel: 'silent' });
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  if (process.env.RPG_CHOIX_COUT_CAPTURE) await mkdir('.cache', { recursive: true });
  for (const [width, height] of [[1440, 900], [800, 600], [390, 844], [568, 320], [812, 375], [320, 240]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/__choix-cout-test`, { waitUntil: 'networkidle' });
    const modal = page.getByRole('dialog', { name: 'Choisissez une carte' });
    await modal.waitFor();
    const items = modal.locator('.rpg-choix-cout__carte');
    assert.equal(await items.count(), 8);
    assert.equal(await modal.getByRole('button', { name: 'Confirmer' }).isDisabled(), true);
    assert.equal(await items.first().evaluate((e) => e === document.activeElement), true, 'focus initial');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await modal.getByRole('button', { name: 'Annuler' }).evaluate((e) => e === document.activeElement), true, 'focus conservé dans le dialogue');
    await page.keyboard.press('Tab');
    assert.equal(await items.first().evaluate((e) => e === document.activeElement), true, 'retour au premier choix');
    const img = items.first().locator('img');
    assert.ok(await img.evaluate((e) => e.complete && e.naturalWidth > 0), 'illustration de carte chargée');
    const dims = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const panel = document.querySelector('.rpg-choix-cout__panel');
      const liste = document.querySelector('.rpg-choix-cout__liste');
      const actions = document.querySelector('.rpg-choix-cout__actions');
      return { panel: box(panel), liste: box(liste), actions: box(actions), scroll: liste.scrollHeight, client: liste.clientHeight, windowWidth: innerWidth, windowHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth };
    });
    const { panel, liste, actions } = dims;
    assert.ok(panel.x >= -1 && panel.y >= -1 && panel.right <= width + 1 && panel.bottom <= height + 1, `panneau hors écran ${width}x${height}: ${JSON.stringify(dims)}`);
    assert.ok(liste.height >= 40 && liste.bottom <= actions.y + 1, `liste inaccessible ${width}x${height}: ${JSON.stringify(dims)}`);
    assert.ok(actions.right <= panel.right + 1 && actions.bottom <= panel.bottom + 1, `actions coupées ${width}x${height}: ${JSON.stringify(dims)}`);
    assert.ok(dims.scrollWidth <= width + 1, `débordement horizontal ${width}x${height}`);
    assert.ok(dims.scroll > dims.client, `liste longue doit défiler ${width}x${height}`);
    await items.last().scrollIntoViewIfNeeded();
    await items.last().click();
    assert.equal(await items.last().getAttribute('aria-pressed'), 'true');
    assert.equal(await modal.getByRole('button', { name: 'Confirmer' }).isEnabled(), true);
    await modal.getByRole('button', { name: 'Confirmer' }).click();
    assert.equal(await page.evaluate(() => window.resultat), 'grand-voile-blanc');
    if (process.env.RPG_CHOIX_COUT_CAPTURE) await page.screenshot({ path: `.cache/choix-cout-${width}x${height}.png` });
    console.log(`✓ ${width}x${height} : panneau, défilement et confirmation`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 568, height: 320 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${port}/__choix-cout-test?exil`, { waitUntil: 'networkidle' });
  assert.match(await page.locator('.rpg-choix-cout__description').innerText(), /exiler de votre cimetière/);
  assert.equal(await page.locator('.rpg-choix-cout__carte').count(), 2);
  assert.equal(await page.locator('.rpg-choix-cout__carte').first().evaluate((e) => getComputedStyle(e).transitionDuration), '0s');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.resultat), 'annule');
  await page.goto(`http://127.0.0.1:${port}/__choix-cout-test?vide`, { waitUntil: 'networkidle' });
  assert.match(await page.locator('.rpg-choix-cout__vide').innerText(), /Aucune carte admissible/);
  assert.equal(await page.getByRole('button', { name: 'Annuler' }).evaluate((e) => e === document.activeElement), true);
  assert.equal(await page.getByRole('button', { name: 'Confirmer' }).isDisabled(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.resultat), 'annule');
  console.log('✓ exil, mouvement réduit, Escape et absence de candidats');
  await page.close();
} finally {
  if (browser) await browser.close();
  await server.close();
}
