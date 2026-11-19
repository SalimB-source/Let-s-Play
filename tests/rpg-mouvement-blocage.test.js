/** Le corps qui bloque : on ne se pose pas sur une créature, on ne passe pas
 *  à travers, et on ne franchit pas la trouée d'une case tenue. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { deplacementsLegaux, rpgCheminLibre, rpgDeplacerCreature } from '../src/games/rpgMouvement.js';
import { positionDe } from '../src/games/rpgChamp.js';

const MELEE = 'viking-des-neiges';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'joueur';
  const poser = (camp, id, cible = null) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const res = rpgJouerCreature(d, camp, id, cible);
    d.tour = avant;
    assert.ok(res.ok, `${id} doit entrer en jeu : ${res.raison}`);
    res.entite.ready = true;
    res.entite.bouge = false;
    res.entite.malInvocation = false;
    return res.entite;
  };
  return { d, poser };
}

/** Une créature posée sur une case précise (table de laboratoire). */
const surCase = (entite, index, camp = null) => {
  entite.emplacement = index;
  entite.avancee = true;
  if (camp) entite.campPose = camp;
  return entite;
};

test('on ne se pose pas sur une case tenue, dans son camp comme chez l’adversaire', () => {
  const { d, poser } = table();
  const nous = surCase(poser('joueur', MELEE), 2); // front, colonne 3
  const voisin = surCase(poser('joueur', MELEE), 3); // front, colonne 4
  const leur = surCase(poser('sorcier', MELEE), 2); // front adverse, colonne 3
  const legaux = deplacementsLegaux(d, 'joueur', nous.id);
  assert.equal(legaux.some((c) => c.camp === 'joueur' && c.index === 3), false,
    'la case du voisin est interdite');
  assert.equal(legaux.some((c) => c.camp === 'sorcier' && c.index === 2), false,
    'la trouée est fermée : la case d’en face est tenue');
  assert.ok(voisin && leur);
});

test('un envahisseur ferme aussi la case qu’il occupe', () => {
  const { d, poser } = table();
  // Une créature à nous a percé et se tient sur le front adverse, colonne 3.
  const perceur = surCase(poser('joueur', MELEE), 2, 'sorcier');
  const nous = surCase(poser('joueur', MELEE), 2, 'joueur');
  nous.emplacement = 2;
  nous.campPose = undefined;
  nous.avancee = true;
  const legaux = deplacementsLegaux(d, 'joueur', nous.id);
  assert.equal(legaux.some((c) => c.camp === 'sorcier' && c.index === 2), false,
    'la case tenue par notre propre envahisseur est occupée');
  assert.ok(perceur);
});

test('le chemin se lit : aucune case intermédiaire ne peut être franchie', () => {
  const { d, poser } = table();
  // Le seul pas de deux cases du champ traverse la ligne neutre : du front du
  // joueur (rangée 2) au fond du sorcier (rangée 0), par le front adverse.
  const depart = { rangee: 2, colonne: 2 };
  const arrivee = { rangee: 0, colonne: 2 };
  assert.equal(rpgCheminLibre(d, depart, arrivee), true, 'la trouée est vide : le chemin est ouvert');
  surCase(poser('sorcier', MELEE), 2); // front adverse, colonne 3
  assert.equal(rpgCheminLibre(d, depart, arrivee), false,
    'un corps sur la trouée arrête le chemin : on ne passe pas à travers');
  // La case d'arrivée, elle, se lit dans `casesOccupees` : le chemin ne juge
  // que ce qu'on traverse.
  assert.equal(rpgCheminLibre(d, depart, { rangee: 1, colonne: 2 }), true,
    'le pas d’une case n’a pas de milieu — c’est la destination qui est contrôlée');
});

test('le déplacement refuse une case tenue, même si le pas est légal par ailleurs', () => {
  const { d, poser } = table();
  const nous = surCase(poser('joueur', MELEE), 2);
  surCase(poser('joueur', MELEE), 3);
  const res = rpgDeplacerCreature(d, 'joueur', nous.id, { camp: 'joueur', index: 3 });
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'case', 'le corps du voisin arrête le pas');
  assert.equal(nous.emplacement, 2, 'la créature n’a pas bougé');
  assert.ok(!nous.bouge, 'son pas n’est pas consommé');
});
