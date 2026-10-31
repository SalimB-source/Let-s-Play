import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, cardHasPrintedType, cardCopyLimit, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel, rpgPeutPayer, rpgPeutRepondre } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { carteReveleePar } from '../src/games/rpgCollection.js';
const id = 'fleau-de-la-lune-noire';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 20]));
  return d;
}
function poser(d, camp, carte) { d[camp].main.push(carte); const r = rpgJouerCreature(d, camp, carte); assert.ok(r.ok, r.raison); return r.entite; }
test('Le Fléau est une créature mythique bicolore et illustrée coûtant huit', () => {
  const c = cardById(id); assert.deepEqual([c.cost, c.atk, c.def, c.rarity], [8, 7, 7, 'mythique']);
  assert.deepEqual(cardColors(c), ['braise', 'tenebres']); assert.ok(c.reactionTourAdverse);
  assert.equal(cardCopyLimit(c), 1); assert.equal(carteReveleePar(id).etageId, 'necropole-4');
  assert.ok(cardHasPrintedType(c, 'Vampire')); assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
});
test('Le coût exige huit manas dont au moins une Braise et une Ténèbres', () => {
  const d = duel(); const c = cardById(id);
  d.joueur.mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 0]));
  d.joueur.mana.braise = 1; d.joueur.mana.tenebres = 1; d.joueur.mana.sable = 5;
  assert.equal(rpgPeutPayer(d.joueur, c), false); d.joueur.mana.sable += 1;
  assert.equal(rpgPeutPayer(d.joueur, c), true);
  d.joueur.mana.tenebres = 0; d.joueur.mana.sable += 1;
  assert.equal(rpgPeutPayer(d.joueur, c), false);
});
test('Son arrivée inflige trois dégâts à chaque créature adverse, sans toucher les alliées ni le sorcier', () => {
  const d = duel(); const amie = poser(d, 'joueur', 'dune-marchante');
  const faible = poser(d, 'sorcier', 'chien-du-guet'); const robuste = poser(d, 'sorcier', 'dune-marchante');
  const pv = d.sorcier.pv; const fleau = poser(d, 'joueur', id);
  assert.equal(amie.pv, 4); assert.equal(fleau.pv, 7); assert.equal(robuste.pv, 1);
  assert.ok(!d.sorcier.creatures.includes(faible)); assert.equal(d.sorcier.pv, pv);
});
test('Il peut répondre pendant le tour adverse en solo et en PvP', () => {
  const d = duel(); d.tour = 'sorcier'; d.fenetreReponse = true; d.joueur.main.push(id);
  assert.ok(rpgPeutRepondre(d, 'joueur')); assert.ok(rpgJouerCreature(d, 'joueur', id).ok);
  const p = duel(); p.pvp = true; p.mulliganFait = { joueur: true, sorcier: true }; p.tour = 'sorcier'; p.joueur.main.push(id);
  assert.ok(rpgPvpAppliquer(p, 'joueur', { type: 'jouer-carte', carteId: id }).ok);
});
