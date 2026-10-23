/**
 * La création assistée d'un deck maison — « l'IA » de l'atelier.
 *
 * Le joueur pose les fondations, le moteur complète. Trois choix le guident :
 * les **couleurs** du deck (1 à 3), **quatre créatures**, puis **quatre sorts**
 * (magies et armes) de ces couleurs — toujours dans sa collection. Le moteur
 * remplit alors les places restantes jusqu'à la taille du deck avec des cartes
 * qui **complètent** celles choisies.
 *
 * Compléter, ici, est un calcul — jamais un appel réseau. Le jeu tourne hors
 * ligne (desktop, Android) et la maison préfère les règles vérifiables ; le
 * moteur est donc un module pur, déterministe, testé comme le composeur du
 * catalogue (`rpgDeckComposer.js`). Chaque candidat reçoit un score :
 *
 *   - **Synergie** — les mécaniques partagées avec les cartes choisies : les
 *     tribus imprimées sur la ligne de type (`tribu:serpent`, `tribu:viking`),
 *     les capacités (`cap:butin`, `cap:envol`, `cap:furie`…), les familles
 *     d'effets (`effet:pioche`, `effet:degats`) et les prêts (`donne:coupRapide`).
 *     Un deck qui choisit des Serpents veut d'autres Serpents et ce qui les
 *     nourrit ;
 *   - **Couverture** — ce que le deck n'a pas encore : aucune pioche ? une
 *     pioche est complémentaire ; aucun retrait ? un sort de dégâts l'est.
 *     Complémenter, c'est aussi combler les trous ;
 *   - **Courbe de mana** — les places du palier cible encore ouvertes reçoivent
 *     un bonus ; une main de finisseurs appelle du jeu précoce ;
 *   - **Mix créatures / sorts** — la répartition des recettes du catalogue
 *     (environ 18 créatures sur 30) ;
 *   - **Couleurs** — une couleur choisie encore absente du deck appelle ses
 *     cartes : le deck final porte bien les couleurs promises ;
 *   - **Puissance** (`rpgCardPower.js`) — en départage final seulement.
 *
 * Les contraintes sont dures et vérifiées : taille exacte, identité chromatique
 * choisie (toutes les couleurs de chaque carte dedans), collection du joueur,
 * plafond de copies (une mythique, deux des autres). Chaque carte choisie est
 * posée à deux exemplaires (une si mythique) — le cœur du deck reste au joueur,
 * l'IA bâtit autour.
 *
 * Le module ne connaît ni le catalogue ni les règles de couleur : ils arrivent
 * en paramètres (`catalogue = { cartes, couleursDe, limiteDe }`), comme chez le
 * composeur. C'est ce qui permet de le tester sur trois cartes synthétiques.
 */

import { puissanceCarte } from './rpgCardPower.js';

/** Le deck complet de la création assistée : 30 cartes, comme le format du duel. */
export const RPG_ASSISTANT_TAILLE = 30;

/** Combien de créatures, puis de sorts, le joueur choisit. */
export const RPG_ASSISTANT_CREATURES = 4;
export const RPG_ASSISTANT_SORTS = 4;

/** Exemplaires posés de chaque carte choisie (la mythique garde sa règle de une). */
export const RPG_ASSISTANT_COPIES = 2;

/** Les capacités imprimées qui signalent une mécanique de deck. */
const CAPACITES = ['butin', 'rapidite', 'envol', 'coupRapide', 'furie', 'overkill', 'protection', 'esquive'];

/** Les sources d'effet d'une carte : son sort, son arrivée, sa mort, son déclenché. */
const SOURCES_EFFET = ['effet', 'arrivee', 'mort', 'declenche'];

/** Mots génériques de la ligne de type : ce ne sont pas des tribus. */
const MOTS_TYPE_IGNORES = new Set([
  'creature', 'legendaire', 'heros', 'magie', 'rapide', 'sorcellerie', 'arme', 'jeton',
  'tour', 'defense', 'bete', 'marine', 'habitant', 'habitants', 'bab', 'el', 'sihr',
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'principale', 'contre',
]);

/** Sans accent, en minuscules — la comparaison des tribus ne dépend pas du pluriel. */
function normaliserMot(mot) {
  return String(mot ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** La famille d'une carte : créature (héros compris), magie, ou arme. */
export function familleDeCarte(carte) {
  if (carte?.kind === 'arme' || carte?.effet?.type === 'arme') return 'arme';
  if (carte?.kind === 'magie') return 'magie';
  return 'creature';
}

/** Les tribus imprimées sur la ligne de type : « Créature — Serpent », « Arme — Takouba ». */
export function tribusDeCarte(carte) {
  const partie = String(carte?.typeLine ?? '').split('—').slice(1).join(' ');
  return new Set(partie.split(/[\s·,]+/).map(normaliserMot)
    .filter((mot) => mot.length >= 3 && !MOTS_TYPE_IGNORES.has(mot)));
}

/**
 * La signature mécanique d'une carte — les jetons que la synergie lit :
 * `tribu:*` (lignes de type), `cap:*` (capacités imprimées), `effet:*` (types
 * d'effet de toutes ses sources), `donne:*` (capacités prêtées).
 */
export function mecaniquesDeCarte(carte) {
  const jetons = new Set();
  for (const tribu of tribusDeCarte(carte)) jetons.add(`tribu:${tribu}`);
  for (const capacite of CAPACITES) {
    if (carte?.[capacite]) jetons.add(`cap:${capacite}`);
  }
  for (const source of SOURCES_EFFET) {
    const type = carte?.[source]?.type;
    if (typeof type === 'string' && type) jetons.add(`effet:${type}`);
  }
  for (const capacite of Object.keys(carte?.donne ?? {})) {
    if (carte.donne[capacite]) jetons.add(`donne:${capacite}`);
  }
  return jetons;
}

/** La courbe visée du deck : les places de chaque palier (1…6, 7+). */
const COURBE_CIBLE = [4, 6, 6, 5, 4, 3, 2];
const palierDeCout = (cout) => Math.min(Math.max(Number(cout) || 0, 1), 7);

/** Le poids d'un jeton dans la synergie : une tribu lie plus qu'un effet. */
const POIDS_JETON = (jeton) => (jeton.startsWith('tribu:') ? 2.4
  : jeton.startsWith('cap:') ? 1.1
    : jeton.startsWith('donne:') ? 0.8 : 0.55);

/**
 * Le score de complémentarité d'un candidat face au deck en cours de
 * construction. `etat` est rendu par `etatDeConstruction` — c'est lui qui
 * change à chaque ajout, et qui fait du remplissage une conversation avec les
 * cartes déjà posées plutôt qu'une liste figée.
 */
export function scoreComplementarite(carte, etat) {
  const jetons = mecaniquesDeCarte(carte);
  // 1. Synergie avec les cartes choisies par le joueur : les jetons partagés.
  let synergie = 0;
  for (const jeton of jetons) {
    if (etat.jetonsChoisis.has(jeton)) synergie += POIDS_JETON(jeton);
  }
  synergie = Math.min(synergie, 5);
  // 2. Couverture : un effet que le deck n'emploie pas encore est complémentaire.
  let couverture = 0;
  for (const jeton of jetons) {
    if (jeton.startsWith('effet:') && !etat.jetonsDeck.has(jeton)) couverture += 0.7;
    if (couverture >= 2) break;
  }
  // 3. Courbe de mana : la place du palier encore ouverte.
  const palier = palierDeCout(carte?.cost);
  const cible = COURBE_CIBLE[palier - 1];
  const ouvert = Math.max(0, cible - etat.parPalier[palier - 1]);
  const courbe = (ouvert / cible) * 1.5;
  // 4. Mix : créatures et sorts selon la répartition des recettes du catalogue.
  const famille = familleDeCarte(carte);
  const cibleFamille = famille === 'creature' ? 18 : 12;
  const deficit = Math.max(0, cibleFamille - etat.parFamille[famille]);
  const mix = Math.min(1, deficit / cibleFamille) * 1.1;
  // 5. Couleurs : une couleur choisie encore absente du deck appelle ses cartes.
  let couleurs = 0;
  for (const couleur of (carte?.couleurs ?? [])) {
    if (!etat.couleursDeck.has(couleur)) couleurs += 0.9;
    if (couleurs >= 1.8) break;
  }
  // 6. Puissance, en départage final seulement.
  const amplitude = etat.puissanceMax - etat.puissanceMin;
  const puissance = amplitude > 0
    ? ((puissanceCarte(carte) - etat.puissanceMin) / amplitude) * 0.7
    : 0.35;
  return synergie + couverture + courbe + mix + couleurs + puissance;
}

/** L'état de construction lu à chaque ajout — pur, dérivé de la liste en cours. */
function etatDeConstruction(cardIds, choixIds, cartesParId) {
  const jetonsChoisis = new Set();
  for (const id of choixIds) {
    for (const jeton of mecaniquesDeCarte(cartesParId.get(id))) jetonsChoisis.add(jeton);
  }
  const jetonsDeck = new Set();
  const parPalier = Array(7).fill(0);
  const parFamille = { creature: 0, magie: 0, arme: 0 };
  const couleursDeck = new Set();
  for (const id of cardIds) {
    const carte = cartesParId.get(id);
    if (!carte) continue;
    for (const jeton of mecaniquesDeCarte(carte)) jetonsDeck.add(jeton);
    parPalier[palierDeCout(carte.cost) - 1] += 1;
    parFamille[familleDeCarte(carte)] += 1;
    for (const couleur of (carte.couleurs ?? [])) couleursDeck.add(couleur);
  }
  return { jetonsChoisis, jetonsDeck, parPalier, parFamille, couleursDeck, puissanceMin: 0, puissanceMax: 1 };
}

/**
 * Les cartes proposées à une étape de l'assistant : les créatures (héros
 * compris) ou les sorts (magies et armes) **possédés** de ces couleurs, triées
 * par coût puis par nom. Hors collection, rien n'est proposé : l'assistant ne
 * compose que ce que le joueur possède.
 */
export function cartesPourEtape(couleurs, famille, catalogue, collection = null) {
  const identite = new Set(Array.isArray(couleurs) ? couleurs : []);
  const { cartes = [], couleursDe = () => [] } = catalogue ?? {};
  return cartes.filter((carte) => {
    const familleCarte = familleDeCarte(carte);
    if (famille === 'creatures' && familleCarte !== 'creature') return false;
    if (famille === 'sorts' && familleCarte === 'creature') return false;
    const couleursCarte = couleursDe(carte);
    if (!couleursCarte.length || !couleursCarte.every((couleur) => identite.has(couleur))) return false;
    if (Array.isArray(collection) && !collection.includes(carte.id)) return false;
    return true;
  }).sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0)
    || String(a.name ?? a.id).localeCompare(String(b.name ?? b.id), 'fr'));
}

/**
 * Génère le deck autour des choix du joueur. Rend `{ cardIds, embleme }` :
 * la liste complète (les cartes choisies d'abord, à deux exemplaires — une si
 * mythique — puis les compléments par score décroissant), et la carte emblème
 * du boîtier (la plus rare des cartes choisies).
 *
 * `taille` est paramétrable pour les tests ; le deck maison réel vaut 30.
 * Quand la collection ne mène pas jusqu'à la taille, le deck rendu reste
 * volontairement incomplet : l'atelier l'affiche en brouillon, jamais cassé.
 */
export function genererDeckAssiste({
  couleurs = [],
  creatures = [],
  sorts = [],
  collection = null,
  catalogue,
  taille = RPG_ASSISTANT_TAILLE,
} = {}) {
  const identite = [...new Set(couleurs)].slice(0, 3);
  const { cartes = [], couleursDe = () => [], limiteDe = () => 2 } = catalogue ?? {};
  // Toutes les cartes portent leurs couleurs lues : le score et l'état de
  // construction n'ont plus jamais à redemander la règle au catalogue.
  const cartesP = cartes.map((carte) => ({ ...carte, couleurs: couleursDe(carte) }));
  const cartesParId = new Map(cartesP.map((carte) => [carte.id, carte]));
  const possedees = (id) => !Array.isArray(collection) || collection.includes(id);

  // 1. La signature : les choix du joueur, deux exemplaires (une mythique).
  const choixIds = [...creatures, ...sorts].filter((id, rang, liste) => liste.indexOf(id) === rang);
  const cardIds = [];
  const compte = new Map();
  /** Pose des exemplaires **en plus** de ceux déjà là, sans dépasser la limite. */
  const poser = (id, exemplaires) => {
    const carte = cartesParId.get(id);
    if (!carte) return;
    const deja = compte.get(id) ?? 0;
    const ajouts = Math.max(0, Math.min(exemplaires, limiteDe(carte) - deja));
    for (let i = 0; i < ajouts; i += 1) cardIds.push(id);
    if (ajouts > 0 || deja > 0) compte.set(id, deja + ajouts);
  };
  for (const id of choixIds) {
    const carte = cartesParId.get(id);
    if (!carte || !possedees(id)) continue;
    const plafond = carte.rarity === 'mythique' ? 1 : RPG_ASSISTANT_COPIES;
    poser(id, plafond);
  }

  // 2. Le vivier de remplissage : possédé, dans l'identité choisie, jamais
  //    les cartes déjà au plafond. La signature reste même si une carte de
  //    choix dépasse l'identité — comme chez le composeur du catalogue.
  const vivier = cartesP.filter((carte) => {
    if (!possedees(carte.id)) return false;
    return carte.couleurs.length > 0 && carte.couleurs.every((couleur) => identite.includes(couleur));
  });
  const puissances = vivier.map((carte) => puissanceCarte(carte));

  // 3. Le remplissage : un complément par itération, le score se recalcule à
  //    chaque ajout — le prochain complément répond aux précédents.
  while (cardIds.length < taille) {
    const etat = etatDeConstruction(cardIds, choixIds, cartesParId);
    etat.puissanceMin = Math.min(...puissances, 0);
    etat.puissanceMax = Math.max(...puissances, 1);
    let meilleur = null;
    let meilleurScore = -Infinity;
    for (const carte of vivier) {
      const deja = compte.get(carte.id) ?? 0;
      if (deja >= limiteDe(carte)) continue;
      const score = scoreComplementarite(carte, etat);
      if (score > meilleurScore
        || (score === meilleurScore && meilleur && (String(carte.id) < String(meilleur.id)))) {
        meilleur = carte;
        meilleurScore = score;
      }
    }
    if (!meilleur) break;
    poser(meilleur.id, 1);
  }

  const embleme = [...choixIds]
    .filter((id) => cartesParId.has(id) && possedees(id))
    .sort((a, b) => (rangRareteLocale(cartesParId.get(b)) - rangRareteLocale(cartesParId.get(a)))
      || (puissanceCarte(cartesParId.get(b)) - puissanceCarte(cartesParId.get(a))))[0] ?? null;
  return { cardIds, embleme };
}

/** Le rang de rareté d'une carte, sans dépendre du catalogue. */
function rangRareteLocale(carte) {
  return { commune: 1, inhabituelle: 2, rare: 3, mythique: 4 }[carte?.rarity] ?? 1;
}

/** Le prénom de la carte : « Takouba de Tin Hinan » → « Takouba ». */
function premierMot(nom) {
  return String(nom ?? '').trim().split(/[\s—'-]+/)[0] ?? '';
}

/** « de Takouba » / « d’Anqa » — l'élision suit la voyelle d'attaque. */
export function particuleDe(nom) {
  const mot = premierMot(nom);
  if (!mot) return '';
  return /^[aàâäéèêëîïôöùûüœy]/i.test(mot) ? `d’${mot}` : `de ${mot}`;
}

/**
 * Les propositions de nom à l'enregistrement — « le jeu propose de nommer le
 * deck ». La carte emblème (la plus rare du deck, la plus forte à égalité)
 * prête son premier mot : « Les Disciples d'Anqa », « Le Serment de Takouba ».
 * Trois propositions déterministes, éditables ensuite par le joueur.
 */
export function suggestionsNomsDeck(cardIds, catalogue) {
  const { cartes = [] } = catalogue ?? {};
  const cartesParId = new Map(cartes.map((carte) => [carte.id, carte]));
  const embleme = [...new Set(Array.isArray(cardIds) ? cardIds : [])]
    .map((id) => cartesParId.get(id))
    .filter((carte) => carte && carte.kind !== 'terrain')
    .sort((a, b) => (rangRareteLocale(b) - rangRareteLocale(a))
      || (puissanceCarte(b) - puissanceCarte(a))
      || String(a.id).localeCompare(String(b.id)))[0] ?? null;
  if (!embleme) return ['Deck maison'];
  const particule = particuleDe(embleme.name);
  return [
    `Les Disciples ${particule}`,
    `Le Serment ${particule}`,
    `La Garde ${particule}`,
  ];
}
