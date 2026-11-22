import test from 'node:test';
import assert from 'node:assert/strict';
import { armeById, cardById, magieById } from '../src/games/rpgCards.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerAttaque, rpgAttaquerSorcier,
} from '../src/games/rpgDuel.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
const mana = (duel, cote) => { duel[cote].mana = { braise: 10, sable: 10, eau: 10, neige: 10, tenebres: 10 }; };
const poser = (duel, cote, id) => {
  duel[cote].main.push(id); mana(duel, cote);
  const resultat = rpgJouerCreature(duel, cote, id);
  assert.equal(resultat.ok, true);
  return resultat.entite;
};
const equiper = (duel, cote, id, porteur) => {
  duel[cote].main.push(id); mana(duel, cote);
  const resultat = rpgJouerArme(duel, cote, id, porteur.id);
  assert.equal(resultat.ok, true, JSON.stringify(resultat));
  return resultat;
};
// Une créature freshly jouée ne peut pas attaquer : on lève le mal d'invocation.
const prete = (entite) => { entite.ready = true; entite.malInvocation = false; return entite; };

test('Braise et sable est une arme à distance du catalogue, pas une magie ni une créature Harakiri', () => {
  const carte = cardById('braise-et-sable');
  assert.equal(carte.kind, 'arme');
  assert.equal(armeById(carte.id), carte);
  assert.equal(magieById(carte.id), null);
  assert.equal(carte.honneur, undefined);
  assert.equal(carte.porteeArme, 'distance', 'Braise et sable est une arme à distance');
  assert.match(carte.text, /^Arme \(À distance\)/, 'la fiche annonce la portée à distance');
  assert.deepEqual(carte.bonus, { atk: 1, def: 0 });
  assert.deepEqual(carte.donne, { coupRapide: true, coupCritique: 0.25 });
  assert.equal(carte.durabilite, 1);
  assert.match(carte.text, /Endurance 1/);
});

test('une arme à distance ne s’équipe pas sur une créature de mêlée', () => {
  const duel = duelVide();
  const melee = poser(duel, 'joueur', 'chien-du-guet');
  duel.joueur.main.push('braise-et-sable'); mana(duel, 'joueur');
  const resultat = rpgJouerArme(duel, 'joueur', 'braise-et-sable', melee.id);
  assert.equal(resultat.ok, false, 'un porteur de mêlée ne peut pas tenir une arme à distance');
  assert.equal(resultat.raison, 'portee');
  assert.ok(duel.joueur.main.includes('braise-et-sable'), 'l’arme reste en main');
});

test('une attaque use Braise et sable et retire son bonus et ses pouvoirs à zéro', () => {
  const duel = duelVide();
  const porteur = prete(poser(duel, 'joueur', 'guetteuse-des-marees')); // 2/2 à distance
  equiper(duel, 'joueur', 'braise-et-sable', porteur);
  assert.equal(porteur.arme?.carteId, 'braise-et-sable');
  assert.equal(porteur.arme.durabilite, 1);
  assert.equal((porteur.armes ?? []).length, 0, 'la lame occupe le vrai emplacement d’arme');
  assert.equal(porteur.atk, 3);
  assert.equal(porteur.coupRapide, true);
  assert.deepEqual(porteur.coupCritique, { chance: 0.25, fois: 2 });
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', porteur.id).ok, true);
  assert.equal(porteur.arme, null);
  assert.equal(porteur.atk, 2);
  assert.equal(porteur.coupRapide, false);
  assert.equal(porteur.coupCritique, null);
  assert.ok(duel.joueur.cimetiere.includes('braise-et-sable'));
});

test('bloquer use aussi Braise et sable ; la créature survit sans son arme', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  const porteur = poser(duel, 'sorcier', 'guetteur-du-beffroi'); // 1/3 à distance, encaisse le chien
  equiper(duel, 'sorcier', 'braise-et-sable', porteur);
  duel.tour = 'joueur';
  const attaquant = prete(poser(duel, 'joueur', 'chien-du-guet'));
  assert.equal(rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [porteur.id] }).ok, true);
  assert.ok(duel.sorcier.creatures.includes(porteur), 'le porteur survit au blocage');
  assert.equal(porteur.arme, null);
  assert.ok(duel.sorcier.cimetiere.includes('braise-et-sable'));
});

test('équiper une autre arme à distance remplace la lame au lieu de cumuler deux armes', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'guetteuse-des-marees'); // 2/2 à distance
  equiper(duel, 'joueur', 'braise-et-sable', porteur);
  equiper(duel, 'joueur', 'arc-de-givre', porteur); // autre arme à distance, sans Attaque ciblée
  assert.equal(porteur.arme.carteId, 'arc-de-givre');
  assert.equal(porteur.arme.durabilite, 2, 'l’Arc de givre porte l’Endurance par défaut');
  assert.equal(porteur.coupRapide, false, 'l’Arc de givre ne prête pas l’Attaque ciblée');
  assert.ok(duel.joueur.cimetiere.includes('braise-et-sable'));
});
