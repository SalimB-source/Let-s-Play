import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColorCost, cardColors, cardHasPrintedType, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel, rpgPeutAttaquer, rpgPeutBloquerAttaquant } from '../src/games/rpgDuel.js';

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
test('L’Archonte inflige deux dégâts à son arrivée', () => {
  const d = duel(); d.joueur.main.push(ids[0]); d.sorcier.main.push('dune-marchante');
  const cible = rpgJouerCreature(d, 'sorcier', 'dune-marchante').entite;
  assert.ok(rpgJouerCreature(d, 'joueur', ids[0], cible.id).ok);
  assert.equal(cible.pv, 2);
});
test('Le Veilleur possède Contre-attaque', () => {
  const d = duel(); d.joueur.main.push(ids[2]);
  assert.equal(rpgJouerCreature(d, 'joueur', ids[2]).entite.contreAttaque, true);
});
