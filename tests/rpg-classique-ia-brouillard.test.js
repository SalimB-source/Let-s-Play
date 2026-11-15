import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgFermerFenetreReponse, rpgJouerCreature, rpgLancerMagie, rpgNouveauDuel, rpgOuvrirFenetreReponse, rpgReglerHasard, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';

function partie(attaquant = 'ashigaru-des-braises', defenseur = null) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  let cible = null;
  if (defenseur) {
    duel.joueur.main = [defenseur];
    cible = rpgJouerCreature(duel, 'joueur', defenseur).entite;
    assert.ok(cible);
  }
  rpgFinDeTour(duel);
  duel.sorcier.main = [attaquant];
  const allie = rpgJouerCreature(duel, 'sorcier', attaquant).entite;
  assert.ok(allie);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  return { duel, allie, cible };
}

function voile(duel) {
  duel.joueur.main = ['grand-voile-blanc'];
  assert.ok(rpgOuvrirFenetreReponse(duel, 'sorcier'));
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  rpgFermerFenetreReponse(duel);
  assert.equal(duel.brouillardCombat, true);
}

test('classique : ne pas gaspiller une attaque directe sous le Grand Voile blanc', () => {
  const { duel, allie } = partie();
  duel.joueur.pv = 1;
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: allie.id, cibleId: null });
  voile(duel);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 1);
});

test('classique : une attaque normale sans capacité ne blesse pas la Gardienne sous le voile', () => {
  const { duel, allie, cible } = partie('chasseuse-de-braise', 'gardienne-des-portes-de-sable');
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: allie.id, cibleId: cible.id });
  voile(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, cible.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(cible.pv, 4); assert.equal(allie.pv, 2);
});

test('classique : le Vampire peut encore blesser une Gardienne grâce à sa capacité avant combat', () => {
  const { duel, allie, cible } = partie('vampire-des-braises', 'gardienne-des-portes-de-sable');
  voile(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: cible.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(cible.pv, 3); assert.equal(allie.pv, 2);
});

test('classique : une Bannière peut rendre une attaque directe utile sous le voile', () => {
  const { duel, allie } = partie();
  duel.sorcier.main = ['daimyo-du-soleil-rouge'];
  const pose = rpgJouerCreature(duel, 'sorcier', 'daimyo-du-soleil-rouge', null, { sacrificeIds: [allie.id] });
  assert.ok(pose.ok, JSON.stringify(pose));
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  voile(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.ok(choix); assert.equal(choix.cibleId, null);
  const attaquant = duel.sorcier.creatures.find((e) => e.id === choix.attaquantId);
  const atk = attaquant.atk, pv = attaquant.pv, vie = duel.joueur.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, null).ok);
  assert.equal(attaquant.atk, atk + 1); assert.equal(attaquant.pv, pv + 1);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, vie);
});

test('classique : une attaque imposée peut encore être déclarée sous le voile', () => {
  const { duel, allie } = partie(); voile(duel);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', allie.id),
    { attaquantId: allie.id, cibleId: null });
});

test('classique : le voile lancé en réponse à une annonce influence les attaques suivantes', () => {
  const { duel, allie } = partie();
  duel.sorcier.main = ['ashigaru-des-braises'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'ashigaru-des-braises');
  duel.joueur.main = ['grand-voile-blanc'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(duel.brouillardCombat, true);
  assert.ok(!allie.attaquee);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
});

test('classique : une frappe directe sous le voile ne prend pas priorité comme faux létal', () => {
  const { duel, allie, cible } = partie('vampire-des-braises', 'ashigaru-des-braises');
  duel.joueur.pv = 1;
  voile(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: cible.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 1);
  assert.equal(duel.joueur.creatures.includes(cible), false);
});

test('classique : la Bannière sous voile ne transforme pas une frappe directe en faux létal', () => {
  const { duel, allie, cible } = partie('vampire-des-braises', 'ashigaru-des-braises');
  duel.sorcier.main = ['ashigaru-des-braises'];
  const sacrifice = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(sacrifice);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['daimyo-du-soleil-rouge'];
  const daimyo = rpgJouerCreature(duel, 'sorcier', 'daimyo-du-soleil-rouge', null, { sacrificeIds: [sacrifice.id] }).entite;
  assert.ok(daimyo);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 1;
  voile(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: cible.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 1);
  assert.equal(duel.joueur.creatures.includes(cible), false);
});
