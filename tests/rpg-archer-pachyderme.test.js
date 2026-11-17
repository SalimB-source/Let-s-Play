import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardFrameInfo, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ID = 'archer-du-pachyderme-ardent';
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
function poser(d, mode, side, id, sacrificeIds = []) {
  d.tour = side; d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = mode === 'moba' ? rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds })
    : mode === 'pvp' ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: id, sacrificeIds })
      : rpgJouerCreature(d, side, id, null, { sacrificeIds });
  assert.ok(r.ok, JSON.stringify(r));
  const e = d[side].creatures.find(e => e.carteId === id); assert.ok(e);
  e.ready = true; e.malInvocation = false; return e;
}
function archer(d, mode, side) {
  const offrande = poser(d, mode, side, 'ashigaru-des-braises');
  return poser(d, mode, side, ID, [offrande.id]);
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

test('fiche jouable, hybride, capacités et illustration', () => {
  const c = cardById(ID); assert.ok(c); assert.ok(RPG_DUEL_CARDS.some(card => card.id === ID));
  assert.equal(c.kind, 'creature'); assert.equal(c.atk, 4); assert.equal(c.def, 8);
  assert.equal(c.cost, 6); assert.equal(c.rarity, 'rare'); assert.equal(sacrificesInvocation(c), 1);
  assert.deepEqual(new Set(cardColors(c)), new Set(['sable', 'braise']));
  assert.deepEqual(c.colorCost, { sable: 1, braise: 1 }); assert.equal(cardFrameInfo(c).key, 'hybride-braise-sable');
  assert.ok(carteJouableSansTerrain(c)); assert.ok(c.coupRapide);
  assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 }); assert.deepEqual(c.blocage, { chance: .15, def: 2 });
  for (const cle of ['coupRapide', 'coupCritique', 'blocage']) assert.ok(effetsDetailles(c).pastilles.find(p => p.cle === cle)?.description, cle);
  assert.match(c.text, /Attaque ciblée/); assert.match(c.text, /Coup critique/); assert.match(c.text, /Blocage/);
  const path = new URL(`../public/cards/${ID}.jpg`, import.meta.url); assert.ok(existsSync(path));
  const jpg = readFileSync(path); assert.equal(jpg[0], 0xff); assert.equal(jpg[1], 0xd8);
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) {
  test(`${mode} ${side} : attaque ciblée réussie et coup critique sans riposte ordinaire`, () => {
    const d = partie(mode), a = archer(d, mode, side), cible = poser(d, mode, autre(side), 'ashigaru-des-braises');
    cible.pv = cible.pvMax = cible.def = 20; cible.atk = 7; d.tour = side;
    const jets = [.9, .1]; rpgReglerHasard(d, () => jets.shift() ?? .9);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 12); assert.equal(a.pv, 8);
    assert.ok(d.combatAnimations.some(e => e.type === 'coup-critique' && e.entiteId === a.id && e.fois === 2));
    if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${mode} ${side} : attaque ciblée manquée ne produit pas de critique`, () => {
    const d = partie(mode), a = archer(d, mode, side), cible = poser(d, mode, autre(side), 'ashigaru-des-braises');
    d.tour = side; rpgReglerHasard(d, () => 0);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, cible.pvMax); assert.equal(a.pv, 8);
    assert.ok(!(d.combatAnimations ?? []).some(e => e.type === 'coup-critique' && e.entiteId === a.id));
  });
  for (const jet of [.149, .15]) test(`${mode} ${side} : Blocage au seuil ${jet} à l’annonce`, () => {
    const d = partie(mode), cible = archer(d, mode, autre(side)), a = poser(d, mode, side, 'ashigaru-des-braises');
    d.tour = side; rpgReglerHasard(d, () => jet);
    assert.ok(declarer(d, mode, side, a, cible).ok);
    assert.equal(cible.pvMax, jet < .15 ? 10 : 8);
    assert.ok(resoudre(d, mode, side).ok);
    if (mode === 'pvp') assert.deepEqual(rpgPvpVue(d, autre(side)).joueur.creatures.find(e => e.id === cible.id)?.blocage, { chance: .15, def: 2 });
  });
  test(`${mode} ${side} : coup critique direct ×2`, () => {
    const d = partie(mode), a = archer(d, mode, side), adv = autre(side); d.tour = side;
    const before = d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv;
    rpgReglerHasard(d, () => .1);
    assert.ok(declarer(d, mode, side, a).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv, before - 8);
  });
}

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) test(`${mode} ${side} : coup critique en défense`, () => {
  const d = partie(mode), cible = archer(d, mode, autre(side)), a = poser(d, mode, side, 'ashigaru-des-braises');
  a.pv = a.pvMax = a.def = 20; d.tour = side;
  const jets = [.9, .1]; rpgReglerHasard(d, () => jets.shift() ?? .9);
  assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
  assert.equal(a.pv, 12); assert.ok(d.combatAnimations.some(e => e.type === 'coup-critique' && e.entiteId === cible.id && e.fois === 2));
});

test('MOBA : la carte figure dans le catalogue de construction audité', async () => {
  const { MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } = await import('../src/games/rpgMobaLocal.js');
  const { RPG_DECKS_THEMATIQUES } = await import('../src/games/rpgDecksThematiques.js');
  assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
  const deck = RPG_DECKS_THEMATIQUES.find(deck => deck.elements.length === 2 && deck.elements.includes('sable') && deck.elements.includes('braise'));
  assert.ok(deck); const cardIds = [...deck.cardIds]; cardIds[0] = ID;
  assert.deepEqual(rpgMobaValiderDeck({ ...deck, cardIds }), { ok: true });
});

test('l’illustration et les trois pierres apparaissent sur les cartes et les aperçus', async () => {
  const { createServer } = await import('vite');
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { JSDOM } = await import('jsdom');
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardArt } = await vite.ssrLoadModule('/src/games/rpgCardArt.js');
    assert.match(cardArt(ID), /cards\/archer-du-pachyderme-ardent\.jpg/);
    const d = partie('classique'), a = archer(d, 'classique', 'joueur'), c = cardById(ID);
    for (const moba of [null, { className: 'moba__slot' }]) {
      const doc = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: a, cote: 'joueur', moba }))).window.document;
      for (const cle of ['coupRapide', 'coupCritique', 'blocage']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
      assert.match(doc.body.innerHTML, /archer-du-pachyderme-ardent\.jpg/);
    }
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: c, entite: a }))).window.document;
    for (const cle of ['coupRapide', 'coupCritique', 'blocage']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
    assert.match(doc.body.textContent, /Archer du pachyderme ardent/);
  } finally { await vite.close(); }
});
