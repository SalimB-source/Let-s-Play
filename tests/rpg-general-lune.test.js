import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, cardHasPrintedType, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { carteReveleePar } from '../src/games/rpgCollection.js';
import { rpgJouerCreature, rpgNouveauDuel, rpgLancerAttaque, rpgBlesserCreature, rpgActionsEtat } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
const id = 'general-du-croissant-noir';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return d;
}
function poser(d, camp, carte) { d[camp].main.push(carte); const r = rpgJouerCreature(d, camp, carte); assert.ok(r.ok, r.raison); return r.entite; }
test('Le Général est un Vampire 3/2 coût 4, illustré et disponible au Souk', () => {
  const c = cardById(id); assert.deepEqual([c.cost, c.atk, c.def], [4, 3, 2]);
  assert.deepEqual(cardColors(c), ['sable', 'tenebres']); assert.ok(cardHasPrintedType(c, 'Vampire'));
  assert.ok(c.volDeVie && c.reactionTourAdverse && c.resonance === 1 && c.resonanceTribu === 'vampire');
  assert.equal(carteReveleePar(id).etageId, 'necropole-3');
  assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
});
test('Résonance renforce tous les Vampires, Général compris, et se cumule avec le Fléau', () => {
  const d = duel(); const ennemi = poser(d, 'sorcier', 'sentinelle-des-sables');
  const chien = poser(d, 'joueur', 'chien-du-guet'); const general = poser(d, 'joueur', id);
  assert.deepEqual([general.atk, general.pv, ennemi.atk, ennemi.pv, chien.atk], [4, 3, 4, 3, 2]);
  const fleau = poser(d, 'joueur', 'fleau-de-la-lune-noire');
  assert.deepEqual([general.atk, general.pv, ennemi.atk, ennemi.pv, fleau.atk, fleau.pv], [5, 4, 5, 4, 9, 9]);
  rpgBlesserCreature(d, 'joueur', general.id, 20); rpgActionsEtat(d);
  assert.deepEqual([ennemi.atk, ennemi.pv, fleau.atk, fleau.pv], [4, 3, 8, 8]);
});
test('Le Général gagne de la vie en attaquant', () => {
  const d = duel(); const general = poser(d, 'joueur', id); general.ready = true; d.joueur.pv = 10;
  assert.ok(rpgLancerAttaque(d, 'joueur', [general.id], {}).ok); assert.equal(d.joueur.pv, 14);
});
test('Le Général peut être joué pendant le tour adverse en PvP', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier'; d.joueur.main.push(id);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: id }).ok);
});
