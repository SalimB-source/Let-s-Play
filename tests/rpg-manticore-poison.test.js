import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { cardArt } from '../src/games/rpgCardArt.js';
import { cardById, RPG_CREATURE_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { carteAuVivier, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import { carteReveleePar } from '../src/games/rpgCollection.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { texteApercuSansDoublons } from '../src/games/rpgCardResume.js';
import { rpgFinDeTour, rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel } from '../src/games/rpgDuel.js';

const ID = 'manticore-des-dunes';

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  }
  return d;
}

function poser(d, cote, id) {
  // Depuis la règle des sacrifices, invoquer une créature de coût 6 demande
  // aussi une victime alliée, en plus du mana. La Gerboise sert d'offrande.
  const sacrificeId = id === ID ? poser(d, cote, 'gerboise-des-ruines').id : null;
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id, null, sacrificeId ? { sacrificeId } : {});
  assert.equal(resultat.ok, true, `${id} entre en jeu : ${resultat.raison}`);
  return resultat.entite;
}

test('la Manticore des dunes est une rare Sable de coût 6 avec Poison et sa propre illustration', () => {
  const carte = cardById(ID);
  assert.ok(carte);
  assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.rarity],
    ['sable', 6, 3, 6, 'rare']);
  assert.deepEqual(carte.poison, { degats: 1, tours: 2 });
  assert.equal(carte.destruction, undefined);
  assert.equal(carte.art, ID);
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
  assert.match(cardArt(ID), /cards\/manticore-des-dunes\.jpg\?v=sable-manticore-poison-v1$/u);
  assert.ok(RPG_CREATURE_CARDS.some((candidate) => candidate.id === ID));
  assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === ID && candidate.kind === 'creature'));
  assert.equal(carteAuVivier(ID), true);
  assert.equal(carteFavoriseeRayon('set-sable', carte), true);
  assert.equal(carteReveleePar(ID)?.etageId, 'sables-2', 'la rare se révèle dans la tour des Sables');
  const lecture = effetsDetailles(carte);
  assert.deepEqual(lecture.pastilles.map((pastille) => pastille.cle), ['poison']);
  assert.match(lecture.pastilles[0].description, /1 PV.*deux prochains tours/u);
  assert.equal(texteApercuSansDoublons(lecture), '', 'la preview ne répète pas la pastille');
});

test('la Manticore inocule le même Poison en attaquant : une dose tue au tour suivant', () => {
  const d = duel();
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const manticore = poser(d, 'joueur', ID);
  manticore.ready = true;
  assert.equal(rpgLancerAttaque(d, 'joueur', [manticore.id], { [manticore.id]: [dune.id] }).ok, true);
  assert.equal(dune.pv, 1, 'la frappe inflige 3 PV, sans bonus immédiat de poison');
  assert.equal(dune.poison?.toursRestants, 2);
  assert.equal(dune.poison?.sourceCarteId, ID);
  rpgFinDeTour(d);
  assert.ok(d.sorcier.cimetiere.includes('dune-marchante'), 'le Poison inflige le PV restant');
  assert.equal(manticore.poison, null);
});

test('la Manticore empoisonne aussi en bloquant, sans avancer le délai au tour adverse', () => {
  const d = duel();
  const manticore = poser(d, 'joueur', ID);
  const dune = poser(d, 'sorcier', 'dune-marchante');
  dune.ready = true;
  d.tour = 'sorcier';
  assert.equal(rpgLancerAttaque(d, 'sorcier', [dune.id], { [dune.id]: [manticore.id] }).ok, true);
  assert.equal(dune.pv, 1);
  assert.equal(dune.poison?.toursRestants, 2);
  assert.equal(manticore.pv, 4);
  rpgFinDeTour(d); // joueur : pas de perte chez le sorcier
  assert.equal(dune.pv, 1);
  assert.equal(dune.poison?.toursRestants, 2);
  rpgFinDeTour(d); // sorcier : le poison agit
  assert.ok(d.sorcier.cimetiere.includes('dune-marchante'));
});
