/**
 * Le mal d'invocation ne vaut plus que pour le **pas** : une créature qui vient
 * d'arriver frappe de sa case, mais elle attend le prochain tour de son camp
 * pour avancer. Sans cette garde, l'IA posait une créature puis la faisait
 * aussitôt glisser d'une case dans le même tour — le joueur voyait un corps
 * neuf traverser le champ avant d'avoir lu sa carte.
 *
 * La Rapidité, imprimée ou accordée, lève cette attente : elle avance d'une
 * case dès l'arrivée.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { deplacementsLegaux, rpgPeutBouger, rpgDeplacerCreature } from '../src/games/rpgMouvement.js';
import { rpgIABougerUneCreature } from '../src/games/rpgMouvementIA.js';
import { rpgSouffreMalInvocation } from '../src/games/rpgStatutsCreature.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';
const RAPIDE = 'messagere-des-cendres';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => 0.9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  // Comme le moteur : la créature entre en jeu avec son mal d'invocation intact.
  const poser = (camp, id) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    return resultat.entite;
  };
  return { d, poser };
}

test('la créature posée ce tour ne bouge pas — côté joueur', () => {
  const { d, poser } = table();
  const entite = poser('joueur', MELEE);
  assert.equal(entite.malInvocation, true, 'elle arrive avec son mal d’invocation');
  assert.equal(rpgPeutBouger(d, 'joueur', entite), false, 'le pas attend le prochain tour');
  assert.deepEqual(deplacementsLegaux(d, 'joueur', entite.id), [], 'aucune case proposée');
  const resultat = rpgDeplacerCreature(d, 'joueur', entite.id, { camp: 'joueur', index: 1 });
  assert.equal(resultat.ok, false, 'le déplacement est refusé');
  assert.equal(resultat.raison, 'pas-disponible');
});

test('la créature posée ce tour ne bouge pas non plus chez le sorcier', () => {
  const { d, poser } = table();
  const entite = poser('sorcier', MELEE);
  assert.equal(rpgPeutBouger(d, 'sorcier', entite), false);
  assert.equal(rpgIABougerUneCreature(d, 'sorcier'), null,
    'l’IA ne fait pas glisser la créature qu’elle vient de poser');
  assert.equal(rpgDeplacerCreature(d, 'sorcier', entite.id, { camp: 'sorcier', index: 1 }).ok, false);
});

test('au tour suivant de son camp, la créature retrouve son pas', () => {
  const { d, poser } = table();
  const entite = poser('joueur', MELEE);
  d.tour = 'joueur';
  rpgFinDeTour(d); // → sorcier
  assert.equal(d.tour, 'sorcier');
  rpgFinDeTour(d); // → joueur : le mal d'invocation tombe
  assert.equal(d.tour, 'joueur');
  assert.equal(entite.malInvocation, false);
  assert.equal(rpgPeutBouger(d, 'joueur', entite), true);
  assert.ok(deplacementsLegaux(d, 'joueur', entite.id).length > 0, 'des cases sont proposées');
  const avant = entite.emplacement;
  const destination = deplacementsLegaux(d, 'joueur', entite.id)[0];
  const resultat = rpgDeplacerCreature(d, 'joueur', entite.id, destination);
  assert.ok(resultat.ok, 'elle avance enfin');
  assert.notEqual(entite.emplacement, avant);
});

test('la Rapidité lève l’attente : la créature rapide bouge dès son arrivée', () => {
  const { d, poser } = table();
  const entite = poser('joueur', RAPIDE);
  assert.equal(entite.rapidite, true);
  assert.equal(rpgSouffreMalInvocation(entite), false, 'la Rapidité annule le mal d’invocation');
  assert.equal(rpgPeutBouger(d, 'joueur', entite), true);
  assert.ok(deplacementsLegaux(d, 'joueur', entite.id).length > 0);
});
