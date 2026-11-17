import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardFrameInfo, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

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

test('fiche 2/3, coût 3, Sable et Braise, avec ses trois capacités et son illustration', () => {
  const c = cardById(ID); assert.ok(c && RPG_DUEL_CARDS.some(carte => carte.id === ID));
  assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['creature', 3, 2, 3]);
  assert.deepEqual(new Set(cardColors(c)), new Set(['sable', 'braise']));
  assert.deepEqual(c.colorCost, { sable: 1, braise: 1 }); assert.equal(cardFrameInfo(c).key, 'hybride-braise-sable');
  assert.equal(sacrificesInvocation(c), 0); assert.ok(carteJouableSansTerrain(c));
  assert.equal(c.coupRapide, true); assert.equal(c.defenseur, true); assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
  assert.notEqual(c.rapidite, true); assert.notEqual(c.volDeVie, true);
  for (const cle of ['coupRapide', 'coupCritique', 'defenseur']) assert.ok(effetsDetailles(c).pastilles.find(p => p.cle === cle)?.description, cle);
  assert.match(c.text, /Attaque ciblée/); assert.match(c.text, /Coup critique/); assert.match(c.text, /Défenseur/);
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) {
  test(`${mode} ${side} : attaque ciblée critique ×2 sans riposte`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'ashigaru-des-braises'), a = poser(d, mode, side, ID);
    cible.pv = cible.pvMax = cible.def = 20; cible.atk = 7; d.tour = side;
    const jets = [.9, .1]; rpgReglerHasard(d, () => jets.shift() ?? .9);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, 16); assert.equal(a.pv, 3);
    assert.ok(d.combatAnimations.some(e => e.type === 'coup-critique' && e.entiteId === a.id && e.fois === 2));
    if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${mode} ${side} : attaque ciblée manquée, sans critique`, () => {
    const d = partie(mode), cible = poser(d, mode, autre(side), 'ashigaru-des-braises'), a = poser(d, mode, side, ID);
    d.tour = side; rpgReglerHasard(d, () => 0);
    assert.ok(declarer(d, mode, side, a, cible).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(cible.pv, cible.pvMax); assert.equal(a.pv, 3);
    assert.ok(!(d.combatAnimations ?? []).some(e => e.type === 'coup-critique' && e.entiteId === a.id));
  });
  for (const jet of [.249, .25]) test(`${mode} ${side} : critique en défense au seuil ${jet}`, () => {
    const d = partie(mode), gardienne = poser(d, mode, autre(side), ID), attaquant = poser(d, mode, side, 'ashigaru-des-braises');
    attaquant.pv = attaquant.pvMax = attaquant.def = 20; d.tour = side; rpgReglerHasard(d, () => jet);
    assert.ok(declarer(d, mode, side, attaquant, gardienne).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(attaquant.pv, jet < .25 ? 16 : 18);
    assert.equal((d.combatAnimations ?? []).some(e => e.type === 'coup-critique' && e.entiteId === gardienne.id), jet < .25);
  });
  test(`${mode} ${side} : Défenseur impose sa priorité aux attaquants adverses`, () => {
    const d = partie(mode), gardienne = poser(d, mode, autre(side), ID, 0);
    const allie = poser(d, mode, autre(side), 'ashigaru-des-braises', 1);
    const attaquant = poser(d, mode, side, 'ashigaru-des-braises'); d.tour = side;
    const cibles = d.moba ? rpgMobaCiblesIndividuelles(d, side, attaquant.id) : rpgCiblesIndividuellesClassique(d, side, attaquant.id);
    assert.deepEqual(cibles, { cibles: [gardienne.id], directe: false });
    assert.equal(declarer(d, mode, side, attaquant, allie).ok, false);
    assert.equal(declarer(d, mode, side, attaquant).ok, false);
    assert.ok(declarer(d, mode, side, attaquant, gardienne).ok);
    assert.ok(resoudre(d, mode, side).ok);
  });
  test(`${mode} ${side} : critique direct contre l’adversaire`, () => {
    const d = partie(mode), a = poser(d, mode, side, ID), adv = autre(side);
    const avant = d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv;
    rpgReglerHasard(d, () => .1);
    assert.ok(declarer(d, mode, side, a).ok); assert.ok(resoudre(d, mode, side).ok);
    assert.equal(d.moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv, avant - 4);
  });
}

test('la chevalière est disponible dans un deck hybride MOBA', () => {
  assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
  const deck = RPG_DECKS_THEMATIQUES.find(d => d.elements.length === 2 && d.elements.includes('sable') && d.elements.includes('braise'));
  assert.ok(deck); const cardIds = [...deck.cardIds]; cardIds[0] = ID;
  assert.deepEqual(rpgMobaValiderDeck({ ...deck, cardIds }), { ok: true });
});

test('les trois pierres et son illustration figurent sur table et aperçu', async () => {
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
      for (const cle of ['coupRapide', 'coupCritique', 'defenseur']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
      assert.match(doc.body.innerHTML, /chevaliere-du-baton-sacre\.jpg/);
    }
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: c, entite: a }))).window.document;
    for (const cle of ['coupRapide', 'coupCritique', 'defenseur']) assert.ok(doc.querySelector(`[data-effet="${cle}"]`), cle);
    assert.match(doc.body.textContent, /Chevalière du bâton sacré/);
  } finally { await vite.close(); }
});

for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) test(`${mode} ${side} : Défenseur protège aussi contre l’Attaque ciblée`, () => {
  const d = partie(mode), gardienne = poser(d, mode, autre(side), ID, 0);
  const allie = poser(d, mode, autre(side), 'ashigaru-des-braises', 1);
  const attaquant = poser(d, mode, side, 'djinn-de-foudre');
  d.tour = side;
  const cibles = d.moba ? rpgMobaCiblesIndividuelles(d, side, attaquant.id) : rpgCiblesIndividuellesClassique(d, side, attaquant.id);
  assert.deepEqual(cibles, { cibles: [gardienne.id], directe: false });
  assert.equal(declarer(d, mode, side, attaquant, allie).ok, false);
  assert.ok(declarer(d, mode, side, attaquant, gardienne).ok);
});
