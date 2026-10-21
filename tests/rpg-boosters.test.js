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
import { RPG_DUEL_CARDS, cardById, cardColors, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, collectionJoueur } from '../src/games/rpgCollection.js';
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

// ── Les trois paquets ────────────────────────────────────────────────────────

test('trois paquets en vente, chacun avec ses couleurs, dès le départ', () => {
  assert.deepEqual(RAYONS.map((rayon) => rayon.id), ['souk', 'banquise', 'citerne']);
  assert.deepEqual(PAQUET_DE.souk.couleur, ['sable', 'braise']);
  assert.deepEqual(PAQUET_DE.banquise.couleur, ['neige', 'tenebres']);
  assert.deepEqual(PAQUET_DE.citerne.couleur, ['eau', 'braise']);
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
  // Le journal d'un appareil garde ses anciennes ouvertures : lisibles, plus vendues.
  assert.equal(rayonParId('braise').nom, 'Braise');
  assert.equal(rayonOuvert('braise'), false);
  assert.deepEqual(vivierRayon('braise'), []);
  assert.equal(prixCoffret('braise'), null);
  assert.equal(etatRayons(progression()).length, RAYONS.length);
  assert.equal(etatRayon('braise', COMPLET), null, 'un ancien rayon n’est plus une étagère');
});

test('chaque carte jouable est vendue dans un seul paquet, sans oubli ni doublon', () => {
  const tous = RAYONS.flatMap((rayon) => vivierRayon(rayon.id));
  assert.equal(new Set(tous).size, tous.length, 'aucune carte dans deux paquets');
  assert.deepEqual([...new Set(tous)].sort(), jouables().sort(), 'toute carte jouable est dans un paquet');
  for (const rayon of RAYONS) {
    for (const id of vivierRayon(rayon.id)) {
      const couleurs = cardColors(id);
      assert.ok(couleurs.some((couleur) => rayon.couleur.includes(couleur)),
        `${id} (${couleurs.join('/')}) est dans le paquet ${rayon.id}`);
    }
  }
});

test('les cartes ne dépendent plus de la progression : tout le catalogue est au vivier', () => {
  for (const id of jouables()) {
    assert.equal(carteAuVivier(id), true, `${id} est au vivier sans condition`);
  }
  assert.equal(carteAuVivier('carte-qui-nexiste-pas'), false);
  // Le vivier ne change pas selon la progression.
  for (const rayon of RAYONS) {
    assert.deepEqual(vivierRayon(rayon.id), vivierRayon(rayon.id, COMPLET));
  }
});

test('une future carte jouable rejoint automatiquement son paquet', () => {
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
  RPG_DUEL_CARDS.push(nouvelle);
  try {
    assert.ok(vivierRayon('souk').includes('carte-future-sable'), 'entre dans le paquet de sa couleur');
    assert.equal(vivierRayon('banquise').includes('carte-future-sable'), false);
  } finally {
    RPG_DUEL_CARDS.splice(RPG_DUEL_CARDS.indexOf(nouvelle), 1);
  }
});

test('une carte sans couleur reconnue tombe dans le premier paquet, jamais hors vente', () => {
  const orpheline = { id: 'carte-sans-couleur', name: 'Orpheline', element: 'inconnu', cost: 1, atk: 1, def: 1, rarity: 'commune', kind: 'creature' };
  RPG_DUEL_CARDS.push(orpheline);
  try {
    assert.ok(vivierRayon(RAYONS[0].id).includes('carte-sans-couleur'));
    for (const rayon of RAYONS.slice(1)) assert.equal(vivierRayon(rayon.id).includes('carte-sans-couleur'), false);
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

test('un paquet fait cinq cartes distinctes, du bon paquet, avec exactement une rare', () => {
  for (const rayon of RAYONS) {
    const vivier = vivierRayon(rayon.id);
    const rng = rngSeme(11);
    for (let index = 0; index < 200; index += 1) {
      const tirage = ouvrirBooster({ portefeuille: journalier(10000), rayonId: rayon.id, progression: COMPLET, rng });
      assert.equal(tirage.ok, true);
      assert.equal(tirage.tirage.cartes.length, TAUX.cartes);
      assert.equal(new Set(tirage.tirage.cartes).size, TAUX.cartes, 'jamais deux fois la même carte');
      for (const id of tirage.tirage.cartes) assert.ok(vivier.includes(id), `${id} est bien dans ${rayon.id}`);
      assert.equal(tirage.tirage.details[3].rarete, 'rare', 'la quatrième carte est la rare garantie');
      assert.equal(tirage.tirage.details.filter((carte) => carte.rarete === 'rare').length, 1,
        'un paquet contient exactement une rare');
    }
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
  for (let graine = 1; graine <= 40; graine += 1) {
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
  const tirage = ouvrirBooster({ portefeuille: depart, rayonId: 'banquise', rng: rngSeme(9) });
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
});

test('un paquet de doublons n’enrichit jamais son acheteur', () => {
  for (const rayon of RAYONS) {
    const vivier = vivierRayon(rayon.id);
    let bourse = journalier(100000);
    for (let graine = 1; graine <= 30; graine += 1) {
      const avant = bourse.credits;
      const achat = ouvrirBooster({ portefeuille: bourse, rayonId: rayon.id, collection: vivier, rng: rngSeme(graine) });
      assert.equal(achat.ok, true);
      assert.ok(achat.portefeuille.credits < avant, `le paquet ${rayon.id} ${graine} ne rapporte pas de crédits`);
      bourse = achat.portefeuille;
    }
  }
  const pire = BAREME_DOUBLON.inhabituelle * 3 + BAREME_DOUBLON.rare + BAREME_DOUBLON.mythique;
  assert.equal(pire, 112);
  assert.ok(pire < 140, 'un paquet entièrement fait de doublons ne rembourse jamais son prix');
});

test('sans solde, ou sur un ancien rayon, l’achat ne touche à rien', () => {
  const pauvre = ouvrirBooster({ portefeuille: journalier(139), rayonId: 'souk' });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.equal(pauvre.portefeuille.credits, 139);
  assert.equal(pauvre.tirage, null);

  const inconnu = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'etagere-fantome' });
  assert.equal(inconnu.raison, 'rayon-inconnu');
  const ancien = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'braise', progression: COMPLET });
  assert.equal(ancien.raison, 'rayon-inconnu', 'un ancien rayon ne se vend plus');
  assert.equal(ancien.portefeuille.credits, 10000);
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

// ── Le journal des ouvertures ────────────────────────────────────────────────

test('chaque paquet acheté laisse une trace au journal, doublons compris', () => {
  const rng = rngSeme(20260301);
  const apres = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'citerne', rng });
  assert.equal(apres.ok, true);
  assert.equal(apres.portefeuille.journal.length, 1, 'un paquet, une entrée');
  const entree = apres.portefeuille.journal[0];
  assert.equal(entree.rayonId, 'citerne');
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
