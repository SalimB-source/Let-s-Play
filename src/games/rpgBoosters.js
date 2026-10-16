/**
 * Les rayons du Souk — boosters, viviers et tirages.
 *
 * **Ce qu'un paquet a le droit de contenir** est la seule vraie question de ce
 * module. Depuis que les étages ne donnent plus de cartes mais les **révèlent**
 * (`rpgCollection.js`), la réponse tient en une phrase :
 *
 * > **Le Souk suit les marches que vous avez montées.** Une carte entre au
 * > vivier quand l'étage qui la révèle est **vaincu**, ou quand c'est **la
 * > marche suivante** — l'étage précédent de sa tour est déjà conquis.
 *
 * **Le Souk ouvre à la première victoire** : avant elle, l'étagère est fermée
 * (les quêtes ne proposent alors pas la quête du comptoir). Ensuite, l'étagère
 * grandit à chaque marche — gagner `listes-1` ouvre les cartes de `listes-1` et
 * celles de `listes-2`, la marche suivante. Aucun paquet ne vend une carte du
 * Fjord avant que le joueur ait posé le pied dans le Fjord, et l'Eau n'arrive
 * qu'avec les citernes du Souk : cette règle unique tient les seuils du
 * dossier 13, sans garde de couleur séparée. La **dotation de départ** ne
 * compte pas dans les couleurs ouvertes — ses communes couvrent les quatre
 * couleurs et ouvriraient tout dès le premier duel ; elles remplissent les
 * paquets, elles ne les ouvrent pas.
 *
 * Le vivier garde **les communes et inhabituelles de la dotation** en plus des
 * cartes ouvertes : elles font le remplissage des paquets et paient des crédits
 * en doublon (`rpgCredits.js`). Sans elles, un paquet ne serait fait que de
 * rares, et les taux annoncés ne voudraient plus rien dire.
 *
 * La **garantie des trois nouvelles** tient la promesse de compléter : les
 * doublons des trois premières places s'échangent contre des cartes neuves au
 * moins aussi rares, et si les seules cartes neuves qui restent sont plus rares
 * que le doublon, **une seule** place est promue. Sans cette promotion, les
 * dernières mythiques ne pourraient sortir que de la cinquième carte, et
 * compléter la collection prendrait des mois de quêtes — mesuré, pas supposé.
 *
 * Le tirage lui-même (`tirerCartes`) est **pur** : `rng` injectable, aucun
 * accès au stockage, aucune dépendance à React — `tests/rpg-boosters.test.js`
 * échantillonne dix mille ouvertures semées pour vérifier les taux.
 */

import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardRarityInfo } from './rpgCards.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, cartesReveleesParEtage, collectionJoueur } from './rpgCollection.js';
import { RPG_STORY_TOURS, etageHistoireParId, tousLesEtages } from './rpgStoryTours.js';
import {
  ajouterCartesAuPortefeuille,
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
  /** Carte 5 : la chance de mythique, quand la pitié n'a pas déjà parlé. */
  mythique: 0.2,
  /** Carte 5 du grand étal : elle paie un peu mieux la curiosité. */
  mythiqueSouk: 0.3,
  /** Huit ouvertures sans mythique : la neuvième en contient une. */
  pitie: 8,
  /** Au moins trois cartes neuves par paquet, tant que le rayon en garde trois. */
  nouvellesMin: 3,
});

/** Le coffret : dix paquets d'un même rayon, une mythique assurée. */
export const COFFRET = Object.freeze({ taille: 10, remise: 0.1, mythiqueAssuree: true });

/**
 * Les cinq étagères. `couleur: null` pour le grand étal (mélange des couleurs
 * ouvertes). Les prix sont ceux du dossier : une journée de jeu vaut deux
 * paquets environ, un peu moins sur le grand étal.
 */
export const RAYONS = Object.freeze([
  { id: 'braise', nom: 'Braise', couleur: 'braise', prix: 140, texte: 'La Montagne, ses samouraïs, ses yōkai et ses braises — ce que les tours ont rendu de rouge.' },
  { id: 'sable', nom: 'Sable', couleur: 'sable', prix: 140, texte: 'Le Désert qui monte : ksour, fennecs, tempêtes et les figures qui tiennent les dunes.' },
  { id: 'eau', nom: 'Eau', couleur: 'eau', prix: 160, texte: 'Ce que les citernes gardent du fond : contresorts, marées et bêtes des abysses.' },
  { id: 'neige', nom: 'Neige', couleur: 'neige', prix: 160, texte: 'Le Serment des Neuf Hivers, livré depuis les stèles de glace du fjord.' },
  { id: 'souk', nom: 'Souk', couleur: null, prix: 180, chanceMythique: TAUX.mythiqueSouk, texte: 'Le grand étal : toutes les couleurs déjà entrées dans la ville, et un peu plus de chances sur les mythiques.' },
]);

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

/** Le rayon par son identifiant (`null` si inconnu). */
export function rayonParId(rayonId) {
  return RAYONS.find((rayon) => rayon.id === rayonId) ?? null;
}

/** Le prix d'un coffret de dix paquets : dix fois le rayon, remise déduite. */
export function prixCoffret(rayonId) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return null;
  return Math.round(rayon.prix * COFFRET.taille * (1 - COFFRET.remise));
}

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
export function carteAuVivier(cardId, progression) {
  if (!cardById(cardId)) return false;
  if (DEBUT.has(cardId)) return true;
  return etageOuvre(cardId, progression);
}

/**
 * Les cartes que la progression **ouvre** : celles dont l'étage révélateur est
 * vaincu, ou dont l'étage précédent l'est. C'est cette liste que l'écran de
 * victoire annonce (« cet étage ouvre deux cartes au Souk »).
 */
export function cartesOuvertes(progression) {
  return RPG_DUEL_CARDS
    .filter((carte) => !DEBUT.has(carte.id) && etageOuvre(carte.id, progression))
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

/** La tour qui garde encore une couleur jamais ouverte (pour le message du Souk). */
export function tourQuiGarde(couleur) {
  const premiere = tousLesEtages()
    .find(({ etage }) => cartesReveleesParEtage(etage.id).some((id) => cardColors(id).includes(couleur)));
  return premiere?.tour ?? null;
}

/**
 * Le vivier d'un rayon : **toutes les cartes du catalogue** de sa couleur (ou des
 * quatre couleurs pour le grand étal). C'est le contenu des boosters : plus de
 * seuil d'étage, plus de carte « verrouillée » — un paquet peut contenir
 * n'importe quelle carte existante de l'élément. La dotation de départ reste
 * dans le vivier pour remplir les paquets de communes.
 */
export function vivierRayon(rayonId, progression) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return [];
  const couleurs = rayon.couleur ? [rayon.couleur] : [...RPG_ELEMENTS];
  const autorisees = new Set(couleurs);
  // Le vivier n'expose que ce que la ville possède déjà : la dotation de
  // départ, plus les cartes qu'un étage vaincu a révélées — jamais tout le
  // catalogue de la couleur dès le premier jour (les mythiques attendent
  // leur étage, sinon la pitié des boosters n'aurait aucun sens).
  const ouvertes = cartesOuvertes(progression);
  const ids = new Set();
  for (const carte of RPG_DUEL_CARDS) {
    if (!cardColors(carte).some((couleur) => autorisees.has(couleur))) continue;
    if (DEBUT.has(carte.id) || ouvertes.includes(carte.id)) ids.add(carte.id);
  }
  return [...ids];
}

/**
 * Le rayon est-il ouvert ? Sa couleur doit être **entrée dans la ville par une
 * carte ouverte** — c'est-à-dire révélée par un étage vaincu ou par la marche
 * suivante. La dotation de départ ne compte **pas** : ses communes couvrent les
 * quatre couleurs et ouvriraient tout dès le premier jour. Elles remplissent les
 * paquets, elles ne les ouvrent pas.
 */
export function rayonOuvert(rayonId, progression) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return false;
  const couleurs = couleursOuvertes(progression);
  return rayon.couleur ? couleurs.has(rayon.couleur) : couleurs.size > 0;
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
 *   - `'ferme'`  — la couleur n'est pas encore entrée dans la ville ;
 *   - `'ouvert'` — il reste au moins une carte à rapporter ;
 *   - `'complet'` — le vivier est entièrement possédé (chaque carte paiera).
 */
export function etatRayon(rayonId, progression, collection = null) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return null;
  const vivier = vivierRayon(rayonId, progression);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const ouvert = rayonOuvert(rayonId, progression);
  const manquantes = vivier.filter((id) => !possedees.has(id));
  const mythiques = vivier.filter((id) => cardById(id)?.rarity === 'mythique');
  const garde = rayon.couleur ? tourQuiGarde(rayon.couleur) : null;
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
    raison: ouvert ? null : (garde ? `La ${garde.nom} la garde encore.` : 'Aucune couleur n’est encore entrée dans la ville.'),
  };
}

/** Tous les rayons, dans l'ordre de l'étagère. */
export function etatRayons(progression, collection = null) {
  return RAYONS.map((rayon) => etatRayon(rayon.id, progression, collection));
}

/** Les rayons réellement achetables : ouverts (même complets, les doublons paient). */
export function rayonsOuverts(progression, collection = null) {
  return etatRayons(progression, collection).filter((etat) => etat.ouvert);
}

/**
 * Tire les cinq cartes d'un paquet. Rend
 * `{ ok, raison, cartes, mythique, nouvelles, garantie }`.
 *
 * Trois temps : les bandes annoncées, la rare garantie, la carte 5 (mythique si
 * la pitié a parlé ou si le sort le veut). Puis la **garantie des nouvelles** :
 * tant que le joueur peut recevoir trois cartes neuves, un doublon des trois
 * premières places est échangé contre une carte neuve **au moins aussi rare**
 * (jamais l'inverse : un échange ne fait jamais perdre une mythique).
 */
export function tirerCartes({ rayonId, progression = null, collection = null, rng = Math.random, pitie = 0 } = {}) {
  const rayon = rayonParId(rayonId);
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
  for (let place = 0; place < 3; place += 1) placer([...bandeCommune, 'rare', 'mythique']);
  placer(['rare', 'mythique', 'inhabituelle', 'commune']);

  const seuilPitie = Math.max(1, Math.floor(TAUX.pitie));
  const chanceMythique = rayon.chanceMythique ?? TAUX.mythique;
  const mythiqueAssuree = (Number(pitie) || 0) + 1 >= seuilPitie;
  const viseMythique = bandes.mythique.length > 0 && (mythiqueAssuree || rng() < chanceMythique);
  placer(viseMythique ? ['mythique', 'rare', 'inhabituelle', 'commune'] : ['rare', 'mythique', 'inhabituelle', 'commune']);

  const compteNouvelles = () => tirees.filter((id) => !possedees.has(id)).length;
  const disponiblesNeuves = vivier.filter((id) => !possedees.has(id)).length;
  const garantie = Math.min(TAUX.nouvellesMin, disponiblesNeuves);
  let promotions = 0;
  for (let place = 0; place < 3 && compteNouvelles() < garantie; place += 1) {
    const actuelle = tirees[place];
    if (!actuelle || !possedees.has(actuelle)) continue;
    const rang = RANG_RARETE[cardRarityInfo(cardById(actuelle)).key] ?? 0;
    const remplacant = ['rare', 'inhabituelle', 'commune']
      .flatMap((bande) => (RANG_RARETE[bande] >= rang ? (bandes[bande] ?? []) : []))
      .find((id) => !tirees.includes(id) && !possedees.has(id));
    if (remplacant) {
      tirees[place] = remplacant;
      continue;
    }
    // Aucun équivalent à offrir : la seule carte neuve qui reste est plus rare
    // que le doublon. **Une** place peut alors être promue — la cinquième carte
    // n'est plus le seul chemin vers une mythique, et la dernière mythique d'une
    // couleur se laisse approcher en jours plutôt qu'en mois. Une seule : le
    // paquet reste un paquet, pas une livraison.
    if (promotions >= 1) continue;
    const promue = (bandes.mythique ?? []).find((id) => !tirees.includes(id) && !possedees.has(id));
    if (promue) {
      tirees[place] = promue;
      promotions += 1;
    }
  }

  return {
    ok: true,
    raison: null,
    cartes: tirees,
    mythique: tirees.some((id) => cardById(id)?.rarity === 'mythique'),
    nouvelles: compteNouvelles(),
    garantie,
  };
}

/** Le détail d'une carte tirée, prêt pour la cérémonie d'ouverture. */
function detaillerTirage(cartes, collection) {
  const possedees = new Set(collection ?? []);
  const details = cartes.map((id) => {
    const carte = cardById(id);
    const doublon = possedees.has(id);
    return {
      id,
      carte,
      rarete: cardRarityInfo(carte).key,
      doublon,
      remboursement: doublon ? creditsDeDoublons([id]) : 0,
    };
  });
  return { details, remboursement: details.reduce((somme, carte) => somme + carte.remboursement, 0) };
}

/**
 * Achète et ouvre un paquet : le solde est débité, les cinq cartes rejoignent le
 * portefeuille, les doublons sont remboursés, la pitié est mise à jour. Rend
 * `{ ok, raison, portefeuille, prix, tirage }` — un refus ne touche à rien.
 */
export function ouvrirBooster({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonParId(rayonId);
  if (!rayon) return { ok: false, raison: 'rayon-inconnu', portefeuille: base, prix: 0, tirage: null };
  const achat = depenserCredits(base, rayon.prix);
  if (!achat.ok) return { ok: false, raison: achat.raison, portefeuille: base, prix: rayon.prix, tirage: null };

  const tirage = tirerCartes({ rayonId, progression, collection, rng, pitie: base.pitie });
  if (!tirage.ok) return { ok: false, raison: tirage.raison, portefeuille: base, prix: rayon.prix, tirage: null };

  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const { details, remboursement } = detaillerTirage(tirage.cartes, possedees);
  let apres = achat.portefeuille;
  apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
  apres = enregistrerOuverture(apres, {
    mythique: tirage.mythique,
    aDesMythiques: vivierRayon(rayonId, progression).some((id) => cardById(id)?.rarity === 'mythique'),
    rayonId,
    cartes: tirage.cartes,
    remboursement,
  });
  if (remboursement) {
    apres = { ...apres, credits: apres.credits + remboursement, majLe: new Date().toISOString() };
  }
  return {
    ok: true,
    raison: null,
    portefeuille: apres,
    prix: rayon.prix,
    tirage: { ...tirage, details, remboursement },
  };
}

/**
 * Le coffret : dix paquets d'un même rayon pour le prix de neuf. Une mythique
 * est assurée sur l'ensemble (elle ne peut pas se cacher dans dix paquets quand
 * le vivier en garde une) — le paquet qui la porte est tiré avec la pitié
 * forcée, puis les suivants suivent la règle normale.
 */
export function ouvrirCoffret({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonParId(rayonId);
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
    const { details, remboursement } = detaillerTirage(tirage.cartes, possedees);
    for (const carte of details) possedees.add(carte.id);
    apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
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
