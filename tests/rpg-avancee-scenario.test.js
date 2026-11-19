/** Le scénario complet du palier 2, joué tour par tour : avancer d'une case,
 *  franchir par une trouée, frapper devant soi — et le tireur qui atteint le
 *  sorcier depuis le front adverse. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { deplacementsLegaux, rpgDeplacerCreature, rpgPeutBouger } from '../src/games/rpgMouvement.js';
import { campPoseDe, distanceEntreCreatures, positionDe } from '../src/games/rpgChamp.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';
const front = (colonne) => colonne;
const fond = (colonne) => 5 + colonne;

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    return resultat.entite;
  };
  return { d, poser };
}

/** Le tour suivant : les créatures peuvent de nouveau avancer et frapper. */
function nouveauTour(d) {
  for (const entite of d.joueur.creatures) { entite.bouge = false; entite.attaquee = false; }
}

const distance = (d, entite, proie, coteProie = 'sorcier') => distanceEntreCreatures(entite, 'joueur', proie, coteProie);

test('la mêlée traverse en deux tours, puis frappe sa proie du fond adverse', () => {
  const { d, poser } = table();
  const melee = poser('joueur', MELEE);
  // Toute créature entre par l'arrière : elle a déjà gagné le front d'un pas.
  melee.emplacement = front(0);
  melee.avancee = true;
  const proie = poser('sorcier', MELEE);
  proie.emplacement = fond(2);
  proie.avancee = true;

  assert.equal(positionDe(melee, 'joueur').rangee, 2, 'au départ : notre front');
  const casesDuPremierTour = deplacementsLegaux(d, 'joueur', melee.id);
  assert.ok(casesDuPremierTour.some((c) => c.camp === 'joueur'), 'elle peut manœuvrer chez elle');
  // Notre front touche le front adverse : la trouée est à un pas.
  const trouee = casesDuPremierTour.find((c) => c.rangee === 1);
  assert.ok(trouee, 'le front adverse est vide : la trouée est ouverte');
  assert.ok(rpgDeplacerCreature(d, 'joueur', melee.id, trouee).ok);
  assert.equal(campPoseDe(melee, 'joueur'), 'sorcier', 'elle a passé la ligne');
  assert.equal(rpgPeutBouger(d, 'joueur', melee), false, 'une seule case par tour');
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).cibles, [],
    'la proie du fond est encore à deux cases');

  nouveauTour(d);
  const casesDuSecondTour = deplacementsLegaux(d, 'joueur', melee.id);
  assert.ok(casesDuSecondTour.length > 0);
  const [approche] = casesDuSecondTour
    .map((c) => ({ c, d: distanceEntreCreatures({ emplacement: c.index, campPose: c.camp }, 'joueur', proie, 'sorcier') }))
    .filter((x) => Number.isFinite(x.d))
    .sort((a, b) => a.d - b.d);
  assert.ok(approche, 'au moins une case mène vers la proie');
  assert.ok(rpgDeplacerCreature(d, 'joueur', melee.id, approche.c).ok);
  assert.equal(distance(d, melee, proie), 1, 'elle est au contact');
  assert.equal(melee.attaquee, false, 'avancer ne consomme pas l’attaque');
  assert.ok(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).cibles.includes(proie.id),
    'elle frappe de sa nouvelle case');
});

test('un tireur posté au front adverse atteint le sorcier ; une mêlée non', () => {
  const { d, poser } = table();
  const archer = poser('joueur', DISTANCE);
  const melee = poser('joueur', MELEE);
  for (const entite of [archer, melee]) {
    entite.emplacement = front(2);
    entite.campPose = 'sorcier';
    entite.avancee = true;
    entite.bouge = true;
  }
  assert.equal(positionDe(archer, 'joueur').rangee, 1, 'sur le front adverse');
  const tir = rpgCiblesIndividuellesClassique(d, 'joueur', archer.id);
  assert.equal(tir.directe, true, 'deux cases : le sorcier est à portée du tir');
  assert.deepEqual(tir.cibles, []);
  const coup = rpgCiblesIndividuellesClassique(d, 'joueur', melee.id);
  assert.equal(coup.directe, false, 'une mêlée au front adverse est encore à deux cases du sorcier');
});

test('la trouée se referme : un corps devant empêche le passage', () => {
  const { d, poser } = table();
  const melee = poser('joueur', MELEE);
  const garde = poser('sorcier', MELEE);
  garde.emplacement = front(positionDe(melee, 'joueur').colonne);
  garde.avancee = true;
  const cases = deplacementsLegaux(d, 'joueur', melee.id);
  assert.equal(cases.some((c) => c.camp === 'sorcier'), false, 'aucune case chez lui tant que le front est tenu');
  assert.ok(cases.length > 0, 'elle peut toujours manœuvrer chez elle');
});

test('franchir ne se fait jamais en diagonale', () => {
  const { d, poser } = table();
  const melee = poser('joueur', MELEE);
  const cases = deplacementsLegaux(d, 'joueur', melee.id);
  assert.ok(cases.every((c) => c.camp === 'joueur' || c.colonne === positionDe(melee, 'joueur').colonne),
    'chez l’adversaire, seulement droit devant');
});
