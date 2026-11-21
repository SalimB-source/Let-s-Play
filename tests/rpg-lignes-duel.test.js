import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, RPG_DUEL_CARDS, cardById } from '../src/games/rpgCards.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgEmplacementsChamp } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { champMax, ligneDe, ligneDeCase, ligneObligee, frontTient, RPG_LIGNE_FRONT, RPG_LIGNE_FOND, RPG_LIGNES_CASES } from '../src/games/rpgLignes.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { etatInitial } from '../src/server/sablierArbitre.js';

// Deux cartes du catalogue, une par ligne : le Viking est un corps à corps,
// l'archère porte le trait « À distance » (l'ashigaru aussi, depuis qu'il tire
// à l'arquebuse — il ne peut donc pas servir de mêlée ici).
const MELEE = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';

function table(lignes = true) {
  // Le mode sans terrains est celui qui tient les cases : c'est lui qui pose
  // les créatures sur le champ (`emplacement`).
  // Le drapeau passe par la **fabrique** : c'est elle que la page appelle.
  // Le forcer après coup masquerait une régression (la fabrique avalait
  // `lignes` sans le recopier, et le plateau restait à cinq cases).
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes,
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
  return { d, poser, poserOk };
}

/** Table de laboratoire : poser une créature au front, ce que le jeu ne fait
 *  plus (le front se gagne case par case, `rpgMouvement.js`). */
const auFront = (entite, index, camp = 'joueur') => {
  entite.emplacement = index;
  entite.avancee = true;
  if (camp !== 'joueur') entite.campPose = camp;
  return entite;
};

test('les deux lignes ouvrent huit cases ; chaque carte entre par sa ligne', () => {
  const { d, poserOk } = table();
  assert.equal(d.lignes, true, 'la fabrique garde le drapeau des lignes');
  assert.equal(champMax(d), 8);
  const melee = poserOk('joueur', MELEE);
  const archiere = poserOk('joueur', DISTANCE);
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT, 'un corps à corps entre devant');
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND, 'une créature à distance entre derrière');
  assert.equal(melee.emplacement, 0, 'la première place du front');
  assert.equal(archiere.emplacement, 4, 'la première place du fond');
  // Les huit cases du champ portent bien les deux créatures, chacune à sa place.
  const cases = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur');
  assert.equal(cases.length, 8);
  assert.equal(cases[melee.emplacement].id, melee.id);
  assert.equal(cases[archiere.emplacement].id, archiere.id);
  assert.ok(cases.slice(0, 4).some(Boolean), 'la mêlée tient le front dès son arrivée');
});

test('le joueur choisit sa colonne, la ligne est imposée par la carte', () => {
  const { d, poserOk } = table();
  // Une case du fond demandée pour un tireur est respectée…
  const archiere = poserOk('joueur', DISTANCE, { emplacement: 7 });
  assert.equal(archiere.emplacement, 7);
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND);
  // …et une case du front pour une mêlée aussi.
  const melee = poserOk('joueur', MELEE, { emplacement: 3 });
  assert.equal(melee.emplacement, 3);
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT);
  // Une case de l'autre ligne est ignorée : la pose se rabat sur la première
  // libre de la ligne de la carte, sans casser la pose.
  const autreMelee = poserOk('joueur', MELEE, { emplacement: 7 });
  assert.equal(ligneDe(autreMelee), RPG_LIGNE_FRONT, 'le fond n’est pas une case de mêlée');
  assert.equal(autreMelee.emplacement, 0);
  // La table garde les trois cases au rafraîchissement suivant.
  const cases = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur');
  assert.equal(cases[7]?.id, archiere.id);
  assert.equal(cases[3]?.id, melee.id);
  assert.equal(cases[0]?.id, autreMelee.id);
});

test('une carte avec Envol entre par l’arrière comme les autres', () => {
  const { d, poserOk } = table();
  // L'Envol parle du passage au-dessus des corps, pas du placement : le Tengu
  // se pose au fond, et une case du front est ignorée.
  const tengu = poserOk('joueur', 'tengu-du-mont-ardent', { emplacement: 0 });
  assert.equal(tengu.emplacement, 4);
  assert.equal(ligneDe(tengu), RPG_LIGNE_FOND);
  assert.ok(d);
});

test('le fond est à deux cases : la mêlée ne l’atteint pas, même front tombé', () => {
  const { d, poserOk } = table();
  d.tour = 'sorcier';
  const mur = poserOk('joueur', MELEE); // devant, chez la cible
  auFront(mur, 2); // le front se gagne : ici, table de laboratoire
  const archiere = poserOk('joueur', DISTANCE);
  const attaquant = poserOk('sorcier', MELEE);
  auFront(attaquant, 2, 'sorcier');
  d.tour = 'sorcier';
  const cibles = () => rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id).cibles;
  assert.ok(cibles().includes(mur.id), 'la mêlée voit le front, à une case');
  assert.equal(cibles().includes(archiere.id), false, 'le fond est à deux cases : hors de portée');
  // Le front tombe : la distance, elle, ne change pas. Une mêlée doit avancer.
  d.joueur.creatures = d.joueur.creatures.filter((e) => e.id !== mur.id);
  assert.equal(frontTient(d.joueur.creatures), false);
  assert.equal(cibles().includes(archiere.id), false,
    'front tombé, le fond reste à deux cases : c’est la portée qui décide, plus la ligne');
});

test('la portée vaut pour tous : l’Infiltration ne traverse plus la ligne', () => {
  const { d, poserOk } = table();
  d.tour = 'joueur';
  const mur = poserOk('joueur', MELEE);
  auFront(mur, 2);
  const archiere = poserOk('joueur', DISTANCE);
  d.tour = 'sorcier';
  const attaquant = poserOk('sorcier', MELEE);
  auFront(attaquant, 2, 'sorcier');
  // Une mêlée infiltrée reste une mêlée : le trait ignore la priorité des
  // Défenseurs, pas la distance. Le fond est à deux cases.
  attaquant.infiltration = true;
  assert.equal(rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id).cibles.includes(archiere.id), false,
    'l’Infiltration ne donne pas de portée');
  // L'Attaque ciblée, elle, est un tir : deux cases, comme « À distance ».
  attaquant.coupRapide = true;
  assert.ok(rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id).cibles.includes(archiere.id),
    'l’Attaque ciblée porte à deux cases');
});


test('un Défenseur entre devant, comme sa fiche le dit', () => {
  const { d, poserOk } = table();
  const defenseur = poserOk('joueur', 'guerrier-au-bouclier-rond');
  assert.equal(ligneDe(defenseur), RPG_LIGNE_FRONT);
  assert.equal(defenseur.emplacement, 0);
  assert.ok(d);
});

test('la ligne pleine arrête la pose : l’autre ligne ne sert pas de repli', () => {
  const { d, poser, poserOk } = table();
  const front = [];
  for (let i = 0; i < 4; i += 1) front.push(poserOk('joueur', MELEE));
  assert.equal(front.filter((e) => ligneDe(e) === RPG_LIGNE_FRONT).length, 4);
  assert.deepEqual(front.map((e) => e.emplacement), [0, 1, 2, 3]);
  // La cinquième mêlée n'a plus de case d'arrivée, même avec le fond vide.
  const refus = poser('joueur', MELEE);
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'champ-plein');
  // Un tireur, lui, entre au fond : chaque ligne a son quota.
  const nouvelle = poserOk('joueur', DISTANCE);
  assert.equal(nouvelle.emplacement, 4, 'la première place du fond');
  assert.equal(d.joueur.creatures.length, 5, 'quatre devant, une derrière');
});

test('sans le drapeau des lignes, rien ne change : quatre cases, tout le monde devant', () => {
  const { d, poserOk } = table(false);
  assert.equal(champMax(d), 4);
  assert.equal(d.lignes, undefined);
  const archiere = poserOk('joueur', DISTANCE);
  const melee = poserOk('joueur', MELEE);
  assert.equal(ligneDe(archiere), RPG_LIGNE_FRONT, 'hors lignes, la ligne du fond n’existe pas');
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT);
  assert.ok(archiere.emplacement < 4 && melee.emplacement < 4);
});

test('le duel en ligne ouvre aussi les deux lignes, dès l’état initial', () => {
  // L'arbitre crée ses duels de son côté : sans le drapeau, la première pose
  // d'un joueur partirait sur une rangée que l'autre ne voit pas.
  const etat = etatInitial([MELEE, DISTANCE], [MELEE], 'graine-des-deux-lignes');
  assert.equal(etat.lignes, true);
  assert.equal(champMax(etat), 8);
});

test('deux cases pour tout tir : le front adverse, jamais son fond sans avancer', () => {
  const { d, poserOk } = table();
  d.tour = 'joueur';
  const mur = poserOk('joueur', MELEE);
  auFront(mur, 2);
  const fond = poserOk('joueur', DISTANCE);
  d.tour = 'sorcier';
  // Un tireur « À distance » qui n'a **pas** l'Attaque ciblée : c'est la
  // portée seule qui est jugée ici.
  const tireur = poserOk('sorcier', 'ashigaru-des-braises');
  assert.equal(tireur.distance, true);
  assert.equal(tireur.coupRapide, false);
  const cibles = () => rpgCiblesIndividuellesClassique(d, 'sorcier', tireur.id).cibles;
  assert.ok(cibles().includes(mur.id), 'le tireur voit le front, à deux cases');
  assert.equal(cibles().includes(fond.id), false,
    'le fond est à trois cases de son fond : la distance le protège');
  // L'Attaque ciblée ne change plus rien à la distance : elle frappe avant,
  // pas plus loin.
  tireur.coupRapide = true;
  assert.equal(cibles().includes(fond.id), false, 'l’Attaque ciblée ne porte pas plus loin');
});

test('une créature retrouvée au front, sans avoir avancé, se redessine à l’arrière', () => {
  const { d, poserOk } = table();
  d.tour = 'joueur';
  const melee = poserOk('joueur', MELEE);
  const archiere = poserOk('joueur', DISTANCE);
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND);
  // Partie reprise : la case de l'archère est une case du front, et rien ne dit
  // qu'elle y est arrivée par le pas (`avancee` absent) — elle rentre au fond.
  archiere.emplacement = 2;
  const cases = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur');
  const place = cases.findIndex((entite) => entite?.id === archiere.id);
  assert.equal(ligneDeCase(place), RPG_LIGNE_FOND, 'elle réapparaît derrière, jamais au front');
  assert.equal(cases[2]?.id, undefined, 'la case 2 du front reste libre');
  assert.equal(cases.findIndex((entite) => entite?.id === melee.id), melee.emplacement,
    'la mêlée garde sa case');
  // Une créature qui a bel et bien avancé, elle, garde sa case du front.
  melee.emplacement = 2;
  melee.avancee = true;
  const apres = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur');
  assert.equal(ligneDeCase(apres.findIndex((entite) => entite?.id === melee.id)), RPG_LIGNE_FRONT);
});

test('hors deux lignes, une créature garde sa case, quel que soit son trait', () => {
  // Le champ d'une seule ligne (cinq cases) ne réordonne rien : la remise dans
  // la ligne ne s'applique qu'au plateau à deux lignes.
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9 });
  d.joueur.creatures = [
    { id: 'a', carteId: DISTANCE, emplacement: 0 },
    { id: 'b', carteId: MELEE, emplacement: 2 },
  ];
  const cases = rpgEmplacementsChamp(d.joueur, RPG_LIGNES_CASES);
  assert.equal(cases[0]?.id, 'a');
  assert.equal(cases[2]?.id, 'b');
  assert.equal(cases.filter(Boolean).length, 2);
});

test('Attaque ciblée = tir : tous ces tireurs se rangent au fond, Salem compris', () => {
  // Frapper sans recevoir de coup en retour, c'est frapper de loin. Toute fiche
  // qui porte l'Attaque ciblée tient donc le fond, qu'elle imprime ou non le
  // mot-clé « À distance ».
  const rapides = RPG_DUEL_CARDS.filter((carte) => carte.coupRapide);
  assert.ok(rapides.length >= 22, `le privilège est répandu (${rapides.length} fiches)`);
  const devant = rapides.filter((carte) => !estDefenseur(carte) && ligneObligee(carte) !== RPG_LIGNE_FOND);
  assert.deepEqual(devant.map((carte) => carte.id), [], 'aucun tireur devant');
  assert.equal(ligneObligee(cardById('salem')), RPG_LIGNE_FOND, 'Salem tire, Salem recule');
  // Le Défenseur garde la priorité : c'est un mur avant d'être un tireur.
  const chevaliere = cardById('chevaliere-du-baton-sacre');
  assert.equal(estDefenseur(chevaliere), true);
  assert.equal(ligneObligee(chevaliere), RPG_LIGNE_FRONT);
});

test('Salem posé derrière : la case du front est refusée, aucune mêlée ne le voit', () => {
  const { d, poserOk } = table();
  d.tour = 'joueur';
  const garde = poserOk('joueur', MELEE);
  auFront(garde, 2);
  const salem = poserOk('joueur', 'salem');
  assert.equal(ligneDe(garde), RPG_LIGNE_FRONT);
  assert.equal(ligneDe(salem), RPG_LIGNE_FOND, 'il entre au fond, comme tout le monde');
  const intrus = poserOk('sorcier', MELEE);
  auFront(intrus, 2, 'sorcier');
  d.tour = 'sorcier';
  const cibles = rpgCiblesIndividuellesClassique(d, 'sorcier', intrus.id).cibles;
  assert.ok(cibles.includes(garde.id), 'la mêlée voit le front');
  assert.equal(cibles.includes(salem.id), false, 'la mêlée n’atteint pas Salem derrière');
});
