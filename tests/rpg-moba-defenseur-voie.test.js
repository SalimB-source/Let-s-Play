import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent, rpgMobaChoisirVoieCentrale } from '../src/games/rpgMobaLocal.js';
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

test('le centre rattaché utilise la voie de combat et non la case physique', () => {
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
  assert.ok(mobaInfliger(d.moba, 'joueur', 'center', 15).conquered);
  assert.ok(rpgMobaChoisirVoieCentrale(d, 'joueur', 'left').ok);
  assert.equal(attaquant.mobaLane, 'left');
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], attaquant.id);
  attaquant.ready = true; attaquant.coupRapide = true;
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id), { cibles: [local.id], directe: false });
  local.defenseur = false;
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'joueur', attaquant.id), { cibles: [local.id, loin.id], directe: true });
  assert.ok(rpgMobaPlacementCoherent(d));
});
