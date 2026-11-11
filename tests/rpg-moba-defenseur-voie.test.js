import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (d.tour !== enemy) rpgFinDeTour(d);
  d[enemy].main = ['gardienne-des-portes-de-sable'];
  const garde = rpgMobaJouerCreature(d, enemy, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  d[enemy].main = ['ashigaru-des-braises'];
  const cible = rpgMobaJouerCreature(d, enemy, 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d);
  d[side].main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(garde?.defenseur && cible && attaquant);
  attaquant.ready = true; attaquant.coupRapide = true; attaquant.atk = 4;
  d[enemy].main = [];
  return { d, garde, cible, attaquant, enemy };
}

for (const side of ['joueur', 'sorcier']) {
  for (const destination of ['cible', 'garde', 'directe']) {
    test(`${side} : Attaque ciblée ${destination} malgré un Défenseur dans une autre voie`, () => {
      const { d, garde, cible, attaquant, enemy } = partie(side);
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: [garde.id, cible.id], directe: true });
      const id = destination === 'directe' ? null : destination === 'cible' ? cible.id : garde.id;
      const pvAvant = destination === 'directe' ? mobaVoie(d.moba, 'left').hp[enemy] : d[enemy].creatures.find(e => e.id === id).pv;
      assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, id).ok);
      assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok);
      const pvApres = destination === 'directe' ? mobaVoie(d.moba, 'left').hp[enemy] : (d[enemy].creatures.find(e => e.id === id)?.pv ?? 0);
      assert.ok(pvApres < pvAvant);
      assert.ok(rpgMobaPlacementCoherent(d));
    });
  }
  test(`${side} : le Défenseur local force toujours la cible, et l’IA respecte les choix`, () => {
    const { d, garde, cible, attaquant } = partie(side);
    const avant = JSON.stringify(d);
    const choix = rpgMobaChoisirAttaqueIndividuelleIA(d, side);
    assert.ok(choix);
    assert.equal(choix.cibleId, null, 'l’IA peut choisir la frappe directe plutôt que le Défenseur éloigné');
    assert.equal(JSON.stringify(d), avant);
    cible.defenseur = true;
    assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: [cible.id], directe: false });
    assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, garde.id).raison, 'cible');
    assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, null).raison, 'cible');
    assert.equal(rpgMobaChoisirAttaqueIndividuelleIA(d, side)?.cibleId, cible.id);
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, cible.id).ok);
  });
}

test('le centre conquis participe aux deux voies et conserve sa case après la chute d’un flanc', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(d); d.sorcier.main = ['gardienne-des-portes-de-sable'];
  const local = rpgMobaJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d); d.sorcier.main = ['gardienne-des-portes-de-sable'];
  const loin = rpgMobaJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(d);
  mobaVoie(d.moba, 'center').hp.joueur = 7;
  assert.ok(mobaInfliger(d.moba, 'joueur', 'center', 15).conquered);
  assert.equal(d.moba.centerChoice, null);
  assert.equal(mobaVoie(d.moba, 'center').hp.joueur, 0);
  assert.equal(mobaVoie(d.moba, 'left').hp.joueur, 20);
  assert.equal(mobaVoie(d.moba, 'right').hp.joueur, 20);
  assert.equal(attaquant.mobaLane, 'center');
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], attaquant.id);
  attaquant.ready = true; attaquant.coupRapide = true;
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id, 'left'), { cibles: [local.id], directe: false });
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id, 'right'), { cibles: [loin.id], directe: false });
  local.defenseur = false; loin.defenseur = false;
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', attaquant.id, null).raison, 'voie-obligatoire');
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', attaquant.id, null, 'right').ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, 20);
  assert.ok(mobaVoie(d.moba, 'right').hp.sorcier < 20);
  const fermeture = mobaInfliger(d.moba, 'sorcier', 'left', 20);
  assert.ok(fermeture.conquered);
  assert.ok(!fermeture.removed.joueur.includes(attaquant.id));
  // Mettre à jour le moteur comme le ferait l'adaptateur après la conquête.
  d.sorcier.creatures = d.sorcier.creatures.filter((e) => !fermeture.removed.sorcier.includes(e.id));
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], attaquant.id);
  assert.equal(attaquant.mobaLane, 'center');
  assert.ok(rpgMobaPlacementCoherent(d));
  assert.equal(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id, 'left').directe, false);
  assert.equal(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id, 'right').directe, true);
});

test('une arrivée de soin au centre conquis soigne les deux flancs sans changer leur maximum', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  assert.ok(mobaInfliger(d.moba, 'joueur', 'center', 15).conquered);
  mobaInfliger(d.moba, 'sorcier', 'left', 5);
  mobaInfliger(d.moba, 'sorcier', 'right', 5);
  d.joueur.main = ['porteuse-de-cruches']; d.joueur.mana.eau = 20;
  const result = rpgMobaJouerCreature(d, 'joueur', 'porteuse-de-cruches', 'center', 0);
  assert.ok(result.ok, result.raison);
  assert.ok(mobaVoie(d.moba, 'left').hp.joueur > 15);
  assert.equal(mobaVoie(d.moba, 'left').hp.joueur, mobaVoie(d.moba, 'right').hp.joueur);
  assert.deepEqual(result.healingEvents.map((event) => event.laneId).sort(), ['left', 'right']);
  assert.ok(rpgMobaPlacementCoherent(d));
});
