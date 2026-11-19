import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardFrameInfo, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgPeutAttaquer, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ID = 'chevalier-sacre-des-braises';
const autre = side => side === 'joueur' ? 'sorcier' : 'joueur';
function partie(mode) {
  const deck = Array(30).fill('chercheuse-des-armes-ensevelies');
  const d = (mode === 'moba' ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: deck, sorcierDeck: deck, modeMana: 'essai', pvp: mode === 'pvp', rng: () => .9 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur', 'sorcier']) {
    d[side].main = []; d[side].deck = []; d[side].manaChoixEnAttente = null;
    d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  }
  return d;
}
function poser(d, mode, side, id) {
  d.tour = side; d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = mode === 'moba' ? rpgMobaJouerCreature(d, side, id, 'left', 0)
    : mode === 'pvp' ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: id })
      : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r));
  const e = d[side].creatures.find(e => e.carteId === id); assert.ok(e); return e;
}
function declarer(d, mode, side, a, cible = null) {
  return mode === 'moba' ? rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, cible?.id ?? null, 'left')
    : mode === 'pvp' ? rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [a.id], cibleId: cible?.id ?? null })
      : rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, cible?.id ?? null);
}
function resoudre(d, mode, side) {
  return mode === 'moba' ? rpgMobaResoudreAttaqueIndividuelle(d, side)
    : mode === 'pvp' ? rpgPvpAppliquer(d, autre(side), { type: 'bloquer', blocages: {} })
      : rpgResoudreAttaqueIndividuelleClassique(d, side);
}
const pv = (d, side) => d.moba ? mobaVoie(d.moba, 'left').hp[side] : d[side].pv;
function fixerPv(d, side, valeur) { if (d.moba) mobaVoie(d.moba, 'left').hp[side] = valeur; else d[side].pv = valeur; }

test('fiche 4/3, coût 4, hybride et trois capacités jouables', () => {
  const c = cardById(ID); assert.ok(c); assert.ok(RPG_DUEL_CARDS.some(card => card.id === ID));
  // Rééquilibrage : 4/3 — l'ATQ 4 reste (elle porte le critique et le vol de vie).
  assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['creature', 4, 4, 3]);
  assert.deepEqual(new Set(cardColors(c)), new Set(['sable', 'braise']));
  assert.deepEqual(c.colorCost, { sable: 1, braise: 1 }); assert.equal(cardFrameInfo(c).key, 'hybride-braise-sable');
  assert.equal(sacrificesInvocation(c), 0); assert.ok(carteJouableSansTerrain(c));
  assert.equal(c.rapidite, true); assert.equal(c.volDeVie, true); assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
  for (const cle of ['rapidite', 'volDeVie', 'coupCritique']) assert.ok(effetsDetailles(c).pastilles.find(p => p.cle === cle)?.description, cle);
  assert.match(c.text, /Rapidité/); assert.match(c.text, /Vol de vie/); assert.match(c.text, /Coup critique/);
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) for (const [jet, multiplicateur] of [[.249, 2], [.25, 1]]) test(`${mode} ${side} : attaque immédiate, critique ${jet} et vol de vie`, () => {
  const d = partie(mode), a = poser(d, mode, side, ID), adv = autre(side);
  assert.ok(a.rapidite && a.volDeVie && rpgPeutAttaquer(a));
  assert.deepEqual([a.atk, a.pv], [4, 3], 'ATQ 4, corps 3');
  fixerPv(d, side, 10); const before = pv(d, adv); rpgReglerHasard(d, () => jet);
  assert.ok(declarer(d, mode, side, a).ok); assert.ok(resoudre(d, mode, side).ok);
  assert.equal(pv(d, adv), before - 4 * multiplicateur);
  assert.equal(pv(d, side), 10 + 2 * multiplicateur);
  const signaux = (d.combatAnimations ?? []).filter(e => e.type === 'coup-critique' && e.entiteId === a.id);
  assert.equal(signaux.length, multiplicateur === 2 ? 1 : 0);
  if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  if (mode === 'pvp') assert.deepEqual(rpgPvpVue(d, side).joueur.creatures.find(e => e.id === a.id)?.coupCritique, { chance: .25, fois: 2 });
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) test(`${mode} ${side} : critique et vol de vie lorsque le chevalier se défend`, () => {
  const d = partie(mode), defenseur = poser(d, mode, autre(side), ID), attaquant = poser(d, mode, side, 'ashigaru-des-braises');
  attaquant.ready = true; attaquant.malInvocation = false; attaquant.pv = attaquant.pvMax = attaquant.def = 20; d.tour = side;
  fixerPv(d, autre(side), 10); rpgReglerHasard(d, () => .1);
  assert.ok(declarer(d, mode, side, attaquant, defenseur).ok); assert.ok(resoudre(d, mode, side).ok);
  assert.equal(attaquant.pv, 12); assert.equal(pv(d, autre(side)), 14);
  assert.ok(d.combatAnimations.some(e => e.type === 'coup-critique' && e.entiteId === defenseur.id));
});

test('la carte figure dans un deck hybride compatible MOBA', () => {
  assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
  const deck = RPG_DECKS_THEMATIQUES.find(d => d.elements.length === 2 && d.elements.includes('sable') && d.elements.includes('braise'));
  assert.ok(deck); const cardIds = [...deck.cardIds]; cardIds[0] = ID;
  assert.deepEqual(rpgMobaValiderDeck({ ...deck, cardIds }), { ok: true });
});

test('table, MOBA et aperçu présentent les trois pierres et l’illustration', async () => {
  const { createServer } = await import('vite'); const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server'); const { JSDOM } = await import('jsdom');
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardArt } = await vite.ssrLoadModule('/src/games/rpgCardArt.js');
    assert.match(cardArt(ID), /cards\/chevalier-sacre-des-braises\.jpg/);
    const a = poser(partie('classique'), 'classique', 'joueur', ID), c = cardById(ID);
    for (const moba of [null, { className: 'moba__slot' }]) {
      const doc = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: a, cote: 'joueur', moba }))).window.document;
      for (const cle of ['rapidite', 'volDeVie', 'coupCritique']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
      assert.match(doc.body.innerHTML, /chevalier-sacre-des-braises\.jpg/);
    }
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: c, entite: a }))).window.document;
    for (const cle of ['rapidite', 'volDeVie', 'coupCritique']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
    assert.match(doc.body.textContent, /Chevalier sacré des braises/);
  } finally { await vite.close(); }
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) test(`${mode} ${side} : les blessures à une créature critique soignent le bon camp`, () => {
  const d = partie(mode), adversaire = poser(d, mode, autre(side), 'ashigaru-des-braises');
  adversaire.pv = adversaire.pvMax = adversaire.def = 20; adversaire.atk = 1;
  const a = poser(d, mode, side, ID); fixerPv(d, side, 10); rpgReglerHasard(d, () => .1);
  assert.ok(declarer(d, mode, side, a, adversaire).ok); assert.ok(resoudre(d, mode, side).ok);
  assert.equal(adversaire.pv, 12); assert.equal(a.pv, 2); assert.equal(pv(d, side), 14);
});

for (const mode of ['classique', 'pvp', 'moba']) test(`${mode} : le Vol de vie arrondit une blessure impaire au supérieur`, () => {
  const d = partie(mode), a = poser(d, mode, 'joueur', ID); a.atk = 3;
  fixerPv(d, 'joueur', 10); rpgReglerHasard(d, () => .9);
  assert.ok(declarer(d, mode, 'joueur', a).ok); assert.ok(resoudre(d, mode, 'joueur').ok);
  assert.equal(pv(d, 'joueur'), 12);
});
