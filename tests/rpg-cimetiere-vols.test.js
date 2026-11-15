import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgLancerMagie, rpgResoudreRenfortChoisi, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { consommerSortiesCimetiere, instantaneCimetiere, sortiesCimetiereEntreVues } from '../src/games/rpgCimetiereAnimation.js';

function nouveau() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], modeMana: 'essai', pvp: true });
  duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
  return duel;
}

test('le moteur signale exactement le retour en main et la réanimation choisie', () => {
  const duel = nouveau();
  duel.joueur.main = ['scribe-de-la-liste']; duel.joueur.cimetiere = ['chien-du-guet'];
  const scribe = rpgJouerCreature(duel, 'joueur', 'scribe-de-la-liste').entite;
  assert.ok(scribe); assert.deepEqual(consommerSortiesCimetiere(duel), []);
  rpgBlesserCreature(duel, 'joueur', scribe.id, 99);
  assert.deepEqual(consommerSortiesCimetiere(duel), [{ cote: 'joueur', carteId: 'chien-du-guet', destination: 'main', entiteId: null }]);
  assert.deepEqual(consommerSortiesCimetiere(duel), [], 'un événement ne se rejoue pas');
  duel.joueur.main.push('reanimation'); duel.joueur.cimetiere.push('chien-du-guet');
  assert.ok(rpgLancerMagie(duel, 'joueur', 'reanimation').ok);
  assert.deepEqual(consommerSortiesCimetiere(duel), [], 'le sort ne fait pas encore sortir la carte');
  const index = duel.joueur.cimetiere.indexOf('chien-du-guet');
  const result = rpgResoudreRenfortChoisi(duel, 'joueur', index);
  assert.ok(result.ok);
  assert.deepEqual(consommerSortiesCimetiere(duel), [{ cote: 'joueur', carteId: 'chien-du-guet', destination: 'jeu', entiteId: result.entite.id }]);
});

test('Ténacité signale le vrai retour, pas un retour impossible', () => {
  const duel = nouveau(); duel.tour = 'sorcier';
  duel.joueur.cimetiere = ['chien-du-guet'];
  duel.joueur.retoursProgrammes = [{ carteId: 'chien-du-guet', tenacite: true, toursRestants: 1 }];
  rpgFinDeTour(duel);
  const revenu = duel.joueur.creatures[0]; assert.ok(revenu);
  assert.deepEqual(consommerSortiesCimetiere(duel), [{ cote: 'joueur', carteId: 'chien-du-guet', destination: 'jeu', entiteId: revenu.id }]);
  const absent = nouveau(); absent.tour = 'sorcier';
  absent.joueur.retoursProgrammes = [{ carteId: 'chien-du-guet', tenacite: true, toursRestants: 1 }];
  rpgFinDeTour(absent);
  assert.deepEqual(consommerSortiesCimetiere(absent), []);
});

test('PvP : comparaison multiensembles sans réanimation imaginaire et sans perdre les doublons', () => {
  const duel = nouveau(); duel.joueur.cimetiere = ['chien-du-guet', 'chien-du-guet', 'papyrus'];
  const avant = instantaneCimetiere(duel);
  duel.joueur.cimetiere = ['papyrus']; duel.joueur.main = ['chien-du-guet'];
  duel.joueur.creatures = [{ id: 'c1', carteId: 'chien-du-guet' }, { id: 'c2', carteId: 'ureus-du-seuil' }];
  const apres = instantaneCimetiere(duel);
  assert.deepEqual(sortiesCimetiereEntreVues(avant, apres), [
    { cote: 'joueur', carteId: 'chien-du-guet', entiteId: 'c1', destination: 'jeu' },
    { cote: 'joueur', carteId: 'chien-du-guet', destination: 'main' },
  ]);
  assert.deepEqual(sortiesCimetiereEntreVues(apres, apres), []);
  const masque = nouveau(); masque.sorcier.cimetiere = ['papyrus']; masque.sorcier.main = [];
  masque.sorcier.mainCount = 0; masque.sorcier.deckCount = 4;
  const avantPioche = instantaneCimetiere(masque);
  masque.sorcier.cimetiere = []; masque.sorcier.mainCount = 1; masque.sorcier.deckCount = 3;
  assert.deepEqual(sortiesCimetiereEntreVues(avantPioche, instantaneCimetiere(masque)), [], 'une pioche ne prouve pas un retour en main');
});

for (const mode of ['normal', 'système réduit', 'jeu réduit']) test(`MOBA : sorties du cimetière — ${mode}`, async () => {
  const reduit = mode !== 'normal';
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const anciennes = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: mode === 'système réduit', addEventListener() {}, removeEventListener() {} });
  if (mode === 'jeu réduit') dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    const cim = this.classList.contains('rpg-card-pile__stack') || (this.classList.contains('moba__pile-fallback') && this.textContent.includes('Cimetière'));
    const entite = this.hasAttribute('data-moba-entity');
    const left = cim ? 20 : entite ? 400 : 200, top = cim ? 100 : entite ? 250 : 500;
    return { left, top, width: 80, height: 100, right: left + 80, bottom: top + 100 };
  };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  let root;
  try {
    const { default: Board } = await vite.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaJouerCreature } = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgBlesserCreature } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const { RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const props = { initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 })), onQuitter() {}, rendu: RPG_RENDU_MOBA, sonActif: false };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el); await act(async () => el.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['reanimation']; duel.joueur.cimetiere = ['ureus-du-seuil'];
    assert.ok(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 1, ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserSort(duel, 'sorcier').ok);
    await render();
    assert.equal(document.querySelector('[data-rpg-cimetiere-vol]'), null, 'aucun mouvement avant le choix');
    await click(document.querySelector('[aria-label="Choix de carte"] .moba__mulligan-card'));
    const vol = document.querySelector('[data-rpg-cimetiere-vol="joueur-jeu"]');
    if (reduit) assert.equal(vol, null);
    else {
      assert.ok(vol); assert.equal(vol.style.getPropertyValue('--vol-dx'), '380px');
      assert.equal(vol.style.getPropertyValue('--vol-dy'), '150px');
      assert.match(vol.querySelector('img').src, /ureus/i);
      assert.equal(vol.closest('[aria-hidden]').getAttribute('aria-hidden'), 'true');
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 1050)); });
      assert.equal(document.querySelector('[data-rpg-cimetiere-vol]'), null, 'le calque est retiré');
    }
    assert.ok(duel.joueur.creatures.some(e => e.carteId === 'ureus-du-seuil'));
    // La mort du Scribe renvoie une carte en main, pas dans une case.
    duel.joueur.main = ['scribe-de-la-liste']; duel.joueur.cimetiere = ['chien-du-guet'];
    duel.moba.creaturesJouees.joueur = false;
    const scribe = rpgMobaJouerCreature(duel, 'joueur', 'scribe-de-la-liste', 'left', 0).entite;
    assert.ok(scribe); await render();
    rpgBlesserCreature(duel, 'joueur', scribe.id, 99);
    await render();
    const retour = document.querySelector('[data-rpg-cimetiere-vol="joueur-main"]');
    if (reduit) assert.equal(retour, null);
    else { assert.ok(retour); assert.equal(retour.style.getPropertyValue('--vol-dx'), '180px'); assert.match(retour.querySelector('img').src, /chien-du-guet/); }
    assert.ok(duel.joueur.main.includes('chien-du-guet'));
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, value] of Object.entries(anciennes)) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
  }
});

test('un exil du cimetière ne déclenche pas de faux vol de réanimation', () => {
  const duel = nouveau(); duel.joueur.cimetiere = ['lecteur-du-dernier-nom'];
  const avant = instantaneCimetiere(duel);
  duel.joueur.cimetiere = []; duel.joueur.exil = ['lecteur-du-dernier-nom'];
  duel.joueur.creatures = [{ id: 'nouveau', carteId: 'lecteur-du-dernier-nom' }];
  assert.deepEqual(sortiesCimetiereEntreVues(avant, instantaneCimetiere(duel)), []);
});
