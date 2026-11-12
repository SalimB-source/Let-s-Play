import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgMulligan, rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPlacementCoherent, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (side === 'sorcier') rpgFinDeTour(d);
  d.joueur.main = []; d.sorcier.main = [];
  return d;
}
function poser(d, side, id, lane, slot) {
  d[side].main.push(id);
  const result = rpgMobaJouerCreature(d, side, id, lane, slot);
  assert.ok(result.ok, JSON.stringify(result));
  return result.entite;
}
function prochainTour(d) { rpgFinDeTour(d); rpgFinDeTour(d); }

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : préfère une invocation gratuite à un sacrifice simplement plus cher`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'left', 0); prochainTour(d);
    d[side].main = ['anqa-des-braises', 'chien-du-guet'];
    let hasard = 0; rpgReglerHasard(d, () => { hasard++; return .5; });
    const before = JSON.stringify(d); const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'chien-du-guet'); assert.deepEqual(choix.sacrificeIds, []);
    assert.equal(JSON.stringify(d), before); assert.equal(hasard, 0);
    assert.ok(rpgMobaJouerCreature(d, side, choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds }).ok);
    assert.ok(d[side].creatures.some(e => e.id === ancien.id)); assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${side} : conserve une créature capable d'avancer si aucun sacrifice n'est utile`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'left', 0); prochainTour(d);
    d[side].main = ['anqa-des-braises']; const before = JSON.stringify(d);
    assert.equal(rpgMobaChoisirCreatureIA(d, side), null); assert.equal(JSON.stringify(d), before);
    assert.ok(d[side].creatures.some(e => e.id === ancien.id));
  });
  test(`${side} : sacrifie pour éliminer une vraie menace malgré une alternative gratuite`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'left', 0);
    rpgFinDeTour(d); const menace = poser(d, enemy, 'chien-du-guet', 'left', 0); menace.atk = 10; menace.pv = menace.def = menace.pvMax = 4;
    rpgFinDeTour(d); d[side].main = ['lionne-du-midi-ardent', 'chien-du-guet'];
    const before = JSON.stringify(d); const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'lionne-du-midi-ardent'); assert.deepEqual(choix.sacrificeIds, [ancien.id]);
    assert.equal(JSON.stringify(d), before); assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${side} : un sacrifice permet de gagner immédiatement par attaque réelle`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'center', 0);
    assert.ok(mobaInfliger(d.moba, side, 'left', 20).conquered);
    mobaInfliger(d.moba, side, 'right', 15);
    prochainTour(d); d[side].main = ['ifrit-des-ergs', 'chien-du-guet'];
    const before = JSON.stringify(d); const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'ifrit-des-ergs'); assert.equal(choix.lane, 'right');
    assert.deepEqual(choix.sacrificeIds, [ancien.id]); assert.equal(JSON.stringify(d), before);
    const pose = rpgMobaJouerCreature(d, side, choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds }); assert.ok(pose.ok);
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, pose.entite.id, null, 'right').ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok); assert.equal(d.moba.winner, side);
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : remplace une créature incapable d'attaquer pour débloquer sa progression`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'left', 0);
    ancien.atk = 0; ancien.nePeutPasAttaquer = true; prochainTour(d);
    d[side].main = ['anqa-des-braises']; const avant = JSON.stringify(d);
    const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'anqa-des-braises'); assert.deepEqual(choix.sacrificeIds, [ancien.id]);
    assert.equal(JSON.stringify(d), avant);
  });
  test(`${side} : conserve les créatures si l'attaque disponible gagne déjà`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'right', 0);
    ancien.atk = 5; assert.ok(mobaInfliger(d.moba, side, 'left', 20).conquered);
    mobaInfliger(d.moba, side, 'right', 15); prochainTour(d);
    d[side].main = ['ifrit-des-ergs'];
    assert.equal(rpgMobaChoisirCreatureIA(d, side), null);
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, ancien.id, null, 'right').ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok); assert.equal(d.moba.winner, side);
  });
}

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : remplace un allié pour empêcher une défaite aérienne imminente`, () => {
    const d = partie(side); const ancien = poser(d, side, 'ashigaru-des-braises', 'center', 0);
    Object.assign(ancien, { atk: 8, pv: 8, def: 8, pvMax: 8 });
    rpgFinDeTour(d); const menace = poser(d, enemy, 'ashigaru-des-braises', 'right', 0);
    Object.assign(menace, { atk: 5, pv: 6, def: 6, pvMax: 6, envol: true });
    assert.ok(mobaInfliger(d.moba, enemy, 'left', 20).conquered); mobaInfliger(d.moba, enemy, 'right', 15);
    rpgFinDeTour(d); d[side].main = ['anqa-des-braises'];
    const avant = JSON.stringify(d); const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'anqa-des-braises'); assert.equal(choix.lane, 'right');
    assert.deepEqual(choix.sacrificeIds, [ancien.id]); assert.equal(JSON.stringify(d), avant);
  });
}
