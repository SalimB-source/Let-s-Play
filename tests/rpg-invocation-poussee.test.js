/** L'invocation sous occupation.
 *
 *  Une ligne d'arrivée envahie ne bloque plus la pose : l'envahisseur de la
 *  colonne choisie est repoussé d'une case (chaîne comprise), puis la créature
 *  s'installe normalement, sur la ligne de sa fiche. Une créature à nous, elle,
 *  ne se laisse pas pousser : sa case reste prise. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { positionDe } from '../src/games/rpgChamp.js';
import { rpgCasesPose, rpgPousserEnvahisseur } from '../src/games/rpgRecul.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';
// Un tireur : il entre par le fond, la ligne que ces cas envahissent.
const TIREUR = 'archere-viking-du-givre';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    d[camp].invocationNormaleJouee = false;
  }
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id, options = {}) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id, null, options);
    d.tour = avant;
    return resultat;
  };
  /** Un envahisseur du sorcier posé sur une case de **notre** fond. */
  const envahir = (colonne) => {
    const resultat = poser('sorcier', MELEE);
    assert.ok(resultat.ok, `l'envahisseur doit entrer : ${resultat.raison}`);
    const entite = resultat.entite;
    entite.emplacement = 4 + colonne;
    entite.campPose = 'joueur';
    entite.avancee = true;
    entite.ready = true;
    entite.malInvocation = false;
    return entite;
  };
  return { d, poser, envahir };
}

test('une case envahie est une case d’arrivée : l’envahisseur recule', () => {
  const { d, envahir } = table();
  const envahisseur = envahir(2);
  const case2 = rpgCasesPose(d, 'joueur').find((c) => c.index === 6);
  assert.ok(case2.occupant, 'la case est tenue par l’envahisseur');
  assert.equal(case2.propre, false);
  assert.equal(case2.poussable, true, 'la chaîne derrière lui est libre : il peut reculer');

  const pose = (() => {
    d.joueur.main.push(TIREUR);
    d.joueur.invocationNormaleJouee = false;
    return rpgJouerCreature(d, 'joueur', TIREUR, null, { emplacement: 6 });
  })();
  assert.ok(pose.ok, `la pose doit aboutir : ${pose.raison}`);
  assert.equal(pose.entite.emplacement, 6, 'la créature prend la case libérée');
  assert.deepEqual(positionDe(envahisseur, 'sorcier'),
    { camp: 'joueur', index: 2, rangee: 2, colonne: 2 },
    'l’envahisseur recule d’une case vers son camp, même colonne');
  assert.match(d.log.join(' '), /repoussée d’une case/, 'le journal raconte la poussée');
});

test('une chaîne d’envahisseurs recule d’un cran', () => {
  const { d, envahir } = table();
  const devant = envahir(1);
  const derriere = (() => {
    const entite = envahir(1);
    // Le second se glisse derrière le premier, sur notre front (rangée 2).
    entite.emplacement = 1;
    entite.campPose = 'joueur';
    return entite;
  })();
  const res = rpgPousserEnvahisseur(d, 'joueur', 5);
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.reculs.length, 2, 'les deux envahisseurs de la colonne reculent');
  assert.equal(positionDe(devant, 'sorcier').rangee, 2, 'il recule sur notre front');
  assert.equal(positionDe(derriere, 'sorcier').rangee, 1, 'et pousse celui de devant');
});

test('l’arrière entièrement envahi ne refuse plus la pose', () => {
  const { d, envahir } = table();
  for (let colonne = 0; colonne < 4; colonne += 1) envahir(colonne);
  const ouvertes = rpgCasesPose(d, 'joueur').filter((c) => c.poussable);
  assert.equal(ouvertes.length, 4, 'les quatre colonnes sont dégageables');
  d.joueur.main.push(TIREUR);
  const pose = rpgJouerCreature(d, 'joueur', TIREUR);
  assert.ok(pose.ok, `la pose doit aboutir : ${pose.raison}`);
  assert.ok(pose.entite.emplacement >= 4, 'elle entre bien par le fond, sa ligne');
});

test('au bord du plateau, personne ne bouge', () => {
  const { d, envahir } = table();
  // Une colonne pleine de son fond jusqu'au nôtre : reculer d'un cran
  // sortirait le premier du plateau.
  const ranger = (entite, rangee) => {
    if (rangee >= 2) { entite.campPose = 'joueur'; entite.emplacement = (rangee - 2) * 4; }
    else { delete entite.campPose; entite.emplacement = (rangee === 1 ? 0 : 4); }
    entite.avancee = true;
    return entite;
  };
  const rangees = [3, 2, 1, 0];
  const troupes = rangees.map((rangee) => ranger(envahir(0), rangee));
  assert.deepEqual(troupes.map((e) => positionDe(e, 'sorcier').rangee), rangees);

  const res = rpgPousserEnvahisseur(d, 'joueur', 4);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'bord');
  assert.deepEqual(troupes.map((e) => positionDe(e, 'sorcier').rangee), rangees,
    'aucun envahisseur n’a bougé');
  const case5 = rpgCasesPose(d, 'joueur').find((c) => c.index === 4);
  assert.equal(case5.poussable, false);
  d.joueur.main.push(TIREUR);
  const pose = rpgJouerCreature(d, 'joueur', TIREUR, null, { emplacement: 4 });
  assert.equal(pose.ok, false, 'une case bloquée ne s’ouvre pas');
});

test('une créature alliée ne se pousse pas', () => {
  const { d } = table();
  d.joueur.invocationNormaleJouee = false;
  d.joueur.main.push(MELEE);
  const nôtre = rpgJouerCreature(d, 'joueur', MELEE, null, { emplacement: 5 });
  assert.ok(nôtre.ok, nôtre.raison);
  nôtre.entite.emplacement = 5;
  const case5 = rpgCasesPose(d, 'joueur').find((c) => c.index === 5);
  assert.equal(case5.propre, true, 'la case est à nous');
  assert.equal(case5.poussable, false, 'un allié ne se pousse pas');
  assert.equal(rpgPousserEnvahisseur(d, 'joueur', 5).raison, 'chez-nous');
  assert.equal(nôtre.entite.emplacement, 5, 'l’allié n’a pas bougé');
});

test('sans les lignes, la règle ne s’applique pas', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .9 });
  assert.deepEqual(rpgCasesPose(d, 'joueur'), []);
  assert.equal(rpgPousserEnvahisseur(d, 'joueur', 5).raison, 'sans-lignes');
});
