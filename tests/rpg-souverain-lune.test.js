import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardColors, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
const id = 'souverain-de-la-lune-noire';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const c of ['joueur', 'sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return d;
}
function poser(d, cote, carte) { d[cote].main.push(carte); const r = rpgJouerCreature(d, cote, carte); assert.ok(r.ok); return r.entite; }
function jouerSouverain(d, cibleId = null, options = {}) {
  const offrande = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main.push(id);
  return rpgJouerCreature(d, 'joueur', id, cibleId, { ...options, sacrificeId: offrande.id });
}
test('Le héros 5/5 coûte 6 et possède Envol et Vol de vie, sans Embuscade', () => {
  const c = cardById(id); assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['hero', 6, 5, 5]);
  assert.deepEqual(cardColors(c), ['sable', 'tenebres']);
  assert.equal(c.rarity, 'mythique');
  assert.ok(!c.reactionTourAdverse && c.envol && c.volDeVie);
});
test('Le duel d’arrivée est simultané : les 5 dégâts soignent même si le héros meurt', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'dune-marchante'); cible.atk = 7;
  d.joueur.pv = 5;
  const res = jouerSouverain(d, null, { cibleDifferee: true });
  assert.ok(res.ok && res.arriveeEnAttente);
  assert.ok(rpgResoudreArriveeCiblee(d, 'joueur', cible.id).ok);
  assert.equal(d.joueur.pv, 8);
  assert.ok(!d.joueur.creatures.some(e => e.carteId === id));
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});
test('Vol de vie pendant une attaque au sorcier, y compris les dégâts au-delà de 25 PV', () => {
  const d = duel(); const heros = jouerSouverain(d).entite;
  heros.ready = true; d.joueur.pv = 24;
  assert.ok(rpgLancerAttaque(d, 'joueur', [heros.id], {}).ok);
  assert.equal(d.joueur.pv, 27);
});
test('Vol de vie en bloquant un attaquant', () => {
  const d = duel(); const heros = jouerSouverain(d).entite;
  const attaquant = poser(d, 'sorcier', 'chien-du-guet'); attaquant.ready = true; attaquant.envol = true;
  d.joueur.pv = 10;
  assert.ok(rpgLancerAttaque(d, 'sorcier', [attaquant.id], { [attaquant.id]: [heros.id] }).ok);
  assert.equal(d.joueur.pv, 13);
});
test('Le Souverain ne peut plus être joué pendant le tour adverse en PvP', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const cible = poser(d, 'sorcier', 'dune-marchante'); cible.ready = true;
  d.joueur.main.push(id);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [cible.id] }).ok);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: id, cibleDifferee: true }).ok, false);
  assert.ok(d.joueur.main.includes(id));
});
test('Le bouclier coloré ne bloque pas le combat d’arrivée ni le Vol de vie', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'dune-marchante');
  cible.protection = { contre: ['sable'], toursRestants: 2 }; d.joueur.pv = 10;
  assert.equal(jouerSouverain(d, cible.id).ok, true);
  assert.equal(d.joueur.pv, 13);
  assert.ok(!d.joueur.main.includes(id));
});
