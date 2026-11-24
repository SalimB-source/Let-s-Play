import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, armeById, cardColors, cardFrameInfo, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgArmeCompatible } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';
import { ligneObligee, ligneDe, RPG_LIGNE_FOND } from '../src/games/rpgLignes.js';

const ID = 'chevaliere-du-baton-sacre';
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
function poser(d, mode, side, id, slot = 0) {
  d.tour = side; d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = mode === 'moba' ? rpgMobaJouerCreature(d, side, id, 'left', slot)
    : mode === 'pvp' ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: id })
      : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r));
  const e = d[side].creatures.find(e => e.carteId === id && e.id === (r.entite?.id ?? e.id)); assert.ok(e);
  e.ready = true; e.malInvocation = false; return e;
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

test('fiche : tireuse sans Défenseur, capacités et caractéristiques conservées', () => {
  const c = cardById(ID); assert.ok(c && RPG_DUEL_CARDS.some(carte => carte.id === ID));
  assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['creature', 3, 2, 3]);
  assert.deepEqual(new Set(cardColors(c)), new Set(['sable', 'braise']));
  assert.deepEqual(c.colorCost, { sable: 1, braise: 1 }); assert.equal(cardFrameInfo(c).key, 'hybride-braise-sable');
  assert.equal(sacrificesInvocation(c), 0); assert.ok(carteJouableSansTerrain(c));
  assert.equal(c.distance, true); assert.equal(estDefenseur(c), false); assert.notEqual(c.coupRapide, true);
  assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
  assert.deepEqual(c.blocage, { chance: .25, def: 2 });
  assert.deepEqual(c.bonusContreElement, { element: 'tenebres', amount: 1 });
  for (const cle of ['coupCritique', 'blocage']) assert.ok(effetsDetailles(c).pastilles.find(p => p.cle === cle)?.description, cle);
  assert.ok(!effetsDetailles(c).pastilles.some(p => p.cle === 'defenseur'));
  assert.match(c.text, /À distance/); assert.match(c.text, /Coup critique/); assert.doesNotMatch(c.text, /Défenseur/);
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
});

test('elle se pose au fond et utilise les armes à distance', () => {
  const d = partie('classique'); d.lignes = true;
  const e = poser(d, 'classique', 'joueur', ID);
  assert.equal(ligneObligee(cardById(ID)), RPG_LIGNE_FOND);
  assert.equal(ligneDe(e), RPG_LIGNE_FOND);
  assert.equal(rpgArmeCompatible(armeById('javelot-du-beffroi'), e), true);
  assert.equal(rpgArmeCompatible(armeById('takouba-des-pistes'), e), false);
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) {
  test(`${mode} ${side} : entité à distance sans priorité Défenseur`, () => {
    const d = partie(mode), chevaliere = poser(d, mode, autre(side), ID, 0);
    const allie = poser(d, mode, autre(side), 'viking-des-neiges', 1);
    const attaquant = poser(d, mode, side, 'viking-des-neiges'); d.tour = side;
    assert.equal(chevaliere.distance, true);
    assert.equal(estDefenseur(chevaliere), false);
    assert.deepEqual(chevaliere.blocage, { chance: .25, def: 2 });
    assert.deepEqual(chevaliere.coupCritique, { chance: .25, fois: 2 });
    const cibles = d.moba ? rpgMobaCiblesIndividuelles(d, side, attaquant.id) : rpgCiblesIndividuellesClassique(d, side, attaquant.id);
    assert.ok(cibles.cibles.includes(allie.id), 'un allié accessible reste ciblable');
    assert.ok(declarer(d, mode, side, attaquant, allie).ok, 'la chevalière n’impose pas sa priorité');
    if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${mode} ${side} : même une Attaque ciblée peut viser une autre créature`, () => {
    const d = partie(mode), chevaliere = poser(d, mode, autre(side), ID, 0);
    const allie = poser(d, mode, autre(side), 'viking-des-neiges', 1);
    const attaquant = poser(d, mode, side, 'viking-des-neiges');
    attaquant.coupRapide = true; d.tour = side;
    const cibles = d.moba ? rpgMobaCiblesIndividuelles(d, side, attaquant.id) : rpgCiblesIndividuellesClassique(d, side, attaquant.id);
    assert.ok(cibles.cibles.includes(allie.id)); assert.ok(cibles.cibles.includes(chevaliere.id));
    assert.ok(declarer(d, mode, side, attaquant, allie).ok);
  });
  test(`${mode} ${side} : Blocage de la chevalière fonctionne toujours`, () => {
    const d = partie(mode), chevaliere = poser(d, mode, autre(side), ID);
    const attaquant = poser(d, mode, side, 'viking-des-neiges'); d.tour = side;
    rpgReglerHasard(d, () => 0);
    assert.ok(declarer(d, mode, side, attaquant, chevaliere).ok);
    assert.equal(chevaliere.pv, 5); assert.equal(chevaliere.pvMax, 5);
    assert.ok(resoudre(d, mode, side).ok);
  });
  test(`${mode} ${side} : le bonus contre Ténèbres est conservé`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'chacal-du-seuil'), a = poser(d, mode, side, ID);
    cible.pv = cible.pvMax = cible.def = 20; d.tour = side;
    rpgReglerHasard(d, () => .9);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 17);
  });
  test(`${mode} ${side} : le tir peut toucher sans riposte de mêlée`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'viking-des-neiges'), a = poser(d, mode, side, ID);
    cible.pv = cible.pvMax = cible.def = 20; cible.atk = 7; d.tour = side;
    rpgReglerHasard(d, () => .9);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 18); assert.equal(a.pv, 3);
  });
  test(`${mode} ${side} : coup critique sur un tir réussi`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'viking-des-neiges'), a = poser(d, mode, side, ID);
    cible.pv = cible.pvMax = cible.def = 20; cible.atk = 0; d.tour = side;
    const jets = [.9, .1]; rpgReglerHasard(d, () => jets.shift() ?? .9);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 16);
    assert.ok(d.combatAnimations.some(e => e.type === 'coup-critique' && e.entiteId === a.id && e.fois === 2));
  });
  test(`${mode} ${side} : tir direct critique`, () => {
    const d = partie(mode), a = poser(d, mode, side, ID), adv = autre(side);
    const avant = d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv;
    rpgReglerHasard(d, () => .1);
    assert.ok(declarer(d, mode, side, a).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv, avant - 4);
  });
  test(`${mode} ${side} : un tir peut rater`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'viking-des-neiges'), a = poser(d, mode, side, ID);
    cible.pv = cible.pvMax = cible.def = 20; d.tour = side;
    rpgReglerHasard(d, () => 0);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 20); assert.equal(a.pv, 3);
  });
}

test('la chevalière est disponible dans un deck hybride MOBA', () => {
  assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
  const deck = RPG_DECKS_THEMATIQUES.find(d => d.elements.length === 2 && d.elements.includes('sable') && d.elements.includes('braise'));
  assert.ok(deck); const cardIds = [...deck.cardIds]; cardIds[0] = ID;
  assert.deepEqual(rpgMobaValiderDeck({ ...deck, cardIds }), { ok: true });
});

test('la table et l’aperçu montrent les capacités conservées, sans Défenseur', async () => {
  const { createServer } = await import('vite'); const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server'); const { JSDOM } = await import('jsdom');
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardArt } = await vite.ssrLoadModule('/src/games/rpgCardArt.js');
    assert.match(cardArt(ID), /cards\/chevaliere-du-baton-sacre\.jpg/);
    const a = poser(partie('classique'), 'classique', 'joueur', ID), c = cardById(ID);
    for (const moba of [null, { className: 'moba__slot' }]) {
      const doc = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: a, cote: 'joueur', moba }))).window.document;
      for (const cle of ['coupCritique', 'blocage']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
      assert.equal(doc.querySelector('[data-effet="defenseur"]'), null);
      assert.ok(doc.querySelector('[data-stat-icon="arc"][data-stat-arc="distance"]'));
      assert.match(doc.body.innerHTML, /chevaliere-du-baton-sacre\.jpg/);
    }
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: c, entite: a }))).window.document;
    for (const cle of ['coupCritique', 'blocage']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
    assert.equal(doc.querySelector('[data-effet="defenseur"]'), null);
    assert.ok(doc.querySelector('[data-stat-icon="arc"][data-stat-arc="distance"]'));
    assert.match(doc.body.textContent, /Chevalière à l’arbalète/);
  } finally { await vite.close(); }
});
