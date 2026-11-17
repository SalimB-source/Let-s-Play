import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ids = ['la-barbe-rousse', 'djinn-de-la-fleche-ardente', 'eirik-du-premier-serment'];
function classique(id, side = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  d.tour = side; let sacrificeId;
  if (id === 'la-barbe-rousse') {
    d[side].main.push('chien-du-guet'); const p = rpgJouerCreature(d, side, 'chien-du-guet');
    assert.ok(p.ok); sacrificeId = p.entite.id; d[side].invocationNormaleJouee = false;
  }
  d[side].main.push(id); const p = rpgJouerCreature(d, side, id, null, { sacrificeId });
  assert.ok(p.ok, JSON.stringify(p)); const a = p.entite; a.ready = true; a.malInvocation = false;
  return { d, a };
}
for (const id of ids) {
  test(`${id} : fiche et capacité critique`, () => {
    const c = cardById(id); assert.deepEqual(c.coupCritique, { chance: .25, fois: 2 });
    assert.match(c.text, /Coup critique.*25 %.*doubler/); assert.ok(pastillesPourCarte(c).some(p => p.cle === 'coupCritique'));
    const { a } = classique(id); assert.deepEqual(a.coupCritique, c.coupCritique);
    if (id === 'djinn-de-la-fleche-ardente') assert.ok(a.coupRapide && a.rapidite && a.detruireFinDuTour);
    else assert.equal(a.contreAttaque, true);
  });
  for (const [jet, multiple] of [[.249, 2], [.25, 1]]) test(`${id} : seuil du critique en attaque directe ${jet}`, () => {
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
    d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); let sacrificeIds = [];
    if (id === 'la-barbe-rousse') {
      d[side].main = ['chien-du-guet']; const o = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'left', 0).entite;
      assert.ok(o); sacrificeIds = [o.id]; rpgFinDeTour(d); rpgFinDeTour(d);
    }
    d[side].main = [id]; const p = rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds });
    assert.ok(p.ok, JSON.stringify(p)); const a = p.entite; a.ready = true; a.malInvocation = false;
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur'; const pv = mobaVoie(d.moba, 'left').hp[enemy];
    rpgReglerHasard(d, () => .1); assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
    const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - a.atk * 2);
    assert.ok(r.resume.critiques.some(c => c.entiteId === a.id && c.fois === 2));
  });
}
test('Djinn : attaque ciblée réussie puis critique, sans changer les chances de rater', () => {
  const { d, a } = classique('djinn-de-la-fleche-ardente');
  const cible = { id: 'cible', carteId: 'chien-du-guet', name: 'Chien', atk: 2, def: 20, pv: 20, pvMax: 20, ready: true };
  d.sorcier.creatures.push(cible); const jets = [.5, .1]; rpgReglerHasard(d, () => jets.shift() ?? .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(cible.pv, 14); assert.equal(r.resume.critiques[0].fois, 2);
});
