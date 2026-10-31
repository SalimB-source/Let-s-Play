import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, cardHasPrintedType, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature } from '../src/games/rpgDuel.js';
const id = 'garde-du-trone-givre';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return d;
}
test('Le Garde Viking et Vampire a coût 3, 2/4, Provocation et Furie 1', () => {
  const c = cardById(id);
  assert.deepEqual([c.cost, c.atk, c.def, c.furie], [3, 2, 4, 1]);
  assert.ok(c.provocation && c.reactionTourAdverse);
  assert.deepEqual(cardColors(c), ['neige', 'tenebres']);
  assert.ok(cardHasPrintedType(c, 'Viking') && cardHasPrintedType(c, 'Vampire'));
  assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
});
test('Furie 1 accorde +1 attaque pendant que le Garde est blessé', () => {
  const d = duel(); d.joueur.main.push(id); const garde = rpgJouerCreature(d, 'joueur', id).entite;
  assert.equal(garde.atk, 2);
  rpgBlesserCreature(d, 'joueur', garde.id, 1);
  assert.equal(garde.atk, 3); assert.equal(garde.furieDeclenchee, true);
  d.joueur.main.push('yamina'); assert.ok(rpgJouerCreature(d, 'joueur', 'yamina').ok);
  assert.equal(garde.atk, 2); assert.equal(garde.furieDeclenchee, false);
});

test('Le Garde possède son illustration de Furie', async () => {
  const { cardArtFurie } = await import('../src/games/rpgCardArt.js');
  const { existsSync } = await import('node:fs');
  assert.equal(cardArtFurie('garde-du-trone-givre'), '/cards/garde-du-trone-givre-furie.jpg?v=garde-trone-furie-v1');
  assert.ok(existsSync(new URL('../public/cards/garde-du-trone-givre-furie.jpg', import.meta.url)));
});
