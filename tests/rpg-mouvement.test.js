/** Le mouvement : une case par tour, puis la frappe — et les portées qui en
 * découlent (une case pour la mêlée, deux pour un tir, sorcier compris). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { deplacementsLegaux, rpgDeplacerCreature, rpgPeutBouger } from '../src/games/rpgMouvement.js';
import { distanceAuSorcierAdverse, distanceEntreCreatures, positionDe } from '../src/games/rpgChamp.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id, options) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id, null, options);
    d.tour = avant;
    if (!resultat.ok) return resultat;
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    return resultat;
  };
  const poserOk = (camp, id, options) => {
    const resultat = poser(camp, id, options);
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    return resultat.entite;
  };
  return { d, poserOk };
}

const surCase = (entite, index) => {
  entite.emplacement = index;
  entite.avancee = true;
  return entite;
};

test('la grille : quatre rangées, le sorcier derrière le fond', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const archer = poserOk('joueur', DISTANCE);
  const cible = poserOk('sorcier', MELEE);
  assert.equal(positionDe(melee, 'joueur').rangee, 2, 'notre front est la rangée 2');
  assert.equal(positionDe(archer, 'joueur').rangee, 3, 'notre fond est la rangée 3');
  assert.equal(positionDe(cible, 'sorcier').rangee, 1, 'le front adverse est la rangée 1');
  // Le sorcier adverse se tient derrière son fond : 3 depuis notre front, 4
  // depuis notre fond.
  assert.equal(distanceAuSorcierAdverse(melee, 'joueur'), 3);
  assert.equal(distanceAuSorcierAdverse(archer, 'joueur'), 4);
  assert.equal(d.lignes, true);
});

test('la mêlée frappe à une case : devant, en diagonale', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const face = poserOk('sorcier', MELEE);
  const cote = poserOk('sorcier', MELEE);
  assert.equal(distanceEntreCreatures(melee, 'joueur', face, 'sorcier'), 1, 'en face : une case');
  // Le second est posé à la colonne suivante de son front : la diagonale.
  assert.equal(positionDe(cote, 'sorcier').colonne, 1);
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', melee.id);
  assert.deepEqual(choix.cibles.sort(), [face.id, cote.id].sort(),
    'la diagonale est à portée, comme la case d’en face');
});

test('la mêlée n’atteint pas le fond adverse tant qu’elle n’a pas avancé', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const fond = poserOk('sorcier', DISTANCE);
  assert.equal(positionDe(fond, 'sorcier').rangee, 0, 'la tireuse adverse est au fond');
  assert.equal(distanceEntreCreatures(melee, 'joueur', fond, 'sorcier'), 2);
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).cibles, []);
});

test('un tireur frappe à deux cases : le front adverse, pas son fond', () => {
  const { d, poserOk } = table();
  const archer = poserOk('joueur', DISTANCE);
  const front = poserOk('sorcier', MELEE);
  const fond = poserOk('sorcier', DISTANCE);
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', archer.id);
  assert.deepEqual(choix.cibles, [front.id], 'seul le front adverse est à deux cases');
  assert.equal(distanceEntreCreatures(archer, 'joueur', fond, 'sorcier'), 3);
});

test('le tireur avancé gagne le fond adverse — et ne perd pas son tir', () => {
  const { d, poserOk } = table();
  const archer = poserOk('joueur', DISTANCE);
  const front = poserOk('sorcier', MELEE);
  const fond = poserOk('sorcier', DISTANCE);
  // Il avance d'une case, de son fond vers son front.
  const pas = deplacementsLegaux(d, 'joueur', archer.id)
    .find((c) => c.rangee === 2 && c.colonne === positionDe(archer, 'joueur').colonne);
  assert.ok(pas, 'le tireur peut avancer au front');
  assert.equal(rpgDeplacerCreature(d, 'joueur', archer.id, pas).ok, true);
  assert.equal(positionDe(archer, 'joueur').rangee, 2);
  assert.equal(rpgPeutBouger(d, 'joueur', archer), false, 'une seule avancée par tour');
  assert.ok(!archer.attaquee, 'avancer n’est pas attaquer');
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', archer.id);
  assert.deepEqual(choix.cibles.sort(), [front.id, fond.id].sort(),
    'à deux cases du fond adverse, il le voit enfin');
});

test('on n’avance que d’une case, et jamais sur un corps', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const voisin = poserOk('joueur', MELEE);
  const colonne = positionDe(melee, 'joueur').colonne;
  const cases = deplacementsLegaux(d, 'joueur', melee.id);
  assert.ok(cases.length, 'des cases restent libres');
  assert.ok(cases.every((c) => Math.abs(c.rangee - 2) <= 1 && Math.abs(c.colonne - colonne) <= 1),
    'aucune case à plus d’une case');
  // La case du voisin (front, colonne suivante) n'est jamais proposée.
  const caseVoisin = positionDe(voisin, 'joueur');
  assert.ok(!cases.some((c) => c.camp === 'joueur' && c.index === voisin.emplacement),
    `la case du voisin (${caseVoisin.colonne}) est occupée`);
});

test('on ne franchit la ligne neutre que par une trouée, droit devant', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const colonne = positionDe(melee, 'joueur').colonne;
  const avant = deplacementsLegaux(d, 'joueur', melee.id);
  const traversee = avant.filter((c) => c.camp === 'sorcier');
  assert.equal(traversee.length, 1, 'une seule case de l’autre côté, celle d’en face');
  assert.equal(traversee[0].colonne, colonne);

  // Un corps adverse en face bouche la trouée : plus aucun passage.
  const garde = poserOk('sorcier', MELEE);
  surCase(garde, colonne);
  const apres = deplacementsLegaux(d, 'joueur', melee.id).filter((c) => c.camp === 'sorcier');
  assert.deepEqual(apres, [], 'aucun passage à travers un corps');
});

test('avancer chez l’adversaire change la grille, pas la propriété', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const colonne = positionDe(melee, 'joueur').colonne;
  const pas = deplacementsLegaux(d, 'joueur', melee.id).find((c) => c.camp === 'sorcier');
  const res = rpgDeplacerCreature(d, 'joueur', melee.id, pas);
  assert.equal(res.ok, true);
  assert.equal(res.franchit, true);
  const position = positionDe(melee, 'joueur');
  assert.equal(position.camp, 'sorcier', 'elle occupe une case du camp adverse');
  assert.equal(position.rangee, 1, 'le front adverse');
  assert.equal(position.colonne, colonne);
  assert.ok(d.joueur.creatures.includes(melee), 'elle reste une créature du joueur');
});

test('chez l’adversaire, la mêlée atteint le fond — et le sorcier', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  const fond = poserOk('sorcier', DISTANCE);
  const colonne = positionDe(melee, 'joueur').colonne;
  surCase(melee, colonne); // il est passé au front adverse
  melee.campPose = 'sorcier';
  assert.equal(distanceEntreCreatures(melee, 'joueur', fond, 'sorcier'), 1, 'le fond est derrière');
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', melee.id);
  assert.deepEqual(choix.cibles, [fond.id], 'la mêlée frappe le fond adverse d’une case');
  assert.equal(choix.directe, false, 'il reste une cible : pas de frappe directe');
});

test('le sorcier se frappe à portée : deux cases pour un tir, une pour la mêlée', () => {
  const { d, poserOk } = table();
  const archer = poserOk('joueur', DISTANCE);
  // Champ adverse vide : la frappe directe ne dépend plus que de la portée.
  const depuisFond = rpgCiblesIndividuellesClassique(d, 'joueur', archer.id);
  assert.equal(depuisFond.directe, false, 'notre fond est à quatre cases du sorcier');

  const colonne = positionDe(archer, 'joueur').colonne;
  surCase(archer, colonne); // front adverse : deux cases du sorcier
  archer.campPose = 'sorcier';
  assert.equal(distanceAuSorcierAdverse(archer, 'joueur'), 2);
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', archer.id).directe, true,
    'un tireur posté au front adverse atteint le sorcier');

  const melee = poserOk('joueur', MELEE);
  surCase(melee, colonne + 1);
  melee.campPose = 'sorcier';
  assert.equal(distanceAuSorcierAdverse(melee, 'joueur'), 2);
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).directe, false,
    'une mêlée au front adverse est encore trop loin du sorcier');

  surCase(melee, 5 + colonne + 1); // fond adverse : une case du sorcier
  assert.equal(distanceAuSorcierAdverse(melee, 'joueur'), 1);
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).directe, true,
    'la mêlée qui a percé les deux lignes frappe le sorcier');
});

test('sans les lignes, personne ne bouge : le champ de cinq cases reste figé', () => {
  const { d, poserOk } = table();
  const melee = poserOk('joueur', MELEE);
  delete d.lignes;
  assert.equal(rpgPeutBouger(d, 'joueur', melee), false);
  assert.deepEqual(deplacementsLegaux(d, 'joueur', melee.id), []);
});

test('l’IA avance vers la proie la plus proche, et ne bouge pas si elle frappe', async () => {
  const { rpgIABougerCreatures, destinationIA } = await import('../src/games/rpgMouvementIA.js');
  const { d, poserOk } = table();
  // Le sorcier a une mêlée au fond (elle doit avancer) et une mêlée au front
  // qui a déjà une proie à une case.
  const fondAdverse = poserOk('sorcier', MELEE);
  fondAdverse.emplacement = 5;
  const avantAdverse = poserOk('sorcier', MELEE);
  const notreFront = poserOk('joueur', MELEE);
  d.tour = 'sorcier';

  assert.equal(destinationIA(d, 'sorcier', avantAdverse), null, 'elle a une proie à une case : elle reste');
  const cible = destinationIA(d, 'sorcier', fondAdverse);
  assert.ok(cible, 'la mêlée du fond veut avancer');
  assert.ok(cible.rangee < 3, 'elle avance vers le joueur');

  const bouges = rpgIABougerCreatures(d, 'sorcier');
  assert.equal(bouges.length, 1, 'une seule créature avait à gagner');
  assert.equal(fondAdverse.bouge, true);
  assert.equal(notreFront.emplacement >= 0, true);
  // Elle est maintenant à une case de sa proie : elle pourra frapper.
  const { distanceEntreCreatures } = await import('../src/games/rpgChamp.js');
  assert.equal(distanceEntreCreatures(fondAdverse, 'sorcier', notreFront, 'joueur'), 1);
});
