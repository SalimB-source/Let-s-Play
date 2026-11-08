import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, cardHasPrintedType, cardCopyLimit, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel, rpgPeutPayer, rpgLancerAttaque, rpgBlesserCreature, rpgActionsEtat } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { carteReveleePar } from '../src/games/rpgCollection.js';
const id = 'fleau-de-la-lune-noire';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 20]));
  return d;
}
function poser(d, camp, carte) {
  const sacrificeIds = [];
  for (let i = 0; i < sacrificesInvocation(cardById(carte), d); i++) {
    d[camp].main.push('chien-du-guet');
    const offrande = rpgJouerCreature(d, camp, 'chien-du-guet');
    assert.ok(offrande.ok, offrande.raison);
    sacrificeIds.push(offrande.entite.id);
  }
  d[camp].main.push(carte);
  const r = rpgJouerCreature(d, camp, carte, null, { sacrificeIds });
  assert.ok(r.ok, r.raison);
  return r.entite;
}
test('Le Fléau est une créature mythique bicolore et illustrée coûtant huit', () => {
  const c = cardById(id); assert.deepEqual([c.cost, c.atk, c.def, c.rarity], [8, 7, 7, 'mythique']);
  assert.deepEqual(cardColors(c), ['braise', 'tenebres']); assert.equal(c.reactionTourAdverse, undefined);
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
test('Résonance vampire renforce les deux camps et le Fléau, sans dégâts à son arrivée', () => {
  const d = duel(); const amie = poser(d, 'joueur', 'danseuse-des-ombres-de-dune');
  d.tour = 'sorcier'; const ennemi = poser(d, 'sorcier', 'sentinelle-des-sables'); d.tour = 'joueur'; const chien = poser(d, 'sorcier', 'chien-du-guet');
  const fleau = poser(d, 'joueur', id);
  assert.ok(fleau.volDeVie && fleau.overkill);
  assert.deepEqual([fleau.atk, fleau.pv, amie.atk, amie.pv, ennemi.atk, ennemi.pv, chien.atk, chien.pv], [8, 8, 3, 3, 4, 3, 2, 2]);
  rpgBlesserCreature(d, 'joueur', fleau.id, 20); rpgActionsEtat(d);
  assert.deepEqual([amie.atk, amie.pv, ennemi.atk, ennemi.pv, chien.atk, chien.pv], [2, 2, 3, 2, 2, 2]);
});
test('Overkill et Vol de vie soignent la moitié des dégâts infligés', () => {
  const d = duel(); const fleau = poser(d, 'joueur', id); const chien = poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.pv = 10; fleau.ready = true; const pvAdverse = d.sorcier.pv;
  assert.ok(rpgLancerAttaque(d, 'joueur', [fleau.id], { [fleau.id]: [chien.id] }).ok);
  assert.equal(d.sorcier.pv, pvAdverse - 6);
  assert.equal(d.joueur.pv, 14, '2 dégâts au bloqueur et 6 au sorcier rendent 4 PV');
});
test('Il ne peut plus répondre pendant le tour adverse en PvP', () => {
  const p = duel(); poser(p, 'sorcier', 'chien-du-guet'); poser(p, 'sorcier', 'chien-du-guet'); poser(p, 'sorcier', 'chien-du-guet');
  p.pvp = true; p.mulliganFait = { joueur: true, sorcier: true }; p.tour = 'sorcier'; p.joueur.main.push(id);
  assert.equal(rpgPvpAppliquer(p, 'joueur', { type: 'jouer-carte', carteId: id }).ok, false);
  assert.ok(p.joueur.main.includes(id));
});
test('Vol de vie fonctionne même si le Fléau meurt dans le combat', () => {
  const d = duel(); const fleau = poser(d, 'joueur', id); const chien = poser(d, 'sorcier', 'chien-du-guet');
  chien.atk = 9; d.joueur.pv = 10; fleau.ready = true;
  assert.ok(rpgLancerAttaque(d, 'joueur', [fleau.id], { [fleau.id]: [chien.id] }).ok);
  assert.equal(d.joueur.pv, 14); assert.ok(!d.joueur.creatures.includes(fleau));
});
test('La résonance atteint aussi les Vampires arrivant après le Fléau', () => {
  const d = duel(); poser(d, 'joueur', id);
  const vampire = poser(d, 'joueur', 'danseuse-des-ombres-de-dune');
  assert.deepEqual([vampire.atk, vampire.pv], [3, 3]);
});
