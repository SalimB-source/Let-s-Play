import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { RPG_ELEMENTS, cardById, effetLie } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgReglerHasard, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';

const spell = 'serment-de-la-forge';
function classique() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const side of ['joueur', 'sorcier']) d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 60]));
  return d;
}
function poser(d, side, id, options = {}) {
  const tour = d.tour; d.tour = side; d[side].invocationNormaleJouee = false; d[side].main.push(id);
  const r = rpgJouerCreature(d, side, id, null, options); d.tour = tour;
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function serment(d) {
  d.joueur.main.push(spell); const r = rpgLancerMagie(d, 'joueur', spell);
  assert.ok(r.ok, JSON.stringify(r));
}
test('Serment : fiche et Lien conservent le renfort sans donner Attaque ciblée', () => {
  const c = cardById(spell);
  assert.equal(c.effet.coupRapide, undefined); assert.equal(c.effet.coupCritique, .15);
  assert.equal(effetLie(c, true).atk, 3); assert.equal(effetLie(c, true).coupCritique, .15);
  assert.match(c.text, /Coup critique/); assert.doesNotMatch(c.text, /Attaque ciblée/);
  assert.ok(pastillesPourCarte(c).some(p => p.cle === 'coupCritique'));
  assert.match(rpgMobaCartePourApercu(c).text, /voie choisie/);
});
test('Serment : cumul, équipement, Attaque ciblée imprimée et expiration', () => {
  const d = classique(); const simple = poser(d, 'joueur', 'chien-du-guet');
  const native = poser(d, 'joueur', 'tislit-des-aures');
  const ennemi = poser(d, 'sorcier', 'chien-du-guet');
  serment(d);
  assert.deepEqual([simple.atk, simple.pv, simple.coupRapide], [4, 3, false]);
  assert.deepEqual(simple.coupCritique, { chance: .15, fois: 2 });
  assert.deepEqual(native.coupCritique, { chance: .3, fois: 2 }); assert.equal(native.coupRapide, true);
  assert.equal(ennemi.coupCritique, null);
  d.joueur.main.push('lance-de-la-lune-givree'); assert.ok(rpgJouerArme(d, 'joueur', 'lance-de-la-lune-givree', native.id).ok);
  assert.deepEqual(native.coupCritique, { chance: .45, fois: 2 });
  d.joueur.main.push('cuirasse-de-sel'); assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', native.id).ok);
  assert.deepEqual(native.coupCritique, { chance: .3, fois: 2 });
  rpgFinDeTour(d);
  assert.equal(simple.coupCritique, null); assert.deepEqual([simple.atk, simple.pv, simple.coupRapide], [2, 2, false]);
  assert.deepEqual(native.coupCritique, { chance: .15, fois: 2 }); assert.equal(native.coupRapide, true);
});
test('Serment : les sources multiples expirent sans perdre le multiplicateur ×4 imprimé', () => {
  const d = classique(); const offrande = poser(d, 'joueur', 'chien-du-guet');
  const a = poser(d, 'joueur', 'kagutsuchi-flamme-originelle', { sacrificeId: offrande.id });
  serment(d); serment(d);
  assert.deepEqual(a.coupCritique, { chance: .45, fois: 4 });
  rpgFinDeTour(d); assert.deepEqual(a.coupCritique, { chance: .15, fois: 4 });
});
for (const [jet, multiple] of [[.149, 2], [.15, 1]]) test(`Serment : tirage ${jet} en attaque directe`, () => {
  const d = classique(); const a = poser(d, 'joueur', 'chien-du-guet'); serment(d);
  a.ready = true; a.malInvocation = false; const pv = d.sorcier.pv; rpgReglerHasard(d, () => jet);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - 4 * multiple);
});
for (const side of ['joueur', 'sorcier']) test(`Serment MOBA : annonce, résolution par voie et expiration (${side})`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); d[side].main = ['chien-du-guet'];
  const a = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite; assert.ok(a);
  rpgFinDeTour(d); rpgFinDeTour(d);
  d[side].main = ['chien-du-guet']; const b = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'right', 0).entite; assert.ok(b);
  d[side].main = [spell];
  const r = rpgMobaLancerMagie(d, side, spell, null, 'left', null, { ouvrirReponse: true });
  assert.equal(r.sortEnAttente, true, JSON.stringify(r)); assert.equal(a.coupCritique, null); assert.equal(d.mobaSortEnAttente.laneId, 'left');
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; assert.ok(rpgMobaPasserSort(d, enemy).ok);
  assert.deepEqual(a.coupCritique, { chance: .15, fois: 2 }); assert.equal(a.coupRapide, false);
  assert.equal(a.atk, 4); assert.equal(b.atk, 2); assert.equal(b.coupCritique, null);
  rpgFinDeTour(d); assert.equal(a.coupCritique, null); assert.equal(a.atk, 2);
});
test('le critique temporaire figure sur le plateau et dans l’aperçu', async () => {
  const d = classique(); const a = poser(d, 'joueur', 'chien-du-guet'); serment(d);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const plateau = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: a, cote: 'joueur' }))).window.document;
    const preview = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: cardById(a.carteId), entite: a }))).window.document;
    assert.ok(plateau.querySelector('[data-effet="coupCritique"]'));
    assert.ok(preview.querySelector('[data-effet="coupCritique"]')); assert.match(preview.body.textContent, /Coup critique/);
  } finally { await vite.close(); }
});

for (const side of ['joueur', 'sorcier']) test(`Serment PvP : lancé par ${side}, critique puis expiration`, () => {
  const d = classique(); d.tour = side; const a = poser(d, side, 'chien-du-guet');
  d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d[side].main.push(spell);
  assert.ok(rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: spell }).ok);
  assert.deepEqual(a.coupCritique, { chance: .15, fois: 2 }); assert.equal(a.coupRapide, false);
  rpgFinDeTour(d); assert.equal(a.coupCritique, null);
});
test('Serment : un état sauvegardé conserve puis expire le bonus temporaire', () => {
  let d = classique(); const a = poser(d, 'joueur', 'tislit-des-aures'); serment(d);
  d = JSON.parse(JSON.stringify(d)); const recharge = d.joueur.creatures.find(e => e.id === a.id);
  assert.deepEqual(recharge.coupCritique, { chance: .3, fois: 2 });
  rpgFinDeTour(d); assert.deepEqual(recharge.coupCritique, { chance: .15, fois: 2 });
});

test('Serment : Daimyō améliore l’attaque sans modifier le critique prêté', () => {
  const d = classique(); const allie = poser(d, 'joueur', 'chien-du-guet');
  const sacrifice = poser(d, 'joueur', 'ashigaru-des-braises');
  poser(d, 'joueur', 'daimyo-du-soleil-rouge', { sacrificeId: sacrifice.id });
  const avant = allie.atk; serment(d);
  assert.equal(allie.atk, avant + 3); assert.deepEqual(allie.coupCritique, { chance: .15, fois: 2 });
});
test('Serment : le critique de l’arme demeure à la fin du tour', () => {
  const d = classique(); const a = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main.push('lance-de-la-lune-givree'); assert.ok(rpgJouerArme(d, 'joueur', 'lance-de-la-lune-givree', a.id).ok);
  serment(d); assert.deepEqual(a.coupCritique, { chance: .3, fois: 2 });
  rpgFinDeTour(d); assert.deepEqual(a.coupCritique, { chance: .15, fois: 2 }); assert.equal(a.coupRapide, true);
});

for (const side of ['joueur', 'sorcier']) test(`Serment MOBA : le critique prêté double l'attaque de ${side}`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); d[side].main = ['chien-du-guet', spell];
  const a = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite;
  assert.ok(a); assert.ok(rpgMobaLancerMagie(d, side, spell, null, 'left').ok);
  a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => .1);
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; const pv = mobaVoie(d.moba, 'left').hp[enemy];
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
  const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
  assert.ok(r.ok); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - 8);
  assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
});
