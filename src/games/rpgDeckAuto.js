/**
 * La création assistée d'un deck maison — « l'IA » de l'atelier.
 *
 * Le joueur pose les fondations, le moteur compose. Deux choix le guident
 * désormais : les **couleurs** du deck (1 à 3), puis son **style de jeu**
 * (`aggro`, `controle` ou `mix`, voir `RPG_STYLES_JEU`). Le moteur bâtit alors
 * un deck de trente cartes **uniquement avec des cartes possédées**, en
 * respectant la courbe de mana, le mix créatures / sorts et les affinités
 * d'effets du style choisi. L'ancien parcours (quatre créatures puis quatre
 * sorts choisis à la main) reste supporté par les paramètres `creatures` et
 * `sorts`, mais l'interface ne le propose plus.
 *
 * Une **invite de texte** ouvre le parcours : le joueur peut dire son deck en
 * toutes lettres — « un deck viking neige ténèbres, avec quelques sorts de
 * contrôle ». `rpgDeckIntention.js` lit la phrase et rend une **intention**
 * (couleurs, thèmes ramenés aux tribus imprimées, style et son intensité,
 * effets voulus, familles dites, courbe, raretés, refus, cartes nommées) ; ce
 * module la traduit en score (`normaliserIntention`, `bonusIntention`). Sans
 * intention, rien ne change : le parcours couleurs → style reste entier.
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
 *   - **Puissance** (`rpgCardPower.js`) — en départage final seulement ;
 *   - **Intention dictée** (`bonusIntention`) — le thème demandé, tant que sa
 *     part du deck n'est pas servie, puis ce qui le complète ; les effets et
 *     les familles dits, la courbe, les raretés, et un fort malus pour ce que
 *     le joueur a refusé (« sans sorts »).
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

/**
 * Les styles de jeu de la création assistée. Le joueur ne choisit plus de
 * cartes une à une : il dit ses **couleurs**, puis son **style**, et le moteur
 * compose trente cartes dans sa collection. Chaque profil règle trois leviers
 * du score (`scoreComplementarite`) :
 *
 *   - `courbe` — les places visées à chaque palier de mana (1…6, 7+) ;
 *   - `creatures` / `sorts` — le mix de familles visé (les deux nombres
 *     totalisent toujours la taille du deck, 30) ;
 *   - les affinités de `bonusStyle` — les capacités et types d'effet que le
 *     style récompense (vitesse et dégâts pour l'aggro, retraits et pioche
 *     pour le contrôle).
 *
 * `mix` reprend exactement les cibles historiques de l'atelier : c'est le
 * style par défaut, et celui des decks composés sans choix du joueur
 * (`rpgDeckDeDepart.js`).
 */
export const RPG_STYLES_JEU = [
  {
    id: 'aggro',
    label: 'Aggro',
    icone: '⚔️',
    accroche: 'Vite, fort, sans attendre',
    description: 'Une courbe basse, des créatures rapides et des sorts de dégâts : submerger l’adversaire avant qu’il ne s’installe.',
    courbe: [7, 8, 7, 4, 2, 1, 1],
    creatures: 22,
    sorts: 8,
  },
  {
    id: 'controle',
    label: 'Contrôle',
    icone: '🛡️',
    accroche: 'Tenir, puis dominer',
    description: 'Retraits, contres, pioche et soins pour survivre, puis de gros finishers pour prendre le dessus.',
    courbe: [2, 3, 4, 6, 6, 5, 4],
    creatures: 14,
    sorts: 16,
  },
  {
    id: 'mix',
    label: 'Mix',
    icone: '⊙',
    accroche: 'L’équilibre avant tout',
    description: 'Une courbe équilibrée et un mélange de créatures et de sorts, pour s’adapter à tous les plans de jeu.',
    courbe: [4, 6, 6, 5, 4, 3, 2],
    creatures: 18,
    sorts: 12,
  },
];

/** Le profil d'un style, avec repli sur `mix` si l'identifiant est inconnu. */
export function profilStyle(style) {
  return RPG_STYLES_JEU.find((profil) => profil.id === style) ?? RPG_STYLES_JEU.find((profil) => profil.id === 'mix');
}

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

/** La courbe visée historique de l'atelier : celle du style `mix`. */
const COURBE_CIBLE = [4, 6, 6, 5, 4, 3, 2];
const palierDeCout = (cout) => Math.min(Math.max(Number(cout) || 0, 1), 7);

/** Le poids d'un jeton dans la synergie : une tribu lie plus qu'un effet. */
const POIDS_JETON = (jeton) => (jeton.startsWith('tribu:') ? 2.4
  : jeton.startsWith('cap:') ? 1.1
    : jeton.startsWith('donne:') ? 0.8 : 0.55);

/** Les effets qui retirent une menace : le cœur du plan de jeu contrôle. */
const EFFETS_CONTROLE = ['effet:degats', 'effet:contresort', 'effet:gel', 'effet:exil', 'effet:debuff', 'effet:brouillard'];
/** Ce qui fait tourner l'avantage de cartes : pioche et recyclage. */
const EFFETS_AVANTAGE = ['effet:pioche', 'effet:recyclage'];
/** Ce qui gagne du temps et des points de vie. */
const EFFETS_SURVIE = ['effet:soin', 'effet:bouclier'];

const sommeJusque = (jetons, liste, gain, plafond) => {
  let total = 0;
  for (const jeton of liste) {
    if (jetons.has(jeton)) total += gain;
    if (total >= plafond) return plafond;
  }
  return total;
};

/**
 * Le bonus (ou le malus) qu'un **style de jeu** applique à un candidat.
 * Neutre pour `mix` — son caractère équilibré vit déjà dans la courbe et le
 * mix de familles ciblés, donc le score historique reste strictement le même
 * quand aucun style n'est choisi.
 */
export function bonusStyle(carte, style) {
  if (style === 'aggro') {
    const cout = palierDeCout(carte?.cost);
    let bonus = 0;
    // La tempo d'abord : tout ce qui arrive tôt prend l'ascendant, les gros
    // coûts sont taxés — un deck aggro veut finir avant eux.
    if (cout <= 2) bonus += 0.9;
    else if (cout === 3) bonus += 0.45;
    else if (cout === 5) bonus -= 0.35;
    else if (cout >= 6) bonus -= 0.8;
    const jetons = mecaniquesDeCarte(carte);
    bonus += sommeJusque(jetons, ['cap:rapidite', 'cap:coupRapide', 'cap:furie'], 0.5, 0.8);
    if (jetons.has('cap:envol')) bonus += 0.3;
    if (jetons.has('effet:degats')) bonus += familleDeCarte(carte) === 'creature' ? 0.25 : 0.6;
    if (familleDeCarte(carte) === 'creature') bonus += 0.3;
    return bonus;
  }
  if (style === 'controle') {
    const cout = palierDeCout(carte?.cost);
    let bonus = 0;
    // Le contrôle achète du temps : il évite les cartes trop précoces et
    // récompense les finishers tardifs.
    if (cout >= 5) bonus += 0.7;
    else if (cout === 4) bonus += 0.2;
    else if (cout <= 1) bonus -= 0.5;
    const jetons = mecaniquesDeCarte(carte);
    bonus += sommeJusque(jetons, EFFETS_CONTROLE, 0.5, 1.2);
    bonus += sommeJusque(jetons, EFFETS_AVANTAGE, 0.45, 0.8);
    bonus += sommeJusque(jetons, EFFETS_SURVIE, 0.35, 0.6);
    if (familleDeCarte(carte) !== 'creature') bonus += 0.3;
    return bonus;
  }
  return 0;
}

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
  // 3. Courbe de mana : la place du palier encore ouverte, selon le style.
  const palier = palierDeCout(carte?.cost);
  const courbeCible = etat.courbeCible ?? COURBE_CIBLE;
  const cible = courbeCible[palier - 1];
  const ouvert = Math.max(0, cible - etat.parPalier[palier - 1]);
  const courbe = (ouvert / cible) * 1.5;
  // 4. Mix : créatures et sorts selon la répartition visée par le style.
  const famille = familleDeCarte(carte);
  const cibleCreatures = etat.cibleCreatures ?? 18;
  const cibleFamille = famille === 'creature' ? cibleCreatures : (RPG_ASSISTANT_TAILLE - cibleCreatures);
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
  // 7. Le style de jeu choisi : neutre en `mix`, directeur en aggro/contrôle.
  //    L'intention dictée en module le poids (« quelques sorts de contrôle »
  //    pèse moins qu'un deck contrôle assumé).
  const demande = etat.intention ?? null;
  const styleBonus = bonusStyle(carte, etat.style ?? 'mix') * (demande?.poidsStyle ?? 1);
  // 8. La demande en toutes lettres : le thème, les effets, les familles, la
  //    courbe et les refus lus par `rpgDeckIntention.js`.
  const intentionBonus = bonusIntention(carte, demande, etat);
  return synergie + couverture + courbe + mix + couleurs + puissance + styleBonus + intentionBonus;
}

/**
 * L'intention lue de l'invite de texte, ramenée à ce que le moteur sait
 * noter — un objet plat, sans vocabulaire ni catalogue. `null` quand rien
 * n'est demandé : le score historique reste alors **strictement** le même.
 */
export function normaliserIntention(intention) {
  if (!intention || typeof intention !== 'object') return null;
  const liste = (valeur) => [...new Set(Array.isArray(valeur) ? valeur.filter(Boolean) : [])];
  const tribus = liste(intention.tribus).map((tribu) => normaliserMot(tribu)).filter(Boolean);
  const themes = liste(intention.themes).map((theme) => (typeof theme === 'string'
    ? { id: theme, label: theme }
    : { id: theme?.id ?? '', label: theme?.label ?? theme?.id ?? '' }));
  const exclusions = intention.exclusions ?? {};
  const partTheme = Number.isFinite(Number(intention.partTheme))
    ? Math.min(Math.max(Number(intention.partTheme), 0.2), 0.95)
    : 0.6;
  const poidsStyle = Number.isFinite(Number(intention.poidsStyle))
    ? Math.min(Math.max(Number(intention.poidsStyle), 0.3), 1.6)
    : 1;
  const normale = {
    texte: String(intention.texte ?? '').trim(),
    themes,
    tribus,
    cartesTheme: liste(intention.cartesTheme),
    effets: liste(intention.effets),
    familles: liste(intention.familles),
    raretes: liste(intention.raretes),
    exclureFamilles: liste(exclusions.familles),
    exclureEffets: liste(exclusions.effets),
    exclureThemes: liste(exclusions.themes),
    courbe: intention.courbe === 'basse' || intention.courbe === 'haute' ? intention.courbe : null,
    partTheme,
    poidsStyle,
    signature: liste(intention.signature),
  };
  const vide = !normale.tribus.length && !normale.cartesTheme.length && !normale.effets.length
    && !normale.familles.length && !normale.raretes.length && !normale.exclureFamilles.length
    && !normale.exclureEffets.length && !normale.courbe && !normale.signature.length
    && poidsStyle === 1;
  return vide ? null : normale;
}

/**
 * Le bonus (ou le malus) qu'une **intention dictée** applique à un candidat.
 *
 * C'est ici que la phrase du joueur devient un deck : « un deck viking neige
 * ténèbres, avec quelques sorts de contrôle » pose d'abord des Vikings —
 * jusqu'à la part du thème visée (`partTheme`, environ 60 % du deck) — puis
 * paie le reste en sorts et en armes de ces couleurs, parce qu'une fois le
 * thème servi, ce qui complète reprend l'avantage. Les effets demandés, les
 * familles dites (« avec des armes »), la courbe et les raretés s'ajoutent ;
 * les refus (« sans sorts ») coûtent cher, sans jamais être un filtre dur :
 * un deck qui ne peut pas se passer de sorts reste un deck complet.
 */
export function bonusIntention(carte, intention, etat = {}) {
  if (!intention) return 0;
  const jetons = mecaniquesDeCarte(carte);
  const famille = familleDeCarte(carte);
  const cout = palierDeCout(carte?.cost);
  let bonus = 0;

  // 1. Le thème : les cartes du thème (nommément) ou ses tribus imprimées,
  //    tant que la part visée n'est pas servie.
  const cibleTheme = etat.cibleTheme ?? 0;
  const themePose = etat.themePose ?? 0;
  const porteTheme = cibleTheme > 0
    && (etat.themeIds?.has(carte?.id)
      || intention.tribus.some((tribu) => jetons.has(`tribu:${tribu}`)));
  if (porteTheme) bonus += themePose < cibleTheme ? 2.3 : 0.3;
  else if (cibleTheme > 0 && themePose >= cibleTheme) bonus += 0.85;

  // 2. Les effets demandés (« quelques sorts de contrôle »).
  let effets = 0;
  for (const effet of intention.effets) {
    if (jetons.has(`effet:${effet}`)) effets += 0.75;
    if (effets >= 1.6) break;
  }
  bonus += effets;

  // 3. Les familles dites (« avec des armes »). Dans un deck de thème, les
  //    armes qui équipent ses créatures complètent naturellement le plan —
  //    le bonus se cumule, pour qu'elles passent devant les sorts neutres.
  if (intention.familles.includes(famille)) bonus += 0.85;
  if (cibleTheme > 0 && famille === 'arme') bonus += 0.5;

  // 4. La courbe dite (« deck rapide », « gros finishers »).
  if (intention.courbe === 'basse') bonus += cout <= 2 ? 0.55 : cout >= 6 ? -0.4 : 0;
  if (intention.courbe === 'haute') bonus += cout >= 5 ? 0.55 : cout <= 1 ? -0.4 : 0;

  // 5. Les raretés dites (« un deck de légendaires »).
  if (intention.raretes.length && intention.raretes.includes(carte?.rarity)) bonus += 0.6;

  // 6. Les refus (« sans sorts ») : un fort malus, jamais une interdiction.
  if (intention.exclureFamilles.includes(famille)) bonus -= 3.4;
  if (intention.exclureEffets.some((effet) => jetons.has(`effet:${effet}`))) bonus -= 1.8;
  return bonus;
}

/** L'état de construction lu à chaque ajout — pur, dérivé de la liste en cours. */
function etatDeConstruction(cardIds, choixIds, cartesParId, style = 'mix', intention = null, taille = RPG_ASSISTANT_TAILLE) {
  const jetonsChoisis = new Set();
  for (const id of choixIds) {
    for (const jeton of mecaniquesDeCarte(cartesParId.get(id))) jetonsChoisis.add(jeton);
  }
  const jetonsDeck = new Set();
  const parPalier = Array(7).fill(0);
  const parFamille = { creature: 0, magie: 0, arme: 0 };
  const couleursDeck = new Set();
  // Le thème se reconnaît de deux façons : les cartes que la vérification a
  // nommées (`cartesTheme`, goût compris) et les tribus imprimées.
  const themeIds = new Set(intention?.cartesTheme ?? []);
  const estDuTheme = (id, jetons) => themeIds.has(id)
    || (intention?.tribus ?? []).some((tribu) => jetons.has(`tribu:${tribu}`));
  let themePose = 0;
  for (const id of cardIds) {
    const carte = cartesParId.get(id);
    if (!carte) continue;
    const jetons = mecaniquesDeCarte(carte);
    for (const jeton of jetons) jetonsDeck.add(jeton);
    parPalier[palierDeCout(carte.cost) - 1] += 1;
    parFamille[familleDeCarte(carte)] += 1;
    for (const couleur of (carte.couleurs ?? [])) couleursDeck.add(couleur);
    if (estDuTheme(id, jetons)) themePose += 1;
  }
  const profil = profilStyle(style);
  // « Sans sorts » / « que des créatures » déplacent le mix visé : la cible des
  // familles suit le refus, pour que le score ne rame pas contre le joueur.
  let cibleCreatures = profil.creatures;
  if (intention?.exclureFamilles.includes('magie') && intention?.exclureFamilles.includes('arme')) {
    cibleCreatures = taille;
  } else if (intention?.exclureFamilles.includes('creature')) {
    cibleCreatures = 0;
  }
  const cibleTheme = intention && (intention.tribus.length || intention.cartesTheme.length)
    ? Math.max(2, Math.round(taille * intention.partTheme))
    : 0;
  return {
    jetonsChoisis,
    jetonsDeck,
    parPalier,
    parFamille,
    couleursDeck,
    puissanceMin: 0,
    puissanceMax: 1,
    style: profil.id,
    courbeCible: profil.courbe,
    cibleCreatures,
    intention: intention ?? null,
    themeIds,
    themePose,
    cibleTheme,
  };
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
 * La création assistée actuelle ne demande plus que les **couleurs** et le
 * **style de jeu** (`aggro`, `controle`, `mix`) : `creatures` et `sorts`
 * restent acceptés pour la compatibilité (le deck de départ en appelle un
 * sans signature), mais l'interface ne les fait plus choisir.
 *
 * `intention` porte la demande **dictée dans l'invite de texte** (lue par
 * `rpgDeckIntention.js`) : thèmes et tribus, effets voulus, familles dites,
 * courbe, raretés, refus et cartes nommées. Absente, elle ne change rien —
 * le score historique est strictement le même.
 *
 * `taille` est paramétrable pour les tests ; le deck maison réel vaut 30.
 * Quand la collection ne mène pas jusqu'à la taille, le deck rendu reste
 * volontairement incomplet : l'atelier l'affiche en brouillon, jamais cassé.
 */
export function genererDeckAssiste({
  couleurs = [],
  creatures = [],
  sorts = [],
  style = 'mix',
  intention = null,
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
  const demande = normaliserIntention(intention);

  // 1. La signature : les choix du joueur — cartes nommées dans l'invite
  //    d'abord, puis les sélections historiques — deux exemplaires (une
  //    mythique).
  const choixIds = [...(demande?.signature ?? []), ...creatures, ...sorts]
    .filter((id, rang, liste) => liste.indexOf(id) === rang);
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
    const etat = etatDeConstruction(cardIds, choixIds, cartesParId, style, demande, taille);
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

  const parRaretePuisPuissance = (a, b) => (rangRareteLocale(cartesParId.get(b)) - rangRareteLocale(cartesParId.get(a)))
    || (puissanceCarte(cartesParId.get(b)) - puissanceCarte(cartesParId.get(a)));
  const emblemeChoisi = [...choixIds]
    .filter((id) => cartesParId.has(id) && possedees(id))
    .sort(parRaretePuisPuissance)[0] ?? null;
  // Aucune carte choisie à la main ? Un deck **dicté** porte encore un visage :
  // la plus rare de ses cartes de thème illustre le boîtier (« les Vikings »
  // montrent une Valkyrie, pas un sort anonyme).
  const themeIds = new Set(demande?.cartesTheme ?? []);
  const embleme = emblemeChoisi ?? ([...compte.keys()]
    .filter((id) => cartesParId.has(id)
      && (themeIds.has(id)
        || (demande?.tribus ?? []).some((tribu) => mecaniquesDeCarte(cartesParId.get(id)).has(`tribu:${tribu}`))))
    .sort(parRaretePuisPuissance)[0] ?? null);
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
