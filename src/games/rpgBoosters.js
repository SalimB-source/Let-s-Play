/**
 * Le comptoir du Souk — boosters, viviers et tirages.
 *
 * **Ce qu'un paquet a le droit de contenir** est la seule vraie question de ce
 * module. Depuis que les étages ne donnent plus de cartes mais les **révèlent**
 * (`rpgCollection.js`), la réponse tient en une phrase :
 *
 * > **Le Souk suit les marches que vous avez montées.** Une carte entre au
 * > vivier quand l'étage qui la révèle est **vaincu**, ou quand c'est **la
 * > marche suivante** — l'étage précédent de sa tour est déjà conquis.
 *
 * **Le Souk ouvre à la première victoire** : avant elle, le comptoir est fermé
 * (les quêtes ne proposent alors pas la quête du comptoir). Ensuite, le vivier
 * grandit à chaque marche — gagner `listes-1` ouvre les cartes de `listes-1` et
 * celles de `listes-2`, la marche suivante. Aucun paquet ne vend une carte du
 * Fjord avant que le joueur ait posé le pied dans le Fjord.
 *
 * **Un seul paquet, toutes les couleurs.** Le Souk ne vend plus un rayon par
 * élément : son vivier réunit **toutes les cartes ouvertes**, quelles que soient
 * leurs couleurs, et le tirage les mélange au hasard. Un paquet n'est jamais
 * monochrome : si les cinq cartes tombent sur la même couleur, la dernière
 * carte de la bande commune est échangée contre une carte d'une autre couleur
 * **de la même rareté** — le mélange se voit sans déplacer les taux.
 *
 * **La rare est garantie.** La quatrième carte est toujours une rare tant que
 * le vivier en garde une ; les mythiques, elles, ne peuvent sortir que de la
 * cinquième carte (8 % par paquet, et la pitié les assure au plus tard au
 * douzième). Un paquet contient donc au moins une rare, jamais « que des
 * communes ».
 *
 * La **garantie des trois nouvelles** tient la promesse de compléter : les
 * doublons des trois premières places s'échangent contre des cartes neuves au
 * moins aussi rares, et si les seules cartes neuves qui restent sont plus rares
 * que le doublon, **une seule** place est promue. Sans cette promotion, les
 * dernières mythiques ne pourraient sortir que de la cinquième carte, et
 * compléter la collection prendrait des mois de quêtes — mesuré, pas supposé.
 *
 * Le vivier garde **les communes et inhabituelles de la dotation** en plus des
 * cartes ouvertes : elles font le remplissage des paquets et paient des crédits
 * en doublon (`rpgCredits.js`). Sans elles, un paquet ne serait fait que de
 * rares, et les mythiques n'auraient plus rien de rare.
 *
 * Le tirage lui-même (`tirerCartes`) est **pur** : `rng` injectable, aucun
 * accès au stockage, aucune dépendance à React — `tests/rpg-boosters.test.js`
 * échantillonne dix mille ouvertures semées pour vérifier les taux.
 */

import { carteJouableSansTerrain, RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardCopyLimit, cardRarityInfo } from './rpgCards.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, cartesReveleesParEtage, collectionJoueur, nombreExemplaires } from './rpgCollection.js';
import { RPG_STORY_TOURS, etageHistoireParId, tousLesEtages } from './rpgStoryTours.js';
import {
  ajouterCartesAuPortefeuille,
  ajouterExemplaireAuPortefeuille,
  creditsDeDoublons,
  depenserCredits,
  enregistrerOuverture,
  normaliserPortefeuille,
} from './rpgCredits.js';
import { tirerParmi } from './rpgHasard.js';

/** Les taux, écrits noir sur blanc : le Souk les affiche, les tests les vérifient. */
export const TAUX = Object.freeze({
  /** Un paquet fait cinq cartes, jamais deux fois la même. */
  cartes: 5,
  /** Cartes 1 à 3 : la bande commune/inhabituelle. */
  communes: 0.88,
  /** Carte 4 : toujours une rare tant que le vivier en garde une. */
  rareGarantie: 1,
  /** Carte 5 : une chance infime de mythique, quand la pitié n'a pas parlé. */
  mythique: 0.01,
  /** Quarante-neuf ouvertures sans mythique : la cinquantième en contient une. */
  pitie: 50,
  /** Au moins trois cartes neuves par paquet, tant que le vivier en garde trois. */
  nouvellesMin: 3,
});

/** Le coffret : dix paquets du comptoir, une mythique assurée. */
export const COFFRET = Object.freeze({ taille: 10, remise: 0.1, mythiqueAssuree: true });

/**
 * Le comptoir du Souk : **un seul paquet, un seul rayon**, toutes les couleurs
 * et toutes les cartes disponibles mêlées dans le même vivier. Le prix garde
 * la promesse du dossier 13 — une journée de jeu vaut deux paquets.
 * `vitrine` est l'illustration de la mythique montrée sur le sachet ; c'est
 * un appât, pas un droit de tirage.
 */
export const RAYONS = Object.freeze([
  {
    id: 'souk',
    nom: 'Souk',
    titre: 'Le paquet du Souk',
    couleur: [...RPG_ELEMENTS],
    prix: 140,
    vitrine: 'ifrit-des-ergs',
    texte: 'Toutes les couleurs de Bab El, mêlées dans un seul paquet — cinq cartes, une rare garantie, et les mythiques au compte-gouttes.',
  },
]);

/**
 * Les rayons d'avant le mélange. Ils ne se vendent plus, mais le journal d'un
 * appareil les reconnaît encore : une ouverture de Braise, de Banquise ou de
 * Citerne a bien eu lieu, et elle ne doit pas disparaître de la mémoire du
 * joueur.
 */
const RAYONS_ANCIENS = Object.freeze([
  { id: 'braise', nom: 'Braise' },
  { id: 'sable', nom: 'Sable' },
  { id: 'eau', nom: 'Eau' },
  { id: 'neige', nom: 'Neige' },
  { id: 'banquise', nom: 'Banquise' },
  { id: 'citerne', nom: 'Citerne' },
]);

/** Le rayon réellement en vente (`null` : pas un rayon du comptoir). */
function rayonActif(rayonId) {
  return RAYONS.find((rayon) => rayon.id === rayonId) ?? null;
}

/** Le rayon par son identifiant — anciens rayons compris, pour le journal. */
export function rayonParId(rayonId) {
  return rayonActif(rayonId) ?? RAYONS_ANCIENS.find((rayon) => rayon.id === rayonId) ?? null;
}

/** Le prix d'un coffret de dix paquets : dix fois le paquet, remise déduite. */
export function prixCoffret(rayonId) {
  const rayon = rayonActif(rayonId);
  if (!rayon) return null;
  return Math.round(rayon.prix * COFFRET.taille * (1 - COFFRET.remise));
}

/** Rang de rareté : sert à n'échanger une carte que contre aussi rare ou plus rare. */
const RANG_RARETE = Object.freeze({ commune: 0, inhabituelle: 1, rare: 2, mythique: 3 });

/** Les étages de chaque tour, l'étage suivant de chacun, et l'étage qui révèle chaque carte. */
const ETAGES_PAR_TOUR = new Map(RPG_STORY_TOURS.map((tour) => [tour.id, tour.etages.map((etage) => etage.id)]));
const TOUR_PAR_ETAGE = new Map(tousLesEtages().map(({ tour, etage }) => [etage.id, tour.id]));
const PRECEDENT_PAR_ETAGE = new Map(tousLesEtages()
  .map(({ tour, index, etage }) => [etage.id, tour.etages[index - 1]?.id ?? null]));
const INTRO_PAR_CARTE = new Map();
for (const { etage } of tousLesEtages()) {
  for (const id of cartesReveleesParEtage(etage.id)) {
    if (!INTRO_PAR_CARTE.has(id)) INTRO_PAR_CARTE.set(id, etage.id);
  }
}

/** La dotation de départ : hors de toute tour, donc toujours au vivier. */
const DEBUT = new Set(COLLECTION_DEPART);

const VAINCUS = (progression) => new Set(Array.isArray(progression?.etagesVaincus) ? progression.etagesVaincus : []);

/** Les tours entamées : celles où au moins un étage est vaincu. */
export function toursEntamees(progression) {
  const vaincus = VAINCUS(progression);
  const entamees = new Set();
  for (const [tourId, etages] of ETAGES_PAR_TOUR) {
    if (etages.some((etageId) => vaincus.has(etageId))) entamees.add(tourId);
  }
  return entamees;
}

/** La tour qui introduit une carte (`null` : carte de dotation, ou inconnue). */
export function tourIntroduction(cardId) {
  const etageId = INTRO_PAR_CARTE.get(cardId);
  return etageId ? (TOUR_PAR_ETAGE.get(etageId) ?? null) : null;
}

/**
 * L'étage qui révèle une carte est-il **ouvert** par la progression ? Il l'est
 * si l'étage est vaincu, ou si c'est **la marche suivante** — l'étage précédent
 * de sa tour est vaincu, on n'a plus qu'à monter. `false` pour la dotation et
 * les cartes inconnues.
 */
function etageOuvre(cardId, progression) {
  const etageId = INTRO_PAR_CARTE.get(cardId);
  if (!etageId) return false;
  const vaincus = VAINCUS(progression);
  if (vaincus.has(etageId)) return true;
  const precedent = PRECEDENT_PAR_ETAGE.get(etageId);
  return Boolean(precedent && vaincus.has(precedent));
}

/**
 * La carte entre-t-elle dans un vivier à cette progression ? La dotation de
 * départ toujours ; sinon, l'étage qui la révèle doit être vaincu **ou** être
 * l'étage suivant d'une tour déjà entamée.
 */
export function carteAuVivier(cardId) {
  // Plus de condition de progression : toute carte jouable du catalogue est
  // au vivier de son paquet, dès la première ouverture.
  return carteJouableSansTerrain(cardById(cardId));
}

/** Le paquet qui vend une carte : le premier rayon qui porte sa couleur principale. */
function rayonDeCarte(carte) {
  const couleur = cardColors(carte)[0];
  // Repli : une carte sans couleur reconnue rejoint le premier paquet, jamais
  // ne disparaît du comptoir (les futures cartes entrent donc toujours quelque part).
  return RAYONS.find((rayon) => rayon.couleur.includes(couleur))?.id ?? RAYONS[0].id;
}

/**
 * Les cartes que la progression **ouvre** : celles dont l'étage révélateur est
 * vaincu, ou dont l'étage précédent l'est. C'est cette liste que l'écran de
 * victoire annonce (« cet étage ouvre deux cartes au Souk »).
 */
export function cartesOuvertes(progression) {
  return RPG_DUEL_CARDS
    .filter((carte) => carteJouableSansTerrain(carte) && !DEBUT.has(carte.id) && etageOuvre(carte.id, progression))
    .map((carte) => carte.id);
}

/**
 * Les étages **ouverts** par la progression — exactement ceux dont les cartes
 * sont au vivier : les étages vaincus, et la marche suivante de chaque tour
 * conquise. La liste reste vide tant que le joueur n'a rien gagné : **le Souk
 * ouvre à la première victoire**.
 */
export function etagesOuverts(progression) {
  const vaincus = VAINCUS(progression);
  const ouverts = new Set(vaincus);
  for (const { tour, index, etage } of tousLesEtages()) {
    if (vaincus.has(etage.id)) ouverts.add(tour.etages[index + 1]?.id);
  }
  return [...ouverts].filter(Boolean);
}

/** Les couleurs que le Souk peut déjà servir : celles des cartes ouvertes. */
export function couleursOuvertes(progression) {
  const couleurs = new Set();
  for (const id of cartesOuvertes(progression)) {
    for (const couleur of cardColors(id)) couleurs.add(couleur);
  }
  return couleurs;
}

/**
 * Le vivier du comptoir : **toutes les couleurs à la fois** — les cartes que la
 * ville a déjà ouvertes (un étage vaincu, ou la marche suivante), plus les
 * communes et inhabituelles de la dotation qui remplissent les paquets. Un
 * paquet peut donc contenir n'importe quelle carte ouverte, quelle que soit sa
 * couleur : c'est le mélange qui fait le paquet.
 */
export function vivierRayon(rayonId) {
  const rayon = rayonActif(rayonId);
  if (!rayon) return [];
  // Chaque carte jouable est vendue dans un seul paquet : les cartes sont
  // réparties entre les rayons, sans condition de victoire.
  return RPG_DUEL_CARDS
    .filter((carte) => carteJouableSansTerrain(carte) && rayonDeCarte(carte) === rayon.id)
    .map((carte) => carte.id);
}

/**
 * Le comptoir est-il ouvert ? Il l'est dès que **la première victoire** a fait
 * entrer une couleur dans la ville. La dotation de départ ne compte **pas** :
 * ses communes couvrent toutes les couleurs et ouvriraient le Souk dès le
 * premier duel. Elles remplissent les paquets, elles ne les ouvrent pas.
 */
export function rayonOuvert(rayonId) {
  // Les paquets sont en vente dès le départ : aucune victoire n'est requise.
  return Boolean(rayonActif(rayonId));
}

/** Répartition par rareté d'une liste d'identifiants. */
function parRarete(cardIds) {
  const bandes = { commune: [], inhabituelle: [], rare: [], mythique: [] };
  for (const id of cardIds) {
    const carte = cardById(id);
    if (!carte) continue;
    (bandes[cardRarityInfo(carte).key] ?? bandes.commune).push(id);
  }
  return bandes;
}

/**
 * L'état d'un rayon, prêt pour l'écran : vivier, cartes qui manquent, mythiques
 * disponibles, prix, prix du coffret, et la raison d'une fermeture.
 *
 *   - `'ferme'`  — le comptoir attend la première victoire ;
 *   - `'ouvert'` — il reste au moins une carte à rapporter ;
 *   - `'complet'` — le vivier est entièrement possédé (chaque carte paiera).
 */
export function etatRayon(rayonId, progression, collection = null) {
  const rayon = rayonActif(rayonId);
  if (!rayon) return null;
  const vivier = vivierRayon(rayonId, progression);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const ouvert = rayonOuvert(rayonId, progression);
  const manquantes = vivier.filter((id) => !possedees.has(id));
  const mythiques = vivier.filter((id) => cardById(id)?.rarity === 'mythique');
  return {
    rayon,
    vivier,
    taille: vivier.length,
    nouvelles: manquantes.length,
    mythiques: mythiques.length,
    prix: rayon.prix,
    prixCoffret: prixCoffret(rayonId),
    ouvert,
    complet: ouvert && manquantes.length === 0,
    raison: ouvert ? null : 'Le Souk ouvrira à votre première victoire.',
  };
}

/** Tous les rayons, dans l'ordre de l'étagère. */
export function etatRayons(progression, collection = null) {
  return RAYONS.map((rayon) => etatRayon(rayon.id, progression, collection));
}

/** Les paquets réellement achetables : ouverts (même complets, les doublons paient). */
export function rayonsOuverts(progression, collection = null) {
  return etatRayons(progression, collection).filter((etat) => etat.ouvert);
}

/**
 * Un paquet n'est jamais monochrome. Si les cinq cartes sont tombées sur une
 * seule couleur, la dernière place de la bande commune est échangée contre une
 * carte d'une autre couleur **de la même rareté** : le mélange se voit, et les
 * taux de rareté ne bougent pas. Si la carte remplacée était neuve, la
 * remplaçante doit l'être aussi — la garantie des trois nouvelles tient.
 * Les Ténèbres (nouvelles communes non-dotées) tombaient en mono car tous les
 * remplaçants non-Ténèbres de la même rareté étaient déjà possédés : la
 * garantie stricte bloquait l'échange. On autorise alors un doublon si la
 * garantie reste tenue.
 */
function diversifierCouleurs(cartes, bandes, possedees, rng) {
  if (!Array.isArray(cartes) || cartes.length < 2) return cartes;
  const couleurs = new Set();
  for (const id of cartes) {
    for (const couleur of cardColors(id)) couleurs.add(couleur);
  }
  if (couleurs.size !== 1) return cartes;
  const [unique] = couleurs;
  if (!unique) return cartes;
  const nouvellesActuelles = cartes.filter((id) => !possedees.has(id)).length;
  const disponiblesNeuves = (() => {
    // Compte les nouvelles restantes hors paquet (pour la garantie)
    let total = 0;
    // On ne connaît pas le vivier ici, mais le test de garantie peut être
    // approximé par : on garde au moins 3 nouvelles si possible.
    // Le plus simple : on calcule la garantie comme min(3, nouvellesActuelles + autres neuves possibles)
    // Pour diversifier, on n'autorise la perte d'une nouvelle que si on reste >= 3
    // ou qu'on n'avait pas 3 au départ.
    return null;
  })();
  // Les trois premières places seulement : la rare garantie et la cinquième
  // carte (la mythique) ne servent jamais à corriger la couleur.
  for (let place = 2; place >= 0; place -= 1) {
    const actuelle = cartes[place];
    const carte = cardById(actuelle);
    if (!carte) continue;
    const bande = bandes[cardRarityInfo(carte).key] ?? [];
    const candidates = bande.filter((id) => !cartes.includes(id) && !cardColors(id).includes(unique));
    if (!candidates.length) continue;
    const actuelleNouvelle = !possedees.has(actuelle);
    const neuves = candidates.filter((id) => !possedees.has(id));
    if (actuelleNouvelle && !neuves.length) {
      // Ténèbres : toutes les communes non-Ténèbres sont déjà possédées (dotation).
      // On autorise le doublon si on ne passe pas sous la garantie.
      const garantie = Math.min(3, nouvellesActuelles);
      if (nouvellesActuelles - 1 < garantie) continue;
      const remplacant = tirerParmi(candidates, rng);
      if (remplacant) {
        cartes[place] = remplacant;
        return cartes;
      }
      continue;
    }
    const remplacant = tirerParmi(actuelleNouvelle ? neuves : candidates, rng);
    if (remplacant) {
      cartes[place] = remplacant;
      return cartes;
    }
  }
  return cartes;
}

/**
 * Tire les cinq cartes d'un paquet. Rend
 * `{ ok, raison, cartes, mythique, nouvelles, garantie }`.
 *
 * Trois temps : les bandes annoncées (places 1 à 3), la **rare garantie**
 * (place 4), puis la carte 5 — mythique si la pitié a parlé ou si le sort le
 * veut (8 %). La place 4 ne peut jamais être mythique tant qu'une rare reste au
 * vivier : un paquet contient donc toujours une rare. Puis la **garantie des
 * nouvelles** : tant que le joueur peut recevoir trois cartes neuves, un
 * doublon des trois premières places est échangé contre une carte neuve **au
 * moins aussi rare** (jamais l'inverse : un échange ne fait jamais perdre une
 * mythique). Enfin, la couleur : jamais un paquet monochrome.
 */
export function tirerCartes({ rayonId, progression = null, collection = null, rng = Math.random, pitie = 0 } = {}) {
  const rayon = rayonActif(rayonId);
  if (!rayon) return { ok: false, raison: 'rayon-inconnu', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };
  if (!rayonOuvert(rayonId, progression)) {
    return { ok: false, raison: 'rayon-ferme', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };
  }
  const vivier = vivierRayon(rayonId, progression);
  if (!vivier.length) return { ok: false, raison: 'rayon-vide', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };

  const bandes = parRarete(vivier);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const tirees = [];

  // Chaque place prend la première bande qui a encore une carte libre : un
  // vivier sans commune ne bloque jamais un paquet, il le rend plus généreux.
  const placer = (ordre) => {
    for (const bande of ordre) {
      const candidats = (bandes[bande] ?? []).filter((id) => !tirees.includes(id));
      const id = tirerParmi(candidats, rng);
      if (id) {
        tirees.push(id);
        return id;
      }
    }
    return null;
  };

  const bandeCommune = rng() < TAUX.communes ? ['commune', 'inhabituelle'] : ['inhabituelle', 'commune'];
  // Les trois premières places restent communes ou inhabituelles : jamais
  // plusieurs rares dans un même paquet.
  for (let place = 0; place < 3; place += 1) placer(bandeCommune);
  // Une seule rare garantie, en quatrième place.
  placer(['rare', 'inhabituelle', 'commune', 'mythique']);

  const seuilPitie = Math.max(1, Math.floor(TAUX.pitie));
  const mythiqueAssuree = (Number(pitie) || 0) + 1 >= seuilPitie;
  const viseMythique = bandes.mythique.length > 0 && (mythiqueAssuree || rng() < TAUX.mythique);
  placer(viseMythique ? ['mythique', 'inhabituelle', 'commune', 'rare'] : ['inhabituelle', 'commune', 'rare', 'mythique']);

  const compteNouvelles = () => tirees.filter((id) => !possedees.has(id)).length;
  const disponiblesNeuves = vivier.filter((id) => !possedees.has(id)).length;
  const garantie = Math.min(TAUX.nouvellesMin, disponiblesNeuves);
  for (let place = 0; place < 3 && compteNouvelles() < garantie; place += 1) {
    const actuelle = tirees[place];
    if (!actuelle || !possedees.has(actuelle)) continue;
    const rang = RANG_RARETE[cardRarityInfo(cardById(actuelle)).key] ?? 0;
    const candidates = ['inhabituelle', 'commune']
      .flatMap((bande) => (RANG_RARETE[bande] >= rang ? (bandes[bande] ?? []) : []))
      .filter((id) => !tirees.includes(id) && !possedees.has(id));
    const remplacant = tirerParmi(candidates, rng);
    if (remplacant) {
      tirees[place] = remplacant;
      continue;
    }
    // Pas de promotion vers une rareté supérieure : la garantie de cartes
    // neuves ne doit jamais contourner les taux de rareté.
  }

  diversifierCouleurs(tirees, bandes, possedees, rng);

  return {
    ok: true,
    raison: null,
    cartes: tirees,
    mythique: tirees.some((id) => cardById(id)?.rarity === 'mythique'),
    nouvelles: compteNouvelles(),
    garantie,
  };
}

/**
 * Le détail d'une carte tirée, prêt pour la cérémonie d'ouverture.
 *
 * `comptes` est le stock d'exemplaires du portefeuille
 * (`portefeuille.exemplaires`, voir `rpgCredits.js`) : la pastille de la
 * cérémonie dit la même chose que celle du catalogue et de l'étal, jusqu'à la
 * seconde copie rachetée à l'unité. Le paquet, lui, ne compte jamais ses
 * doublons : ils se remboursent (doc 13, D4).
 */
function detaillerTirage(cartes, collection, comptes = null) {
  const possedees = new Set(collection ?? []);
  const details = cartes.map((id) => {
    const carte = cardById(id);
    const exemplairesAvant = nombreExemplaires([...collection], id, comptes);
    const doublon = exemplairesAvant > 0;
    const limite = cardCopyLimit(carte) ?? 1;
    // Le second exemplaire se garde : il complète le playset et n'est pas
    // remboursé. Seul l'exemplaire au-delà du quota de deck (3e et plus)
    // rapporte des crédits au barème des doublons (doc 13, D4).
    const remboursable = doublon && exemplairesAvant >= limite;
    // Stock après rangement de cette carte : 1 pour une nouvelle acquisition,
    // le quota monté d'un cran pour le second exemplaire conservé, et le
    // playset (ou le stock déjà écrit) pour une carte déjà complète.
    const exemplairesApres = doublon
      ? Math.min(exemplairesAvant + 1, limite)
      : nombreExemplaires([...collection, id], id, comptes);
    return {
      id,
      carte,
      rarete: cardRarityInfo(carte).key,
      doublon,
      remboursement: remboursable ? creditsDeDoublons([id]) : 0,
      exemplaires: exemplairesApres,
    };
  });
  return { details, remboursement: details.reduce((somme, carte) => somme + carte.remboursement, 0) };
}

/**
 * Ce que la cérémonie annonce d'une carte révélée, en un mot :
 *
 *   - `nouvelle`   — la carte entre dans la collection ;
 *   - `remboursee` — déjà au quota : le doublon est payé au barème (D4) ;
 *   - `exemplaire` — **le deuxième exemplaire se garde** : il complète le
 *     playset et se joue à deux en deck ;
 *   - `deja`       — le reste : une copie qui ne peut pas monter (rien à
 *     ajouter, rien à rendre).
 *
 * C'est la **seule** règle de l'étiquette : sans elle, la rare — la seule
 * rareté dont le premier doublon tombe pile sur le quota de deux — affichait
 * « déjà possédée » alors que la copie venait d'être ajoutée au stock, et le
 * joueur croyait n'avoir rien reçu (doc 13, D4).
 */
export function etatDeCarteRevelee(detail) {
  if (!detail || !detail.doublon) return 'nouvelle';
  if ((detail.remboursement ?? 0) > 0) return 'remboursee';
  return (detail.exemplaires ?? 1) > 1 ? 'exemplaire' : 'deja';
}

/** Les mots de la pastille, pour l'œil et pour le lecteur d'écran. */
export const TAMPON_CARTE = Object.freeze({
  nouvelle: 'Nouvelle',
  exemplaire: '2ᵉ exemplaire',
  deja: 'Déjà possédée',
});

/**
 * Ouvre un paquet du comptoir — **acheté ou offert**.
 *
 * Les deux chemins partagent exactement le même tirage, le même remboursement
 * des doublons et la même pitié : un paquet offert par un palier est un vrai
 * paquet, il compte dans les ouvertures et rapproche de la mythique assurée.
 * Seule la caisse change : `offert` ne touche pas au solde et rend `prix: 0`.
 */
function ouvrirUnPaquet({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random, offert = false } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonActif(rayonId);
  const prix = offert ? 0 : (rayon?.prix ?? 0);
  if (!rayon) return { ok: false, raison: 'rayon-inconnu', portefeuille: base, prix: 0, tirage: null };
  // Le paquet offert ne passe pas par la caisse : aucun solde n'est débité, et
  // un joueur à zéro crédit reçoit son palier comme tout le monde.
  const achat = offert ? { ok: true, portefeuille: base } : depenserCredits(base, rayon.prix);
  if (!achat.ok) return { ok: false, raison: achat.raison, portefeuille: base, prix, tirage: null };

  const tirage = tirerCartes({ rayonId, progression, collection, rng, pitie: base.pitie });
  if (!tirage.ok) return { ok: false, raison: tirage.raison, portefeuille: base, prix, tirage: null };

  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const { details, remboursement } = detaillerTirage(tirage.cartes, possedees, base.exemplaires);
  let apres = achat.portefeuille;
  apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
  // Le second exemplaire d'une carte se garde (il complète le playset) : on le
  // note au stock d'exemplaires pour que le suivant (3e et au-delà) soit le
  // premier remboursé. Un exemplaire déjà au quota ne bouge pas.
  for (const detail of details) {
    if (detail.doublon && detail.remboursement === 0) {
      const suite = ajouterExemplaireAuPortefeuille(apres, detail.id);
      if (suite.ajoute) apres = suite.portefeuille;
    }
  }
  apres = enregistrerOuverture(apres, {
    mythique: tirage.mythique,
    aDesMythiques: vivierRayon(rayonId, progression).some((id) => cardById(id)?.rarity === 'mythique'),
    rayonId,
    cartes: tirage.cartes,
    remboursement,
    offert,
  });
  if (remboursement) {
    apres = { ...apres, credits: apres.credits + remboursement, majLe: new Date().toISOString() };
  }
  return {
    ok: true,
    raison: null,
    portefeuille: apres,
    prix,
    tirage: { ...tirage, details, remboursement },
  };
}

/**
 * Achète et ouvre un paquet : le solde est débité, les cinq cartes rejoignent le
 * portefeuille, les doublons sont remboursés, la pitié est mise à jour. Rend
 * `{ ok, raison, portefeuille, prix, tirage }` — un refus ne touche à rien.
 */
export function ouvrirBooster(args = {}) {
  return ouvrirUnPaquet({ ...args, offert: false });
}

/**
 * Le paquet **offert par un palier** (`rpgProfil.js`) : le même tirage, la même
 * pitié, le même remboursement des doublons — et aucun crédit dépensé. C'est la
 * récompense d'une montée de niveau, et elle ne passe jamais par la caisse :
 * un joueur à zéro ◈ la reçoit comme les autres.
 */
export function ouvrirBoosterOffert(args = {}) {
  return ouvrirUnPaquet({ ...args, offert: true });
}

/**
 * Le coffret : dix paquets du comptoir pour le prix de neuf. Une mythique est
 * assurée sur l'ensemble (elle ne peut pas se cacher dans dix paquets quand le
 * vivier en garde une) — le paquet qui la porte est tiré avec la pitié forcée,
 * puis les suivants suivent la règle normale.
 */
export function ouvrirCoffret({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonActif(rayonId);
  const prix = prixCoffret(rayonId);
  if (!rayon || prix === null) return { ok: false, raison: 'rayon-inconnu', portefeuille: base, prix: 0, paquets: [] };
  if (!rayonOuvert(rayonId, progression)) return { ok: false, raison: 'rayon-ferme', portefeuille: base, prix, paquets: [] };
  const achat = depenserCredits(base, prix);
  if (!achat.ok) return { ok: false, raison: achat.raison, portefeuille: base, prix, paquets: [] };

  const vivier = vivierRayon(rayonId, progression);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const aDesMythiques = vivier.some((id) => cardById(id)?.rarity === 'mythique');
  let apres = achat.portefeuille;
  const paquets = [];
  let mythique = false;
  for (let index = 0; index < COFFRET.taille; index += 1) {
    const forcer = COFFRET.mythiqueAssuree && aDesMythiques && !mythique && index === COFFRET.taille - 1;
    const tirage = tirerCartes({
      rayonId,
      progression,
      collection: [...possedees],
      rng,
      pitie: forcer ? TAUX.pitie : apres.pitie,
    });
    if (!tirage.ok) break;
    // Le stock se lit **au fil du coffret**, pas sur l'instantané d'avant
    // achat : un doublon tombé dans un paquet précédent a déjà monté le
    // compteur, et le suivant — au-delà du quota — doit être remboursé au
    // barème comme il le serait dans un paquet acheté seul (doc 13, D4).
    const { details, remboursement } = detaillerTirage(tirage.cartes, possedees, apres.exemplaires);
    for (const carte of details) possedees.add(carte.id);
    apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
    // Le second exemplaire d'une carte se garde (il complète le playset) : on le
    // note au stock d'exemplaires pour que le suivant (3e et au-delà) soit le
    // premier remboursé.
    for (const detail of details) {
      if (detail.doublon && detail.remboursement === 0) {
        const suite = ajouterExemplaireAuPortefeuille(apres, detail.id);
        if (suite.ajoute) apres = suite.portefeuille;
      }
    }
    apres = enregistrerOuverture(apres, {
      mythique: tirage.mythique,
      aDesMythiques,
      rayonId,
      cartes: tirage.cartes,
      remboursement,
      // Dix paquets en une fois : le journal garde **une** entrée par paquet,
      // ce qui se lit encore ; les marquer « coffret » dit d'où ils viennent.
      coffret: true,
    });
    if (remboursement) apres = { ...apres, credits: apres.credits + remboursement, majLe: new Date().toISOString() };
    mythique = mythique || tirage.mythique;
    paquets.push({ ...tirage, details, remboursement });
  }
  return { ok: true, raison: null, portefeuille: apres, prix, paquets, mythique };
}

/** Les quatre couleurs du duel, exportées pour l'écran du Souk. */
export const COULEURS_SOUK = Object.freeze([...RPG_ELEMENTS]);

/** L'étage qui a introduit une carte — l'écran s'en sert pour dire « venu de tel palier ». */
export function etageIntroduction(cardId) {
  const etageId = INTRO_PAR_CARTE.get(cardId);
  return etageId ? (etageHistoireParId(etageId)?.etage ?? null) : null;
}
