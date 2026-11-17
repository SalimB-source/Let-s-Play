import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgReglerHasard, rpgJouerArme, rpgLancerMagie, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';

import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ids = ['hatamoto-des-cendres', 'tojiro-le-pourfendeur'];
function duelTest() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  return d;
}
function jouer(d, cote, id) {
  const tour = d.tour; d.tour = cote;
  let sacrificeId = null;
  if (id === 'tojiro-le-pourfendeur') {
    sacrificeId = jouer(d, cote, 'chien-du-guet').id;
    d[cote].invocationNormaleJouee = false; // offrande posée au tour précédent
  }
  d[cote].main.push(id);
  const r = rpgJouerCreature(d, cote, id, null, { sacrificeId });
  d.tour = tour;
  assert.ok(r.ok, `${id}: ${JSON.stringify(r)}`);
  return r.entite;
}
for (const id of ids) {
  test(`${id} : fiche, entité et équipement conservent le critique`, () => {
    const fiche = cardById(id);
    assert.deepEqual(fiche.coupCritique, { chance: .25, fois: 2 });
    assert.match(fiche.text, /Coup critique.*25 %.*doubler/);
    assert.ok(pastillesPourCarte(fiche).some(p => p.cle === 'coupCritique'));
    assert.equal(fiche.honneur, 1);
    const d = duelTest(); const a = jouer(d, 'joueur', id);
    assert.deepEqual(a.coupCritique, fiche.coupCritique);
    d.joueur.main.push('lance-de-la-lune-givree');
    assert.ok(rpgJouerArme(d, 'joueur', 'lance-de-la-lune-givree', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .5, fois: 2 });
    d.joueur.main.push('cuirasse-de-sel');
    assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .25, fois: 2 });
  });
  for (const [jet, multiple] of [[.249, 2], [.25, 1]]) {
    test(`${id} : attaque directe classique au seuil ${jet}`, () => {
      const d = duelTest(); const a = jouer(d, 'joueur', id);
      a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => jet);
      const pv = d.sorcier.pv;
      assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
      const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
      assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - a.atk * multiple);
      assert.equal(r.resume.critiques.length, multiple === 2 ? 1 : 0);
    });
  }
  test(`${id} : critique en blocage en combat classique collectif`, () => {
    const d = duelTest(); const a = jouer(d, 'joueur', 'chien-du-guet');
    const b = jouer(d, 'sorcier', id); a.ready = true; a.malInvocation = false;
    a.pv = a.pvMax = a.def = 20; b.pv = b.pvMax = b.def = 20;
    const jets = [.1, .5]; // critique du bloqueur, puis éventuelle Esquive de Tojiro
    rpgReglerHasard(d, () => jets.shift() ?? .5);
    const r = rpgLancerAttaque(d, 'joueur', [a.id], { [a.id]: b.id });
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(a.pv, 20 - b.atk * 2);
    assert.ok(r.resume.critiques.some(c => c.entiteId === b.id && c.fois === 2));
  });
}

for (const id of ids) for (const side of ['joueur', 'sorcier']) {
  test(`${id} : critique direct MOBA pour ${side}`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (d.tour !== side) rpgFinDeTour(d);
    d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
    let sacrificeIds = [];
    if (id === 'tojiro-le-pourfendeur') {
      d[side].main = ['chien-du-guet'];
      const victime = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite;
      assert.ok(victime); sacrificeIds = [victime.id]; rpgFinDeTour(d); rpgFinDeTour(d);
    }
    d[side].main = [id];
    const pose = rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds });
    assert.ok(pose.ok, JSON.stringify(pose)); const a = pose.entite;
    a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => .1);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; const pv = mobaVoie(d.moba, 'left').hp[enemy];
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
    const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - 2 * a.atk);
    assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
  });
}

for (const id of ids) {
  test(`${id} : critique dans l'échange individuel classique`, () => {
    const d = duelTest(); const a = jouer(d, 'joueur', id);
    const b = jouer(d, 'sorcier', 'chien-du-guet');
    a.ready = true; a.malInvocation = false; a.pv = a.pvMax = a.def = 20; b.pv = b.pvMax = b.def = 20;
    const jets = [.1, .5]; rpgReglerHasard(d, () => jets.shift() ?? .5);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, b.id).ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(b.pv, 20 - 2 * a.atk);
    assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
  });
}

test('Tojiro conserve une Contre-attaque distincte du critique de combat', () => {
  const d = duelTest(); jouer(d, 'sorcier', 'tojiro-le-pourfendeur');
  d.joueur.main.push('trait-de-braise'); const pv = d.joueur.pv;
  rpgReglerHasard(d, () => 0); // Esquive réussie, sans critique sur la riposte de capacité
  const tojiro = d.sorcier.creatures[0];
  assert.ok(rpgLancerMagie(d, 'joueur', 'trait-de-braise', tojiro.id).ok);
  assert.equal(tojiro.pv, 5); assert.equal(d.joueur.pv, pv - 5);
});
