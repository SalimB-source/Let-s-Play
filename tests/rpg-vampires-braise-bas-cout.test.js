import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { cardById, cardHasPrintedType, RPG_CREATURE_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { carteAuVivier } from '../src/games/rpgBoosters.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';

const nouveaux = [
  ['novice-des-cendres', 1, 1, 1, 'commune'],
  ['chasseuse-de-braise', 2, 2, 2, 'inhabituelle'],
];

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  }
  return d;
}

test('deux Vampires de Braise coûtent 1 et 2, sont illustrés et accessibles', () => {
  for (const [id, cost, atk, def, rarity] of nouveaux) {
    const carte = cardById(id);
    assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.rarity],
      ['braise', cost, atk, def, rarity]);
    assert.ok(cardHasPrintedType(carte, 'Vampire'), id);
    assert.equal(carte.volDeVie, true);
    assert.equal(carte.reactionTourAdverse, undefined, 'ces Vampires ne gagnent pas Embuscade');
    assert.deepEqual(pastillesPourCarte(carte).map((pastille) => pastille.cle), ['volDeVie']);
    assert.equal(carte.art, id);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    assert.match(cardArt(id), /vampires-braise-novices-v1$/);
    assert.ok(RPG_CREATURE_CARDS.some((candidate) => candidate.id === id));
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === id && candidate.kind === 'creature'));
    assert.equal(carteAuVivier(id), true);
    assert.ok(COLLECTION_DEPART.includes(id));
  }
});

test('les deux nouveaux Vampires volent de la vie sans Embuscade', () => {
  const d = duel();
  d.joueur.pv = 10;
  const poses = nouveaux.map(([id]) => {
    d.joueur.main.push(id);
    const res = rpgJouerCreature(d, 'joueur', id);
    assert.equal(res.ok, true, `${id} entre en jeu : ${res.raison}`);
    res.entite.ready = true;
    return res.entite.id;
  });
  assert.equal(rpgLancerAttaque(d, 'joueur', poses, {}).ok, true);
  assert.equal(d.sorcier.pv, 22, '1 + 2 dégâts au sorcier');
  assert.equal(d.joueur.pv, 12, 'les deux coups soignent séparément de 1 PV chacun');
});

test('sept anciens porteurs perdent entièrement Embuscade et le Souverain est 5/5', () => {
  for (const id of [
    'danseuse-des-ombres-de-dune', 'vampire-des-braises', 'general-du-croissant-noir',
    'fleau-de-la-lune-noire', 'archonte-du-sablier-noir',
    'veilleur-du-dernier-crepuscule', 'souverain-de-la-lune-noire',
  ]) {
    const carte = cardById(id);
    assert.equal(carte.reactionTourAdverse, undefined, id);
    assert.equal(carte.conditionEmbuscade, undefined, id);
    assert.doesNotMatch(carte.text, /Embuscade/u, id);
    assert.ok(!pastillesPourCarte(carte).some((pastille) => pastille.cle === 'reactionTourAdverse'), id);
  }
  const souverain = cardById('souverain-de-la-lune-noire');
  assert.deepEqual([souverain.atk, souverain.def], [5, 5]);
  assert.equal(cardById('veilleur-du-dernier-crepuscule').interceptionAttaque, undefined,
    'le Veilleur ne conserve pas une interception réservée au jeu pendant le tour adverse');
  assert.equal(cardById('sentinelle-des-sables').reactionTourAdverse, true,
    'les autres cartes portant Embuscade la gardent');
});
