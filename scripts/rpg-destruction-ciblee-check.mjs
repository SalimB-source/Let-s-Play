// Vérification de la destruction ciblée du Sablier — le Ghul des cendres doit
// retenir la partie jusqu'au clic de son contrôleur, et se dissiper quand plus
// aucune créature adverse n'est légale.
//
// Deux angles :
//   1. le moteur, joué pour de vrai : le mort ouvre une attente même quand une
//      seule créature est légale, la fin de tour est refusée tant que le clic
//      manque, et l'attente sans cible tombe d'elle-même ;
//   2. le source de la page : le tour du sorcier se met en pause à chaque
//      point de reprise, la fin de tour du joueur est bloquée, et le clic
//      relance la chaîne interrompue.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgBlesserCreature,
  rpgResoudreDestructionCiblee,
  rpgDissiperDestructionsSansCible,
  rpgFinDeTour,
} from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

const manaPlein = (duel, cote) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 20]));
};
const donner = (duel, cote, id) => duel[cote].main.push(id);
const poser = (duel, cote, id) => {
  donner(duel, cote, id);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} entre en jeu`);
  return res.entite;
};

// ── 1. Le moteur : le joueur désigne toujours, la partie attend ─────────────
{
  const duel = rpgNouveauDuel({
    joueurDeck: Array.from({ length: 20 }, () => 'desert'),
    sorcierDeck: Array.from({ length: 20 }, () => 'desert'),
  });
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  const ghul = poser(duel, 'joueur', 'ghul-des-cendres');
  const pvDune = dune.pv;
  rpgBlesserCreature(duel, 'joueur', ghul.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente?.length, 1,
    'une seule cible légale : le joueur doit tout de même la désigner');
  assert.equal(dune.pv, pvDune, 'aucune créature ne saigne avant le clic');

  duel.tour = 'joueur';
  duel.phase = 'principale2';
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur', 'la fin de tour est refusée tant que la cible manque');
  assert.equal(duel.destructionsEnAttente.length, 1, 'l’attente reste ouverte');

  assert.equal(rpgResoudreDestructionCiblee(duel, 'joueur', dune.id).ok, true);
  assert.equal(dune.pv, pvDune - 1, 'le clic applique enfin le dégât');
  assert.equal(duel.destructionsEnAttente.length, 0, 'l’attente est refermée');
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier', 'la partie repart une fois la cible frappée');
}

// ── 2. Le moteur : plus de cible, l'effet se dissipe ───────────────────────
{
  const duel = rpgNouveauDuel({
    joueurDeck: Array.from({ length: 20 }, () => 'desert'),
    sorcierDeck: Array.from({ length: 20 }, () => 'desert'),
  });
  const chien = poser(duel, 'sorcier', 'chien-du-guet');
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  const ghul = poser(duel, 'joueur', 'ghul-des-cendres');
  rpgBlesserCreature(duel, 'joueur', ghul.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente.length, 1, 'deux cibles : attente ouverte');

  duel.sorcier.creatures = duel.sorcier.creatures.filter((entite) => entite.id !== chien.id);
  dune.protection = { contre: 'braise', toursRestants: 1 };
  assert.equal(rpgDissiperDestructionsSansCible(duel), 1,
    'une attente sans créature légale se dissipe');
  assert.ok(duel.log.some((ligne) => /se dissipe : aucune créature adverse/.test(ligne)),
    'le journal dit que l’effet se dissipe');

  duel.tour = 'joueur';
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier', 'le tour se ferme : l’attente ne bloque plus');
}

// ── 3. La page : chaque reprise du sorcier est mise en pause ───────────────
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const corpsDe = (nom) => {
  const debut = page.indexOf(`const ${nom} = (`);
  assert.notEqual(debut, -1, `${nom} existe dans la page`);
  const fin = page.indexOf('\n  };', debut);
  return page.slice(debut, fin === -1 ? undefined : fin);
};
for (const nom of ['apresCombatSorcier', 'annoncerSuivantSorcier', 'declarerAttaqueSorcier', 'finirTourSorcier', 'passerFinTourSorcier']) {
  assert.match(corpsDe(nom), new RegExp(`pauseSiAttenteJoueur\\(${nom}\\)`),
    `${nom} s’arrête tant que le joueur doit désigner sa cible`);
}
assert.match(page, /const pauseSiAttenteJoueur = \(reprendre\) => \{\s*\n\s*if \(duel\.destructionsEnAttente\?\.\[0\]\?\.cote !== 'joueur'\) return false;\s*\n\s*repriseSorcierRef\.current = reprendre;/,
  'la pause retient la fonction à reprendre');
assert.match(corpsDe('finDuTour'), /duel\.destructionsEnAttente\?\.\[0\]\?\.cote === 'joueur'.*jouerSfx\('erreur'\)/,
  'la fin de tour du joueur est refusée tant que la cible manque');
assert.match(corpsDe('cliquerCreatureEnnemie'), /rpgResoudreDestructionCiblee\(duel, 'joueur', entite\.id\)[\s\S]*?reprendreSorcier\(\);/,
  'le clic de désignation relance le tour du sorcier');
assert.match(page, /const attenteDestructionVisible = attenteDestruction && idsCiblesDestruction\.size > 0;/,
  'sans cible légale, le bandeau ne s’accroche pas');
assert.match(page, /if \(!rpgDissiperDestructionsSansCible\(duelCourant\)\) return;\s*\n\s*force\(\);\s*\n\s*reprendreSorcier\(\);/,
  'la table dissipe elle-même une attente devenue sans objet');

console.log('✓ Destruction ciblée : le Ghul des cendres retient la partie jusqu’au clic de son contrôleur — '
  + 'fin de tour et tour du sorcier en pause, reprise après la désignation, et effet dissipé quand '
  + 'aucune créature adverse n’est plus légale.');
