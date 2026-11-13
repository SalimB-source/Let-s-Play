import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgOuvrirFinDeTour, rpgJouerCreature, rpgLancerMagie, rpgPeutPayer, rpgPeutAttaquer, rpgEngagerTerrain, rpgPeutEngagerPourMana } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';

function partie(pvp = false) {
  const deck = Array(30).fill('chien-du-guet');
  const d = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, pvp, joueurCouleurs: ['sable', 'eau'], sorcierAtouts: { mana: 3 }, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(d).ok);
  return d;
}

test('pas de choix ni de gain de mana au début ou au changement de tour', () => {
  const d = partie();
  assert.equal(d.joueur.manaChoixEnAttente, false);
  assert.equal(d.sorcier.manaSources.length, 0);
  assert.ok(Object.values(d.joueur.mana).every(n => n === 0));
  rpgFinDeTour(d);
  assert.equal(d.tour, 'sorcier');
  assert.equal(d.sorcier.manaChoixEnAttente, false);
  assert.ok(Object.values(d.sorcier.mana).every(n => n === 0));
});

test('une invocation normale, sacrifices imprimés et réinitialisation par camp', () => {
  const d = partie();
  d.joueur.main = ['chien-du-guet', 'anqa-des-braises'];
  const premiere = rpgJouerCreature(d, 'joueur', 'chien-du-guet');
  assert.ok(premiere.ok, premiere.raison);
  assert.ok(rpgPeutAttaquer(premiere.entite));
  assert.equal(rpgJouerCreature(d, 'joueur', 'anqa-des-braises', null, { sacrificeIds: [premiere.entite.id] }).raison, 'creature-limite');
  rpgFinDeTour(d);
  d.sorcier.main = ['chien-du-guet'];
  assert.ok(rpgJouerCreature(d, 'sorcier', 'chien-du-guet').ok);
  rpgFinDeTour(d);
  assert.equal(rpgJouerCreature(d, 'joueur', 'anqa-des-braises').raison, 'sacrifice-requis');
  assert.ok(rpgJouerCreature(d, 'joueur', 'anqa-des-braises', null, { sacrificeIds: [premiere.entite.id] }).ok);
});

test('l’Embuscade adverse est gratuite et ne consomme pas l’invocation normale', () => {
  const d = partie();
  d.tour = 'sorcier';
  d.sorcier.main = ['gardienne-des-portes-de-sable'];
  const allie = rpgJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  allie.pv--;
  d.tour = 'joueur';
  d.joueur.main = ['djinn-du-dernier-brasier'];
  assert.ok(rpgJouerCreature(d, 'joueur', 'djinn-du-dernier-brasier').ok);
  d.sorcier.main = ['tojiro-le-pourfendeur', 'chien-du-guet'];
  assert.equal(sacrificesInvocation(cardById('tojiro-le-pourfendeur'), d, 'sorcier'), 0);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'tojiro-le-pourfendeur').raison, 'timing');
  rpgOuvrirFinDeTour(d);
  assert.ok(rpgJouerCreature(d, 'sorcier', 'tojiro-le-pourfendeur').ok);
  assert.equal(d.sorcier.invocationNormaleJouee, true);
  rpgFinDeTour(d);
  assert.ok(rpgJouerCreature(d, 'sorcier', 'chien-du-guet').ok);
});

test('PvP : une réaction n’est admise que dans une fenêtre', () => {
  const d = partie(true);
  d.tour = 'sorcier';
  d.sorcier.main = ['gardienne-des-portes-de-sable'];
  const allie = rpgJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  allie.pv--;
  d.tour = 'joueur';
  d.sorcier.invocationNormaleJouee = false;
  d.joueur.main = ['djinn-du-dernier-brasier'];
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'djinn-du-dernier-brasier' }).ok);
  d.sorcier.main = ['tojiro-le-pourfendeur'];
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'tojiro-le-pourfendeur' }).raison, 'timing');
  rpgOuvrirFinDeTour(d);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'tojiro-le-pourfendeur' }).ok);
  assert.equal(d.sorcier.invocationNormaleJouee, false);
});

test('sorts gratuits mais Prix en PV conservé ; les productions de mana sont désactivées', () => {
  const d = partie();
  d.joueur.main = ['trait-de-braise', 'trait-de-braise', 'papyrus'];
  assert.ok(rpgLancerMagie(d, 'joueur', 'trait-de-braise', 'sorcier').ok);
  assert.ok(rpgLancerMagie(d, 'joueur', 'trait-de-braise', 'sorcier').ok);
  d.joueur.pv = 2;
  assert.equal(rpgPeutPayer(d.joueur, cardById('papyrus')), false);
  assert.equal(rpgPeutEngagerPourMana(d, 'joueur', 'absent'), false);
  assert.equal(rpgEngagerTerrain(d, 'joueur', 'absent').raison, 'sans-mana');
  assert.ok(Object.values(d.joueur.mana).every(n => n === 0));
});

test('deux sacrifices sont exigés à partir du coût imprimé sept', () => {
  const d = partie();
  d.joueur.main = ['chien-du-guet', 'chien-du-guet', 'orochi'];
  const a = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  const b = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(sacrificesInvocation(cardById('orochi'), d, 'joueur'), 2);
  const avant = JSON.stringify(d);
  assert.equal(rpgJouerCreature(d, 'joueur', 'orochi', null, { sacrificeIds: [a.id] }).raison, 'sacrifice');
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgJouerCreature(d, 'joueur', 'orochi', null, { sacrificeIds: [a.id, b.id] }).ok);
  assert.equal(d.joueur.creatures.length, 1);
});

test('une ancienne attente de choix de mana ne bloque plus le jeu', () => {
  const d = partie(true);
  d.joueur.manaChoixEnAttente = true; // partie sauvegardée avant la migration
  d.joueur.main = ['chien-du-guet'];
  const pose = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'chien-du-guet' });
  assert.ok(pose.ok, pose.raison);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [d.joueur.creatures[0].id] }).ok);
});

test('une invocation normale contrée consomme le quota sans payer de mana', () => {
  const d = partie();
  d.tour = 'sorcier';
  d.joueur.main = ['ecueil'];
  d.sorcier.main = ['chien-du-guet', 'chien-du-guet'];
  d.annonce = { cote: 'sorcier', carteId: 'chien-du-guet' };
  d.fenetreReponse = true;
  assert.ok(rpgLancerMagie(d, 'joueur', 'ecueil').contre);
  assert.equal(d.sorcier.invocationNormaleJouee, true);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'chien-du-guet').raison, 'creature-limite');
  assert.ok(Object.values(d.sorcier.mana).every(n => n === 0));
});
