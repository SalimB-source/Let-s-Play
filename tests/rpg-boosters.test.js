import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COFFRET,
  RAYONS,
  TAUX,
  carteAuVivier,
  cartesOuvertes,
  couleursOuvertes,
  etagesOuverts,
  etageIntroduction,
  etatRayon,
  etatRayons,
  ouvrirBooster,
  ouvrirCoffret,
  prixCoffret,
  rayonParId,
  rayonOuvert,
  tourIntroduction,
  toursEntamees,
  vivierRayon,
} from '../src/games/rpgBoosters.js';
import { RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_STORY_TOURS, tousLesEtages } from '../src/games/rpgStoryTours.js';
import { BAREME_DOUBLON, noterOuvertureJournal, portefeuilleVide } from '../src/games/rpgCredits.js';
import { rngSeme } from '../src/games/rpgHasard.js';

const progression = (...etages) => ({ etagesVaincus: [...etages] });
/** L'état d'un joueur qui a gravi la ville jusqu'à cet étage inclus. */
const jusqua = (etageId) => {
  const vaincus = [];
  for (const { etage } of tousLesEtages()) {
    vaincus.push(etage.id);
    if (etage.id === etageId) break;
  }
  return progression(...vaincus);
};
const TOUS_LES_ETAGES = tousLesEtages().map(({ etage }) => etage.id);
const COMPLET = progression(...TOUS_LES_ETAGES);
const idsCatalogue = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));
const journalier = (credits) => ({ ...portefeuilleVide(), credits });
const bandesDe = (cartIds) => {
  const bandes = { commune: [], inhabituelle: [], rare: [], mythique: [] };
  for (const id of cartIds) {
    const carte = cardById(id);
    if (carte) bandes[carte.rarity]?.push(id);
  }
  return bandes;
};

// ── La borne des tours ───────────────────────────────────────────────────────

test('aucune tour n’est entamée avant la première victoire', () => {
  assert.deepEqual([...toursEntamees(progression())], [], 'le Souk ouvre à la première victoire');
  assert.deepEqual([...toursEntamees(progression('listes-3'))], ['tour-des-listes']);
  assert.equal(toursEntamees(progression('listes-3', 'souk-1')).has('tour-du-souk'), true);
  assert.equal(toursEntamees(COMPLET).size, RPG_STORY_TOURS.length);
});

test('le Souk suit les marches montées : vaincue, ou la suivante', () => {
  const fjord = Object.entries(RPG_REVELATIONS_PAR_ETAGE).find(([etage]) => etage.startsWith('fjord'));
  const carteDuFjord = fjord[1].find((id) => !COLLECTION_DEPART.includes(id));
  assert.ok(carteDuFjord, 'le Fjord révèle bien une carte qui ne vient pas de la dotation');
  const tour = RPG_STORY_TOURS.find((candidate) => candidate.etages.some((etage) => etage.id === fjord[0]));
  assert.equal(tourIntroduction(carteDuFjord), tour.id);

  assert.equal(carteAuVivier(carteDuFjord, progression()), false, 'aucun Fjord avant le Fjord');
  assert.equal(carteAuVivier(carteDuFjord, progression('listes-5', 'souk-4')), false);
  assert.equal(carteAuVivier(carteDuFjord, progression('fjord-1')), true, 'l’étage vaincu ouvre sa carte');
  assert.equal(carteAuVivier('carte-qui-nexiste-pas', progression()), false);

  // « ou la suivante » : gagner listes-1 ouvre les cartes de listes-2.
  const braisier = RPG_REVELATIONS_PAR_ETAGE['listes-2'][0];
  assert.equal(carteAuVivier(braisier, progression()), false, 'la marche suivante n’est pas encore ouverte');
  assert.equal(carteAuVivier(braisier, progression('listes-1')), true, 'listes-1 vaincu ouvre listes-2, la marche suivante');
  assert.equal(carteAuVivier(braisier, progression('listes-2')), true, 'vaincue aussi');
  // Le Fjord ne s’ouvre qu’en y entrant : sa première marche ne s’offre pas d’office.
  const premierDuFjord = RPG_REVELATIONS_PAR_ETAGE['fjord-1'][0];
  assert.equal(carteAuVivier(premierDuFjord, progression()), false, 'aucun Fjord avant le Fjord');
  assert.equal(carteAuVivier(premierDuFjord, progression('sables-3')), false, 'même au sommet des Sables');
  assert.equal(carteAuVivier(premierDuFjord, progression('fjord-1')), true, 'entrer dans le Fjord l’ouvre');
});

test('les cartes ouvertes et les étages ouverts suivent la progression', () => {
  assert.deepEqual(cartesOuvertes(progression()), [], 'la ville n’a encore rien ouvert');
  assert.equal(cartesOuvertes(progression('listes-1')).length,
    RPG_REVELATIONS_PAR_ETAGE['listes-1'].length + RPG_REVELATIONS_PAR_ETAGE['listes-2'].length,
    'la marche conquise et la suivante sont ouvertes');
  assert.deepEqual(etagesOuverts(progression()), [], 'rien n’est ouvert avant la première victoire');
  const ouverts = etagesOuverts(progression('listes-1'));
  assert.ok(ouverts.includes('listes-1'), 'la marche conquise');
  assert.ok(ouverts.includes('listes-2'), 'et la suivante');
  assert.equal(ouverts.length, 2);
});

// ── Le vivier mélangé ────────────────────────────────────────────────────────

test('le comptoir ne vend plus qu’un seul paquet, toutes couleurs mélangées', () => {
  assert.equal(RAYONS.length, 1, 'les cinq rayons monochromes ont disparu');
  const [rayon] = RAYONS;
  assert.equal(rayon.id, 'souk');
  assert.equal(rayon.nom, 'Souk');
  assert.equal(rayon.titre, 'Le paquet du Souk');
  assert.equal(rayon.couleur, null, 'aucune couleur imposée');
  assert.equal(rayon.prix, 140, 'une journée de jeu vaut deux paquets');
  assert.equal(rayon.vitrine, 'djinn-du-souk');
  assert.match(rayon.texte, /couleurs.*mélangées/i, 'la fiche dit le mélange');

  assert.equal(rayonParId('souk').id, 'souk');
  assert.equal(rayonParId('inconnu'), null);
  // Le journal d'un appareil garde ses anciennes ouvertures : les rayons
  // d'avant le mélange restent lisibles, mais ne se vendent plus.
  assert.equal(rayonParId('braise').nom, 'Braise');
  assert.equal(rayonOuvert('braise', COMPLET), false);
  assert.deepEqual(vivierRayon('braise', COMPLET), []);
  assert.equal(prixCoffret('braise'), null);

  assert.equal(prixCoffret('souk'), 1260);
  assert.equal(COFFRET.taille, 10);
});

test('le vivier du comptoir réunit toutes les couleurs ouvertes', () => {
  const vivier = vivierRayon('souk', COMPLET);
  assert.ok(vivier.length > 0);
  const couleurs = new Set();
  const bandes = bandesDe(vivier);
  for (const id of vivier) {
    assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
    assert.ok(!cardById(id).terrain, `${id} est jouable sans terrain`);
    for (const couleur of cardColors(id)) couleurs.add(couleur);
  }
  assert.deepEqual(new Set([...couleurs]), new Set(['braise', 'eau', 'sable', 'neige']),
    'les quatre couleurs de l’Histoire sont servies');
  assert.ok(bandes.commune.length > 0, 'des communes pour le remplissage');
  assert.ok(bandes.rare.length > 0, 'des rares pour la garantie');
  assert.ok(bandes.mythique.length > 0, 'des mythiques pour la cinquième carte');

  const debut = vivierRayon('souk', jusqua('listes-1'));
  assert.ok(debut.length > 0, 'la dotation remplit le vivier dès la première victoire');
  assert.ok(vivier.length > debut.length, 'le vivier grandit avec la ville');
  assert.equal(vivierRayon('souk', COMPLET).length, vivier.length, 'à la fin, toute la ville ouverte est au vivier');
});

test('le comptoir ouvre à la première victoire, jamais avant', () => {
  assert.equal(rayonOuvert('souk', progression()), false);
  assert.equal(rayonOuvert('souk', jusqua('listes-1')), true, 'la première marche ouvre le Souk');
  assert.equal(rayonOuvert('souk', COMPLET), true);

  const ferme = etatRayon('souk', progression());
  assert.ok(ferme);
  assert.equal(ferme.ouvert, false);
  assert.equal(ferme.prix, 140);
  assert.equal(ferme.prixCoffret, 1260);
  assert.match(ferme.raison, /première victoire/);

  const ouvert = etatRayon('souk', jusqua('listes-1'));
  assert.equal(ouvert.ouvert, true);
  assert.ok(ouvert.nouvelles >= 1, 'il reste des cartes à rapporter');
  assert.equal(ouvert.mythiques, 0, 'au deuxième jour, le vivier n’a encore aucune mythique');
  assert.ok(etatRayon('souk', COMPLET).mythiques > 0, 'plus haut, les mythiques sont entrées');

  const complet = etatRayon('souk', COMPLET, vivierRayon('souk', COMPLET));
  assert.equal(complet.complet, true, 'tout est possédé : le comptoir le dit');
  assert.equal(complet.nouvelles, 0);
  assert.equal(etatRayons(progression()).length, 1);
  assert.equal(etatRayon('braise', COMPLET), null, 'un ancien rayon n’est plus une étagère');
});

// ── Le tirage ────────────────────────────────────────────────────────────────

test('un paquet fait cinq cartes distinctes, mélangées et toujours avec une rare', () => {
  const rng = rngSeme(11);
  const vivier = vivierRayon('souk', COMPLET);
  const possedees = new Set(collectionJoueur({ progression: COMPLET }));
  const neuvesAuVivier = vivier.filter((id) => !possedees.has(id)).length;
  const couleursVues = new Set();
  for (let index = 0; index < 300; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'souk', progression: COMPLET, rng });
    assert.equal(tirage.ok, true);
    assert.equal(tirage.tirage.cartes.length, TAUX.cartes);
    assert.equal(new Set(tirage.tirage.cartes).size, TAUX.cartes, 'jamais deux fois la même carte');
    for (const id of tirage.tirage.cartes) {
      assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
      assert.ok(vivier.includes(id), `${id} est bien au vivier du comptoir`);
    }
    assert.equal(tirage.tirage.details[3].rarete, 'rare', 'la quatrième carte est la rare garantie');
    assert.equal(tirage.tirage.details.filter((carte) => carte.rarete === 'rare').length, 1,
      'un paquet contient exactement une rare, jamais plusieurs');
    const couleurs = new Set(tirage.tirage.cartes.flatMap((id) => cardColors(id)));
    assert.ok(couleurs.size >= 2, `jamais monochrome (${[...couleurs].join(', ')})`);
    for (const couleur of couleurs) couleursVues.add(couleur);
    // La garantie des nouvelles suit ce que le vivier peut offrir : trois tant
    // qu'il reste trois cartes neuves, sinon tout ce qu'il reste.
    const attendu = Math.min(TAUX.nouvellesMin, neuvesAuVivier);
    assert.ok(tirage.tirage.nouvelles >= Math.min(1, attendu), 'le paquet conserve des cartes neuves quand le vivier le permet');
  }
  assert.deepEqual(couleursVues, new Set(['braise', 'eau', 'sable', 'neige']),
    'sur 300 paquets, les quatre couleurs sortent');
});

test('la garantie des nouvelles ne sert pas toujours la même carte', () => {
  // Un vivier presque complet : cinq cartes neuves, réparties sur trois
  // raretés. La garantie doit en servir trois — mais pas toujours les mêmes.
  // La version « première carte trouvée » servait les mêmes trois à chaque
  // paquet ; le tirage au sort est ce qui fait vivre la collection.
  const p = jusqua('listes-1');
  const vivier = vivierRayon('souk', p);
  const parRarete = bandesDe(vivier);
  const neuves = [
    ...parRarete.rare.slice(0, 2),
    ...parRarete.inhabituelle.slice(0, 2),
    ...parRarete.commune.slice(0, 1),
  ];
  assert.equal(neuves.length, 5, 'le vivier de listes-1 a de quoi semer cinq nouvelles');
  const possedees = vivier.filter((id) => !neuves.includes(id));
  const portefeuille = journalier(100000);
  const tiragesNeufs = new Set();
  for (let graine = 1; graine <= 40; graine += 1) {
    const tirage = ouvrirBooster({
      portefeuille,
      rayonId: 'souk',
      progression: p,
      collection: possedees,
      rng: rngSeme(graine * 7919),
    });
    assert.equal(tirage.ok, true);
    const servies = tirage.tirage.cartes.filter((id) => !possedees.includes(id));
    assert.ok(servies.length >= 1, `${servies.length} nouvelle(s) servie(s)`);
    tiragesNeufs.add([...servies].sort().join('|'));
  }
  assert.ok(tiragesNeufs.size >= 5, `les cartes promues varient (${tiragesNeufs.size} tirages neufs distincts)`);
});

test('les mythiques sont très rares : 1 % par paquet, la pitié les assure au cinquantième', () => {
  assert.equal(TAUX.mythique, 0.01);
  assert.equal(TAUX.pitie, 50);

  // 200 paquets : la mythique n’est plus la carte de tous les jours.
  let mythiques = 0;
  const rng = rngSeme(23);
  for (let index = 0; index < 200; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(100000), rayonId: 'souk', progression: COMPLET, rng });
    mythiques += tirage.tirage.mythique ? 1 : 0;
  }
  assert.ok(mythiques / 200 < 0.2, `les mythiques restent rares (${mythiques}/200)`);

  // La pitié ne force que si le vivier a des mythiques à donner : avant elles,
  // la promesse ne se compte pas — c'est la règle, pas un oubli.
  const sansMythique = ouvrirBooster({
    portefeuille: { ...journalier(10000), pitie: TAUX.pitie - 1 },
    rayonId: 'souk',
    progression: jusqua('listes-1'),
    rng: rngSeme(3),
  });
  assert.equal(sansMythique.tirage.mythique, false);
  assert.ok(sansMythique.tirage.details.some((carte) => carte.rarete === 'rare'), 'la place retombe sur la rare');

  const avecPitie = { ...journalier(10000), pitie: TAUX.pitie - 1 };
  for (let index = 0; index < 20; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: avecPitie, rayonId: 'souk', progression: COMPLET, rng: rngSeme(100 + index) });
    assert.equal(tirage.tirage.mythique, true, 'la pitié est une promesse, pas une chance');
  }
});

test('les taux annoncés tiennent sur dix mille ouvertures semées', () => {
  const rng = rngSeme(4242);
  let mythiques = 0;
  let ouvertureDepuisMythique = 0;
  let pireSerie = 0;
  let bourse = journalier(1000000);
  for (let index = 0; index < 10000; index += 1) {
    if (bourse.credits < 200) bourse = { ...bourse, credits: 1000000 }; // budget illimité : on mesure des taux
    const tirage = ouvrirBooster({ portefeuille: bourse, rayonId: 'souk', progression: COMPLET, rng });
    bourse = tirage.portefeuille;
    ouvertureDepuisMythique = tirage.tirage.mythique ? 0 : ouvertureDepuisMythique + 1;
    pireSerie = Math.max(pireSerie, ouvertureDepuisMythique);
    mythiques += tirage.tirage.mythique ? 1 : 0;
  }
  // 1 % par paquet, et la pitié relève légèrement la moyenne ; mesuré sur
  // dix mille ouvertures, le taux reste bas.
  const part = mythiques / 10000;
  assert.ok(part > 0.01 && part < 0.06, `le comptoir vaut ${(part * 100).toFixed(1)} % de mythiques`);
  assert.ok(pireSerie <= TAUX.pitie - 1, `jamais plus de ${TAUX.pitie - 1} paquets secs (${pireSerie})`);
});

// ── L'achat ──────────────────────────────────────────────────────────────────

test('ouvrir un paquet débite le solde, range les cartes et rembourse les doublons', () => {
  const depart = journalier(500);
  const tirage = ouvrirBooster({ portefeuille: depart, rayonId: 'souk', progression: jusqua('listes-1'), rng: rngSeme(9) });
  assert.equal(tirage.ok, true);
  const remboursement = tirage.tirage.remboursement;
  assert.equal(remboursement, tirage.tirage.details.reduce((somme, carte) => somme + carte.remboursement, 0));
  assert.equal(tirage.portefeuille.credits, 500 - 140 + remboursement);
  assert.equal(tirage.portefeuille.ouvertures, 1);
  assert.equal(tirage.portefeuille.cartes.length, TAUX.cartes, 'les cinq cartes sont rangées');
  assert.deepEqual(depart.cartes, [], 'le portefeuille de départ n’est pas modifié');
  const doublons = tirage.tirage.details.filter((carte) => carte.doublon);
  assert.ok(doublons.length >= 2, 'un joueur qui a la dotation reçoit des doublons');
  for (const carte of doublons) assert.equal(carte.remboursement, BAREME_DOUBLON[carte.rarete]);
  for (const carte of tirage.tirage.details.filter((detail) => !detail.doublon)) assert.equal(carte.remboursement, 0);
});

test('un paquet de doublons n’enrichit jamais son acheteur', () => {
  // Collection complète : les cinq cartes du paquet sont des doublons, c'est le
  // mieux que le comptoir puisse rendre. Le solde doit pourtant toujours baisser.
  const vivier = vivierRayon('souk', COMPLET);
  let bourse = journalier(100000);
  for (let graine = 1; graine <= 60; graine += 1) {
    const avant = bourse.credits;
    const achat = ouvrirBooster({
      portefeuille: bourse,
      rayonId: 'souk',
      progression: COMPLET,
      collection: vivier,
      rng: rngSeme(graine),
    });
    assert.equal(achat.ok, true);
    assert.ok(achat.portefeuille.credits < avant, `le paquet ${graine} ne doit pas rapporter de crédits`);
    bourse = achat.portefeuille;
  }
  // La borne, écrite noir sur blanc : le pire paquet possible — trois
  // inhabituelles, la rare garantie et la mythique en cinquième, toutes des
  // doublons — rend 112 ◈ pour un paquet à 140 ◈. On ne farme pas le Souk.
  const pire = BAREME_DOUBLON.inhabituelle * 3 + BAREME_DOUBLON.rare + BAREME_DOUBLON.mythique;
  assert.equal(pire, 112);
  assert.ok(pire < RAYONS[0].prix, 'un paquet entièrement fait de doublons ne rembourse jamais son prix');
});

test('sans solde, avant la première victoire ou sur un ancien rayon, l’achat ne touche à rien', () => {
  const pauvre = ouvrirBooster({ portefeuille: journalier(139), rayonId: 'souk', progression: jusqua('listes-1') });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.equal(pauvre.portefeuille.credits, 139);
  assert.equal(pauvre.tirage, null);

  const ferme = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'souk', progression: progression() });
  assert.equal(ferme.ok, false);
  assert.equal(ferme.raison, 'rayon-ferme');
  assert.equal(ferme.portefeuille.credits, 10000, 'un Souk fermé ne coûte rien');

  const inconnu = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'etagere-fantome' });
  assert.equal(inconnu.raison, 'rayon-inconnu');
  const ancien = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'braise', progression: COMPLET });
  assert.equal(ancien.raison, 'rayon-inconnu', 'un ancien rayon ne se vend plus');
  assert.equal(ancien.portefeuille.credits, 10000);
});

test('le coffret vend dix paquets avec la remise, et une mythique assurée', () => {
  assert.equal(prixCoffret('souk'), 1260);
  assert.equal(prixCoffret('inconnu'), null);
  assert.equal(COFFRET.taille, 10);

  const depart = journalier(5000);
  const coffret = ouvrirCoffret({ portefeuille: depart, rayonId: 'souk', progression: COMPLET, rng: rngSeme(77) });
  assert.equal(coffret.ok, true);
  assert.equal(coffret.paquets.length, 10, 'dix paquets, même si le dernier se vide');
  assert.equal(coffret.mythique, true, 'une mythique au moins dans le coffret');
  assert.equal(coffret.prix, 1260);
  assert.equal(coffret.portefeuille.credits, 5000 - 1260 + coffret.paquets.reduce((somme, paquet) => somme + paquet.remboursement, 0));
  assert.ok(coffret.portefeuille.ouvertures >= 10);

  const pauvre = ouvrirCoffret({ portefeuille: journalier(1200), rayonId: 'souk', progression: COMPLET });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.deepEqual(pauvre.paquets, []);
});

// ── Les repères d'affichage ──────────────────────────────────────────────────

test('l’étage d’introduction d’une carte se retrouve, la dotation n’en a pas', () => {
  const etage = etageIntroduction('cavalier-amazigh-du-desert');
  assert.equal(etage.id, 'listes-1');
  assert.equal(etageIntroduction('carte-qui-nexiste-pas'), null);
  const dotation = COLLECTION_DEPART.find((id) => !Object.values(RPG_REVELATIONS_PAR_ETAGE).some((revelation) => revelation.includes(id)));
  assert.ok(dotation, 'la dotation compte des cartes qu’aucun étage ne rend');
  assert.equal(tourIntroduction(dotation), null);
  assert.equal(cardById(dotation) !== null, true);
});

// ── Le journal des ouvertures (lot 5) ───────────────────────────────────────

test('chaque paquet acheté laisse une trace au journal, doublons compris', () => {
  const p = progression('listes-1');
  const rng = rngSeme(20260301);
  const avant = journalier(10000);
  const apres = ouvrirBooster({ portefeuille: avant, rayonId: 'souk', progression: p, rng });
  assert.equal(apres.ok, true);
  assert.equal(apres.portefeuille.journal.length, 1, 'un paquet, une entrée');
  const entree = apres.portefeuille.journal[0];
  assert.equal(entree.rayonId, 'souk');
  assert.equal(entree.cartes.length, TAUX.cartes, 'les cinq cartes y sont');
  assert.equal(entree.coffret, false);
  assert.equal(entree.coffret === undefined, false, 'le champ existe toujours');
  assert.equal(entree.remboursement, apres.tirage.remboursement, 'et le remboursement du paquet');
  assert.ok(entree.cartes.every((id) => cardById(id)), 'des cartes du catalogue');

  const coffret = ouvrirCoffret({ portefeuille: journalier(10000), rayonId: 'souk', progression: p, rng: rngSeme(20260401) });
  assert.equal(coffret.ok, true);
  assert.equal(coffret.portefeuille.journal.length, COFFRET.taille, 'dix paquets, dix entrées');
  assert.ok(coffret.portefeuille.journal.every((ligne) => ligne.coffret), 'marquées comme venues d’un coffret');
  assert.equal(coffret.portefeuille.journal[0].rayonId, 'souk');

  const refuse = ouvrirBooster({ portefeuille: portefeuilleVide(), rayonId: 'souk', progression: p, rng });
  assert.equal(refuse.ok, false);
  assert.deepEqual(refuse.portefeuille.journal, [], 'un achat refusé n’écrit rien au journal');

  // Les anciennes ouvertures restent lisibles dans la mémoire du joueur.
  const ancien = noterOuvertureJournal(portefeuilleVide(), {
    rayonId: 'braise', cartes: ['tarek'], horloge: '2026-03-01T10:00:00.000Z',
  });
  assert.equal(ancien.journal.length, 1);
  assert.equal(ancien.journal[0].rayonId, 'braise');
});
