/**
 * Les coffrets de bienvenue — le premier choix d'un nouveau joueur.
 *
 * Ce que ces tests protègent, dans l'ordre du dossier :
 *
 *   - l'offre : trois coffrets, trois couleurs différentes, trente cartes ;
 *   - le contenu : une mythique (une seule), trois rares distinctes à **un**
 *     exemplaire, le reste en communes et inhabituelles ;
 *   - la jouabilité : chaque coffret est un deck valide au sens du format
 *     (`rpgValiderDeck`), à deux couleurs au plus ;
 *   - le choix : définitif, et un identifiant inconnu ne casse rien ;
 *   - les vagues de la cérémonie : le socle, puis les rares, puis la mythique ;
 *   - le remplacement de la dotation dans `collectionJoueur`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RPG_DUEL_CARDS,
  cardById,
  cardColors,
  cardCopyLimit,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import {
  COFFRETS_PROPOSES,
  COFFRETS_IDENTITE,
  COFFRET_COULEURS,
  COFFRET_RARES,
  COFFRET_TAILLE,
  choisirCoffret,
  coffretChoisi,
  coffretEstJouable,
  coffretParId,
  coffretEnDeckMaison,
  coffretBienvenueNecessaire,
  composerCoffret,
  composerOffre,
  mythiqueVitrineDuCoffret,
  normaliserOffreBienvenue,
  offreBienvenue,
  vaguesDuCoffret,
} from '../src/games/rpgCoffretBienvenue.js';
import { collectionJoueur, COLLECTION_DEPART } from '../src/games/rpgCollection.js';

/** Un générateur reproductible : les tests ne dépendent pas du hasard. */
function suite(graine = 1) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/** Les couleurs d'un coffret, sans doublon. */
function couleursDuCoffret(coffret) {
  return [...new Set(coffret.cardIds.flatMap((id) => cardColors(cardById(id))))];
}

test('les coffrets de bienvenue : trois coffrets, trois couleurs, trente cartes', () => {
  const offre = composerOffre({ rng: suite(7) });
  assert.equal(offre.length, COFFRETS_PROPOSES, 'trois coffrets sont proposés');
  assert.equal(new Set(offre.map((coffret) => coffret.couleur)).size, 3,
    'les trois coffrets sont de couleurs différentes');
  for (const coffret of offre) {
    assert.equal(COFFRET_COULEURS.includes(coffret.couleur), true, `${coffret.couleur} est une couleur historique`);
    assert.equal(coffret.cardIds.length, COFFRET_TAILLE, `${coffret.nom} : trente cartes`);
    assert.equal(coffret.nom, COFFRETS_IDENTITE[coffret.couleur].nom);
    assert.ok(coffret.sousTitre.length > 0, 'chaque coffret porte sa phrase');
  }
});

test('un coffret, c’est une mythique, trois rares à un exemplaire, et des communes', () => {
  for (const couleur of COFFRET_COULEURS) {
    const coffret = composerCoffret(couleur, { rng: suite(couleur.length) });
    assert.ok(coffret, `${couleur} : un coffret se compose`);
    const comptes = new Map();
    for (const id of coffret.cardIds) comptes.set(id, (comptes.get(id) ?? 0) + 1);

    const mythiques = [...comptes.keys()].filter((id) => cardById(id).rarity === 'mythique');
    assert.deepEqual(mythiques, [coffret.mythiqueId], `${couleur} : une seule mythique, celle annoncée`);
    assert.equal(comptes.get(coffret.mythiqueId), 1, `${couleur} : la mythique est en un exemplaire`);

    const rares = [...comptes.keys()].filter((id) => cardById(id).rarity === 'rare');
    assert.equal(rares.length, COFFRET_RARES, `${couleur} : trois rares distinctes`);
    assert.deepEqual([...rares].sort(), [...coffret.raresIds].sort(), `${couleur} : les rares annoncées`);
    for (const id of rares) assert.equal(comptes.get(id), 1, `${couleur} : ${id} en un exemplaire`);

    for (const [id, nombre] of comptes.entries()) {
      const carte = cardById(id);
      assert.equal(nombre <= cardCopyLimit(carte), true,
        `${couleur} : ${id} ne dépasse pas son quota (${nombre} ≤ ${cardCopyLimit(carte)})`);
      if (!['mythique', 'rare'].includes(carte.rarity)) {
        assert.ok(['commune', 'inhabituelle'].includes(carte.rarity),
          `${couleur} : ${id} est une commune ou une inhabituelle (${carte.rarity})`);
      }
    }

    const couleurs = couleursDuCoffret(coffret);
    assert.ok(couleurs.includes(couleur), `${couleur} : le coffret porte sa couleur`);
    assert.equal(couleurs.length <= 2, true,
      `${couleur} : au plus une couleur alliée (${couleurs.join(' + ')})`);
  }
});

test('chaque coffret est un deck valide, deux cents tirages de suite', () => {
  const rng = suite(2026);
  for (let tirage = 0; tirage < 200; tirage += 1) {
    const couleur = COFFRET_COULEURS[tirage % COFFRET_COULEURS.length];
    const coffret = composerCoffret(couleur, { rng });
    assert.ok(coffret, `${couleur} : le tirage ${tirage} compose un coffret`);
    const validation = rpgValiderDeck(coffret.cardIds);
    assert.equal(validation.ok, true, `${couleur} : ${validation.raison}`);
    assert.equal(coffretEstJouable(coffret), true, `${couleur} : coffretEstJouable suit la règle du format`);
  }
});

test('un coffret se lit en deck maison : trente cartes, sa mythique en peinture', () => {
  const coffret = composerCoffret('neige', { rng: suite(3) });
  const deck = coffretEnDeckMaison(coffret);
  assert.equal(deck.maison, true);
  assert.equal(deck.cardIds.length, 30);
  assert.deepEqual(deck.cardIds, coffret.cardIds, 'le deck du coffret est son contenu, dans l’ordre');
  assert.equal(deck.boxArt, coffret.mythiqueId, 'le boîtier montre la mythique');
  assert.equal(deck.element, 'neige');
});

test('le même générateur refait la même offre, un autre en change', () => {
  const premiere = composerOffre({ rng: suite(11) });
  const seconde = composerOffre({ rng: suite(11) });
  assert.deepEqual(premiere, seconde, 'le tirage est reproductible');
  const autre = composerOffre({ rng: suite(12) });
  assert.notDeepEqual(autre.map((c) => c.cardIds), premiere.map((c) => c.cardIds),
    'deux générateurs différents ne donnent pas la même offre');
});

test('le choix d’un coffret est définitif, et un identifiant inconnu ne change rien', () => {
  const offre = offreBienvenue({ rng: suite(5), horloge: () => '2026-10-26T00:00:00.000Z' });
  assert.equal(offre.choisi, null, 'rien n’est choisi au départ');
  assert.equal(coffretBienvenueNecessaire({ offre }), true, 'un joueur neuf voit les coffrets');

  const inconnu = choisirCoffret(offre, 'coffret-inexistant');
  assert.equal(inconnu.choisi, null, 'un identifiant inconnu ne choisit rien');

  const id = offre.coffrets[0].id;
  const choisi = choisirCoffret(offre, id);
  assert.equal(choisi.choisi, id);
  assert.equal(coffretChoisi(choisi).id, id);
  assert.equal(coffretBienvenueNecessaire({ offre: choisi }), false, 'un coffret choisi ferme l’écran');

  const second = choisirCoffret(choisi, offre.coffrets[1].id);
  assert.equal(second.choisi, id, 'on ne remplace pas un coffret déjà ouvert');
  assert.equal(coffretParId(choisi, offre.coffrets[1].id).id, offre.coffrets[1].id);
});

test('les vagues de la cérémonie : le socle, puis les trois rares, puis la mythique', () => {
  const coffret = composerCoffret('sable', { rng: suite(2) });
  const vagues = vaguesDuCoffret(coffret);
  assert.deepEqual(vagues.map((vague) => vague.cle), ['socle', 'rares', 'mythique'],
    'l’ordre des vagues est celui de la cérémonie');
  assert.equal(vagues[0].cartes.every((ligne) => ['commune', 'inhabituelle'].includes(ligne.carte.rarity)), true);
  assert.equal(vagues[1].cartes.length, COFFRET_RARES, 'la deuxième vague : les trois rares');
  assert.deepEqual(vagues[2].cartes.map((ligne) => ligne.id), [coffret.mythiqueId],
    'la dernière vague : la mythique, seule');
  assert.equal(vagues.reduce((total, vague) => total
    + vague.cartes.reduce((somme, ligne) => somme + ligne.exemplaires, 0), 0), 30,
    'les vagues rendent les trente cartes du coffret, exemplaires compris');
});

test('l’écran de bienvenue ne s’impose jamais à un joueur qui a déjà joué', () => {
  const offre = offreBienvenue({ rng: suite(4) });
  assert.equal(coffretBienvenueNecessaire({ offre, progression: { etagesVaincus: ['listes-1'] } }), false,
    'un étage vaincu : le joueur a déjà joué');
  assert.equal(coffretBienvenueNecessaire({ offre, acquis: { cartes: ['tarek'] } }), false,
    'des cartes gagnées : plus de coffret');
  assert.equal(coffretBienvenueNecessaire({ offre, collection: ['tarek'] }), false,
    'une collection existante : plus de coffret');
  assert.equal(coffretBienvenueNecessaire({ offre: normaliserOffreBienvenue(null) }), false,
    'sans offre, il n’y a rien à proposer');
});

test('une offre corrompue ne casse jamais l’écran', () => {
  assert.deepEqual(normaliserOffreBienvenue(null), { version: 1, creeLe: null, coffrets: [], choisi: null });
  const cassee = normaliserOffreBienvenue({
    coffrets: [{ id: 'x', cardIds: ['tarek'] }, null, { id: 'coffret-sable', cardIds: [] }],
    choisi: 'x',
  });
  assert.deepEqual(cassee.coffrets, [], 'les coffrets incomplets sont écartés');
  assert.equal(cassee.choisi, null, 'un choix orphelin est oublié');
});

test('le coffret remplace la dotation, et seulement lui', () => {
  const coffret = composerCoffret('braise', { rng: suite(9) });
  const sansCoffret = collectionJoueur({ acquis: { gel: true, cartes: [] }, coffret: null });
  assert.deepEqual(sansCoffret, [...COLLECTION_DEPART],
    'sans coffret, la dotation du catalogue reste la base');

  const avecCoffret = collectionJoueur({ acquis: { gel: true, cartes: [] }, coffret });
  assert.deepEqual(avecCoffret, [...new Set(coffret.cardIds)],
    'la collection est le coffret, dédoublonné, sans la dotation');
  assert.equal(avecCoffret.length, new Set(coffret.cardIds).size,
    'les cartes du coffret, dédoublonnées');
  assert.equal(avecCoffret.some((id) => COLLECTION_DEPART.includes(id) && !coffret.cardIds.includes(id)), false,
    'aucune carte de la dotation hors coffret');
  assert.equal(avecCoffret.includes('tarek'), false, 'Tarek ne vient pas du coffret');

  const avecSouk = collectionJoueur({ acquis: { gel: true, cartes: [] }, coffret, souk: ['tarek'] });
  assert.equal(avecSouk.includes('tarek'), true, 'le Souk s’ajoute au coffret');
  assert.equal(avecSouk.length, avecCoffret.length + 1);
});

test('chaque paquet porte la peinture d’une mythique de SA couleur', () => {
  // C'est l'illustration imprimée sur le coffret fermé : une mythique de la
  // couleur du coffret, existante, et **pas** forcément celle qui sera tirée —
  // le paquet doit donner envie, pas vendre la surprise de la troisième vague.
  const vues = new Set();
  for (const couleur of COFFRET_COULEURS) {
    const coffret = composerCoffret(couleur, { rng: suite(41) });
    const vitrine = mythiqueVitrineDuCoffret(coffret);
    assert.ok(vitrine, `${couleur} a une peinture de paquet`);
    assert.equal(cardById(vitrine.id), vitrine, 'la carte existe au catalogue');
    assert.equal(vitrine.rarity, 'mythique', `${vitrine.id} est bien une mythique`);
    assert.ok(cardColors(vitrine).includes(couleur), `${vitrine.id} est de la couleur du coffret`);
    vues.add(vitrine.id);
  }
  assert.equal(vues.size, COFFRET_COULEURS.length, 'quatre couleurs, quatre peintures différentes');
  assert.equal(mythiqueVitrineDuCoffret(null), null, 'sans coffret, aucune peinture');
  // Le cachet de l'offre reste intact : la vitrine ne devient pas une carte du coffret.
  const coffret = composerCoffret('sable', { rng: suite(41) });
  assert.equal(coffret.cardIds.length, COFFRET_TAILLE);
});

test('le catalogue des coffrets ne cite jamais une carte inconnue', () => {
  const connues = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));
  for (const couleur of COFFRET_COULEURS) {
    const coffret = composerCoffret(couleur, { rng: suite(13) });
    for (const id of coffret.cardIds) assert.equal(connues.has(id), true, `${id} est au catalogue`);
    assert.equal(connues.has(coffret.mythiqueId), true);
    for (const id of coffret.raresIds) assert.equal(connues.has(id), true);
  }
});
