/**
 * Le Sablier du temps — les plateaux de duel.
 *
 * Le duel se joue sur une **table** : un fond plein cadre, sous les cartes.
 * Le jeu n'en avait qu'une (le bois gravé d'un astrolabe) ; il en propose
 * désormais plusieurs, et **le plateau change de partie en partie** : à chaque
 * nouveau duel, un tirage parmi les plateaux disponibles, jamais deux fois de
 * suite le même tant qu'il en existe un autre.
 *
 * Qui préfère garder le même terrain d'un duel à l'autre le **verrouille**
 * depuis le menu : le choix est mémorisé sur l'appareil (même convention que
 * `rpgStory.js` : accès `localStorage` tolérant, écriture silencieuse, lecture
 * normalisée) et le tirage ne reprend qu'une fois « Aléatoire » resélectionné.
 *
 * Le tirage passe par le `rng` du duel — injectable — donc une partie se
 * rejoue à l'identique, comme le reste du moteur.
 *
 * Un plateau = un identifiant, un nom lisible, un lieu, un fichier de
 * `public/` et un résumé pour le menu. Le fichier est un fond plein cadre
 * **sans texte ni interface dessinée** : l'interface du jeu se superpose
 * elle-même (voir `RPG-CARD-ART.md` pour l'esprit de la direction artistique).
 */

export const RPG_PLATEAU_STORAGE_KEY = 'letsplay_sablier_plateau_v1';

/** Valeur de choix : le plateau est tiré à chaque nouvelle partie. */
export const RPG_PLATEAU_ALEATOIRE = 'aleatoire';

export const RPG_PLATEAUX = [
  {
    id: 'table-des-heures',
    nom: 'La Table des Heures',
    lieu: 'Bab El, salle haute de la Chambre',
    fichier: 'card-table.jpg',
    resume: 'Le bois des Veilleurs, l’astrolabe doré gravé au centre et quatre bougies : la table d’origine du duel.',
  },
  {
    id: 'erg-du-sahara',
    nom: 'L’Erg du Sahara',
    lieu: 'Le grand désert, hors les murs',
    fichier: 'plateau-erg-du-sahara.jpg',
    resume: 'La rose des sables tracée à même la dune ; la lanterne de laiton, l’outre et la corde posées au bord du plateau.',
  },
  {
    id: 'caravane-de-gourara',
    nom: 'La Caravane de Gourara',
    lieu: 'Le Gourara, pays des foggaras',
    fichier: 'plateau-caravane-de-gourara.jpg',
    resume: 'Le lit sec de l’oued et sa piste de caravane : les deux empreintes du campement, l’outre, la corde et le compas abandonné.',
  },
  {
    id: 'terre-de-damnation',
    nom: 'La Terre de Damnation',
    lieu: 'Les Brûlés, étage perdu de Bab El',
    fichier: 'plateau-terre-de-damnation.jpg',
    resume: 'L’étage repris par le feu : la croûte craquelée et ses braises encore vives, l’encensoir de fer renversé, les troncs calcinés, la cendre grise.',
  },
  {
    id: 'fjord-des-neuf-hivers',
    nom: 'Le Fjord des Neuf Hivers',
    lieu: 'La glace du Nord, devant le Serment',
    fichier: 'plateau-fjord-des-neuf-hivers.jpg',
    resume: 'La glace polie du fjord et sa rose des vents gravée au ciseau ; la lanterne de fer, le cor à boire, la corde lovée, la hache et le bâton de runes posés au bord.',
  },
  {
    id: 'ruines-de-tipaza',
    nom: 'Les Ruines de Tipaza',
    lieu: 'Tipasa, la ville romaine au bord de la mer',
    fichier: 'plateau-ruines-de-tipaza.jpg',
    resume: 'La mosaïque de pierre noire et blanche ouverte par le vent, les dalles romaines disjointes, les fûts de colonne et le chapiteau corinthien tombés à l’entour.',
  },
];

/** Le plateau par son identifiant, ou null. */
export function plateauParId(id) {
  if (typeof id !== 'string') return null;
  return RPG_PLATEAUX.find((plateau) => plateau.id === id) ?? null;
}

/** Un choix valide : « aléatoire » ou l'identifiant d'un plateau connu. */
export function normaliserChoixPlateau(valeur) {
  return plateauParId(valeur) ? valeur : RPG_PLATEAU_ALEATOIRE;
}

/** Le plateau est-il verrouillé (choix explicite du joueur) ? */
export function plateauVerrouille(choix) {
  return Boolean(plateauParId(choix));
}

function browserStorage() {
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Charge le choix mémorisé ; « aléatoire » si absent, illisible ou inconnu. */
export function chargerChoixPlateau() {
  const stockage = browserStorage();
  if (!stockage) return RPG_PLATEAU_ALEATOIRE;
  try {
    return normaliserChoixPlateau(stockage.getItem(RPG_PLATEAU_STORAGE_KEY));
  } catch {
    return RPG_PLATEAU_ALEATOIRE;
  }
}

/** Mémorise le choix (silencieux si le stockage manque). */
export function sauverChoixPlateau(choix) {
  const stockage = browserStorage();
  if (!stockage) return false;
  try {
    stockage.setItem(RPG_PLATEAU_STORAGE_KEY, normaliserChoixPlateau(choix));
    return true;
  } catch {
    return false;
  }
}

/**
 * Le plateau d'une nouvelle partie.
 *
 * - choix verrouillé : ce plateau, toujours.
 * - « aléatoire » : un tirage parmi tous les plateaux, en écartant celui de la
 *   partie précédente (jamais deux duels de suite sur le même terrain), avec
 *   un rejet des valeurs de `rng` hors bornes plutôt qu'un plantage.
 */
export function tirerPlateau({ choix = RPG_PLATEAU_ALEATOIRE, rng = Math.random, precedentId = null } = {}) {
  const verrouille = plateauParId(choix);
  if (verrouille) return verrouille;
  const candidats = RPG_PLATEAUX.filter((plateau) => plateau.id !== precedentId);
  const vivier = candidats.length ? candidats : RPG_PLATEAUX;
  const tirage = typeof rng === 'function' ? Number(rng()) : Math.random();
  const borne = Number.isFinite(tirage) ? Math.min(Math.max(tirage, 0), 0.999999) : 0;
  return vivier[Math.floor(borne * vivier.length)];
}
