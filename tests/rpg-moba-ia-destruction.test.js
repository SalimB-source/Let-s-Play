import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgJouerCreature, rpgLancerMagie, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaCiblesDestruction, rpgMobaResoudreDestruction, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function position(side, avecCible) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok && rpgMobaMulligan(duel, 'sorcier', []).ok);
  if (duel.tour !== enemy) rpgFinDeTour(duel);
  duel[enemy].main = ['gardienne-des-portes-de-sable'];
  const horsVoie = rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(horsVoie); horsVoie.atk = 100;
  rpgFinDeTour(duel);
  duel[side].main = ['ghul-des-cendres'];
  const ghul = rpgMobaJouerCreature(duel, side, 'ghul-des-cendres', 'right', 0).entite;
  assert.ok(ghul);
  rpgFinDeTour(duel);
  let dansVoie = null;
  if (avecCible) {
    duel[enemy].main = ['ashigaru-des-braises'];
    dansVoie = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(dansVoie);
  }
  duel[enemy].main = ['trait-de-braise'];
  return { duel, side, enemy, ghul, horsVoie, dansVoie };
}

for (const side of ['joueur', 'sorcier']) for (const avecCible of [false, true]) {
  test(`Ghul ${side} : ${avecCible ? 'seule la créature de sa voie est une cible légale' : 'se dissipe sans cible dans sa voie'}`, () => {
    const { duel, enemy, ghul, horsVoie, dansVoie } = position(side, avecCible);
    const result = rpgMobaLancerMagie(duel, enemy, 'trait-de-braise', ghul.id);
    assert.ok(result.ok, JSON.stringify(result));
    if (side === 'joueur' && avecCible) {
      assert.deepEqual(rpgMobaCiblesDestruction(duel, side), [dansVoie.id]);
      assert.ok(rpgMobaResoudreDestruction(duel, side, dansVoie.id).ok);
    }
    assert.equal(horsVoie.pv, 4);
    if (avecCible) assert.equal(duel[enemy].creatures.some((e) => e.id === dansVoie.id), false);
    assert.ok(!duel.destructionsEnAttente?.length);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

test('Ghul du sorcier : un centre conquis donne accès aux deux voies latérales', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok && rpgMobaMulligan(duel, 'sorcier', []).ok);
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const gardienne = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(gardienne);
  rpgFinDeTour(duel);
  assert.ok(mobaInfliger(duel.moba, 'sorcier', 'center', 15).conquered);
  duel.sorcier.main = ['ghul-des-cendres'];
  const ghul = rpgMobaJouerCreature(duel, 'sorcier', 'ghul-des-cendres', 'center', 0).entite;
  assert.ok(ghul); assert.equal(ghul.mobaLane, 'center');
  rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'trait-de-braise'];
  const ashigaru = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  assert.ok(ashigaru);
  assert.ok(rpgMobaLancerMagie(duel, 'joueur', 'trait-de-braise', ghul.id).ok);
  assert.equal(duel.joueur.creatures.some((e) => e.id === ashigaru.id), false);
  assert.equal(gardienne.pv, 4);
  assert.ok(rpgMobaPlacementCoherent(duel));
});

test('Ghul du sorcier classique : son choix automatique reste disponible sans voies', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const cible = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(cible);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['ghul-des-cendres'];
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  assert.ok(ghul);
  rpgFinDeTour(duel);
  duel.joueur.main = ['trait-de-braise'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', ghul.id).ok);
  assert.equal(cible.pv, 3);
  assert.ok(!duel.destructionsEnAttente?.length);
});

for (const gardienneEnPremier of [true, false]) {
  test(`Ghul du sorcier : brise le bouclier de l'Ashigaru plutôt que blesser la Gardienne (${gardienneEnPremier ? 'Gardienne' : 'Ashigaru'} posée en premier)`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok && rpgMobaMulligan(duel, 'sorcier', []).ok);
    const premier = gardienneEnPremier ? 'gardienne-des-portes-de-sable' : 'ashigaru-des-braises';
    const second = gardienneEnPremier ? 'ashigaru-des-braises' : 'gardienne-des-portes-de-sable';
    duel.joueur.main = [premier];
    const a = rpgMobaJouerCreature(duel, 'joueur', premier, 'right', 0).entite;
    assert.ok(a);
    rpgFinDeTour(duel);
    duel.sorcier.main = ['ghul-des-cendres'];
    const ghul = rpgMobaJouerCreature(duel, 'sorcier', 'ghul-des-cendres', 'right', 0).entite;
    assert.ok(ghul);
    rpgFinDeTour(duel);
    duel.joueur.main = [second, 'trait-de-braise'];
    const b = rpgMobaJouerCreature(duel, 'joueur', second, 'right', 1).entite;
    assert.ok(b);
    const gardienne = gardienneEnPremier ? a : b;
    const ashigaru = gardienneEnPremier ? b : a;
    ashigaru.bouclier = 1;
    assert.ok(rpgMobaLancerMagie(duel, 'joueur', 'trait-de-braise', ghul.id).ok);
    assert.equal(gardienne.pv, 4);
    assert.equal(ashigaru.pv, 1); assert.equal(ashigaru.bouclier, 0);
    assert.ok(!duel.destructionsEnAttente?.length);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}
