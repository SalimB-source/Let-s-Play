import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_ELEMENTS, cardById, cardHasPrintedType, RPG_DECK_SORCIER_BASE } from '../src/games/rpgCards.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';
import { rpgBlesserCreature, rpgJouerCreature, rpgLancerAttaque, rpgLancerMagie, rpgNouveauDuel } from '../src/games/rpgDuel.js';

const ID = 'djinn-des-cendres-vengeresses';
const partie = () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 40]));
  return d;
};
function poser(d, cote, id) {
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id);
  assert.equal(resultat.ok, true, `${id} : ${resultat.raison}`);
  return resultat.entite;
}

test('le Djinn 4 mana 3/3 possède son illustration, son type et une place dans le jeu', () => {
  const carte = cardById(ID);
  assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def], ['braise', 4, 3, 3]);
  assert.equal(cardHasPrintedType(carte, 'Djinn'), true);
  assert.deepEqual(carte.mortAlliee, { type: 'degats-sorcier', amount: 1 });
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
  assert.ok(RPG_REVELATIONS_PAR_ETAGE['souk-3'].includes(ID), 'la carte est découvrable');
  assert.ok(RPG_DECK_SORCIER_BASE.includes(ID), 'la Cour des Djinns peut la jouer');
});

test('chaque mort alliée frappe le sorcier adverse, mais pas une mort ennemie ni la sienne', () => {
  const d = partie();
  const djinn = poser(d, 'joueur', ID);
  const allie1 = poser(d, 'joueur', 'chien-du-guet');
  const allie2 = poser(d, 'joueur', 'chien-du-guet');
  const ennemi = poser(d, 'sorcier', 'chien-du-guet');
  const pv = d.sorcier.pv;
  rpgBlesserCreature(d, 'sorcier', ennemi.id, 10);
  assert.equal(d.sorcier.pv, pv);
  rpgBlesserCreature(d, 'joueur', allie1.id, 10);
  rpgBlesserCreature(d, 'joueur', allie2.id, 10);
  assert.equal(d.sorcier.pv, pv - 2);
  assert.equal(d.sorcier.degatsRecus, 2);
  rpgBlesserCreature(d, 'joueur', djinn.id, 10);
  assert.equal(d.sorcier.pv, pv - 2, 'sa propre mort ne déclenche rien');
});

test('une mort au combat déclenche elle aussi le Djinn survivant', () => {
  const d = partie();
  poser(d, 'joueur', ID);
  const allie = poser(d, 'joueur', 'chien-du-guet');
  const ennemi = poser(d, 'sorcier', 'dune-marchante');
  ennemi.ready = true;
  d.tour = 'sorcier';
  const resultat = rpgLancerAttaque(d, 'sorcier', [ennemi.id], { [ennemi.id]: [allie.id] });
  assert.equal(resultat.ok, true, resultat.raison);
  assert.equal(d.sorcier.pv, 24);
});

test('deux Djinns cumulent leurs dégâts et le bouclier adverse absorbe les coups', () => {
  const d = partie();
  const premier = poser(d, 'joueur', ID);
  poser(d, 'joueur', ID);
  const allie = poser(d, 'joueur', 'chien-du-guet');
  d.sorcier.bouclier = 1;
  rpgBlesserCreature(d, 'joueur', allie.id, 10);
  assert.equal(d.sorcier.bouclier, 0);
  assert.equal(d.sorcier.pv, 24);
  assert.equal(d.sorcier.degatsRecus, 1);
  rpgBlesserCreature(d, 'joueur', premier.id, 10);
  assert.equal(d.sorcier.pv, 23, 'l’autre Djinn réagit à la mort de son congénère');
});

test('un Djinn contrôlé par le sorcier inflige le dégât au joueur', () => {
  const d = partie();
  poser(d, 'sorcier', ID);
  const allie = poser(d, 'sorcier', 'chien-du-guet');
  rpgBlesserCreature(d, 'sorcier', allie.id, 10);
  assert.equal(d.joueur.pv, 24);
  assert.equal(d.sorcier.pv, 25);
});

test('les sacrifices et les destructions de masse déclenchent une fois par allié mort', () => {
  const d = partie();
  poser(d, 'joueur', ID);
  const sacrifice = poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'joueur', 'chien-du-guet');
  const avant = d.sorcier.pv;
  const archonte = poserAvecSacrifice(d, sacrifice.id);
  assert.ok(archonte);
  assert.equal(d.sorcier.pv, avant - 1);
  // Celui qui juge détruit tous les alliés de coût au plus 3 dans la même vague.
  // Son coût 6 exige d’abord un sacrifice dans son propre camp.
  poser(d, 'sorcier', 'chien-du-guet');
  poser(d, 'sorcier', 'celui-qui-juge');
  assert.equal(d.sorcier.pv, avant - 3, 'les deux Chiens meurent dans la même vague, pas le Djinn de coût 4');
});

function poserAvecSacrifice(d, sacrificeId) {
  d.joueur.main.push('archonte-du-sablier-noir');
  const resultat = rpgJouerCreature(d, 'joueur', 'archonte-du-sablier-noir', null, { sacrificeId });
  assert.equal(resultat.ok, true, resultat.raison);
  return resultat.entite;
}

test('l’exil d’un allié ne compte pas comme une mort', () => {
  const d = partie();
  poser(d, 'joueur', ID);
  const allie = poser(d, 'joueur', 'chien-du-guet');
  const avant = d.sorcier.pv;
  poser(d, 'sorcier', 'chien-du-guet');
  d.sorcier.main.push('la-devoreuse');
  const resultat = rpgJouerCreature(d, 'sorcier', 'la-devoreuse', allie.id);
  assert.equal(resultat.ok, true, resultat.raison);
  assert.equal(d.sorcier.pv, avant);
  assert.ok(d.joueur.exil?.includes(allie.carteId));
});

test('une destruction totale simultanée ne déclenche pas les Djinns morts avec leurs alliés', () => {
  const d = partie();
  poser(d, 'joueur', ID); poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'sorcier', ID); poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.main.push('la-derniere-pesee');
  const resultat = rpgLancerMagie(d, 'joueur', 'la-derniere-pesee');
  assert.equal(resultat.ok, true, resultat.raison);
  assert.equal(d.sorcier.pv, 25);
  assert.equal(d.joueur.pv, 25);
  assert.equal(d.joueur.creatures.length, 0);
  assert.equal(d.sorcier.creatures.length, 0);
});
