import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardColors, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgResoudreArriveeCiblee, rpgPeutRepondre, rpgOuvrirFinDeTour } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
const id = 'souverain-de-la-lune-noire';
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const c of ['joueur', 'sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return d;
}
function poser(d, cote, carte) { d[cote].main.push(carte); const r = rpgJouerCreature(d, cote, carte); assert.ok(r.ok); return r.entite; }
test('Le héros 6/6 coûte 6 et possède Envol et Vol de vie', () => {
  const c = cardById(id); assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['hero', 6, 6, 6]);
  assert.deepEqual(cardColors(c), ['sable', 'tenebres']);
  assert.ok(c.reactionTourAdverse && c.envol && c.volDeVie);
});
test('Le duel d’arrivée est simultané : les 6 dégâts soignent même si le héros meurt', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'dune-marchante'); cible.atk = 7;
  d.joueur.pv = 5; d.joueur.main.push(id);
  const res = rpgJouerCreature(d, 'joueur', id, null, { cibleDifferee: true });
  assert.ok(res.ok && res.arriveeEnAttente);
  assert.ok(rpgResoudreArriveeCiblee(d, 'joueur', cible.id).ok);
  assert.equal(d.joueur.pv, 11);
  assert.ok(!d.joueur.creatures.some(e => e.carteId === id));
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});
test('Vol de vie pendant une attaque au sorcier, y compris les dégâts au-delà de 25 PV', () => {
  const d = duel(); d.joueur.main.push(id); const heros = rpgJouerCreature(d, 'joueur', id).entite;
  heros.ready = true; d.joueur.pv = 24;
  assert.ok(rpgLancerAttaque(d, 'joueur', [heros.id], {}).ok);
  assert.equal(d.joueur.pv, 30);
});
test('Vol de vie en bloquant un attaquant', () => {
  const d = duel(); d.joueur.main.push(id); const heros = rpgJouerCreature(d, 'joueur', id).entite;
  const attaquant = poser(d, 'sorcier', 'chien-du-guet'); attaquant.ready = true; attaquant.envol = true;
  d.joueur.pv = 10;
  assert.ok(rpgLancerAttaque(d, 'sorcier', [attaquant.id], { [attaquant.id]: [heros.id] }).ok);
  assert.equal(d.joueur.pv, 16);
});
test('La fin de tour adverse ouvre une réponse pour le héros', () => {
  const d = duel(); d.tour = 'sorcier'; d.joueur.main.push(id); rpgOuvrirFinDeTour(d);
  assert.ok(rpgPeutRepondre(d, 'joueur'));
  assert.ok(rpgJouerCreature(d, 'joueur', id).ok);
});
test('En PvP le héros répond à l’attaque et désigne son duel', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const cible = poser(d, 'sorcier', 'dune-marchante'); cible.ready = true; d.joueur.main.push(id); d.joueur.pv = 10;
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [cible.id] }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: id, cibleDifferee: true }).ok);
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: cible.id });
  assert.ok(res.ok, res.raison); assert.equal(d.joueur.pv, 16); assert.equal(d.phase, 'principale2');
});
test('En PvP il peut aussi être joué pendant la phase principale adverse', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier'; d.phase = 'principale';
  const cible = poser(d, 'sorcier', 'dune-marchante'); d.joueur.main.push(id);
  const pose = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: id, cibleDifferee: true });
  assert.ok(pose.ok, pose.raison);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'fin-de-tour' }).ok, false, 'le duel en attente doit être résolu');
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: cible.id });
  assert.ok(res.ok, res.raison);
});
test('Les dégâts empêchés ne rendent aucun point de vie', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'dune-marchante');
  cible.protection = { contre: ['sable'], toursRestants: 2 }; d.joueur.pv = 10; d.joueur.main.push(id);
  assert.equal(rpgJouerCreature(d, 'joueur', id, cible.id).ok, false);
  assert.equal(d.joueur.pv, 10);
  assert.ok(d.joueur.main.includes(id));
});
test('Un héros adverse qui arrive pendant mon tour peut aussi voler de la vie', () => {
  const d = duel(); const cible = poser(d, 'joueur', 'dune-marchante');
  d.sorcier.pv = 10; d.sorcier.main.push(id); d.fenetreReponse = true;
  assert.ok(rpgJouerCreature(d, 'sorcier', id, cible.id).ok);
  assert.equal(d.sorcier.pv, 16);
});
