import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COFFRET,
  RAYONS,
  TAUX,
  carteAuVivier,
  etageIntroduction,
  etatRayon,
  etatRayons,
  ouvrirBooster,
  ouvrirCoffret,
  prixCoffret,
  rayonParId,
  rayonOuvert,
  tourIntroduction,
  vivierRayon,
} from '../src/games/rpgBoosters.js';
import {
  RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, carteJouableSansTerrain,
} from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, collectionJoueur, nombreExemplaires } from '../src/games/rpgCollection.js';
import { tousLesEtages } from '../src/games/rpgStoryTours.js';
import { BAREME_DOUBLON, noterOuvertureJournal, portefeuilleVide } from '../src/games/rpgCredits.js';
import { rngSeme } from '../src/games/rpgHasard.js';

const progression = (...etages) => ({ etagesVaincus: [...etages] });
const TOUS_LES_ETAGES = tousLesEtages().map(({ etage }) => etage.id);
const COMPLET = progression(...TOUS_LES_ETAGES);
const journalier = (credits) => ({ ...portefeuilleVide(), credits });
const jouables = () => RPG_DUEL_CARDS.filter(carteJouableSansTerrain).map((carte) => carte.id);
const bandesDe = (cartIds) => {
  const bandes = { commune: [], inhabituelle: [], rare: [], mythique: [] };
  for (const id of cartIds) {
    const carte = cardById(id);
    if (carte) bandes[carte.rarity]?.push(id);
  }
  return bandes;
};
const PAQUET_DE = Object.fromEntries(RAYONS.map((rayon) => [rayon.id, rayon]));

// ── Un seul paquet ───────────────────────────────────────────────────────────

test('un seul paquet en vente, toutes les couleurs et toutes les cartes, dès le départ', () => {
  assert.deepEqual(RAYONS.map((rayon) => rayon.id), ['souk'], 'les boosters sont fondus en un seul paquet');
  assert.deepEqual(PAQUET_DE.souk.couleur, RPG_ELEMENTS, 'le paquet unique couvre toutes les couleurs');
  for (const rayon of RAYONS) {
    assert.equal(rayon.prix, 140, 'une journée de jeu vaut deux paquets');
    assert.equal(cardById(rayon.vitrine)?.rarity, 'mythique', `${rayon.id} montre une vraie mythique`);
    assert.equal(rayonOuvert(rayon.id), true, 'aucune victoire requise');
    assert.equal(rayonOuvert(rayon.id, progression()), true, 'même sans aucune victoire');
    assert.equal(prixCoffret(rayon.id), 1260);
  }
  assert.equal(COFFRET.taille, 10);
  assert.equal(rayonParId('souk').nom, 'Souk');
  assert.equal(rayonParId('inconnu'), null);
  // Le journal d'un appareil garde ses anciennes ouvertures : lisibles, plus vendues
  // — les quatre rayons monochromes d'origine, et les deux paquets mélangés
  // (Banquise, Citerne) qui les ont remplacés avant d'être fondus à leur tour.
  for (const [id, nom] of [['braise', 'Braise'], ['sable', 'Sable'], ['eau', 'Eau'], ['neige', 'Neige'], ['banquise', 'Banquise'], ['citerne', 'Citerne']]) {
    assert.equal(rayonParId(id).nom, nom);
    assert.equal(rayonOuvert(id), false, `${id} ne se vend plus`);
    assert.deepEqual(vivierRayon(id), []);
    assert.equal(prixCoffret(id), null);
    assert.equal(etatRayon(id, COMPLET), null, 'un ancien rayon n’est plus une étagère');
  }
  assert.equal(etatRayons(progression()).length, RAYONS.length);
});

test('chaque carte jouable est vendue dans l’unique paquet, sans oubli ni doublon', () => {
  const vivier = vivierRayon('souk');
  assert.equal(new Set(vivier).size, vivier.length, 'aucune carte en double dans le vivier');
  assert.deepEqual([...vivier].sort(), jouables().sort(), 'toute carte jouable est dans le paquet du Souk');
});

test('les cartes ne dépendent plus de la progression : tout le catalogue est au vivier', () => {
  for (const id of jouables()) {
    assert.equal(carteAuVivier(id), true, `${id} est au vivier sans condition`);
  }
  assert.equal(carteAuVivier('carte-qui-nexiste-pas'), false);
  // Le vivier ne change pas selon la progression.
  assert.deepEqual(vivierRayon('souk'), vivierRayon('souk', COMPLET));
});

test('une future carte jouable, de n’importe quelle couleur, rejoint le paquet unique', () => {
  const nouvelle = {
    id: 'carte-future-sable',
    name: 'Carte future',
    element: 'sable',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    kind: 'creature',
  };
  const autre = {
    id: 'carte-future-neige',
    name: 'Carte future (Neige)',
    element: 'neige',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    kind: 'creature',
  };
  RPG_DUEL_CARDS.push(nouvelle, autre);
  try {
    assert.ok(vivierRayon('souk').includes('carte-future-sable'), 'une carte Sable entre dans le paquet unique');
    assert.ok(vivierRayon('souk').includes('carte-future-neige'), 'une carte Neige aussi : un seul vivier, toutes les couleurs');
  } finally {
    RPG_DUEL_CARDS.splice(RPG_DUEL_CARDS.indexOf(nouvelle), 1);
    RPG_DUEL_CARDS.splice(RPG_DUEL_CARDS.indexOf(autre), 1);
  }
});

test('une carte sans couleur reconnue tombe dans le paquet, jamais hors vente', () => {
  const orpheline = { id: 'carte-sans-couleur', name: 'Orpheline', element: 'inconnu', cost: 1, atk: 1, def: 1, rarity: 'commune', kind: 'creature' };
  RPG_DUEL_CARDS.push(orpheline);
  try {
    assert.ok(vivierRayon('souk').includes('carte-sans-couleur'));
  } finally {
    RPG_DUEL_CARDS.splice(RPG_DUEL_CARDS.indexOf(orpheline), 1);
  }
});

test('les cartes hors dotation gardent leur étage de révélation pour l’affichage', () => {
  const etage = etageIntroduction('cavalier-amazigh-du-desert');
  assert.equal(etage.id, 'listes-1');
  assert.equal(etageIntroduction('carte-qui-nexiste-pas'), null);
  const dotation = COLLECTION_DEPART.find((id) => !Object.values(RPG_REVELATIONS_PAR_ETAGE).some((revelation) => revelation.includes(id)));
  assert.ok(dotation, 'la dotation compte des cartes qu’aucun étage ne rend');
  assert.equal(tourIntroduction(dotation), null);
  assert.ok(tousLesEtages().length > 0);
});

// ── Le tirage ────────────────────────────────────────────────────────────────

test('un paquet fait cinq cartes distinctes, toutes couleurs mêlées, avec exactement une rare', () => {
  const vivier = vivierRayon('souk');
  const rng = rngSeme(11);
  for (let index = 0; index < 200; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'souk', progression: COMPLET, rng });
    assert.equal(tirage.ok, true);
    assert.equal(tirage.tirage.cartes.length, TAUX.cartes);
    assert.equal(new Set(tirage.tirage.cartes).size, TAUX.cartes, 'jamais deux fois la même carte');
    for (const id of tirage.tirage.cartes) assert.ok(vivier.includes(id), `${id} est bien dans le vivier du Souk`);
    assert.equal(tirage.tirage.details[3].rarete, 'rare', 'la quatrième carte est la rare garantie');
    assert.equal(tirage.tirage.details.filter((carte) => carte.rarete === 'rare').length, 1,
      'un paquet contient exactement une rare');
  }
});

test('la garantie des nouvelles ne sert pas toujours la même carte', () => {
  const vivier = vivierRayon('souk');
  const parRarete = bandesDe(vivier);
  const neuves = [...parRarete.rare.slice(0, 2), ...parRarete.inhabituelle.slice(0, 2), ...parRarete.commune.slice(0, 1)];
  assert.equal(neuves.length, 5, 'le Souk a de quoi semer cinq nouvelles');
  const possedees = vivier.filter((id) => !neuves.includes(id));
  const portefeuille = journalier(100000);
  const tiragesNeufs = new Set();
  // Le vivier fusionné est bien plus vaste qu'un rayon à deux couleurs : la
  // rare neuve se noie dans une bande de rares beaucoup plus large, et il faut
  // davantage de tirages pour voir la variété promise se révéler.
  for (let graine = 1; graine <= 150; graine += 1) {
    const tirage = ouvrirBooster({ portefeuille, rayonId: 'souk', collection: possedees, rng: rngSeme(graine * 7919) });
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
  const rng = rngSeme(23);
  let mythiques = 0;
  for (let index = 0; index < 200; index += 1) {
    mythiques += ouvrirBooster({ portefeuille: journalier(100000), rayonId: 'souk', rng }).tirage.mythique ? 1 : 0;
  }
  assert.ok(mythiques / 200 < 0.2, `les mythiques restent rares (${mythiques}/200)`);

  const avecPitie = { ...journalier(10000), pitie: TAUX.pitie - 1 };
  for (let index = 0; index < 20; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: avecPitie, rayonId: 'souk', rng: rngSeme(100 + index) });
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
    if (bourse.credits < 200) bourse = { ...bourse, credits: 1000000 };
    const tirage = ouvrirBooster({ portefeuille: bourse, rayonId: 'souk', rng });
    bourse = tirage.portefeuille;
    ouvertureDepuisMythique = tirage.tirage.mythique ? 0 : ouvertureDepuisMythique + 1;
    pireSerie = Math.max(pireSerie, ouvertureDepuisMythique);
    mythiques += tirage.tirage.mythique ? 1 : 0;
  }
  const part = mythiques / 10000;
  assert.ok(part > 0.01 && part < 0.06, `le paquet Souk vaut ${(part * 100).toFixed(1)} % de mythiques`);
  assert.ok(pireSerie <= TAUX.pitie - 1, `jamais plus de ${TAUX.pitie - 1} paquets secs (${pireSerie})`);
});

// ── L'achat ──────────────────────────────────────────────────────────────────

test('ouvrir un paquet débite le solde, range les cartes et rembourse les doublons', () => {
  const depart = journalier(500);
  const tirage = ouvrirBooster({ portefeuille: depart, rayonId: 'souk', rng: rngSeme(9) });
  assert.equal(tirage.ok, true);
  const remboursement = tirage.tirage.remboursement;
  assert.equal(remboursement, tirage.tirage.details.reduce((somme, carte) => somme + carte.remboursement, 0));
  assert.equal(tirage.portefeuille.credits, 500 - 140 + remboursement);
  assert.equal(tirage.portefeuille.ouvertures, 1);
  assert.equal(tirage.portefeuille.cartes.length, TAUX.cartes, 'les cinq cartes sont rangées');
  assert.deepEqual(depart.cartes, [], 'le portefeuille de départ n’est pas modifié');
  const doublons = tirage.tirage.details.filter((carte) => carte.doublon);
  for (const carte of doublons) assert.equal(carte.remboursement, BAREME_DOUBLON[carte.rarete]);
  for (const carte of tirage.tirage.details.filter((detail) => !detail.doublon)) assert.equal(carte.remboursement, 0);
  for (const detail of tirage.tirage.details) {
    assert.equal(detail.exemplaires, nombreExemplaires([...COLLECTION_DEPART, ...depart.cartes, detail.id], detail.id),
      'la pastille connaît le stock juste après le rangement de la carte');
  }
});

test('un paquet de doublons n’enrichit jamais son acheteur', () => {
  const vivier = vivierRayon('souk');
  let bourse = journalier(100000);
  for (let graine = 1; graine <= 30; graine += 1) {
    const avant = bourse.credits;
    const achat = ouvrirBooster({ portefeuille: bourse, rayonId: 'souk', collection: vivier, rng: rngSeme(graine) });
    assert.equal(achat.ok, true);
    assert.ok(achat.portefeuille.credits < avant, `le paquet du Souk ${graine} ne rapporte pas de crédits`);
    bourse = achat.portefeuille;
  }
  const pire = BAREME_DOUBLON.inhabituelle * 3 + BAREME_DOUBLON.rare + BAREME_DOUBLON.mythique;
  assert.equal(pire, 112);
  assert.ok(pire < 140, 'un paquet entièrement fait de doublons ne rembourse jamais son prix');
});

test('le deuxième exemplaire d’une carte possédée se garde sans remboursement', () => {
  // `samourai-du-torii` : rare non-dotation, deux exemplaires max en deck.
  // La graine 81 le fait sortir dans le paquet (déterministe).
  const cible = 'samourai-du-torii';
  const tirage = ouvrirBooster({
    portefeuille: journalier(100000),
    rayonId: 'souk',
    collection: [cible],
    rng: rngSeme(81),
  });
  assert.equal(tirage.ok, true);
  const detail = tirage.tirage.details.find((carte) => carte.id === cible);
  assert.ok(detail, 'la cible est bien dans le paquet');
  assert.equal(detail.doublon, true, 'déjà possédée');
  assert.equal(detail.remboursement, 0, 'le deuxième exemplaire n’est pas remboursé');
  assert.equal(detail.exemplaires, 2, 'le stock passe à deux exemplaires');
  assert.equal(tirage.tirage.remboursement, 0, 'aucun crédit rendu pour ce paquet');
  assert.equal(tirage.portefeuille.credits, 100000 - 140, 'le solde est juste débité du prix');
  assert.equal(tirage.portefeuille.exemplaires[cible], 2, 'l’exemplaire conservé est écrit au stock');
});

test('le troisième exemplaire d’une carte complète est remboursé au barème', () => {
  const cible = 'samourai-du-torii';
  // Le stock déclare déjà deux exemplaires : la carte est complète.
  const portefeuille = { ...journalier(100000), cartes: [cible], exemplaires: { [cible]: 2 } };
  const tirage = ouvrirBooster({
    portefeuille,
    rayonId: 'souk',
    collection: [cible],
    rng: rngSeme(81),
  });
  assert.equal(tirage.ok, true);
  const detail = tirage.tirage.details.find((carte) => carte.id === cible);
  assert.ok(detail);
  assert.equal(detail.doublon, true);
  assert.equal(detail.remboursement, BAREME_DOUBLON.rare, 'le troisième exemplaire est remboursé au barème rare');
  assert.equal(detail.exemplaires, 2, 'le stock reste bloqué au quota de deck');
  assert.equal(tirage.tirage.remboursement, BAREME_DOUBLON.rare);
  assert.equal(tirage.portefeuille.credits, 100000 - 140 + BAREME_DOUBLON.rare);
});

test('sans solde, ou sur un ancien rayon, l’achat ne touche à rien', () => {
  const pauvre = ouvrirBooster({ portefeuille: journalier(139), rayonId: 'souk' });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.equal(pauvre.portefeuille.credits, 139);
  assert.equal(pauvre.tirage, null);

  const inconnu = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'etagere-fantome' });
  assert.equal(inconnu.raison, 'rayon-inconnu');
  for (const id of ['braise', 'banquise', 'citerne']) {
    const ancien = ouvrirBooster({ portefeuille: journalier(10000), rayonId: id, progression: COMPLET });
    assert.equal(ancien.raison, 'rayon-inconnu', `l’ancien rayon ${id} ne se vend plus`);
    assert.equal(ancien.portefeuille.credits, 10000);
  }
});

test('le coffret vend dix paquets avec la remise, et une mythique assurée', () => {
  assert.equal(prixCoffret('souk'), 1260);
  assert.equal(prixCoffret('inconnu'), null);
  const depart = journalier(5000);
  const coffret = ouvrirCoffret({ portefeuille: depart, rayonId: 'souk', rng: rngSeme(77) });
  assert.equal(coffret.ok, true);
  assert.equal(coffret.paquets.length, 10, 'dix paquets, même si le dernier se vide');
  assert.equal(coffret.mythique, true, 'une mythique au moins dans le coffret');
  assert.equal(coffret.prix, 1260);
  assert.equal(coffret.portefeuille.credits, 5000 - 1260 + coffret.paquets.reduce((somme, paquet) => somme + paquet.remboursement, 0));

  const pauvre = ouvrirCoffret({ portefeuille: journalier(1200), rayonId: 'souk' });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.deepEqual(pauvre.paquets, []);
});

test('dans un coffret, le doublon d’un paquet précédent se rembourse au barème', () => {
  // `samourai-du-torii` : rare hors dotation possédée en un seul exemplaire.
  // La graine 42 la fait sortir dans deux paquets du coffret — le second est
  // le troisième exemplaire, il se rembourse au barème comme il le ferait
  // dans un paquet acheté seul (doc 13, D4), et le stock reste au quota.
  const cible = 'samourai-du-torii';
  const depart = { ...journalier(100000), cartes: [cible], exemplaires: { [cible]: 1 } };
  const coffret = ouvrirCoffret({ portefeuille: depart, rayonId: 'souk', collection: [cible], rng: rngSeme(42) });
  assert.equal(coffret.ok, true);
  const details = coffret.paquets.flatMap((paquet) => paquet.details).filter((carte) => carte.id === cible);
  assert.equal(details.length, 2, 'la rare tombe dans deux paquets du coffret');
  assert.equal(details[0].remboursement, 0, 'le deuxième exemplaire se garde, il complète le playset');
  assert.equal(details[1].remboursement, BAREME_DOUBLON.rare, 'le troisième exemplaire se rembourse au barème rare');
  assert.equal(coffret.portefeuille.exemplaires[cible], 2, 'le stock reste bloqué au quota de deck');
});

// ── Le journal des ouvertures ────────────────────────────────────────────────

test('chaque paquet acheté laisse une trace au journal, doublons compris', () => {
  const rng = rngSeme(20260301);
  const apres = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'souk', rng });
  assert.equal(apres.ok, true);
  assert.equal(apres.portefeuille.journal.length, 1, 'un paquet, une entrée');
  const entree = apres.portefeuille.journal[0];
  assert.equal(entree.rayonId, 'souk');
  assert.equal(entree.cartes.length, TAUX.cartes);
  assert.equal(entree.coffret, false);
  assert.equal(entree.remboursement, apres.tirage.remboursement);
  assert.ok(entree.cartes.every((id) => cardById(id)), 'des cartes du catalogue');

  const coffret = ouvrirCoffret({ portefeuille: journalier(10000), rayonId: 'souk', rng: rngSeme(20260401) });
  assert.equal(coffret.portefeuille.journal.length, COFFRET.taille, 'dix paquets, dix entrées');
  assert.ok(coffret.portefeuille.journal.every((ligne) => ligne.coffret), 'marquées comme venues d’un coffret');

  const refuse = ouvrirBooster({ portefeuille: portefeuilleVide(), rayonId: 'souk', rng });
  assert.equal(refuse.ok, false);
  assert.deepEqual(refuse.portefeuille.journal, [], 'un achat refusé n’écrit rien au journal');

  const ancien = noterOuvertureJournal(portefeuilleVide(), {
    rayonId: 'braise', cartes: ['tarek'], horloge: '2026-03-01T10:00:00.000Z',
  });
  assert.equal(ancien.journal[0].rayonId, 'braise', 'l’ancienne ouverture reste lisible');
});
