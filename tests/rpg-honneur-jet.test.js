import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgBlesserCreature,
  rpgConsommerJetsHonneur,
  rpgJouerCreature,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';

/* ── Le journal des jets d'Honneur ───────────────────────────────────────────
   Quand une créature meurt en trouvant sa cible, le moteur retient le trajet
   — la morte, la frappée, les dégâts — hors de l'état sauvegardé. La table en
   tire la petite boule de feu ; les règles, elles, ne lisent jamais ce
   journal. */

function duelTest(rng = () => 0.5) {
  const duel = rpgNouveauDuel({
    joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng,
  });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = { braise: 100, eau: 100, sable: 100, neige: 100 };
  }
  return duel;
}
function jouer(duel, cote, id) {
  duel[cote].main.push(id);
  const resultat = rpgJouerCreature(duel, cote, id);
  assert.equal(resultat.ok, true, id);
  return resultat.entite;
}

test('le jet d’Honneur est noté avant la blessure, avec sa source, sa cible et ses dégâts', () => {
  for (const rng of [() => 0, () => 0.5, () => 0.99]) {
    const duel = duelTest(rng);
    const honneur = jouer(duel, 'joueur', 'hatamoto-des-cendres');
    const cibles = Array.from({ length: 3 }, () => jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon'));
    rpgBlesserCreature(duel, 'joueur', honneur.id, 10, 'eau');

    const jets = rpgConsommerJetsHonneur(duel);
    assert.equal(jets.length, 1, 'une mort d’Honneur laisse exactement un trajet');
    const [jet] = jets;
    assert.equal(jet.cote, 'joueur');
    assert.equal(jet.entityId, honneur.id, 'le départ est la créature qui meurt');
    assert.equal(jet.carteId, 'hatamoto-des-cendres');
    assert.equal(jet.cibleCote, 'sorcier');
    assert.equal(jet.montant, cardById('hatamoto-des-cendres').honneur);
    const cible = cibles.find((candidate) => candidate.id === jet.cibleId);
    assert.ok(cible, 'l’arrivée est bien l’une des créatures adverses');
    // La cible notée EST celle qui a été frappée : le journal ne détourne pas
    // le hasard du moteur.
    assert.match(duel.log.find((ligne) => ligne.startsWith('Honneur')),
      new RegExp(`à ${cible.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('le journal se vide à chaque relevé, et ne se remplit que pour un vrai Honneur', () => {
  const duel = duelTest();
  const honneur = jouer(duel, 'joueur', 'oni-de-la-fournaise');
  jouer(duel, 'sorcier', 'chien-du-guet');
  rpgBlesserCreature(duel, 'joueur', honneur.id, 10, 'eau');
  assert.equal(rpgConsommerJetsHonneur(duel).length, 1);
  assert.deepEqual(rpgConsommerJetsHonneur(duel), [], 'le journal se vide au premier relevé');

  // Une créature sans Honneur ne laisse rien.
  const sansHonneur = jouer(duel, 'joueur', 'chien-du-guet');
  rpgBlesserCreature(duel, 'joueur', sansHonneur.id, 10, 'eau');
  assert.deepEqual(rpgConsommerJetsHonneur(duel), []);

  // Une créature avec Honneur mais personne en face : aucun jet.
  const duelVide = duelTest();
  const solitaire = jouer(duelVide, 'joueur', 'oni-de-la-fournaise');
  rpgBlesserCreature(duelVide, 'joueur', solitaire.id, 10, 'eau');
  assert.deepEqual(rpgConsommerJetsHonneur(duelVide), [],
    'sans créature adverse, l’Honneur ne trouve personne et ne lance rien');
  assert.ok(duelVide.log.some((ligne) => ligne.includes('ne trouve aucune créature adverse')));
});

test('deux morts d’Honneur dans le même combat laissent deux trajets, dans l’ordre', () => {
  const duel = duelTest();
  const premier = jouer(duel, 'joueur', 'hatamoto-des-cendres');
  const second = jouer(duel, 'joueur', 'samourai-du-torii');
  const cible = jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  // Une vague de zone emporte les deux samouraïs ensemble.
  rpgBlesserCreature(duel, 'joueur', premier.id, 10, 'eau');
  rpgBlesserCreature(duel, 'joueur', second.id, 10, 'eau');
  const jets = rpgConsommerJetsHonneur(duel);
  assert.deepEqual(jets.map((jet) => jet.carteId), ['hatamoto-des-cendres', 'samourai-du-torii']);
  assert.ok(jets.every((jet) => jet.cibleId === cible.id || jet.cibleCote === 'sorcier'));
  assert.ok(jets.every((jet) => jet.montant > 0));
});

test('le journal reste hors de l’état du duel : il ne se sauvegarde pas', () => {
  const duel = duelTest();
  const honneur = jouer(duel, 'joueur', 'hatamoto-des-cendres');
  jouer(duel, 'sorcier', 'chien-du-guet');
  rpgBlesserCreature(duel, 'joueur', honneur.id, 10, 'eau');
  const sauvegarde = JSON.stringify(duel);
  assert.doesNotMatch(sauvegarde, /jetsHonneur|jetHonneur/,
    'aucun journal de jets ne traîne dans la sauvegarde du duel');
  assert.equal(rpgConsommerJetsHonneur(duel).length, 1, 'et le journal est bien là pour la table');
});
