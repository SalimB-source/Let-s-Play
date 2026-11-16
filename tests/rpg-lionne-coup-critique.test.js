import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerAttaque, rpgReglerHasard, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const id = 'lionne-du-midi-ardent';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const side of ['joueur', 'sorcier']) d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  return d;
}
function poser(d, side, carte, cible = null, options = {}) {
  const tour = d.tour; d.tour = side; d[side].main.push(carte);
  const r = rpgJouerCreature(d, side, carte, cible, options); d.tour = tour;
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function lionne(d, side = 'joueur', cible = null) {
  const offrande = poser(d, side, 'chien-du-guet');
  d[side].invocationNormaleJouee = false; // offrande du tour précédent
  return poser(d, side, id, cible, { sacrificeId: offrande.id });
}
test('Lionne : fiche, pastille et souffle à l’arrivée inchangé', () => {
  const c = cardById(id); assert.deepEqual(c.coupCritique, { chance: .15, fois: 2 });
  assert.ok(pastillesPourCarte(c).some(p => p.cle === 'coupCritique'));
  assert.match(c.text, /Coup critique.*15 %.*doubler/);
  assert.equal(c.rapidite, true); assert.deepEqual(c.protection.contre, ['eau', 'neige']);
  const d = duel(); const cible = poser(d, 'sorcier', 'chien-du-guet'); cible.pv = cible.def = cible.pvMax = 20;
  rpgReglerHasard(d, () => 0); const a = lionne(d, 'joueur', cible.id);
  assert.deepEqual(a.coupCritique, c.coupCritique); assert.equal(cible.pv, 16);
  d.joueur.main.push('lance-de-la-lune-givree'); assert.ok(rpgJouerArme(d, 'joueur', 'lance-de-la-lune-givree', a.id).ok);
  assert.deepEqual(a.coupCritique, { chance: .3, fois: 2 });
  d.joueur.main.push('cuirasse-de-sel'); assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', a.id).ok);
  assert.deepEqual(a.coupCritique, { chance: .15, fois: 2 });
});
for (const [jet, multiple] of [[.149, 2], [.15, 1]]) test(`Lionne : attaque directe classique au seuil ${jet}`, () => {
  const d = duel(); const a = lionne(d); a.ready = true; a.malInvocation = false;
  const pv = d.sorcier.pv; rpgReglerHasard(d, () => jet);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - 4 * multiple);
  assert.equal(r.resume.critiques.length, multiple === 2 ? 1 : 0);
});
test('Lionne : critique au blocage en combat collectif', () => {
  const d = duel(); const b = lionne(d, 'sorcier'); const a = poser(d, 'joueur', 'chien-du-guet');
  a.ready = true; a.malInvocation = false; a.pv = a.pvMax = a.def = 20;
  rpgReglerHasard(d, () => .1);
  const r = rpgLancerAttaque(d, 'joueur', [a.id], { [a.id]: b.id });
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(a.pv, 12);
  assert.ok(r.resume.critiques.some(c => c.entiteId === b.id && c.fois === 2));
});
for (const side of ['joueur', 'sorcier']) test(`Lionne : critique direct MOBA pour ${side}`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30])); d[side].main = ['chien-du-guet'];
  const offrande = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite; assert.ok(offrande);
  rpgFinDeTour(d); rpgFinDeTour(d); d[side].main = [id];
  const pose = rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds: [offrande.id] });
  assert.ok(pose.ok, JSON.stringify(pose)); const a = pose.entite; a.ready = true; a.malInvocation = false;
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; const pv = mobaVoie(d.moba, 'left').hp[enemy];
  rpgReglerHasard(d, () => .1);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
  const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - 8);
  assert.equal(r.resume.critiques[0].fois, 2);
});

test('Lionne : critique dans un échange individuel contre une créature', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'chien-du-guet');
  cible.pv = cible.def = cible.pvMax = 20;
  const a = lionne(d, 'joueur', cible.id); a.ready = true; a.malInvocation = false;
  rpgReglerHasard(d, () => .1);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(cible.pv, 8); // 4 à l'arrivée, puis 8 en combat
  assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
});
