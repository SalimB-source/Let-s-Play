import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { rpgBlesserCreature, rpgFinDeTour, rpgJouerCreature, rpgNouveauDuel, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi } from '../src/games/rpgDuel.js';
import { MOBA_CARTES_AUTORISEES, rpgMobaJouerCreature, rpgMobaNouveauDuel, rpgMobaPlacementCoherent, rpgMobaResoudreRecherche } from '../src/games/rpgMobaLocal.js';
import { CARTES_COMBAT_AUDITEES } from '../src/games/rpgMobaAudit.js';
import { vivierRayon } from '../src/games/rpgBoosters.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';

function partie(moba, side = 'joueur') {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp: true, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true; d.tour = side;
  for (const s of ['joueur', 'sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; }
  return d;
}
function choisir(d, side, id) {
  const c = rpgCartesRenfortChoisi(d, side).find(c => c.id === id && c.admissible); assert.ok(c);
  const r = d.moba ? rpgMobaResoudreRecherche(d, side, id, c.index) : rpgResoudreRenfortChoisi(d, side, c.index);
  assert.ok(r.ok, JSON.stringify(r));
}
function poser(d, side, id, slot = 0) {
  d.tour = side; d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, slot < 2 ? 'left' : 'right', slot < 2 ? slot : slot - 2) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}

test('Les nouvelles cartes et leurs cibles sont disponibles en MOBA et en collection', () => {
  const id = 'gardienne-des-derniers-noms';
  assert.ok(RPG_DUEL_CARDS.some(c => c.id === id)); assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  assert.ok(vivierRayon('souk').includes(id)); assert.ok(RPG_REVELATIONS_PAR_ETAGE['necropole-2'].includes(id));
  for (const c of RPG_DUEL_CARDS.filter(c => ['creature','hero'].includes(c.kind) && cardColors(c).includes('tenebres') && c.cost <= 2)) assert.ok(CARTES_COMBAT_AUDITEES.has(c.id), c.id);
});
for (const moba of [false, true]) for (const side of ['joueur','sorcier']) {
  const mode = `${moba ? 'MOBA' : 'Duel'}, ${side}`;
  test(`Gardienne : à sa mort invoque depuis le dessus du deck (${mode})`, () => {
    const d = partie(moba, side), e = poser(d, side, 'gardienne-des-derniers-noms');
    d[side].cimetiere = ['chacal-du-seuil'];
    d[side].deck = ['chacal-du-seuil', 'ouvrier-du-natron', 'viking-des-neiges', 'papyrus'];
    d.tour = side === 'joueur' ? 'sorcier' : 'joueur';
    const quota = moba ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee;
    rpgBlesserCreature(d, side, e.id, 10);
    assert.deepEqual(d[side].creatures.map(c => c.carteId), ['ouvrier-du-natron']);
    assert.deepEqual(d[side].deck, ['chacal-du-seuil', 'viking-des-neiges', 'papyrus']);
    assert.ok(d[side].cimetiere.includes('chacal-du-seuil'));
    assert.equal(moba ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee, quota);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Gardienne : sans candidat, pas de réanimation depuis le cimetière (${mode})`, () => {
    const d = partie(moba, side), e = poser(d, side, 'gardienne-des-derniers-noms');
    d[side].deck = ['viking-des-neiges', 'ureus-du-seuil']; d[side].cimetiere = ['chacal-du-seuil'];
    rpgBlesserCreature(d, side, e.id, 10);
    assert.equal(d[side].creatures.length, 0); assert.ok(d[side].cimetiere.includes('chacal-du-seuil'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Veilleur : réanime Ténèbres ou Neige, détruit à la fin du tour adverse (${mode})`, () => {
    const d = partie(moba, side), e = poser(d, side, 'veilleur-des-cendres');
    d[side].cimetiere = ['ureus-du-seuil', 'gardien-viking-du-fjord', 'djinn-des-braises-voilees'];
    d.tour = side === 'joueur' ? 'sorcier' : 'joueur';
    rpgBlesserCreature(d, side, e.id, 10); choisir(d, side, 'gardien-viking-du-fjord');
    assert.deepEqual(d[side].creatures.map(c => c.carteId), ['gardien-viking-du-fjord']);
    assert.equal(d[side].creatures[0].detruireFinDuTourActuel, true);
    rpgFinDeTour(d);
    assert.equal(d[side].creatures.length, 0); assert.ok(d[side].cimetiere.includes('gardien-viking-du-fjord'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Veilleur : Ténèbres coût 3, Braise et coût 4 exclus (${mode})`, () => {
    const d = partie(moba, side), e = poser(d, side, 'veilleur-des-cendres');
    d[side].cimetiere = ['ureus-du-seuil', 'djinn-des-braises-voilees', 'souverain-de-la-lune-noire'];
    rpgBlesserCreature(d, side, e.id, 10); choisir(d, side, 'ureus-du-seuil');
    assert.deepEqual(d[side].creatures.map(c => c.carteId), ['ureus-du-seuil']);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Convoi : choix parmi les créatures Braise, Sable ou Ténèbres (${mode})`, () => {
    const d = partie(moba, side); d[side].cimetiere = ['chien-du-guet', 'ureus-du-seuil', 'viking-des-neiges', 'dune-marchante', 'papyrus'];
    const e = poser(d, side, 'convoi-des-dunes'); assert.ok(e); choisir(d, side, 'ureus-du-seuil');
    assert.deepEqual(d[side].main, ['ureus-du-seuil']);
    assert.deepEqual(d[side].cimetiere, ['chien-du-guet', 'viking-des-neiges', 'dune-marchante', 'papyrus']);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}

for (const moba of [false, true]) for (const id of ['chien-du-guet', 'cotre-de-course', 'ureus-du-seuil']) {
  test(`Convoi récupère ${id} (${moba ? 'MOBA' : 'Duel'})`, () => {
    const d = partie(moba); d.joueur.cimetiere = [id]; poser(d, 'joueur', 'convoi-des-dunes'); choisir(d, 'joueur', id);
    assert.deepEqual(d.joueur.main, [id]); assert.deepEqual(d.joueur.cimetiere, []);
  });
}
for (const moba of [false, true]) test(`Chaque Convoi déclenche son choix à l'arrivée (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = partie(moba); d.joueur.cimetiere = ['chien-du-guet', 'ureus-du-seuil'];
  poser(d, 'joueur', 'convoi-des-dunes', 0); choisir(d, 'joueur', 'ureus-du-seuil');
  poser(d, 'joueur', 'convoi-des-dunes', 1); choisir(d, 'joueur', 'chien-du-guet');
  assert.deepEqual(d.joueur.main, ['ureus-du-seuil', 'chien-du-guet']); assert.deepEqual(d.joueur.cimetiere, []);
});

for (const moba of [false, true]) {
  test(`Convoi peut récupérer une autre copie de lui-même (${moba ? 'MOBA' : 'Duel'})`, () => {
    const d = partie(moba); d.joueur.cimetiere = ['convoi-des-dunes']; poser(d, 'joueur', 'convoi-des-dunes'); choisir(d, 'joueur', 'convoi-des-dunes');
    assert.deepEqual(d.joueur.main, ['convoi-des-dunes']); assert.deepEqual(d.joueur.cimetiere, []);
  });
  test(`Veilleur mourant à la fin du tour détruit aussi son renfort (${moba ? 'MOBA' : 'Duel'})`, () => {
    const d = partie(moba), e = poser(d, 'joueur', 'veilleur-des-cendres');
    d.joueur.cimetiere = ['viking-des-neiges']; e.detruireFinDuTour = true;
    rpgFinDeTour(d); choisir(d, 'joueur', 'viking-des-neiges');
    assert.equal(d.joueur.creatures.length, 0); assert.ok(d.joueur.cimetiere.includes('viking-des-neiges'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Veilleur sans cible admissible ne sort aucune carte (${moba ? 'MOBA' : 'Duel'})`, () => {
    const d = partie(moba), e = poser(d, 'joueur', 'veilleur-des-cendres');
    d.joueur.cimetiere = ['djinn-des-braises-voilees', 'souverain-de-la-lune-noire', 'papyrus'];
    rpgBlesserCreature(d, 'joueur', e.id, 10);
    assert.equal(d.joueur.creatures.length, 0); assert.ok(d.joueur.cimetiere.includes('souverain-de-la-lune-noire'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}

for (const moba of [false, true]) test(`La place libérée par la mort accueille le renfort sur un terrain plein (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = partie(moba), e = poser(d, 'joueur', 'gardienne-des-derniers-noms', 0);
  const places = moba ? 4 : 5;
  for (let i = 1; i < places; i++) poser(d, 'joueur', 'chien-du-guet', i);
  d.joueur.deck = ['ouvrier-du-natron']; rpgBlesserCreature(d, 'joueur', e.id, 10);
  assert.equal(d.joueur.creatures.length, places); assert.ok(d.joueur.creatures.some(c => c.carteId === 'ouvrier-du-natron'));
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
