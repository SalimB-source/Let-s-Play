/** Toute invocation entre en jeu **avec une case**, ou n'entre pas.
 *
 *  La garde d'invocation comptait les places libres sur nos seules créatures
 *  (`casesLibresPour`) : une case tenue par un envahisseur y passait pour
 *  libre. Quand la ligne d'arrivée était pleine et que le dernier envahisseur
 *  ne pouvait pas être poussé (bord, Site), `placerDansEmplacement` rendait la
 *  main **sans poser** : la créature entrait sans case — et frappait alors de
 *  n'importe où (`rpgPortees.js`). La garde lit désormais la même table que la
 *  pose (`rpgCasesPose`, `rpgRecul.js`), sur la ligne de la carte, et refuse
 *  avant paiement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

// Un tireur : il tient la ligne du fond, celle de sa fiche.
const PETITE = 'archere-viking-du-givre';
const MELEE = 'viking-des-neiges';
const SITE = 'source-de-bimini';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'joueur';
  const jouer = (id) => {
    d.joueur.invocationNormaleJouee = false;
    d.joueur.main.push(id);
    return rpgJouerCreature(d, 'joueur', id, null);
  };
  // La ligne arrière du joueur : quatre tireurs (cases 5 à 8).
  for (let i = 0; i < 4; i += 1) assert.ok(jouer(PETITE).ok, 'la quatrième créature entre en jeu');
  return { d, jouer };
}

/** Un Site du sorcier avancé chez nous, sur la dernière case libre du fond. */
function envahisseurIndeboulonnable(d, index) {
  d.sorcier.creatures.push({
    id: 'site-envahisseur', carteId: SITE, name: 'Source de Bimini',
    pv: 1, pvMax: 1, atk: 0, ready: true, emplacement: index, campPose: 'joueur',
  });
}

test('la dernière case du fond tenue par un Site adverse : l’invocation est refusée', () => {
  const { d, jouer } = table();
  envahisseurIndeboulonnable(d, 9);
  const avant = d.joueur.creatures.length;
  const res = jouer(PETITE);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'champ-plein', 'refusée avant paiement, pas posée sans case');
  assert.equal(d.joueur.creatures.length, avant, 'aucune créature fantôme sur la table');
});

test('la dernière case libre : l’invocation y entre avec sa case', () => {
  const { d, jouer } = table();
  const res = jouer(PETITE);
  assert.ok(res.ok, `la cinquième créature entre : ${res.raison}`);
  assert.equal(res.entite.emplacement, 9, 'la première case libre du fond');
  assert.ok(d.joueur.creatures.every((e) => Number.isInteger(e.emplacement)),
    'toute créature en jeu a une case');
});

test('un envahisseur poussable ouvre la place, et la créature a bien sa case', () => {
  const { d, jouer } = table();
  // Une mêlée du sorcier sur la dernière case du fond : elle recule d'une case.
  d.sorcier.creatures.push({
    id: 'envahisseur', carteId: MELEE, name: 'Viking des neiges',
    pv: 1, pvMax: 1, atk: 3, ready: true, emplacement: 9, campPose: 'joueur',
  });
  const res = jouer(PETITE);
  assert.ok(res.ok, `l’invocation pousse l’envahisseur : ${res.raison}`);
  assert.equal(res.entite.emplacement, 9, 'elle prend la case ouverte');
  const envahisseur = d.sorcier.creatures.find((e) => e.id === 'envahisseur');
  assert.equal(envahisseur.emplacement, 4, 'et l’envahisseur recule chez nous, au front');
  assert.ok(d.joueur.creatures.every((e) => Number.isInteger(e.emplacement)));
  assert.ok(d.sorcier.creatures.every((e) => Number.isInteger(e.emplacement)));
});
