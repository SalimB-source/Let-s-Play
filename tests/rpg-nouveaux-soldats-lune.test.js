import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgFinDeTour, rpgResoudreArriveeCiblee, rpgBlesserCreature } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { cardArt } from '../src/games/rpgCardArt.js';
const ids = ['eclipse-silencieuse', 'gardienne-du-croissant', 'traqueur-des-nuits-sans-lune', 'sanguinaire-des-dunes', 'porte-etendard-de-leclipse', 'veilleuse-de-la-lune-givree'];
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return d;
}
function poser(d, cote, id, cible = null, options = {}) {
  d[cote].main.push(id); const res = rpgJouerCreature(d, cote, id, cible, options); assert.ok(res.ok, res.raison); return res.entite;
}
test('Six soldats illustrés, bicolores et jouables normalement pendant leur tour', () => {
  const elements = ['sable', 'sable', 'eau', 'braise', 'sable', 'neige'];
  for (const [i, id] of ids.entries()) {
    const c = cardById(id); assert.equal(c.kind, 'creature'); assert.ok(c.reactionTourAdverse && c.arrivee);
    assert.deepEqual(cardColors(c), [elements[i], 'tenebres']);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    const d = duel();
    assert.ok(poser(d, 'joueur', id));
  }
});
test('Éclipse coûte 3 pour une 2/1 et réduit l’attaque jusqu’à la fin du tour', () => {
  assert.deepEqual([cardById(ids[0]).cost, cardById(ids[0]).atk, cardById(ids[0]).def], [3, 2, 1]);
  const d = duel(); const cible = poser(d, 'sorcier', 'chien-du-guet'); cible.atk = 1;
  poser(d, 'joueur', ids[0], cible.id); assert.equal(cible.atk, 0);
  rpgFinDeTour(d); assert.equal(cible.atk, 1);
});
test('Le Gardien au croissant protège une créature alliée choisie', () => {
  assert.equal(cardById(ids[1]).name, 'Gardien au croissant');
  assert.deepEqual([cardById(ids[1]).atk, cardById(ids[1]).def], [3, 1]);
  assert.equal(cardArt(cardById(ids[1])), '/cards/gardienne-du-croissant.jpg?v=gardien-croissant-lumiere-v1');
  const d = duel(); const allie = poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'joueur', ids[1], allie.id); assert.equal(allie.bouclier, 1);
  assert.deepEqual([allie.atk, allie.def, allie.pv, allie.pvMax], [2, 4, 4, 4]);
  rpgFinDeTour(d); assert.equal(allie.def, 4, 'le bonus reste après le tour');
});
test('Traqueur 2/2 : détruit à coût 3 ou moins, renvoie à coût 4 ou plus', () => {
  const carte = cardById(ids[2]);
  assert.deepEqual([carte.atk, carte.def, carte.arrivee.coutDestructionMax, carte.arrivee.coutRenvoiMin], [2, 2, 3, 4]);
  const d = duel(); const petite = poser(d, 'sorcier', 'chien-du-guet');
  const allie = poser(d, 'joueur', 'dune-marchante');
  d.joueur.main.push(ids[2]); assert.equal(rpgJouerCreature(d, 'joueur', ids[2], allie.id).ok, false);
  assert.ok(rpgJouerCreature(d, 'joueur', ids[2], petite.id).ok);
  assert.ok(d.sorcier.cimetiere.includes('chien-du-guet'));
  assert.ok(!d.sorcier.main.includes('chien-du-guet'));
  const grosse = poser(d, 'sorcier', 'dune-marchante');
  poser(d, 'joueur', ids[2], grosse.id);
  assert.ok(d.sorcier.main.includes('dune-marchante'));
  assert.ok(!d.sorcier.creatures.includes(grosse));
});
test('Sanguinaire mythique blesse toute la table adverse selon les blessures préexistantes', () => {
  const c = cardById(ids[3]);
  assert.deepEqual([c.cost, c.atk, c.def, c.rarity, c.reactionTourAdverse], [3, 3, 2, 'mythique', true]);
  const d = duel(); const indemne = poser(d, 'sorcier', 'dune-marchante');
  const blessee = poser(d, 'sorcier', 'dune-marchante');
  const protegee = poser(d, 'sorcier', 'dune-marchante'); protegee.bouclier = 1;
  const allie = poser(d, 'joueur', 'dune-marchante');
  rpgBlesserCreature(d, 'sorcier', blessee.id, 1, 'eau', null, 'attaque');
  const pvSorcier = d.sorcier.pv;
  poser(d, 'joueur', ids[3]);
  assert.equal(indemne.pv, 3, 'une cible indemne ne subit que 1 dégât');
  assert.equal(blessee.pv, 1, 'une cible déjà blessée subit 2 dégâts');
  assert.equal(protegee.pv, 4); assert.equal(protegee.bouclier, 0);
  assert.equal(allie.pv, 4); assert.equal(d.sorcier.pv, pvSorcier);
});
test('Porte-étendard renforce temporairement les Vampires alliés seulement', () => {
  const d = duel(); const vampire = poser(d, 'joueur', 'danseuse-des-ombres-de-dune'); const chien = poser(d, 'joueur', 'chien-du-guet');
  const porteur = poser(d, 'joueur', ids[4]); assert.deepEqual([vampire.def, chien.def, porteur.def], [4, 2, 5]);
  rpgFinDeTour(d); assert.deepEqual([vampire.def, chien.def, porteur.def], [2, 2, 3]);
});
test('Veilleuse gèle une créature adverse', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'dune-marchante');
  poser(d, 'joueur', ids[5], cible.id); assert.ok(cible.gelToursRestants > 0);
});
test('En PvP, le Traqueur exige deux attaquants et ne peut en cibler qu’un', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const a = poser(d, 'sorcier', 'dune-marchante'); a.ready = true;
  const b = poser(d, 'sorcier', 'chien-du-guet'); b.ready = true;
  const nonAttaquant = poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.main.push(ids[2]);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [a.id, b.id] }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: ids[2], cibleDifferee: true }).ok);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: nonAttaquant.id }).ok, false);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: a.id }).ok);
  assert.ok(d.sorcier.main.includes('dune-marchante'));
});
test('La Veilleuse est à la fois Viking et Vampire', async () => {
  const { cardHasPrintedType } = await import('../src/games/rpgCards.js');
  const veilleuse = cardById(ids[5]);
  assert.equal(veilleuse.cost, 3, 'la Veilleuse coûte trois manas');
  assert.ok(cardHasPrintedType(veilleuse, 'Viking'));
  assert.ok(cardHasPrintedType(veilleuse, 'Vampire'));
});

test('L’arrivée différée du Gardien confère le bouclier et +0/+2 à la même cible', () => {
  const d = duel(); const allie = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main.push(ids[1]);
  const pose = rpgJouerCreature(d, 'joueur', ids[1], null, { cibleDifferee: true });
  assert.ok(pose.ok && pose.arriveeEnAttente);
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', allie.id).ok, true);
  assert.equal(allie.bouclier, 1);
  assert.deepEqual([allie.atk, allie.def, allie.pv, allie.pvMax], [2, 4, 4, 4]);
});


test('Sanguinaire : Embuscade en PvP, sans choix de cible', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const cible = poser(d, 'sorcier', 'dune-marchante'); cible.ready = true;
  rpgBlesserCreature(d, 'sorcier', cible.id, 1, 'eau', null, 'attaque');
  d.joueur.main.push(ids[3]);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [cible.id] }).ok);
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: ids[3], cibleDifferee: true });
  assert.equal(res.ok, true); assert.equal(cible.pv, 1); assert.ok(!d.arriveeEnAttente);
});

test('le Sanguinaire est révélé au Souk et limité à un exemplaire mythique', async () => {
  const { carteReveleePar, COLLECTION_DEPART } = await import('../src/games/rpgCollection.js');
  const { cardCopyLimit } = await import('../src/games/rpgCards.js');
  assert.equal(cardCopyLimit(cardById(ids[3])), 1);
  assert.equal(COLLECTION_DEPART.includes(ids[3]), false);
  assert.equal(carteReveleePar(ids[3])?.etageId, 'necropole-4');
});

test('Traqueur : le coût en jeu, y compris le surcoût d’une arme, décide du sort de la cible', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'chien-du-guet');
  cible.coutBonusArme = 2; // coût imprimé 2, coût en jeu 4
  poser(d, 'joueur', ids[2], cible.id);
  assert.ok(d.sorcier.main.includes('chien-du-guet'));
  assert.ok(!d.sorcier.cimetiere.includes('chien-du-guet'));
});

test('Traqueur : un bouclier bloque l’effet et une destruction déclenche la capacité de mort', () => {
  const d = duel();
  const ghul = poser(d, 'sorcier', 'ghul-des-cendres');
  const cible = poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'joueur', ids[2], ghul.id);
  assert.ok(d.sorcier.cimetiere.includes('ghul-des-cendres'));
  // Le Ghul conserve son déclencheur de destruction (choix de la cible par l’IA).
  assert.ok(d.joueur.creatures.some((entite) => entite.pv < entite.pvMax), 'le Ghul a blessé une créature alliée');
  const protegee = poser(d, 'sorcier', 'chien-du-guet');
  protegee.bouclier = 1;
  d.joueur.main.push(ids[2]);
  assert.equal(rpgJouerCreature(d, 'joueur', ids[2], protegee.id).ok, true);
  assert.ok(d.sorcier.creatures.includes(protegee));
  assert.equal(protegee.bouclier, 0);
});

test('l’IA choisit et joue le Traqueur contre une cible adverse', async () => {
  const { choisirCarteIA, choisirCibleAutoIA } = await import('../src/games/rpgAI.js');
  const d = duel(); const cible = poser(d, 'joueur', 'chien-du-guet'); d.tour = 'sorcier';
  d.sorcier.main.push(ids[2]);
  assert.equal(choisirCibleAutoIA(d, 'sorcier', cardById(ids[2])), cible.id);
  const coup = choisirCarteIA(d, 'sorcier', { profil: { niveau: 'recit', style: 'equilibre', profondeur: 0, tauxErreur: 0 } });
  assert.equal(coup?.carteId, ids[2]); assert.equal(coup?.cibleId, cible.id);
  assert.ok(rpgJouerCreature(d, 'sorcier', ids[2], coup.cibleId).ok);
  assert.ok(d.joueur.cimetiere.includes('chien-du-guet'));
});
