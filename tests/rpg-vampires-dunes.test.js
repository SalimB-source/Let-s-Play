import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColorCost, cardColors, cardHasPrintedType, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgLancerAttaque, rpgFinDeTour } from '../src/games/rpgDuel.js';

const ids = ['archonte-du-sablier-noir', 'danseuse-des-ombres-de-dune', 'veilleur-du-dernier-crepuscule'];
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 20]));
  return d;
}
test('Les trois vampires sont jouables, bicolores et illustrés', () => {
  for (const id of ids) {
    const c = cardById(id);
    assert.deepEqual(cardColors(c), ['sable', 'tenebres']);
    assert.deepEqual(cardColorCost(c), { sable: 1, tenebres: 1 });
    assert.ok(cardHasPrintedType(c, 'humain') && cardHasPrintedType(c, 'vampire'));
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    const d = duel(); d.joueur.main.push(id);
    assert.ok(rpgJouerCreature(d, 'joueur', id).ok);
  }
});
test('La Danseuse attaque immédiatement et ne peut pas être bloquée', () => {
  const d = duel(); d.joueur.main.push(ids[1]); d.sorcier.main.push('chien-du-guet');
  const danseuse = rpgJouerCreature(d, 'joueur', ids[1]).entite;
  const chien = rpgJouerCreature(d, 'sorcier', 'chien-du-guet').entite;
  assert.ok(rpgPeutAttaquer(danseuse));
  assert.equal(rpgPeutBloquerAttaquant(chien, danseuse), false);
});
test('L’Archonte renforce les Vampires alliés, lui compris, jusqu’à la fin du tour', () => {
  const d = duel(); d.joueur.main.push(ids[0], ids[1], 'chien-du-guet'); d.sorcier.main.push('sentinelle-des-sables');
  const danseuse = rpgJouerCreature(d, 'joueur', ids[1]).entite;
  const chien = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  const ennemi = rpgJouerCreature(d, 'sorcier', 'sentinelle-des-sables').entite;
  const archonte = rpgJouerCreature(d, 'joueur', ids[0]).entite;
  assert.deepEqual([danseuse.atk, archonte.atk, chien.atk, ennemi.atk], [4, 6, 2, 3]);
  rpgFinDeTour(d);
  assert.deepEqual([danseuse.atk, archonte.atk, chien.atk, ennemi.atk], [2, 4, 2, 3]);
});
test('La Danseuse rend la moitié des dégâts qu’elle inflige en points de vie', () => {
  const d = duel(); d.joueur.main.push(ids[1]); d.joueur.pv = 10;
  const danseuse = rpgJouerCreature(d, 'joueur', ids[1]).entite;
  assert.ok(danseuse.volDeVie);
  assert.ok(rpgLancerAttaque(d, 'joueur', [danseuse.id], {}).ok);
  assert.equal(d.joueur.pv, 11);
});
test('Le Veilleur est 3/3 avec Contre-attaque et Embuscade', () => {
  const carte = cardById(ids[2]);
  assert.deepEqual([carte.cost, carte.atk, carte.def], [4, 3, 3]);
  const d = duel(); d.joueur.main.push(ids[2]);
  const veilleur = rpgJouerCreature(d, 'joueur', ids[2]).entite;
  assert.equal(veilleur.contreAttaque, true);
  assert.equal(carte.reactionTourAdverse, true);
  assert.deepEqual([veilleur.atk, veilleur.pv], [3, 3]);
});

test('Le Vol de vie arrondit chaque blessure à l’entier supérieur', () => {
  for (const [degats, soin] of [[0, 0], [1, 1], [2, 1], [3, 2], [5, 3]]) {
    const d = duel(); d.joueur.main.push(ids[1]); d.joueur.pv = 10;
    const danseuse = rpgJouerCreature(d, 'joueur', ids[1]).entite;
    danseuse.atk = degats;
    assert.ok(rpgLancerAttaque(d, 'joueur', [danseuse.id], {}).ok);
    assert.equal(d.joueur.pv, 10 + soin, `${degats} dégât(s) rendent ${soin} PV`);
  }
});
