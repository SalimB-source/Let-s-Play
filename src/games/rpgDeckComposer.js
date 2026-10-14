/**
 * Le composeur de deck du Sablier — « les meilleures cartes d'abord ».
 *
 * Un deck du jeu n'est plus écrit à la main carte par carte : il est **composé**
 * à partir d'une **recette** (`rpgDeckRecipes.js`) et du catalogue
 * (`rpgCards.js`). La recette dit ce qui ne se négocie pas — l'identité
 * chromatique, les places de terrains (jusqu'à la peinture de chaque variante),
 * les places de créatures, de sorts et d'armes, et sa **signature** : les quelques
 * cartes qui portent son archétype. Le composeur remplit le reste avec **les
 * meilleures cartes de l'identité**, dans l'ordre du palier de rareté puis de
 * la puissance (`rpgCardPower.js`), chaque carte prise à son maximum légal
 * (une mythique en un exemplaire, les autres jusqu'à trois).
 *
 * Deux garde-fous :
 *
 *   - **Les plafonds du Récit.** Une recette d'Histoire peut borner le nombre
 *     de mythiques et de rares qu'un sorcier aligne (`mythiquesMax`,
 *     `raresMax`) : c'est ce qui garde la rampe des Tours — la Garde du fjord
 *     n'ouvre pas avec les figures du Nord, le Maître des Neuf Hivers si. Les
 *     plafonds comptent les **cartes distinctes**, signature comprise.
 *   - **Aucune place vide.** Si les plafonds interdisaient de remplir un
 *     quota, une seconde passe les ignore : mieux vaut un deck un cran plus
 *     fort qu'un deck de trente-neuf cartes.
 *
 * Le composeur ne connaît ni le catalogue ni les règles de couleur : ils
 * arrivent en paramètres (`couleursDe`, `limiteDe`, `cartes`). C'est ce qui
 * lui permet d'être appelé depuis `rpgCards.js` — le catalogue se compose
 * lui-même — sans créer de cycle d'imports, et d'être testé avec un catalogue
 * de trois cartes.
 */

import { comparerCartesParPuissance, RPG_RANGS_RARETE } from './rpgCardPower.js';

/** Le seau d'une carte : une créature ou un héros occupe une place de créature,
 *  une arme sa propre place (ni corps ni sort), le reste suit. */
function seauDe(carte) {
  if (carte?.kind === 'magie') return 'magie';
  if (carte?.kind === 'arme') return 'arme';
  return 'creature';
}

/**
 * Compose la liste de 40 cartes d'une recette.
 *
 * `catalogue` : `{ cartes, couleursDe, limiteDe }` — les cartes du duel
 * (terrains compris), la lecture des couleurs d'une carte (`cardColors`) et la
 * limite d'exemplaires (`cardCopyLimit`). Les doublons de la signature sont
 * bornés par cette limite, comme à la main.
 *
 * Rend un tableau d'identifiants : les terrains d'abord (dans l'ordre de la
 * recette), puis les créatures et les héros, puis les sorts.
 */
export function composerDeck(recette, catalogue) {
  const { cartes, couleursDe, limiteDe } = catalogue;
  const carteParId = new Map((cartes ?? []).map((carte) => [carte.id, carte]));
  const {
    identite = [], terrains = [], creatures = 0, magies = 0, armes = 0,
    signature = [], mythiquesMax = Infinity, raresMax = Infinity,
  } = recette ?? {};

  const dansIdentite = (carte) => {
    const couleurs = couleursDe(carte);
    return couleurs.length > 0 && couleurs.every((couleur) => identite.includes(couleur));
  };
  const vivier = (cartes ?? []).filter((carte) => carte.kind !== 'terrain' && dansIdentite(carte));
  const quotas = { creature: creatures, magie: magies, arme: armes };
  const choisis = { creature: [], magie: [], arme: [] };
  const comptes = new Map();

  /** Pose jusqu'à `nombre` exemplaires d'une carte, sans dépasser limite ni quota. */
  const poser = (carte, nombre) => {
    if (!carte) return 0;
    const seau = seauDe(carte);
    const limite = limiteDe(carte);
    const deja = comptes.get(carte.id) ?? 0;
    const place = quotas[seau] - choisis[seau].length;
    const copies = Math.max(0, Math.min(nombre - deja, limite - deja, place));
    for (let i = 0; i < copies; i += 1) choisis[seau].push(carte.id);
    if (copies > 0 || deja > 0) comptes.set(carte.id, deja + copies);
    return copies;
  };

  const distinctesDeRarete = (rarete, seau) => [...comptes.keys()]
    .filter((id) => {
      const carte = carteParId.get(id);
      return carte?.rarity === rarete && seauDe(carte) === seau;
    }).length;

  // 1. La signature : les cartes d'archétype du deck, posées avant tout.
  for (const entree of signature) {
    const [id, nombre] = Array.isArray(entree) ? entree : [entree, 1];
    poser(carteParId.get(id), nombre);
  }

  // 2. Le remplissage : les meilleures cartes de l'identité, palier par palier.
  // Les plafonds se comptent **par famille** — au plus N figures parmi les
  // créatures, au plus N rares parmi les sorts : un sorcier ne renonce pas à
  // ses sorts rares parce qu'il a déjà aligné quatre créatures rares. Le
  // plafond des mythiques ne cède jamais avant celui des rares (une figure est
  // un événement de la campagne, une rare est une carte ordinaire), et la
  // dernière passe ne sert qu'à ne pas laisser une place vide.
  const classees = [...vivier].sort(comparerCartesParPuissance);
  for (const passe of ['plafons', 'rares-sans-plafond', 'sans-plafond']) {
    for (const carte of classees) {
      const seau = seauDe(carte);
      if (choisis[seau].length >= quotas[seau]) continue;
      if ((comptes.get(carte.id) ?? 0) >= limiteDe(carte)) continue;
      if (!comptes.has(carte.id)) {
        if (carte.rarity === 'mythique' && passe !== 'sans-plafond'
          && distinctesDeRarete('mythique', seau) >= mythiquesMax) continue;
        if (carte.rarity === 'rare' && passe === 'plafons'
          && distinctesDeRarete('rare', seau) >= raresMax) continue;
      }
      poser(carte, limiteDe(carte));
    }
  }

  return [
    ...terrains.flatMap(([id, nombre]) => Array(nombre).fill(id)),
    ...choisis.creature,
    ...choisis.magie,
    ...choisis.arme,
  ];
}

/**
 * Les cartes d'une liste qui ne sont pas des terrains — la lecture utilisée par
 * les contrôles (« telle carte est bien dans le deck, à tel nombre »).
 */
export function cartesHorsTerrain(liste, carteParId) {
  return (liste ?? []).filter((id) => carteParId.get(id)?.kind !== 'terrain');
}

/** Le rang de rareté d'une carte, exposé pour les contrôles de plafond. */
export function rangDeRarete(carte) {
  return RPG_RANGS_RARETE[carte?.rarity] ?? RPG_RANGS_RARETE.commune;
}
