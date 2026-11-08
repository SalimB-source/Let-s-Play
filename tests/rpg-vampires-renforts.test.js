import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { cardById, cardHasPrintedType, RPG_CREATURE_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { carteAuVivier, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel, rpgPeutAttaquer, rpgPeutBloquerAttaquant } from '../src/games/rpgDuel.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';

const renforts = [
  ['messagere-des-cendres', 'braise', 1, 1, 1, 'commune', 'rapidite'],
  ['garde-du-voile', 'tenebres', 1, 1, 2, 'commune', 'defenseur'],
  ['rodeuse-des-tombes', 'tenebres', 2, 2, 1, 'inhabituelle', 'infiltration'],
  ['sentinelle-du-brasier', 'braise', 2, 1, 3, 'inhabituelle', 'volDeVie'],
];

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 20]));
  }
  return d;
}
function poser(d, cote, id) {
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id);
  assert.equal(resultat.ok, true, `${id}: ${resultat.raison}`);
  return resultat.entite;
}

test('quatre Vampires illustrés renforcent les coûts 1 et 2, sans Embuscade', () => {
  assert.equal(RPG_CREATURE_CARDS.length, 133);
  for (const [id, element, cost, atk, def, rarity, capacite] of renforts) {
    const carte = cardById(id);
    assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.rarity],
      [element, cost, atk, def, rarity], id);
    assert.ok(cardHasPrintedType(carte, 'Vampire'), id);
    assert.equal(carte[capacite], true, id);
    assert.equal(carte.reactionTourAdverse, undefined, id);
    assert.equal(carte.conditionEmbuscade, undefined, id);
    assert.doesNotMatch(carte.text, /Embuscade/u, id);
    assert.deepEqual(pastillesPourCarte(carte).map((pastille) => pastille.cle), [capacite], id);
    assert.equal(carte.art, id);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)), id);
    assert.match(cardArt(id), /vampire-v1$/);
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === id && candidate.kind === 'creature'));
    assert.equal(carteAuVivier(id), true);
    assert.equal(carteFavoriseeRayon('vampires', carte), true);
    assert.ok(COLLECTION_DEPART.includes(id), id);
  }
});

test('la Messagère attaque à son arrivée ; la Rôdeuse ne peut pas être bloquée', () => {
  const d = duel();
  const messagere = poser(d, 'joueur', 'messagere-des-cendres');
  const rodeuse = poser(d, 'joueur', 'rodeuse-des-tombes');
  const bloqueur = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgPeutAttaquer(messagere), true);
  assert.equal(rpgPeutAttaquer(rodeuse), false);
  assert.equal(rpgPeutBloquerAttaquant(bloqueur, rodeuse), false);
  assert.equal(rpgLancerAttaque(d, 'joueur', [messagere.id], {}).ok, true);
  assert.equal(d.sorcier.pv, 24);
});

test('le Garde détourne une Attaque ciblée et la Sentinelle rend 1 PV à chaque coup', () => {
  const d = duel();
  const garde = poser(d, 'joueur', 'garde-du-voile');
  const autre = poser(d, 'joueur', 'novice-des-cendres');
  const assaillant = poser(d, 'sorcier', 'chien-du-guet');
  assaillant.ready = true;
  assaillant.coupRapide = true;
  assert.equal(rpgLancerAttaque(d, 'sorcier', [assaillant.id], null, null, null,
    { [assaillant.id]: autre.id }).raison, 'defenseur');
  assert.ok(d.joueur.creatures.some((entite) => entite.id === garde.id));

  const soin = duel();
  soin.joueur.pv = 10;
  const sentinelle = poser(soin, 'joueur', 'sentinelle-du-brasier');
  sentinelle.ready = true;
  assert.equal(rpgLancerAttaque(soin, 'joueur', [sentinelle.id], {}).ok, true);
  assert.equal(soin.joueur.pv, 11);
  assert.equal(soin.sorcier.pv, 24);
});
