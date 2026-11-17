import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const id = 'sanguinaire-des-dunes';
function classique() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const side of ['joueur', 'sorcier']) d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  return d;
}
function jouer(d, side, carte) {
  const tour = d.tour; d.tour = side; d[side].main.push(carte);
  const r = rpgJouerCreature(d, side, carte); d.tour = tour;
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
test('Sanguinaire : fiche, pastille et dégâts d’arrivée restent distincts du critique', () => {
  const c = cardById(id);
  assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
  assert.match(c.text, /Coup critique.*25 %.*doubler/);
  assert.ok(pastillesPourCarte(c).some(p => p.cle === 'coupCritique'));
  const d = classique(); const cible = jouer(d, 'sorcier', 'chien-du-guet');
  cible.pv = cible.pvMax = cible.def = 10;
  rpgReglerHasard(d, () => 0); const a = jouer(d, 'joueur', id);
  assert.equal(cible.pv, 9); assert.deepEqual(a.coupCritique, c.coupCritique);
});
for (const [jet, multiple] of [[.249, 2], [.25, 1]]) {
  test(`Sanguinaire : attaque directe au seuil ${jet}`, () => {
    const d = classique(); const a = jouer(d, 'joueur', id); a.ready = true; a.malInvocation = false;
    rpgReglerHasard(d, () => jet); const pv = d.sorcier.pv;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - a.atk * multiple);
    assert.equal(r.resume.critiques.length, multiple === 2 ? 1 : 0);
  });
}
test('Sanguinaire : critique contre une créature en combat individuel', () => {
  const d = classique(); const cible = jouer(d, 'sorcier', 'chien-du-guet'); cible.pv = cible.pvMax = cible.def = 20;
  const a = jouer(d, 'joueur', id); a.ready = true; a.malInvocation = false;
  rpgReglerHasard(d, () => .1);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(cible.pv, 13); // 1 à l'arrivée, puis 6 en combat
  assert.equal(r.resume.critiques[0].fois, 2);
});
for (const side of ['joueur', 'sorcier']) test(`Sanguinaire : critique direct MOBA pour ${side}`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30])); d[side].main = [id];
  const pose = rpgMobaJouerCreature(d, side, id, 'left', 0); assert.ok(pose.ok, JSON.stringify(pose));
  const a = pose.entite; a.ready = true; a.malInvocation = false;
  rpgReglerHasard(d, () => .1); const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const pv = mobaVoie(d.moba, 'left').hp[enemy];
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
  const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
  assert.ok(r.ok); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - 6);
  assert.equal(r.resume.critiques[0].fois, 2);
});
