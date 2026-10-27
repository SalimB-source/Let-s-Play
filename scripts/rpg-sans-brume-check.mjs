/**
 * Régression navigateur : les illustrations restent visibles sans l'ancien
 * voile doré, au coffret, au catalogue, à l'atelier, au Souk et en duel.
 * npm run check:rpg-sans-brume (ou CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium).
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const plateauFixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '/src/games/RpgDuelPage.jsx';
import { rpgNouveauDuel } from '/src/games/rpgDuel.js';
import { cardById } from '/src/games/rpgCards.js';
import '/src/styles.css';
const vue = rpgNouveauDuel({ pvp: true, rng: () => .999 });
vue.mulliganFait = { joueur: true, sorcier: true };
vue.joueur.main = ['feriel', 'chien-du-guet', 'serment-de-la-forge'];
vue.joueur.mana.braise = 10;
vue.joueur.cimetiere = ['feriel'];
const entite = (id, uid) => {
  const carte = cardById(id);
  return { ...carte, id: uid, carteId: id, pv: carte.def, pvMax: carte.def, ready: true, attaquee: false };
};
vue.joueur.creatures = [entite('kraken', 'entite-101'), entite('chien-du-guet', 'entite-102')];
vue.joueur.creatures[1].arme = { carteId: 'armure-de-cendres' };
vue.sorcier.creatures = [{ ...entite('maitre-du-marteau', 'entite-103'), furieDeclenchee: true }];
createRoot(document.getElementById('root')).render(React.createElement(RpgDuelPage, {
  pvp: { vue, seq: 1, statut: 'en_cours', code: 'TEST', onIntention: async () => ({ ok: true }) },
}));
`;

const boosterFixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgBoosterOuverture from '/src/games/RpgBoosterOuverture.jsx';
import { cardArt } from '/src/games/rpgCardArt.js';
import '/src/styles.css';
import '/src/games/rpg-battle.css';
const ids = ['baton-des-citernes', 'kraken', 'leviathan', 'masque-du-guetteur', 'pere-des-corbeaux'];
createRoot(document.getElementById('root')).render(React.createElement(RpgBoosterOuverture, {
  onPlaySfx: () => {}, onFermer: () => {}, cardArt,
  ouverture: {
    prix: 140, nouvelles: 5, remboursement: 0, coffret: false, paquets: 1,
    cartes: ids.map((id) => ({ id, doublon: false, remboursement: 0, exemplaires: 1 })),
  },
}));
`;

const fixtures = new Map([
  ['__sans-brume-plateau', { id: 'virtual:rpg-sans-brume-plateau', source: plateauFixture }],
  ['__sans-brume-booster', { id: 'virtual:rpg-sans-brume-booster', source: boosterFixture }],
]);
const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
  plugins: [{
    name: 'test-cartes-sans-brume',
    resolveId(id) {
      return [...fixtures.values()].some((fixture) => fixture.id === id) ? `\0${id}` : null;
    },
    load(id) {
      return [...fixtures.values()].find((fixture) => `\0${fixture.id}` === id)?.source ?? null;
    },
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        const nom = req.url?.split('?')[0].split('/').at(-1);
        const fixture = fixtures.get(nom);
        if (!fixture) return next();
        try {
          const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/${fixture.id}"></script></body></html>`;
          res.setHeader('Content-Type', 'text/html');
          res.end(await vite.transformIndexHtml(`${vite.config.base}${nom}`, html));
        } catch (erreur) {
          next(erreur);
        }
      });
    },
  }],
});

const ancienVoile = '.rpg-brume-mythique, [data-rpg-brume-mythique]';
async function verifierCarte(carte, nom) {
  await carte.waitFor();
  await carte.scrollIntoViewIfNeeded();
  const resultat = await carte.evaluate(async (node, selecteur) => {
    const image = node.matches('img') ? node : node.querySelector('img');
    if (image) await image.decode().catch(() => {});
    const rectangle = image?.getBoundingClientRect();
    return {
      brume: node.matches(selecteur) || Boolean(node.querySelector(selecteur)),
      source: image?.currentSrc ?? '',
      largeur: rectangle?.width ?? 0,
      hauteur: rectangle?.height ?? 0,
      naturelle: image?.naturalWidth ?? 0,
    };
  }, ancienVoile);
  assert.equal(resultat.brume, false, `${nom} ne porte plus de brume`);
  assert.ok(resultat.largeur > 0 && resultat.hauteur > 0 && resultat.naturelle > 0,
    `${nom} conserve son illustration visible (${JSON.stringify(resultat)})`);
}
async function verifierPage(page, nom) {
  assert.equal(await page.locator(ancienVoile).count(), 0, `aucun voile de brume ${nom}`);
}

let browser;
try {
  for (const fichier of [
    '../src/games/RpgBrumeMythique.jsx',
    '../src/games/rpg-brume-mythique.css',
    '../src/games/assets/brume-mythique.png',
  ]) assert.equal(existsSync(new URL(fichier, import.meta.url)), false, `${fichier} est retiré`);

  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}${server.config.base}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const erreurs = [];
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));

  // Le coffret de départ présente encore sa mythique et toutes ses peintures.
  await page.goto(`${base}jeu/sablier-de-bab-el`);
  await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
  await page.locator('[data-rpg-coffret-boite]').first().click();
  await page.locator('[data-rpg-coffret-phase="ceremonie"]').waitFor();
  await page.locator('.rpg-coffret__suivant').click();
  await page.locator('.rpg-coffret__suivant').click();
  await verifierCarte(page.locator('[data-rpg-coffret-rarete="mythique"]'), 'la mythique du coffret');
  await verifierPage(page, 'au coffret');
  await page.locator('.rpg-coffret__suivant').click();
  await page.locator('[data-rpg-coffret-phase]').waitFor({ state: 'detached' });

  // Les 166 cartes du catalogue, la fiche puis l'atelier restent consultables.
  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  const catalogue = page.locator('.rpg-card-catalogue__card');
  await catalogue.first().waitFor();
  assert.equal(await catalogue.count(), RPG_DUEL_CARDS.length);
  await verifierPage(page, 'au catalogue');
  const pere = page.locator('.rpg-card-catalogue__card[data-card-id="pere-des-corbeaux"]');
  await pere.locator('[data-catalogue-open]').click();
  await verifierCarte(page.locator('.rpg-card-peek .rpg-hover-card-preview__face'), 'la fiche du Père des corbeaux');
  await page.getByRole('button', { name: 'Fermer la fiche' }).click();
  await page.getByRole('button', { name: 'Deck', exact: true }).click();
  await page.getByRole('button', { name: /Créer un nouveau deck dans l’atelier/ }).click();
  await verifierCarte(page.locator('.rpg-atelier__carte[data-card-id="kraken"]'), 'le Kraken de l’atelier');
  await verifierPage(page, 'à l’atelier');

  await page.getByRole('button', { name: /Le Souk —/ }).click();
  const etal = page.locator('[data-souk-direct-rarete="mythique"]').first();
  await verifierCarte(etal, 'la mythique à l’étal du Souk');
  await verifierPage(page, 'au Souk');

  // Le vrai composant de booster, avec plusieurs mythiques dans son tirage.
  await page.goto(`${base}__sans-brume-booster`);
  await page.waitForSelector('[data-souk-phase="termine"]');
  const cartesBooster = page.locator('[data-souk-carte]');
  assert.equal(await cartesBooster.count(), 5);
  assert.ok(await page.locator('[data-souk-carte-rarete="mythique"]').count() > 0);
  await verifierCarte(page.locator('[data-souk-carte][data-card-id="kraken"]'), 'le Kraken du booster');
  await verifierPage(page, 'au booster');

  // Les mythiques restent jouables et lisibles en main, sur la table et dans
  // le cimetière, y compris les armes équipées et les sorts annoncés.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}__sans-brume-plateau`);
  const enMain = page.locator('.rpg-hand__card[data-card-id="feriel"]');
  const surTable = page.locator('.rpg-card--equipe[data-card-id="kraken"]');
  await verifierCarte(enMain, 'Fériel en main');
  await verifierCarte(surTable, 'le Kraken sur la table');
  await verifierCarte(page.locator('.rpg-card--ennemi[data-card-id="maitre-du-marteau"]'), 'la mythique en furie');
  await verifierCarte(page.locator('.rpg-card-pile--graveyard [data-card-id="feriel"]'), 'Fériel au cimetière');
  await verifierPage(page, 'sur le plateau');
  await surTable.click();
  assert.equal(await surTable.getAttribute('aria-pressed'), 'true', 'la carte reste sélectionnable');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  await page.locator('.rpg-card--equipe[data-card-id="chien-du-guet"]').click({ button: 'right' });
  await verifierCarte(page.locator('.rpg-card-peek .rpg-hover-card-preview__weapon[data-arme-equipee="armure-de-cendres"]'), 'l’arme équipée');
  await verifierPage(page, 'sur la fiche d’arme');
  await page.reload();
  await page.locator('.rpg-hand__card[data-card-id="serment-de-la-forge"]').click();
  await page.getByRole('button', { name: 'Lancer le sort' }).click();
  // L'annonce est éphémère : vérifier son image sans attendre son décodage,
  // qui peut finir après la disparition de la vignette.
  const sort = page.locator('img.rpg-spell-played__art');
  await sort.waitFor();
  assert.match(await sort.getAttribute('src') ?? '', /\/cards\/serment-de-la-forge\.jpg/);
  await verifierPage(page, 'sur le sort annoncé');

  for (const [width, height] of [[844, 390], [568, 320]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}__sans-brume-plateau`);
    await verifierCarte(enMain, `la main à ${width}×${height}`);
    await verifierCarte(surTable, `la table à ${width}×${height}`);
    await verifierPage(page, `à ${width}×${height}`);
  }
  assert.deepEqual(erreurs, [], 'aucune erreur navigateur');
  console.log('✓ Illustrations sans brume au coffret, catalogue, atelier, Souk, booster et duel, y compris sur téléphone.');
} finally {
  await browser?.close();
  await server.close();
}
