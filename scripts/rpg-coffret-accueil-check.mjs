/**
 * Régression navigateur : le coffret est proposé à l'accueil, jamais sur une
 * partie. Les fixtures Vite gardent les vrais composants et hooks ; seules les
 * réponses du compte et de l'arbitre sont contrôlées pour tester leurs retards.
 *
 * npm run check:rpg-coffret-accueil
 */
import assert from 'node:assert/strict';
import { createServer, transformWithOxc } from 'vite';
import { chromium } from 'playwright';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { deckDeDepartDepuisCollection } from '../src/games/rpgDeckDeDepart.js';

const remoteFixture = `
const lectures = [];
const ecritures = [];
const api = window.__sablierTestRemote = {
  lectures, ecritures, differerEcritures: false,
  lire(id) { return lectures.filter((l) => l.id === id); },
  resoudreLecture(index, reponse) {
    const entree = lectures[index];
    if (!entree || entree.termine) return;
    entree.termine = true;
    entree.resoudre(reponse);
  },
  resoudreLectures(id, reponse) {
    lectures.forEach((l, i) => { if (l.id === id) api.resoudreLecture(i, reponse); });
  },
  resoudreEcritures(id) {
    ecritures.forEach((e) => {
      if (e.id === id && !e.termine) { e.termine = true; e.resoudre('table'); }
    });
  },
};
export function chargerEtatSablier(id) {
  return new Promise((resoudre) => lectures.push({ id, termine: false, resoudre }));
}
export function sauverEtatSablier(id, state) {
  const copie = structuredClone(state);
  return new Promise((resoudre) => {
    const entree = { id, state: copie, termine: !api.differerEcritures, resoudre };
    ecritures.push(entree);
    if (entree.termine) resoudre('table');
  });
}
`;

const pvpFixture = `
const api = window.__sablierTestPvp = { enAttente: [], rejoint: null, vue: null };
export function sablierPvpDisponible() { return true; }
export function cadenceSondage() { return 60000; }
export function cheminDefi(code) { return '/jeu/sablier-de-bab-el/defi/' + code; }
export function lienDefi(code, base = '') { return base + cheminDefi(code); }
export function etatDefi() { return new Promise((resoudre) => api.enAttente.push(resoudre)); }
export async function rejoindreDefi({ code, deck }) {
  api.rejoint = { code, deck };
  return { ok: true, code, statut: 'en_cours', siege: 'sorcier', seq: 1, etat: window.__sablierTestDuel };
}
export async function ouvrirDefi() { return { ok: false, raison: 'test' }; }
export async function jouerIntention() { return { ok: true }; }
export async function abandonnerDefi() { return { ok: true }; }
export async function refuserDefi() { return { ok: true }; }
`;

const appFixture = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '/src/auth/AuthContext.jsx';
import { definirProprietaireProgression, definirSessionPrete } from '/src/lib/progressionScope.js';
import RpgDuelPage from '/src/games/RpgDuelPage.jsx';
import RpgPvpSalon from '/src/games/RpgPvpSalon.jsx';
import { rpgNouveauDuel } from '/src/games/rpgDuel.js';
import '/src/styles.css';
const duel = rpgNouveauDuel({ pvp: true, rng: () => .99 });
duel.mulliganFait = { joueur: true, sorcier: true };
window.__sablierTestDuel = duel;
function Fixture() {
  const [auth, setAuth] = useState(window.__sablierTestConfig.auth);
  window.__sablierChangerAuth = (suivant) => setAuth(suivant);
  definirSessionPrete(!auth.loading);
  definirProprietaireProgression(auth.isDemo ? null : (auth.user?.id ?? null));
  const page = window.__sablierTestConfig.page;
  return <AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={['/jeu/sablier-de-bab-el/defi/AB12CD34']}>
      {page === 'salon'
        ? <Routes><Route path="/jeu/sablier-de-bab-el/defi/:code" element={<RpgPvpSalon />} /></Routes>
        : <RpgDuelPage />}
    </MemoryRouter>
  </AuthContext.Provider>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
`;

const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
  plugins: [{
    name: 'test-rpg-coffret-accueil',
    enforce: 'pre',
    resolveId(id) {
      if (id === './rpgSablierRemote.js') return '\0test-rpg-remote';
      if (id === './rpgPvpApi.js') return '\0test-rpg-pvp';
      if (id === 'virtual:rpg-coffret-accueil') return '\0test-rpg-accueil';
    },
    load(id) {
      if (id === '\0test-rpg-remote') return remoteFixture;
      if (id === '\0test-rpg-pvp') return pvpFixture;
      // Vite transforme le JSX de la fixture comme celui de l'application.
      if (id === '\0test-rpg-accueil') return transformWithOxc(appFixture, 'rpg-coffret-fixture.jsx', { lang: 'jsx' });
    },
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/__coffret-accueil')) return next();
        try {
          const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/virtual:rpg-coffret-accueil"></script></body></html>';
          res.setHeader('Content-Type', 'text/html');
          res.end(await vite.transformIndexHtml(`${vite.config.base}__coffret-accueil`, html));
        } catch (erreur) { next(erreur); }
      });
    },
  }],
});

const compte = (id) => ({ user: { id, name: id }, loading: false, isDemo: false });
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const choix = '[data-rpg-coffret-phase="choix"]';
const attente = '[data-rpg-coffret-attente]';
const aucunEtat = { state: null, source: 'none' };
const horsLigne = { state: null, source: 'unavailable' };
let browser;
let base;
const erreurs = [];

async function nouvellePage(config = null, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
  if (config) await context.addInitScript((valeur) => { window.__sablierTestConfig = valeur; }, config);
  const page = await context.newPage();
  page.on('pageerror', (erreur) => erreurs.push(erreur.stack || erreur.message));
  return { context, page };
}

async function fixture(page) {
  await page.goto(`${base}__coffret-accueil`);
  await page.waitForFunction(() => Boolean(window.__sablierChangerAuth));
}
async function attendreLectures(page, id, nombre) {
  await page.waitForFunction(({ id, nombre }) => window.__sablierTestRemote?.lire(id).length >= nombre, { id, nombre });
}
async function resoudreLectures(page, id, reponse) {
  await page.evaluate(({ id, reponse }) => window.__sablierTestRemote.resoudreLectures(id, reponse), { id, reponse });
}
async function attendreMenuLibre(page) {
  try {
    await page.waitForFunction(() => {
      const menu = document.querySelector('.rpg-mode-menu');
      return menu && !menu.inert && !document.querySelector('[data-rpg-coffret-attente], [data-rpg-coffret-phase]');
    }, null, { timeout: 12000 });
  } catch (erreur) {
    console.error('Accueil bloqué :', await page.evaluate(() => ({
      scene: document.querySelector('.rpg-battle')?.dataset.scene,
      inert: document.querySelector('.rpg-mode-menu')?.inert,
      attente: Boolean(document.querySelector('[data-rpg-coffret-attente]')),
      phase: document.querySelector('[data-rpg-coffret-phase]')?.dataset.rpgCoffretPhase,
      histoire: localStorage.getItem('letsplay_sablier_histoire_v2'),
    })), erreurs);
    throw erreur;
  }
}
async function terminerCeremonie(page) {
  for (let i = 0; i < 3; i += 1) await page.locator('.rpg-coffret__suivant').click();
  await page.locator('[data-rpg-coffret-phase]').waitFor({ state: 'detached' });
}
async function choisirCoffret(page) {
  await page.locator(choix).waitFor();
  const nombre = await page.locator('[data-rpg-coffret-boite]').count();
  assert.equal(nombre, 3, 'trois coffrets à l’accueil');
  const couleur = await page.locator('[data-rpg-coffret-boite]').first().getAttribute('data-rpg-coffret-boite');
  await page.locator('[data-rpg-coffret-boite]').first().click();
  await page.locator('[data-rpg-coffret-phase="ceremonie"]').waitFor();
  await terminerCeremonie(page);
  return couleur;
}

try {
  await server.listen();
  base = `http://127.0.0.1:${server.httpServer.address().port}${server.config.base}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  // Parcours réel, invité : accueil -> coffret -> deck jouable -> duel -> retour.
  {
    const { page, context } = await nouvellePage();
    await page.goto(`${base}jeu/sablier-de-bab-el`);
    await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
    await page.locator(choix).waitFor();
    assert.equal(await page.locator('.rpg-battle').getAttribute('data-scene'), 'menu');
    assert.equal(await page.locator('.rpg-mulligan').count(), 0, 'aucune partie lancée derrière le coffret');
    await page.waitForFunction(() => document.querySelector('.rpg-mode-menu')?.inert);
    const couleur = await choisirCoffret(page);
    await attendreMenuLibre(page);
    const donnees = await page.evaluate(() => ({
      offre: JSON.parse(localStorage.getItem('letsplay_sablier_coffret_bienvenue_v1')),
      casier: JSON.parse(localStorage.getItem('letsplay_sablier_decks_maison_v1')),
      bourse: JSON.parse(localStorage.getItem('letsplay_sablier_bourse_v1')),
      selection: JSON.parse(localStorage.getItem('letsplay_sablier_deck_v1')),
    }));
    assert.equal(donnees.offre.choisi, `coffret-${couleur}`);
    assert.deepEqual(donnees.casier.decks.map((deck) => deck.id), [`maison-coffret-${couleur}`], 'aucun faux deck pré-généré');
    assert.equal(donnees.casier.decks[0].cardIds.length, 30);
    assert.equal(donnees.selection.deckId, `maison-coffret-${couleur}`);
    assert.ok(donnees.bourse.cartes.length > 0 && Object.keys(donnees.bourse.exemplaires).length > 0);
    await page.locator('.rpg-menu-button--partie-rapide').click();
    assert.match(await page.locator('.rpg-partie-rapide').innerText(), /30 cartes[\s\S]*Actuel/i);
    await page.getByRole('button', { name: 'Lancer la partie' }).click();
    await page.locator('.rpg-battle[data-scene="duel"]').waitFor();
    assert.equal(await page.locator('[data-rpg-coffret-phase]').count(), 0, 'pas de coffret sur la table');
    await page.goto(`${base}jeu/sablier-de-bab-el`);
    await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
    await attendreMenuLibre(page);
    assert.equal(await page.locator(choix).count(), 0, 'un rechargement ne repropose pas le choix');
    await context.close();
    console.log('✓ invité : choix au menu, deck sélectionné, partie sans coffret, rechargement');
  }

  // Sur téléphone aussi, le choix et toute la cérémonie précèdent la partie.
  {
    const { page, context } = await nouvellePage(null, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(`${base}jeu/sablier-de-bab-el`);
    await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
    await page.locator(choix).waitFor();
    assert.equal(await page.locator('.rpg-battle').getAttribute('data-scene'), 'menu');
    await choisirCoffret(page);
    await attendreMenuLibre(page);
    await context.close();
    console.log('✓ téléphone : le coffret se choisit aussi à l’accueil');
  }

  // L'ancienne version pouvait créer un deck automatique avant l'ouverture :
  // seul, il ne doit pas priver un nouveau joueur de son vrai coffret.
  {
    const { page, context } = await nouvellePage();
    const ancienDeck = deckDeDepartDepuisCollection(COLLECTION_DEPART);
    await context.addInitScript((deck) => {
      localStorage.setItem('letsplay_sablier_decks_maison_v1', JSON.stringify({ decks: [deck], supprimes: [] }));
    }, ancienDeck);
    await page.goto(`${base}jeu/sablier-de-bab-el`);
    await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
    const couleur = await choisirCoffret(page);
    await attendreMenuLibre(page);
    const selection = await page.evaluate(() => JSON.parse(localStorage.getItem('letsplay_sablier_deck_v1')).deckId);
    assert.equal(selection, `maison-coffret-${couleur}`);
    await page.locator('.rpg-menu-button--partie-rapide').click();
    assert.equal(await page.getByRole('button', { name: 'Lancer la partie' }).isEnabled(), true);
    await context.close();
    console.log('✓ ancien deck automatique : le coffret reste proposé et sélectionné');
  }

  // Des données locales antérieures continuent à donner directement accès au
  // menu, sans présenter le choix comme s'il s'agissait d'un nouveau joueur.
  {
    const { page, context } = await nouvellePage();
    await context.addInitScript(() => {
      localStorage.setItem('letsplay_sablier_histoire_v2', JSON.stringify({ version: 2, etagesVaincus: ['listes-1'], recit: null }));
    });
    await page.goto(`${base}jeu/sablier-de-bab-el`);
    await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
    await attendreMenuLibre(page);
    assert.equal(await page.locator(choix).count(), 0);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('letsplay_sablier_histoire_v2')).etagesVaincus), ['listes-1']);
    await context.close();
    console.log('✓ joueur existant : progression locale conservée sans nouvelle offre');
  }

  let copieCompteA;
  // Session tardive, trois lectures et écritures retardées, puis changement de compte.
  {
    const { page, context } = await nouvellePage({ page: 'hub', auth: { user: null, loading: true, isDemo: false } });
    await fixture(page);
    await page.locator(attente).waitFor();
    assert.equal(await page.locator(choix).count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('letsplay_sablier_coffret_bienvenue_v1')), null);
    await page.evaluate((auth) => { window.__sablierTestRemote.differerEcritures = true; window.__sablierChangerAuth(auth); }, compte(A));
    await attendreLectures(page, A, 3);
    await page.evaluate(({ id, reponse }) => {
      const a = window.__sablierTestRemote.lectures;
      a.forEach((l, i) => { if (l.id === id && i < 2) window.__sablierTestRemote.resoudreLecture(i, reponse); });
    }, { id: A, reponse: aucunEtat });
    await page.waitForFunction((id) => window.__sablierTestRemote.ecritures.some((e) => e.id === id), A);
    assert.equal(await page.locator(choix).count(), 0, 'une lecture encore en vol bloque le choix');
    await resoudreLectures(page, A, aucunEtat);
    await page.waitForFunction((id) => window.__sablierTestRemote.ecritures.filter((e) => e.id === id).length >= 2, A);
    assert.equal(await page.locator(choix).count(), 0, 'les écritures initiales doivent aussi se terminer');
    await page.evaluate((id) => window.__sablierTestRemote.resoudreEcritures(id), A);
    await page.locator(choix).waitFor();
    await page.evaluate(() => { window.__sablierTestRemote.differerEcritures = false; });
    await page.locator('[data-rpg-coffret-boite]').first().click();
    await page.locator('[data-rpg-coffret-phase="ceremonie"]').waitFor();
    const enregistrements = await page.evaluate((id) => window.__sablierTestRemote.ecritures.filter((e) => e.id === id).map((e) => e.state), A);
    copieCompteA = enregistrements.at(-1);
    assert.equal(copieCompteA.decks.length, 1, 'cartes et deck envoyés dans une seule sauvegarde');
    assert.ok(copieCompteA.bourse.cartes.length > 0);
    assert.ok(copieCompteA.decks[0].cardIds.every((id) => copieCompteA.bourse.cartes.includes(id)));

    // B arrive pendant la cérémonie de A : ni le choix ni les timers de A ne suivent.
    await page.evaluate((auth) => window.__sablierChangerAuth(auth), compte(B));
    await page.locator(attente).waitFor();
    await attendreLectures(page, B, 3);
    assert.equal(await page.locator('[data-rpg-coffret-phase]').count(), 0);
    await resoudreLectures(page, B, aucunEtat);
    await page.locator(choix).waitFor();
    assert.equal(await page.evaluate((id) => localStorage.getItem(`letsplay_sablier_coffret_bienvenue_v1:user:${id}`) !== null, B), true);
    await page.evaluate((auth) => window.__sablierChangerAuth(auth), compte(A));
    await attendreLectures(page, A, 6);
    await resoudreLectures(page, A, aucunEtat);
    await attendreMenuLibre(page);
    assert.equal(await page.locator(choix).count(), 0, 'A garde son choix au retour');
    await context.close();
    console.log('✓ compte neuf : session, trois synchronisations et changements de compte');
  }

  // Une réponse de l'ancien compte qui arrive après le changement ne doit ni
  // décider pour le nouveau joueur, ni écrire dans ses clés locales.
  {
    const { page, context } = await nouvellePage({ page: 'hub', auth: compte(A) });
    await fixture(page);
    await attendreLectures(page, A, 3);
    await page.evaluate((auth) => window.__sablierChangerAuth(auth), compte(B));
    await attendreLectures(page, B, 3);
    await resoudreLectures(page, A, { source: 'table', state: { bourse: { cartes: ['tarek'] }, histoire: { etagesVaincus: ['listes-1'] } } });
    assert.equal(await page.locator(choix).count(), 0, 'B attend toujours ses propres réponses');
    assert.equal(await page.evaluate((id) => window.__sablierTestRemote.ecritures.some((e) => e.id === id), A), false,
      'la réponse périmée de A est ignorée');
    await resoudreLectures(page, B, aucunEtat);
    await page.locator(choix).waitFor();
    const bourseB = await page.evaluate((id) => JSON.parse(localStorage.getItem(`letsplay_sablier_bourse_v1:user:${id}`)), B);
    assert.equal(bourseB.cartes.includes('tarek'), false, 'B ne reçoit pas les cartes de A');
    await context.close();
    console.log('✓ changement de compte : réponse tardive de l’ancien joueur ignorée');
  }

  // Un compte existant dont seule la bourse distante porte ses cartes ne doit
  // pas recevoir un nouveau coffret ; même garantie pour l'histoire distante.
  for (const [nom, etat] of [
    ['bourse', { bourse: { cartes: ['tarek'], exemplaires: { tarek: 1 } } }],
    ['histoire', { histoire: { etagesVaincus: ['listes-1'] } }],
    ['profil', { profil: { xp: 1 } }],
  ]) {
    const { page, context } = await nouvellePage({ page: 'hub', auth: compte(C) });
    await fixture(page);
    await attendreLectures(page, C, 3);
    assert.equal(await page.locator(choix).count(), 0, `${nom} : attendre le serveur`);
    await resoudreLectures(page, C, { source: 'table', state: etat });
    await attendreMenuLibre(page);
    assert.equal(await page.locator(choix).count(), 0, `${nom} distant : pas de nouvelle offre`);
    await context.close();
    console.log(`✓ ancien compte : données distantes (${nom}) préservées`);
  }

  // Un deck local peut précéder la bourse récupérée d'un autre appareil. Il ne
  // doit jamais être « réparé » avec un stock incomplet avant cette réponse.
  {
    const { page, context } = await nouvellePage({ page: 'hub', auth: compte(A) });
    await context.addInitScript(({ id, decks }) => {
      localStorage.setItem(`letsplay_sablier_decks_maison_v1:user:${id}`, JSON.stringify({ decks, supprimes: [] }));
    }, { id: A, decks: copieCompteA.decks });
    await fixture(page);
    await attendreLectures(page, A, 3);
    const lireCartes = () => page.evaluate((id) => JSON.parse(localStorage.getItem(`letsplay_sablier_decks_maison_v1:user:${id}`)).decks[0].cardIds, A);
    assert.deepEqual(await lireCartes(), copieCompteA.decks[0].cardIds, 'le deck reste intact pendant l’attente');
    await resoudreLectures(page, A, { source: 'table', state: copieCompteA });
    await attendreMenuLibre(page);
    assert.deepEqual(await lireCartes(), copieCompteA.decks[0].cardIds, 'le stock distant protège les trente cartes');
    await page.locator('.rpg-menu-button--partie-rapide').click();
    assert.match(await page.locator('.rpg-partie-rapide').innerText(), /30 cartes/);
    assert.equal(await page.getByRole('button', { name: 'Lancer la partie' }).isEnabled(), true);
    await context.close();
    console.log('✓ deck local et stock distant : aucune réparation prématurée');
  }

  // Un vrai repli local et une démo ne doivent pas rester bloqués.
  {
    const { page, context } = await nouvellePage({ page: 'hub', auth: compte(C) });
    await fixture(page);
    await attendreLectures(page, C, 3);
    await resoudreLectures(page, C, horsLigne);
    await page.locator(choix).waitFor();
    await context.close();
    const demo = await nouvellePage({ page: 'hub', auth: { user: { id: 'demo' }, loading: false, isDemo: true } });
    await fixture(demo.page);
    await demo.page.locator(choix).waitFor();
    assert.equal(await demo.page.evaluate(() => window.__sablierTestRemote.lectures.length), 0);
    await demo.context.close();
    console.log('✓ repli hors ligne et profil de démonstration');
  }

  // Invitation directe : attendre de savoir si le duel existe déjà, puis
  // synchroniser le compte, choisir le coffret et rejoindre avec le bon deck.
  {
    const { page, context } = await nouvellePage({ page: 'salon', auth: compte(B) });
    await fixture(page);
    await page.waitForFunction(() => window.__sablierTestPvp?.enAttente.length > 0);
    assert.equal(await page.locator('[data-rpg-coffret-phase], [data-rpg-coffret-attente]').count(), 0,
      'aucun accueil tant que le statut du défi est inconnu');
    await page.evaluate(() => window.__sablierTestPvp.enAttente.shift()({ ok: true, code: 'AB12CD34', statut: 'invitation', siege: null }));
    await attendreLectures(page, B, 2);
    await page.locator(attente).waitFor();
    await resoudreLectures(page, B, aucunEtat);
    const couleur = await choisirCoffret(page);
    const selection = page.locator('.rpg-pvp-decks button[aria-pressed="true"]');
    await selection.waitFor();
    const joindre = page.getByRole('button', { name: 'Rejoindre le duel' });
    await joindre.waitFor({ state: 'visible' });
    await joindre.click();
    await page.locator('.rpg-battle[data-scene="duel"]').waitFor();
    const carteJouees = await page.evaluate(() => window.__sablierTestPvp.rejoint.deck);
    const casier = await page.evaluate((id) => JSON.parse(localStorage.getItem(`letsplay_sablier_decks_maison_v1:user:${id}`)), B);
    assert.deepEqual(carteJouees, casier.decks.find((deck) => deck.id === `maison-coffret-${couleur}`).cardIds);
    assert.equal(await page.locator('[data-rpg-coffret-phase], [data-rpg-coffret-attente]').count(), 0, 'le duel PvP reste dégagé');
    await context.close();
    console.log('✓ invitation directe : coffret, deck immédiatement sélectionnable puis duel');
  }

  // La copie d'un autre appareil remplit elle aussi le sélecteur PvP.
  {
    const { page, context } = await nouvellePage({ page: 'salon', auth: compte(A) });
    await fixture(page);
    await page.waitForFunction(() => window.__sablierTestPvp?.enAttente.length > 0);
    await page.evaluate(() => window.__sablierTestPvp.enAttente.shift()({ ok: true, code: 'AB12CD34', statut: 'invitation', siege: null }));
    await attendreLectures(page, A, 2);
    await resoudreLectures(page, A, { source: 'table', state: copieCompteA });
    await page.locator('.rpg-pvp-decks button[aria-pressed="true"]').waitFor();
    assert.equal(await page.locator('[data-rpg-coffret-phase]').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Rejoindre le duel' }).isEnabled(), true);
    await context.close();
    console.log('✓ invitation directe : deck récupéré du compte sur un appareil neuf');
  }

  // Reconnexion directe à une partie active : aucun dialogue, même pour un
  // compte vierge dont toutes les lectures distantes restent en attente.
  {
    const { page, context } = await nouvellePage({ page: 'salon', auth: compte(C) });
    await fixture(page);
    await page.waitForFunction(() => window.__sablierTestPvp?.enAttente.length > 0);
    await page.evaluate(() => window.__sablierTestPvp.enAttente.shift()({
      ok: true, code: 'AB12CD34', statut: 'en_cours', siege: 'joueur', seq: 1, etat: window.__sablierTestDuel,
    }));
    try {
      await page.locator('.rpg-battle[data-scene="duel"]').waitFor({ timeout: 10000 });
    } catch (erreur) {
      console.error('Vue PvP :', (await page.locator('body').innerText()).slice(0, 1000), erreurs);
      throw erreur;
    }
    await attendreLectures(page, C, 3);
    assert.equal(await page.locator('[data-rpg-coffret-phase], [data-rpg-coffret-attente]').count(), 0);
    await context.close();
    console.log('✓ reconnexion PvP : aucune superposition pendant un duel actif');
  }

  // Même après le retour au menu proposé en portrait, une table PvP encore
  // active ne doit pas faire surgir l'accueil par-dessus son écran.
  {
    const { page, context } = await nouvellePage(
      { page: 'salon', auth: compte(C) },
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    );
    await fixture(page);
    await page.waitForFunction(() => window.__sablierTestPvp?.enAttente.length > 0);
    await page.evaluate(() => window.__sablierTestPvp.enAttente.shift()({
      ok: true, code: 'AB12CD34', statut: 'en_cours', siege: 'joueur', seq: 1, etat: window.__sablierTestDuel,
    }));
    await page.getByRole('button', { name: 'Retour au menu' }).click();
    await page.locator('.rpg-mode-menu').waitFor();
    assert.equal(await page.locator('[data-rpg-coffret-phase], [data-rpg-coffret-attente]').count(), 0);
    assert.equal(await page.locator('.rpg-mode-menu').evaluate((menu) => menu.inert), false);
    await context.close();
    console.log('✓ PvP sur téléphone : retour au menu sans accueil intempestif');
  }

  assert.deepEqual(erreurs, [], 'aucune erreur JavaScript dans les parcours');
  console.log('Contrôle du coffret à l’accueil : réussi.');
} finally {
  await browser?.close();
  await server.close();
}
