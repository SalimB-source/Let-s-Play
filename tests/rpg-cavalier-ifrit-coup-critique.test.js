import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerAttaque, rpgReglerHasard, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ids = ['le-cavalier-du-bucher', 'ifrit-al-ahmar'];
function classique(id, side = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  d.tour = side; d[side].main.push('chien-du-guet');
  const victime = rpgJouerCreature(d, side, 'chien-du-guet').entite; assert.ok(victime);
  d[side].invocationNormaleJouee = false; d[side].main.push(id);
  const p = rpgJouerCreature(d, side, id, null, { sacrificeId: victime.id });
  assert.ok(p.ok, JSON.stringify(p)); const a = p.entite; a.ready = true; a.malInvocation = false;
  return { d, a };
}
for (const id of ids) {
  test(`${id} : fiche, capacités et cumul avec arme`, () => {
    const c = cardById(id); assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
    assert.match(c.text, /Coup critique.*25 %.*doubler/);
    assert.ok(pastillesPourCarte(c).some(p => p.cle === 'coupCritique'));
    const { d, a } = classique(id); assert.deepEqual(a.coupCritique, c.coupCritique);
    if (id === 'ifrit-al-ahmar') { assert.equal(a.coupRapide, true); assert.deepEqual(c.resonance, 2); assert.equal(c.protection.contre, 'eau'); }
    else { assert.equal(a.rapidite, true); assert.equal(c.destruction.amount, 2); }
    d.joueur.main.push('lance-de-la-lune-givree'); assert.ok(rpgJouerArme(d, 'joueur', 'lance-de-la-lune-givree', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .5, fois: 2 });
    d.joueur.main.push('cuirasse-de-sel'); assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', a.id).ok);
    assert.deepEqual(a.coupCritique, { chance: .25, fois: 2 });
  });
  for (const [jet, multiple] of [[.249, 2], [.25, 1]]) test(`${id} : attaque directe classique au seuil ${jet}`, () => {
    const { d, a } = classique(id); const pv = d.sorcier.pv; rpgReglerHasard(d, () => jet);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - a.atk * multiple);
    assert.equal(r.resume.critiques.length, multiple === 2 ? 1 : 0);
  });
  for (const side of ['joueur', 'sorcier']) test(`${id} : attaque directe MOBA (${side})`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (d.tour !== side) rpgFinDeTour(d);
    d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); d[side].main = ['chien-du-guet'];
    const offrande = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite; assert.ok(offrande);
    rpgFinDeTour(d); rpgFinDeTour(d); d[side].main = [id];
    const pose = rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds: [offrande.id] });
    assert.ok(pose.ok, JSON.stringify(pose)); const a = pose.entite; a.ready = true; a.malInvocation = false;
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; const pv = mobaVoie(d.moba, 'left').hp[enemy];
    rpgReglerHasard(d, () => .1); assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
    const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - a.atk * 2);
    assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
  });
}
test('Ifrit : le critique suit la réussite de son Attaque ciblée', () => {
  const { d, a } = classique('ifrit-al-ahmar');
  const cible = { id: 'cible', carteId: 'chien-du-guet', name: 'Chien', atk: 2, def: 20, pv: 20, pvMax: 20, ready: true };
  d.sorcier.creatures.push(cible); const jets = [.5, .1]; rpgReglerHasard(d, () => jets.shift() ?? .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(cible.pv, 14); assert.equal(r.resume.critiques[0].fois, 2);
});
test('Cavalier : un critique au blocage conserve les dégâts de mort à 2', () => {
  const { d, a: bloqueur } = classique('le-cavalier-du-bucher', 'sorcier');
  d.tour = 'joueur'; d.joueur.main = ['chien-du-guet'];
  const attaque = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite; assert.ok(attaque);
  attaque.ready = true; attaque.malInvocation = false; attaque.atk = 3;
  attaque.pv = attaque.def = attaque.pvMax = 20; rpgReglerHasard(d, () => .1);
  const r = rpgLancerAttaque(d, 'joueur', [attaque.id], { [attaque.id]: bloqueur.id });
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.resume.critiques.some(c => c.entiteId === bloqueur.id && c.fois === 2));
  assert.equal(attaque.pv, 10); // 8 de combat et 2 à la mort, non doublés
  assert.ok(!d.sorcier.creatures.some(e => e.id === bloqueur.id));
});
