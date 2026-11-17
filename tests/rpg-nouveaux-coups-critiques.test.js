import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { effetsDetailles, pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgReglerHasard, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ids = ['ureus-du-seuil', 'tislit-des-aures', 'archere-viking-du-givre'];
function classique(id, side = 'joueur') {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  duel.tour = side; duel[side].main.push(id);
  const pose = rpgJouerCreature(duel, side, id);
  assert.ok(pose.ok, JSON.stringify(pose));
  const a = pose.entite; a.ready = true; a.malInvocation = false;
  return { duel, a };
}

for (const id of ids) {
  test(`${id} : coup critique imprimé, pastille et ancienne Attaque ciblée`, () => {
    const carte = cardById(id);
    assert.deepEqual(carte.coupCritique, { chance: .25, fois: 2 });
    assert.equal(carte.coupRapide, true);
    assert.ok(pastillesPourCarte(carte).some(p => p.cle === 'coupCritique'));
    assert.match(effetsDetailles(carte).pastilles.find(p => p.cle === 'coupCritique').description, /25 %.*doubler.*créature ou l’adversaire/);
    assert.deepEqual(classique(id).a.coupCritique, { chance: .25, fois: 2 });
  });
  for (const [rng, multiple] of [[.249, 2], [.25, 1]]) {
    test(`${id} : critique classique contre le sorcier (tirage ${rng})`, () => {
      const { duel, a } = classique(id); const pv = duel.sorcier.pv;
      rpgReglerHasard(duel, () => rng);
      assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'joueur', a.id).ok);
      const r = rpgResoudreAttaqueIndividuelleClassique(duel, 'joueur');
      assert.ok(r.ok); assert.equal(duel.sorcier.pv, pv - a.atk * multiple);
      assert.equal(r.resume.critiques.length, multiple === 2 ? 1 : 0);
      if (multiple === 2) assert.equal(r.resume.critiques[0].fois, 2);
    });
  }
  test(`${id} : attaque ciblée touche puis applique le critique à une créature`, () => {
    const { duel, a } = classique(id);
    duel.sorcier.creatures.push({ id: 'cible', carteId: 'chien-du-guet', name: 'Chien', atk: 2, def: 20, pv: 20, pvMax: 20, ready: true });
    // Attaque ciblée : réussite, gel (Archère uniquement), puis critique.
    const jets = id === 'archere-viking-du-givre' ? [.9, .9, .1] : [.9, .1];
    rpgReglerHasard(duel, () => jets.shift() ?? .9);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'joueur', a.id, 'cible').ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(duel, 'joueur');
    assert.ok(r.ok); assert.equal(duel.sorcier.creatures[0].pv, 20 - a.atk * 2);
    assert.equal(r.resume.critiques[0].fois, 2);
  });
  for (const side of ['joueur', 'sorcier']) {
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    test(`${id} : critique direct MOBA pour ${side}`, () => {
      const deck = Array(30).fill('ashigaru-des-braises');
      const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
      assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
      if (d.tour !== side) rpgFinDeTour(d);
      d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); d[side].main = [id];
      const pose = rpgMobaJouerCreature(d, side, id, 'left', 0);
      assert.ok(pose.ok, JSON.stringify(pose));
      const a = pose.entite; a.ready = true; a.malInvocation = false;
      rpgReglerHasard(d, () => .1); const hp = mobaVoie(d.moba, 'left').hp[enemy];
      assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
      const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
      assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], hp - a.atk * 2);
      assert.equal(r.resume.critiques[0].fois, 2);
    });
  }
}

test('un équipement critique cumule sa chance sans effacer le critique imprimé', () => {
  for (const id of ids) {
    const { duel, a } = classique(id); duel.joueur.main.push('lance-de-la-lune-givree');
    assert.ok(rpgJouerArme(duel, 'joueur', 'lance-de-la-lune-givree', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .5, fois: 2 });
    duel.joueur.main.push('cuirasse-de-sel');
    assert.ok(rpgJouerArme(duel, 'joueur', 'cuirasse-de-sel', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .25, fois: 2 });
  }
});

test('les cartes et aperçus Duel et MOBA affichent le coup critique', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    for (const id of ids) {
      const carte = cardById(id); const { a } = classique(id);
      for (const moba of [null, { className: 'moba__slot' }]) {
        const doc = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: a, cote: 'joueur', moba }))).window.document;
        assert.ok(doc.querySelector('[data-effet="coupCritique"]'), `${id} sur le plateau`);
      }
      const preview = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte, entite: a }))).window.document;
      assert.ok(preview.querySelector('[data-effet="coupCritique"]'), `${id} en aperçu`);
      assert.match(preview.body.textContent, /Coup critique/);
    }
  } finally { await vite.close(); }
});
