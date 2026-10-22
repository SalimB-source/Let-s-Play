/**
 * Les decks du Sablier sont **composés** : ces contrôles tiennent la règle
 * « les meilleures cartes d'abord » (`rpgCardPower.js`, `rpgDeckComposer.js`,
 * `rpgDeckRecipes.js`).
 *
 * Trois familles d'assertions :
 *
 *  1. **La liste est bien le produit de la recette** — chaque deck du catalogue
 *     et de l'Histoire vaut exactement ce que `composerDeck` rend pour sa
 *     recette et le catalogue : une carte retirée à la main d'un deck, ou une
 *     meilleure carte oubliée, fait échouer le contrôle.
 *  2. **Aucun regret** — hors signature, aucune carte laissée de côté n'est
 *     mieux classée (palier de rareté, puis puissance) qu'une carte retenue :
 *     c'est la définition même de « les meilleures d'abord ».
 *  3. **Les invariants du jeu** — 30 cartes sans terrain,
 *     mythiques à un exemplaire, identité chromatique stricte, plafonds de la
 *     campagne tenus, boîtier illustré par une carte du deck.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOGUE_DU_COMPOSEUR,
  RPG_DECKS,
  RPG_DUEL_CARDS,
  carteJouableSansTerrain,
  cardById,
  cardColors,
  cardCopyLimit,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { RPG_RECETTES_DECKS, RPG_RECETTES_HISTOIRE } from '../src/games/rpgDeckRecipes.js';
import { composerDeck } from '../src/games/rpgDeckComposer.js';
import { comparerCartesParPuissance, puissanceCarte, rangRarete } from '../src/games/rpgCardPower.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';

const RECETTES = { ...RPG_RECETTES_DECKS, ...RPG_RECETTES_HISTOIRE };
const carteParId = new Map(RPG_DUEL_CARDS.map((carte) => [carte.id, carte]));

/** Les couleurs admises dans une liste : celles du vivier (`identite`), plus
 *  celles des cartes posées d'office par la **signature** — Le Brûlot, seule
 *  flamme (Braise) des Lettres de Marque, entre par elle et non par le
 *  remplissage. Ces exceptions restent bornées aux cartes de la signature. */
function couleursAdmises(recette) {
  const admises = new Set(recette.identite);
  for (const entree of recette.signature) {
    const id = Array.isArray(entree) ? entree[0] : entree;
    for (const couleur of cardColors(id)) admises.add(couleur);
  }
  return admises;
}

/** Les cartes d'une liste, au nombre d'exemplaires près : `Map(id → n)`. */
function compter(liste) {
  const comptes = new Map();
  for (const id of liste) comptes.set(id, (comptes.get(id) ?? 0) + 1);
  return comptes;
}

/** La clé de classement d'une carte : palier de rareté, puis puissance. */
const cleDe = (carte) => [rangRarete(carte), puissanceCarte(carte)];

/** `a` est-il mieux classé que `b` ? */
function mieuxClasse(a, b) {
  const [rangA, puissanceA] = cleDe(a);
  const [rangB, puissanceB] = cleDe(b);
  return rangA > rangB || (rangA === rangB && puissanceA > puissanceB);
}

// ── 1. Chaque deck vaut la composition de sa recette ────────────────────────

test('chaque recette somme 30 cartes sans terrain et désigne un quota cohérent', () => {
  for (const [deckId, recette] of Object.entries(RECETTES)) {
    const terrains = recette.terrains.reduce((somme, [, nombre]) => somme + nombre, 0);
    assert.equal(terrains + recette.creatures + recette.magies + (recette.armes ?? 0), 30,
      `${deckId} : créatures + magies + armes doivent faire 30`);
    assert.equal(terrains, 0, `${deckId} : aucun terrain`);
    assert.ok(recette.identite.length >= 1, `${deckId} : une identité chromatique`);
  }
});

test('les decks du catalogue et de l’Histoire sont composés par leur recette', () => {
  for (const deck of RPG_DECKS) {
    const recette = RPG_RECETTES_DECKS[deck.id];
    assert.ok(recette, `${deck.id} a sa recette`);
    assert.deepEqual(deck.cardIds, composerDeck(recette, CATALOGUE_DU_COMPOSEUR),
      `${deck.name} : la liste est celle de la recette, pas une liste écrite à la main`);
  }
  for (const deckId of Object.keys(RPG_RECETTES_HISTOIRE)) {
    assert.deepEqual(RPG_STORY_DECKS[deckId],
      composerDeck(RPG_RECETTES_HISTOIRE[deckId], CATALOGUE_DU_COMPOSEUR),
      `le paquet d’Histoire ${deckId} suit sa recette`);
  }
});

// ── 2. « Les meilleures d'abord » : aucun regret ────────────────────────────

test('aucune carte laissée de côté n’est mieux classée qu’une carte retenue', () => {
  for (const [deckId, recette] of Object.entries(RECETTES)) {
    const liste = RPG_STORY_DECKS[deckId] ?? RPG_DECKS.find((deck) => deck.id === deckId)?.cardIds;
    assert.ok(liste, `${deckId} : la liste existe`);
    const signature = new Set(recette.signature.map((entree) => (Array.isArray(entree) ? entree[0] : entree)));
    const comptes = compter(liste);
    const identite = (carte) => {
      if (carte?.set === 'balance-des-heures' && !recette.identite.includes('tenebres')) return false;
      const couleurs = cardColors(carte);
      if (carte?.set === 'lettres-de-marque') {
        const course = recette.identite.includes('sable') && recette.identite.includes('eau');
        const tenebresPures = couleurs.length > 0
          && couleurs.every((couleur) => couleur === 'tenebres')
          && recette.identite.includes('tenebres');
        if (!course && !tenebresPures) return false;
      }
      return couleurs.length > 0 && couleurs.every((couleur) => recette.identite.includes(couleur));
    };
    // Les places de remplissage — signature et terrains exclus : la signature
    // est posée d'abord quel que soit son rang, et les terrains ne se classent
    // pas à la puissance.
    const remplissage = [...comptes.keys()]
      .filter((id) => !signature.has(id) && carteParId.get(id).kind !== 'terrain')
      .map((id) => carteParId.get(id));
    const seau = (carte) => (carte.kind === 'magie' ? 'magie' : carte.kind === 'arme' ? 'arme' : 'creature');
    // Les plafonds globaux des starters sont durs ; les plafonds de campagne,
    // eux, restent par famille et peuvent céder lors de la dernière passe.
    const distinctes = (rarete) => [...comptes.keys()]
      .map((id) => carteParId.get(id))
      .filter((autre) => autre.kind !== 'terrain' && autre.rarity === rarete).length;
    const plafondAtteint = (carte) => {
      const famille = seau(carte);
      const memes = [...comptes.keys()]
        .map((id) => carteParId.get(id))
        .filter((autre) => seau(autre) === famille && autre.kind !== 'terrain');
      if (carte.rarity === 'mythique') {
        return distinctes('mythique') >= (recette.mythiquesTotalMax ?? Infinity)
          || memes.filter((autre) => autre.rarity === 'mythique').length >= (recette.mythiquesMax ?? Infinity);
      }
      if (carte.rarity === 'rare') {
        return distinctes('rare') >= (recette.raresTotalMax ?? Infinity)
          || memes.filter((autre) => autre.rarity === 'rare').length >= (recette.raresMax ?? Infinity);
      }
      return false;
    };
    const laissees = RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
      && identite(carte) && !comptes.has(carte.id) && !signature.has(carte.id)
      && !plafondAtteint(carte));
    for (const carte of laissees) {
      for (const retenue of remplissage) {
        if (seau(carte) !== seau(retenue)) continue;
        assert.equal(mieuxClasse(carte, retenue), false,
          `${deckId} : ${carte.id} (laissée) passe devant ${retenue.id} (retenue)`);
      }
    }
  }
});

test('les meilleures cartes sont prises à leur maximum légal', () => {
  for (const [deckId, recette] of Object.entries(RECETTES)) {
    const liste = RPG_STORY_DECKS[deckId] ?? RPG_DECKS.find((deck) => deck.id === deckId)?.cardIds;
    const comptes = compter(liste);
    for (const [id, nombre] of comptes) {
      const carte = carteParId.get(id);
      assert.ok(nombre <= cardCopyLimit(carte), `${deckId} : ${id} ×${nombre}`);
    }
    const horsTerrains = [...comptes.keys()]
      .filter((id) => carteParId.get(id).kind !== 'terrain');
    // Toute carte retenue qui n'est pas la dernière admise a son maximum : le
    // composeur remplit carte par carte, jamais à moitié par plaisir.
    const signature = new Set(recette.signature.map((entree) => (Array.isArray(entree) ? entree[0] : entree)));
    const partielle = new Set();
    for (const famille of ['magie', 'creature', 'arme']) {
      const classees = horsTerrains
        .map((id) => carteParId.get(id))
        .filter((carte) => (carte.kind === 'magie' ? 'magie' : carte.kind === 'arme' ? 'arme' : 'creature') === famille)
        .filter((carte) => !signature.has(carte.id))
        .sort(comparerCartesParPuissance);
      if (classees.length) partielle.add(classees.at(-1).id);
    }
    for (const id of horsTerrains) {
      if (signature.has(id) || partielle.has(id)) continue;
      const nombre = comptes.get(id);
      assert.equal(nombre, cardCopyLimit(carteParId.get(id)),
        `${deckId} : ${id} est retenu sans être à son maximum`);
    }
  }
});

// ── 3. Les invariants du jeu ────────────────────────────────────────────────

test('les boîtiers du catalogue restent valides, illustrés et fidèles à leur couleur', () => {
  for (const deck of RPG_DECKS) {
    const validation = rpgValiderDeck(deck.cardIds);
    assert.equal(validation.ok, true, `${deck.name} : ${validation.raison}`);
    assert.equal(deck.cardIds.length, 30);
    const recette = RPG_RECETTES_DECKS[deck.id];
    assert.equal(validation.terrains, recette.terrains.reduce((somme, [, n]) => somme + n, 0),
      `${deck.name} : les terrains de la recette`);
    const admises = couleursAdmises(recette);
    for (const id of new Set(deck.cardIds)) {
      const carte = cardById(id);
      const couleurs = cardColors(carte);
      assert.ok(couleurs.every((couleur) => admises.has(couleur)),
        `${deck.name} : ${id} sort de l’identité ${recette.identite.join(' + ')}`);
      assert.equal(cardColors(carte).length > 0, true, `${deck.name} : ${id} a une couleur`);
    }
    assert.ok(deck.cardIds.some((id) => (cardById(id).art ?? id) === deck.boxArt),
      `${deck.name} : le boîtier montre une carte du deck`);
  }
});

test('chaque deck de départ mélange les quatre raretés et respecte son plafond de mythiques', () => {
  for (const deck of RPG_DECKS) {
    const recette = RPG_RECETTES_DECKS[deck.id];
    const comptes = compter(deck.cardIds);
    const cartesNonTerrain = [...comptes.keys()]
      .map((id) => cardById(id))
      .filter((carte) => carte.kind !== 'terrain');
    const mythiques = cartesNonTerrain.filter((carte) => carte.rarity === 'mythique');
    const raresDistinctes = cartesNonTerrain.filter((carte) => carte.rarity === 'rare');
    const raretes = new Set(cartesNonTerrain.map((carte) => carte.rarity));

    assert.equal(mythiques.length, recette.mythiquesTotalMax,
      `${deck.name} : exactement le nombre de mythiques déclaré par sa recette`);
    assert.equal(recette.mythiquesTotalMax, ['serment-des-neuf-hivers', 'serment-du-soleil-rouge'].includes(deck.id) ? 2 : 1,
      `${deck.name} : plafond global déclaré dans sa recette`);
    assert.ok(raresDistinctes.length >= 1, `${deck.name} : au moins une rare`);
    assert.ok(raresDistinctes.length <= recette.raresTotalMax,
      `${deck.name} : ${raresDistinctes.length} rares distinctes, plafond ${recette.raresTotalMax}`);
    for (const rarete of ['commune', 'inhabituelle', 'rare', 'mythique']) {
      assert.ok(raretes.has(rarete), `${deck.name} : contient une carte ${rarete}`);
    }

    // Les mythiques désignées par le starter deck sont jouables dans son
    // boîtier, mais elles ne sont pas remises comme cartes de collection :
    // elles se gagnent au Souk.
    const mythiquesDuDeck = new Set(mythiques.map((carte) => carte.id));
    for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.rarity === 'mythique'
      && candidate.kind !== 'terrain'
      && cardColors(candidate).length > 0
      && cardColors(candidate).every((couleur) => recette.identite.includes(couleur)))) {
      if (mythiquesDuDeck.has(carte.id)) continue;
      assert.equal(comptes.has(carte.id), false, `${deck.name} : ${carte.id} reste hors du deck de départ`);
    }
  }
});

test('les cartes rares et mythiques qui restent hors des starters sont réservées au Souk', () => {
  for (const carte of RPG_DUEL_CARDS.filter((candidate) => ['rare', 'mythique'].includes(candidate.rarity))) {
    assert.equal(COLLECTION_DEPART.includes(carte.id), false, `${carte.id} n’est pas dans la dotation gratuite`);
    assert.ok(carteReveleePar(carte.id), `${carte.id} est révélée puis ouvrable dans un booster`);
  }
});

test('les paquets de la campagne tiennent les plafonds de la rampe', () => {
  for (const [deckId, recette] of Object.entries(RPG_RECETTES_HISTOIRE)) {
    const liste = RPG_STORY_DECKS[deckId];
    const validation = rpgValiderDeck(liste);
    assert.equal(validation.ok, true, `${deckId} : ${validation.raison}`);
    const comptes = compter(liste);
    const parSeau = { creature: [], magie: [], arme: [] };
    for (const id of comptes.keys()) {
      const carte = carteParId.get(id);
      if (carte.kind === 'terrain') continue;
      parSeau[carte.kind === 'magie' ? 'magie' : carte.kind === 'arme' ? 'arme' : 'creature'].push(carte);
    }
    for (const [seau, cartes] of Object.entries(parSeau)) {
      const mythiques = cartes.filter((carte) => carte.rarity === 'mythique').length;
      const rares = cartes.filter((carte) => carte.rarity === 'rare').length;
      assert.ok(mythiques <= (recette.mythiquesMax ?? Infinity),
        `${deckId} : ${mythiques} mythiques (${seau}) pour un plafond de ${recette.mythiquesMax}`);
      assert.ok(rares <= (recette.raresMax ?? Infinity),
        `${deckId} : ${rares} rares (${seau}) pour un plafond de ${recette.raresMax}`);
    }
    // L'identité chromatique de la recette, la signature mise à part.
    const admises = couleursAdmises(recette);
    for (const id of new Set(liste)) {
      const couleurs = cardColors(cardById(id));
      assert.ok(couleurs.every((couleur) => admises.has(couleur)),
        `${deckId} : ${id} sort de l’identité de sa recette`);
    }
  }
});

test('le composeur garde la signature, remplit au maximum et ne laisse pas de place vide', () => {
  // Un mini-catalogue : trois créatures et un sort, dont une mythique faible —
  // la signature doit la garder, le remplissage doit prendre le reste.
  const fabriquer = (id, rarity, cost, atk, def, kind = 'creature') => ({
    id, rarity, cost, atk, def, kind, element: 'sable', typeLine: 'test',
  });
  const cartes = [
    fabriquer('faible-mythique', 'mythique', 6, 1, 1),
    fabriquer('rare-forte', 'rare', 2, 3, 3),
    fabriquer('commune', 'commune', 1, 1, 1),
    { id: 'rituel', rarity: 'commune', cost: 2, kind: 'magie', element: 'sable', effet: { type: 'pioche', amount: 1 }, typeLine: 'test' },
    { id: 'terrain-sable', rarity: 'commune', cost: 0, kind: 'terrain', element: 'sable', typeLine: 'test' },
  ];
  const catalogueDeTest = {
    cartes,
    couleursDe: (carte) => (carte.element ? [carte.element] : []),
    limiteDe: (carte) => (carte.kind === 'terrain' ? Infinity : carte.rarity === 'mythique' ? 1 : 3),
  };
  const recette = {
    identite: ['sable'],
    terrains: [['terrain-sable', 37]],
    creatures: 2,
    magies: 1,
    signature: [['faible-mythique', 1]],
  };
  const liste = composerDeck(recette, catalogueDeTest);
  assert.equal(liste.length, 40, 'la composition rend toujours quarante cartes');
  assert.equal(liste.filter((id) => id === 'faible-mythique').length, 1, 'la signature est posée, même faible');
  assert.equal(liste.filter((id) => id === 'rare-forte').length, 1, 'le remplissage prend la meilleure carte restante');
  assert.equal(liste.filter((id) => id === 'commune').length, 0, 'la commune passe après la rare');
  assert.equal(liste.filter((id) => id === 'rituel').length, 1, 'le sort remplit le quota des magies');

  // Une carte disparue du catalogue ne casse pas la recette : ses places
  // reviennent aux meilleures cartes encore là, dans l'ordre du classement.
  const recetteAvecDisparue = {
    ...recette, terrains: [['terrain-sable', 36]], creatures: 3, signature: [['carte-disparue', 2]],
  };
  const listeSansLaCarte = composerDeck(recetteAvecDisparue, catalogueDeTest);
  assert.equal(listeSansLaCarte.length, 40, 'la place de la carte disparue est reprise');
  assert.equal(listeSansLaCarte.filter((id) => id === 'faible-mythique').length, 1,
    'la mythique restante entre la première');
  assert.equal(listeSansLaCarte.filter((id) => id === 'rare-forte').length, 2,
    'la rare prend les places restantes, jusqu’au quota');

  // Le plafond de courbe compte les exemplaires, signature comprise : la
  // mythique à six manas épuise l’unique place de finisseur, donc la rare à
  // cinq manas reste dehors malgré sa puissance supérieure.
  const catalogueAvecFinisseur = {
    ...catalogueDeTest,
    cartes: [...cartes, fabriquer('finisseur-rare', 'rare', 5, 9, 9)],
  };
  const recetteBorne = {
    ...recette,
    terrains: [['terrain-sable', 36]],
    creatures: 3,
    finisseursMax: 1,
  };
  const listeBornee = composerDeck(recetteBorne, catalogueAvecFinisseur);
  assert.equal(listeBornee.length, 40, 'le plafond de courbe ne laisse aucune place vide');
  assert.equal(listeBornee.filter((id) => id === 'faible-mythique').length, 1);
  assert.equal(listeBornee.filter((id) => id === 'finisseur-rare').length, 0,
    'aucun second exemplaire à cinq manas ou plus ne passe le plafond');
});
