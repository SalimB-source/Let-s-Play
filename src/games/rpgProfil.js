/**
 * Le profil du joueur du Sablier — l'XP, les niveaux, les rangs.
 *
 * Le Souk paie (`rpgCredits.js`), les quêtes du jour occupent (`rpgQuetes.js`),
 * la collection s'ouvre (`rpgCollection.js`) : il manquait **la colonne
 * vertébrale** qui les relie — une progression qui monte quoi qu'il arrive, et
 * qui se voit. C'est ce module.
 *
 * ## La courbe : vite au début, gourmande ensuite
 *
 * Le seuil d'un palier suit une puissance :
 *
 * > **`seuil(n) = arrondi(26 × n^1,62)`** — l'XP à gagner pour passer de
 * > `n` à `n + 1`.
 *
 * Les premiers niveaux tombent en un ou deux duels (26 XP pour le niveau 2,
 * 80 pour le 3, 144 pour le 4), puis la marche s'élargit à chaque palier :
 * 1 076 XP pour quitter le niveau 10, 3 300 pour le 20, 6 270 pour le 30. Le
 * joueur **sent** la progression s'accélérer au départ et se durcir ensuite,
 * sans qu'aucun plafond ne vienne le lui dire. C'est la même famille de courbe
 * que `04-progression-da.md` (§1, `xp(n) = 60 × n^1,6`), ré-étalonnée pour un
 * jeu de cartes où un duel dure dix minutes.
 *
 * Le niveau se **déduit** de l'XP total (`niveauDeXp`) : il n'est jamais
 * stocké. Deux appareils qui fusionnent ne peuvent donc pas se retrouver avec
 * un niveau qui contredit son XP.
 *
 * ## Le booster du palier
 *
 * **Chaque niveau gagné ouvre un booster au hasard** (dossier
 * `20-profil-joueur-xp.md`). Le module ne sait pas ouvrir un paquet — il tient
 * la **comptabilité** : `boostersDus(profil)` rend le nombre de paquets que le
 * jeu doit encore au joueur, déduit comme
 *
 * > `(niveau − 1) − boostersOfferts`
 *
 * Un seul compteur est écrit (`boostersOfferts`, monotone), et la dette se
 * calcule : un palier franchi avant que le comptoir ne puisse tirer (vivier
 * vide, stockage absent) n'est **jamais perdu**, il attend. Deux appareils ne
 * peuvent pas non plus se payer deux fois le même palier — la fusion prend le
 * maximum des deux compteurs, et la dette en ressort identique des deux côtés.
 *
 * ## Trois invariants, ceux de la maison
 *
 * 1. **Tout est tolérant** : stockage absent, JSON corrompu, XP d'un autre
 *    catalogue — on retombe sur un profil neuf plutôt que de casser un écran.
 * 2. **Rien ne redescend** : `fusionnerProfils` prend le maximum de l'XP, des
 *    compteurs et des paquets offerts, l'union des paliers, et le pseudo,
 *    l'avatar ou le plateau le plus récent **sans jamais effacer** un choix qui
 *    n'existe que d'un côté.
 * 3. **Aucun barème n'est caché** : la courbe, les gains d'XP et les rangs sont
 *    des constantes exportées, vérifiées par `tests/rpg-profil.test.js`. La
 *    carte de profil, elle, est dépouillée (dossier 20 §6) : ces chiffres vivent
 *    ici, pas à l'écran.
 *
 * ## L'identité tient en trois champs
 *
 * `pseudo`, `embleme`, `avatar` — et un choix de table, `plateau`. Le module ne
 * connaît **ni le casting ni les plateaux** : il garde une chaîne propre, bornée
 * par `COURBE.choixMax`, et ce sont les catalogues qui valident
 * (`avatarParId` dans `rpgAvatars.js`, `plateauParId` dans `rpgPlateaux.js`).
 * Un identifiant inconnu — sauvegarde retouchée, avatar retiré d'une version à
 * l'autre — rend `null` à la lecture : le médaillon retombe sur le glyphe, la
 * table retombe sur le terrain du deck. Rien ne casse, rien ne ment.
 */

import { creditsLisible } from './rpgCredits.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

/**
 * Les XP s'écrivent comme les crédits : une espace fine insécable tous les
 * trois chiffres (« 1 076 XP » se lit, « 1076 XP » se déchiffre). Le format
 * est **celui du portefeuille**, ré-exporté pour qu'aucun écran n'en invente
 * un deuxième.
 */
export const xpLisible = creditsLisible;

/** Le profil de l'appareil : XP, identité, compteurs et journal des paliers. */
export const RPG_PROFIL_STORAGE_KEY = 'letsplay_sablier_profil_v1';

/** La courbe, écrite noir sur blanc : l'écran l'affiche, les tests la vérifient. */
export const COURBE = Object.freeze({
  /** Le seuil du premier palier, en XP. */
  base: 26,
  /** L'exposant : c'est lui qui rend chaque palier plus gourmand que le précédent. */
  exposant: 1.62,
  /** On commence au niveau 1, avec 0 XP. */
  niveauDepart: 1,
  /** Le plafond du dossier 04 (niveaux 1 → 60). L'XP continue d'y compter. */
  niveauMax: 60,
  /** Le journal des paliers : les derniers franchis, le plus récent en tête. */
  paliersJournal: 20,
  /** Un pseudo se lit sur un onglet de menu : il reste court. */
  pseudoMax: 24,
  /** Un choix d'avatar ou de plateau est un identifiant : il reste court. */
  choixMax: 48,
});

/**
 * Ce que vaut chaque geste, en XP. Le barème est **parallèle** à celui des
 * crédits (`GAINS`, `rpgCredits.js`) sans être le même : les crédits paient le
 * comptoir, l'XP mesure le temps passé à Bab El. Un duel libre rapporte peu de
 * crédits mais assez d'XP pour faire bouger la barre — c'est voulu, la barre
 * doit vivre à chaque partie.
 */
export const XP = Object.freeze({
  /** Une carte posée sur la table : le fil continu de la barre. */
  carteJouee: 2,
  /** Duel libre gagné. */
  duelLibre: 20,
  /** Premier déblayage d'un étage (Histoire, Jeu Solo). */
  etagePremiere: 70,
  /** Étage rejoué : le jeu paie le duel, pas le farm. */
  etageRejoue: 22,
  /** Le butin de la tour terminée — versé une fois par tour, comme les ◈. */
  tourTerminee: 150,
  /** Un paquet ouvert au Souk. */
  boosterOuvert: 6,
  /** Une quête du jour réclamée. */
  queteReclamee: 30,
  /** Le Cachet du cycle : les trois quêtes du jour. */
  cachetDuCycle: 50,
  /** Le Cachet de la semaine : sept jours d'affilée. */
  cachetDeLaSemaine: 80,
  /** Une leçon du guide terminée. */
  lecon: 40,
});

/**
 * Pourquoi la barre a bougé — le motif du dernier palier, gardé au journal.
 * Chaque motif a son libellé : le journal des paliers se lit, il ne se
 * déchiffre pas.
 */
export const MOTIFS = Object.freeze([
  'carte', 'duel-libre', 'etage', 'tour', 'booster', 'quete', 'cachet', 'semaine', 'lecon', 'autre',
]);

const LIBELLES_MOTIF = Object.freeze({
  carte: 'une carte posée sur la table',
  'duel-libre': 'un duel libre gagné',
  etage: 'un étage déblayé',
  tour: 'une tour terminée',
  booster: 'un paquet ouvert au Souk',
  quete: 'une quête du jour réclamée',
  cachet: 'le Cachet du cycle',
  semaine: 'le Cachet de la semaine',
  lecon: 'une leçon terminée',
  autre: 'le sable qui monte',
});

/**
 * Les rangs de Bab El : dix titres, du sans-nom que le sable n'a pas encore
 * inscrit à la voix de l'Astrolabe. Un rang se **lit** sur la carte de profil ;
 * il ne débloque rien, il dit où l'on en est — comme les paliers de repos du
 * dossier 04.
 */
export const RANGS = Object.freeze([
  { id: 'sans-nom', niveau: 1, nom: 'Sans-Nom', phrase: 'Le sable n’a pas encore retenu votre poids.' },
  { id: 'lanterne', niveau: 3, nom: 'Porteur de lanterne', phrase: 'On vous laisse descendre un étage, pas deux.' },
  { id: 'sondeur', niveau: 6, nom: 'Sondeur', phrase: 'Vous comptez les absents à voix haute.' },
  { id: 'veilleur', niveau: 10, nom: 'Veilleur', phrase: 'La Chambre connaît votre écriture.' },
  { id: 'gardien', niveau: 15, nom: 'Gardien d’étage', phrase: 'Un palier tient parce que vous y restez.' },
  { id: 'horloger', niveau: 22, nom: 'Horloger', phrase: 'Vous entendez l’Astrolabe avant qu’il sonne.' },
  { id: 'souffleur', niveau: 30, nom: 'Souffleur de verre', phrase: 'Le sable devient barrage entre vos mains.' },
  { id: 'vigie', niveau: 40, nom: 'Vigie du beffroi', phrase: 'De là-haut, les neuf étages tiennent dans l’œil.' },
  { id: 'passeur', niveau: 50, nom: 'Passeur de la Liste', phrase: 'On signe près de vous, on ne signe plus sans vous.' },
  { id: 'astrolabe', niveau: 60, nom: 'Voix de l’Astrolabe', phrase: 'L’horloge du ciel vous répond.' },
]);

/**
 * L'emblème de la carte de profil : un glyphe, pas une image. Aucun asset à
 * charger, aucun asset à manquer — et le même glyphe sert d'icône à l'onglet
 * du menu, où la place est comptée.
 */
export const EMBLEMES = Object.freeze([
  { id: 'sablier', glyphe: '⌛', nom: 'Le Sablier' },
  { id: 'astre', glyphe: '✦', nom: 'L’Astrolabe' },
  { id: 'sonde', glyphe: '⚒', nom: 'La perche du sondeur' },
  { id: 'corbeau', glyphe: '☾', nom: 'Le corbeau des neiges' },
  { id: 'lanterne', glyphe: '❂', nom: 'La lanterne d’étage' },
  { id: 'registre', glyphe: '▤', nom: 'Le registre de la Liste' },
]);

/** Le barème, tel que l'écran l'affiche : une ligne par geste, jamais un secret. */
export const BAREME_XP = Object.freeze([
  { cle: 'etagePremiere', label: 'Premier déblayage d’un étage', motif: 'etage' },
  { cle: 'tourTerminee', label: 'Tour terminée (tous ses étages)', motif: 'tour' },
  { cle: 'duelLibre', label: 'Duel libre gagné', motif: 'duel-libre' },
  { cle: 'etageRejoue', label: 'Étage rejoué', motif: 'etage' },
  { cle: 'lecon', label: 'Leçon du guide terminée', motif: 'lecon' },
  { cle: 'queteReclamee', label: 'Quête du jour réclamée', motif: 'quete' },
  { cle: 'cachetDuCycle', label: 'Cachet du cycle', motif: 'cachet' },
  { cle: 'cachetDeLaSemaine', label: 'Cachet de la semaine', motif: 'semaine' },
  { cle: 'boosterOuvert', label: 'Paquet ouvert au Souk', motif: 'booster' },
  { cle: 'carteJouee', label: 'Carte posée sur la table', motif: 'carte' },
].map((ligne) => ({ ...ligne, xp: XP[ligne.cle] })));

/** Les compteurs que le profil tient lui-même (le reste se lit ailleurs). */
const CLES_STATS = Object.freeze([
  'duelsGagnes', 'etagesPremiers', 'etagesRejoues', 'toursTerminees',
  'cartesJouees', 'quetesReclamees', 'cachets', 'lecons',
]);

/** Entier positif ou nul, quelle que soit l'entrée (chaîne, `NaN`, négatif). */
function entierPositif(valeur) {
  const nombre = Math.floor(Number(valeur));
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

/** Un niveau du catalogue : entier, borné entre le départ et le plafond. */
function borneNiveau(valeur) {
  const nombre = Math.floor(Number(valeur));
  if (!Number.isFinite(nombre)) return COURBE.niveauDepart;
  return Math.min(COURBE.niveauMax, Math.max(COURBE.niveauDepart, nombre));
}

/** `2026-10-23T14:05:00.000Z`, ou l'horloge injectée par les tests. */
function maintenant(horloge = null) {
  if (typeof horloge === 'string' && horloge) return horloge;
  if (typeof horloge === 'function') return maintenant(horloge());
  if (horloge instanceof Date && !Number.isNaN(horloge.getTime())) return horloge.toISOString();
  if (typeof horloge === 'number' && Number.isFinite(horloge)) return new Date(horloge).toISOString();
  return new Date().toISOString();
}

// ── La courbe ───────────────────────────────────────────────────────────────
// Les seuils et leurs cumuls sont calculés UNE fois, au chargement : soixante
// paliers tiennent dans deux tableaux, et chaque lecture de barre est une
// recherche de tableau, pas une boucle.

/** `SEUILS[i]` : l'XP à gagner pour passer du niveau `i + 1` au niveau `i + 2`. */
const SEUILS = Object.freeze(Array.from({ length: COURBE.niveauMax }, (_, index) => (
  Math.max(1, Math.round(COURBE.base * Math.pow(index + 1, COURBE.exposant)))
)));

/** `CUMULS[i]` : l'XP total nécessaire pour **atteindre** le niveau `i + 1`. */
const CUMULS = Object.freeze(SEUILS.reduce((cumuls, seuil) => {
  cumuls.push((cumuls[cumuls.length - 1] ?? 0) + seuil);
  return cumuls;
}, [0]).slice(0, COURBE.niveauMax));

/**
 * L'XP à gagner pour passer de `niveau` à `niveau + 1`. Au plafond, il n'y a
 * plus de palier : le seuil rend `0`.
 */
export function seuilDuNiveau(niveau) {
  const n = borneNiveau(niveau);
  return n >= COURBE.niveauMax ? 0 : SEUILS[n - 1];
}

/** L'XP total nécessaire pour **atteindre** `niveau` (le niveau 1 coûte 0). */
export function xpTotalDuNiveau(niveau) {
  return CUMULS[borneNiveau(niveau) - 1];
}

/**
 * Le niveau que porte un XP total. La boucle s'arrête au plafond : l'XP
 * continue d'y compter (il se lit sur la carte), il ne monte plus de palier.
 */
export function niveauDeXp(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  let niveau = COURBE.niveauDepart;
  while (niveau < COURBE.niveauMax && total >= CUMULS[niveau]) niveau += 1;
  return niveau;
}

/**
 * La barre d'XP, prête pour l'écran :
 *
 *   - `niveau`     — le niveau atteint ;
 *   - `into`/`need`— l'XP gagné dans le palier en cours, et ce qu'il demande ;
 *   - `reste`     — ce qui manque avant le niveau suivant (`0` au plafond) ;
 *   - `percent`   — de 0 à 100, arrondi à l'entier : c'est la largeur du
 *     remplissage, et l'écran n'a pas d'arithmétique à refaire ;
 *   - `suivant`   — le niveau d'après, ou `null` au plafond ;
 *   - `maximal`   — vrai au plafond, quand la barre ne promet plus rien.
 */
export function progressionDeXp(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  const niveau = niveauDeXp(total);
  if (niveau >= COURBE.niveauMax) {
    return {
      niveau, xp: total, into: 0, need: 0, reste: 0, percent: 100,
      suivant: null, maximal: true, palier: xpTotalDuNiveau(niveau),
    };
  }
  const palier = xpTotalDuNiveau(niveau);
  const need = seuilDuNiveau(niveau);
  const into = Math.max(0, Math.min(need, total - palier));
  return {
    niveau,
    xp: total,
    into,
    need,
    reste: Math.max(0, need - into),
    percent: need ? Math.min(100, Math.max(0, Math.round((into / need) * 100))) : 0,
    suivant: niveau + 1,
    maximal: false,
    palier,
  };
}

/** La barre du profil — `progressionDeXp(profil.xp)`, sans autre lecture. */
export function progressionDuProfil(profil) {
  return progressionDeXp(normaliserProfil(profil).xp);
}

/**
 * Les paliers à venir, du plus proche au plus lointain : c'est la courbe qui se
 * **lit** — l'écran montre que chaque niveau coûte plus cher que le précédent.
 */
export function paliersAVenir(profil, { nombre = 4 } = {}) {
  const barre = progressionDuProfil(profil);
  const compte = Math.max(0, Math.min(12, Math.floor(Number(nombre) || 0)));
  const paliers = [];
  for (let niveau = barre.niveau; niveau < COURBE.niveauMax && paliers.length < compte; niveau += 1) {
    paliers.push({ niveau, seuil: seuilDuNiveau(niveau), total: xpTotalDuNiveau(niveau + 1) });
  }
  return paliers;
}

/** Le rang d'un niveau, et le suivant (`null` au dernier rang). */
export function rangDeNiveau(niveau) {
  const n = borneNiveau(niveau);
  let rang = RANGS[0];
  let prochain = null;
  for (let index = 0; index < RANGS.length; index += 1) {
    if (RANGS[index].niveau <= n) rang = RANGS[index];
    else { prochain = RANGS[index]; break; }
  }
  return { rang, prochain };
}

/** Le libellé d'un motif de palier — une phrase, jamais un identifiant. */
export function motifLisible(motif) {
  return LIBELLES_MOTIF[motif] ?? LIBELLES_MOTIF.autre;
}

// ── L'état ──────────────────────────────────────────────────────────────────

/** Le profil d'un joueur neuf : niveau 1, 0 XP, aucun palier franchi. */
export function profilVide() {
  return {
    version: 1,
    pseudo: null,
    embleme: EMBLEMES[0].id,
    // Pas de visage choisi, pas de table imposée : le médaillon porte le glyphe
    // de l'emblème et la moitié du joueur prend le terrain de son deck.
    avatar: null,
    plateau: null,
    xp: 0,
    boostersOfferts: 0,
    stats: Object.fromEntries(CLES_STATS.map((cle) => [cle, 0])),
    paliers: [],
    majLe: null,
  };
}

/** Un motif connu, ou `'autre'` — le journal ne garde jamais un mot vide. */
function normaliserMotif(motif) {
  return MOTIFS.includes(motif) ? motif : 'autre';
}

/**
 * Le journal des paliers : `{ niveau, le, motif }`, un seul par niveau (le
 * premier appareil qui l'a franchi garde son horodatage), le plus haut en tête,
 * borné à `COURBE.paliersJournal`.
 */
function normaliserPaliers(value) {
  const brut = Array.isArray(value) ? value : [];
  const parNiveau = new Map();
  for (const entree of brut) {
    if (!entree || typeof entree !== 'object') continue;
    const niveau = borneNiveau(entree.niveau);
    if (niveau <= COURBE.niveauDepart) continue;
    if (typeof entree.le !== 'string' || !entree.le) continue;
    const deja = parNiveau.get(niveau);
    // Deux appareils racontent le même palier : le premier horodatage l'emporte,
    // c'est lui qui dit quand le joueur a vraiment monté ce niveau.
    if (!deja || entree.le < deja.le) {
      parNiveau.set(niveau, { niveau, le: entree.le, motif: normaliserMotif(entree.motif) });
    }
  }
  return [...parNiveau.values()]
    .sort((a, b) => b.niveau - a.niveau || (a.le < b.le ? -1 : 1))
    .slice(0, COURBE.paliersJournal);
}

/** Un pseudo propre : texte court, sans retour à la ligne, ou `null`. */
export function normaliserPseudo(value) {
  if (typeof value !== 'string') return null;
  // Les espaces de contrôle et les sauts de ligne n'ont rien à faire sur un
  // onglet de menu ; le reste est du texte libre, la ville a tous les accents.
  const propre = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!propre) return null;
  return propre.slice(0, COURBE.pseudoMax);
}

/** Un emblème du catalogue, ou l'emblème de départ. */
function normaliserEmbleme(value) {
  return EMBLEMES.some((embleme) => embleme.id === value) ? value : EMBLEMES[0].id;
}

/**
 * Un choix d'avatar ou de plateau : un identifiant court, ou `null` pour « je
 * n'ai pas choisi ». **Aucun catalogue n'est consulté ici** — voir l'en-tête :
 * une chaîne propre suffit, et l'écran comme la table valident de leur côté.
 */
function normaliserChoix(value) {
  if (typeof value !== 'string') return null;
  const propre = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!propre) return null;
  return propre.slice(0, COURBE.choixMax);
}

/** Les compteurs, clé par clé : un entier positif ou nul, jamais `NaN`. */
function normaliserStats(value) {
  const brut = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(CLES_STATS.map((cle) => [cle, entierPositif(brut[cle])]));
}

/**
 * Réduit n'importe quelle valeur à un profil valable. Une valeur illisible rend
 * un profil neuf — jamais `null`, jamais une exception. Le niveau **n'est pas
 * un champ** : il se déduit de l'XP, donc aucune sauvegarde ne peut mentir sur
 * son propre palier.
 */
export function normaliserProfil(value) {
  const brut = value && typeof value === 'object' ? value : {};
  return {
    version: 1,
    pseudo: normaliserPseudo(brut.pseudo),
    embleme: normaliserEmbleme(brut.embleme),
    avatar: normaliserChoix(brut.avatar),
    plateau: normaliserChoix(brut.plateau),
    xp: entierPositif(brut.xp),
    boostersOfferts: entierPositif(brut.boostersOfferts),
    stats: normaliserStats(brut.stats),
    paliers: normaliserPaliers(brut.paliers),
    majLe: typeof brut.majLe === 'string' ? brut.majLe : null,
  };
}

/**
 * Combien de paquets le jeu doit encore au joueur. La dette se **calcule** :
 * un palier franchi = un booster, moins ceux déjà ouverts. Jamais négative —
 * un compteur d'ouvertures en avance (fusion, sauvegarde retouchée) ne rend pas
 * de paquets au comptoir.
 */
export function boostersDus(profil) {
  const base = normaliserProfil(profil);
  const franchis = niveauDeXp(base.xp) - COURBE.niveauDepart;
  return Math.max(0, franchis - base.boostersOfferts);
}

/**
 * Verse de l'XP. Rend `{ profil, xpGagne, niveauxGagnes, niveau, niveauAvant,
 * dus }` — `dus` est la dette de paquets **après** le versement : c'est elle que
 * le hook regarde pour savoir s'il doit ouvrir un booster.
 *
 * Au plafond, l'XP continue de compter mais plus aucun palier ne sonne : la
 * barre dit « niveau maximal » et la dette reste à ce qu'elle est.
 *
 * `stats` additionne les compteurs du même geste (`{ cartesJouees: 1 }`) : un
 * seul appel écrit l'XP et ce qu'il raconte, pour qu'aucun écran ne voie une
 * barre bouger sans ses statistiques.
 */
export function gagnerXp(profil, montant, { motif = 'autre', stats = null, horloge = null } = {}) {
  const gain = entierPositif(montant);
  const compteurs = stats && typeof stats === 'object' ? normaliserStats(stats) : null;
  // Un geste qui ne verse ni XP ni compteur rend le profil **d'origine**, pas sa
  // copie normalisée : l'appelant compare les références pour savoir si quelque
  // chose a bougé, comme dans le reste de l'économie du jeu.
  if (!gain && !(compteurs && CLES_STATS.some((cle) => compteurs[cle] > 0))) {
    const niveau = niveauDeXp(profil?.xp);
    return { profil, xpGagne: 0, niveauxGagnes: 0, niveau, niveauAvant: niveau, dus: boostersDus(profil) };
  }

  const base = normaliserProfil(profil);
  const compter = (courant) => (compteurs
    ? Object.fromEntries(CLES_STATS.map((cle) => [cle, courant[cle] + (compteurs[cle] ?? 0)]))
    : courant);

  const niveauAvant = niveauDeXp(base.xp);
  const xp = base.xp + gain;
  const niveau = niveauDeXp(xp);
  const niveauxGagnes = Math.max(0, niveau - niveauAvant);
  const le = maintenant(horloge);

  let paliers = base.paliers;
  if (niveauxGagnes) {
    // Chaque palier franchi entre au journal, du plus haut au plus bas : le
    // joueur relit sa montée dans l'ordre où elle s'est produite.
    const nouveaux = [];
    for (let n = niveau; n > niveauAvant; n -= 1) {
      nouveaux.push({ niveau: n, le, motif: normaliserMotif(motif) });
    }
    paliers = normaliserPaliers([...nouveaux, ...base.paliers]);
  }

  const suivant = {
    ...base,
    xp,
    stats: compter(base.stats),
    paliers,
    majLe: le,
  };
  return { profil: suivant, xpGagne: gain, niveauxGagnes, niveau, niveauAvant, dus: boostersDus(suivant) };
}

/**
 * Un paquet de palier vient d'être ouvert : la dette baisse d'un cran. Le
 * compteur est monotone — c'est lui, et lui seul, qui dit ce qui a déjà été
 * offert, sur tous les appareils. Rien à offrir : le profil est rendu tel quel.
 */
export function marquerBoosterOffert(profil, { horloge = null } = {}) {
  if (boostersDus(profil) <= 0) return profil ?? profilVide();
  const base = normaliserProfil(profil);
  return {
    ...base,
    boostersOfferts: base.boostersOfferts + 1,
    majLe: maintenant(horloge),
  };
}

/** Le pseudo retenu : celui du profil, sinon le nom du compte, sinon la ville. */
export function pseudoLisible(profil, nomDeCompte = null) {
  const base = normaliserProfil(profil);
  return base.pseudo ?? normaliserPseudo(nomDeCompte) ?? 'Gardien de Bab El';
}

/**
 * Renomme le profil. Un pseudo vide — ou déjà porté — rend le profil
 * **d'origine** : l'appelant compare les références pour savoir s'il y a quelque
 * chose à écrire, comme partout dans l'économie du jeu.
 */
export function renommerProfil(profil, pseudo, { horloge = null } = {}) {
  const propre = normaliserPseudo(pseudo);
  // Un champ vide n'efface pas le nom : la carte retomberait sur celui du
  // compte, et le joueur perdrait ce qu'il a choisi. Rien de saisi, rien
  // d'écrit — le profil d'origine est rendu tel quel.
  if (!propre || propre === normaliserPseudo(profil?.pseudo)) return profil ?? profilVide();
  return { ...normaliserProfil(profil), pseudo: propre, majLe: maintenant(horloge) };
}

/**
 * Change l'emblème de la carte. Un emblème inconnu — ou déjà porté — ne change
 * rien et rend le profil d'origine.
 */
export function choisirEmbleme(profil, emblemeId, { horloge = null } = {}) {
  const connu = EMBLEMES.some((embleme) => embleme.id === emblemeId);
  if (!connu || normaliserProfil(profil).embleme === emblemeId) return profil ?? profilVide();
  return { ...normaliserProfil(profil), embleme: emblemeId, majLe: maintenant(horloge) };
}

/**
 * Choisit le visage de la carte. `null` (ou une chaîne vide) **retire** le
 * choix : le médaillon retombe sur le glyphe de l'emblème. Un identifiant
 * inconnu ne change rien et rend le profil d'origine — l'appelant compare les
 * références, comme partout dans l'économie du jeu.
 */
export function choisirAvatar(profil, avatarId, { horloge = null } = {}) {
  const voulu = normaliserChoix(avatarId);
  if (normaliserProfil(profil).avatar === voulu) return profil ?? profilVide();
  return { ...normaliserProfil(profil), avatar: voulu, majLe: maintenant(horloge) };
}

/**
 * Choisit le terrain sur lequel le joueur reçoit — sa moitié de table, en duel
 * libre comme en Histoire. `null` rend la main au deck (`plateauDeDeck`), et
 * c'est l'état d'un joueur neuf. L'identifiant est validé par la table, pas
 * ici : un plateau retiré du catalogue retombe sur le terrain du deck.
 */
export function choisirPlateau(profil, plateauId, { horloge = null } = {}) {
  const voulu = normaliserChoix(plateauId);
  if (normaliserProfil(profil).plateau === voulu) return profil ?? profilVide();
  return { ...normaliserProfil(profil), plateau: voulu, majLe: maintenant(horloge) };
}

/** Le glyphe de l'emblème choisi — l'onglet du menu et la carte le lisent. */
export function glypheEmbleme(profil) {
  const base = normaliserProfil(profil);
  return (EMBLEMES.find((embleme) => embleme.id === base.embleme) ?? EMBLEMES[0]).glyphe;
}

/**
 * Fusion de l'appareil et du compte : l'XP, les compteurs et les paquets
 * offerts au **maximum**, le journal en union, le pseudo, l'emblème, l'avatar et
 * le plateau du côté le plus récent — sans jamais effacer un choix qui n'existe
 * que d'un côté.
 * `modifie` dit si le compte apportait quelque chose à l'appareil.
 */
export function fusionnerProfils(local, distant) {
  const ici = normaliserProfil(local);
  const la = normaliserProfil(distant);
  const recent = (la.majLe ?? '') > (ici.majLe ?? '') ? la : ici;
  const fusion = {
    version: 1,
    pseudo: recent.pseudo ?? ici.pseudo ?? la.pseudo,
    embleme: recent.embleme,
    // Un visage ou une table choisi d'un seul côté ne se perd pas : le côté le
    // plus récent parle, et s'il n'a rien choisi, l'autre garde son choix.
    avatar: recent.avatar ?? ici.avatar ?? la.avatar,
    plateau: recent.plateau ?? ici.plateau ?? la.plateau,
    xp: Math.max(ici.xp, la.xp),
    boostersOfferts: Math.max(ici.boostersOfferts, la.boostersOfferts),
    stats: Object.fromEntries(CLES_STATS.map((cle) => [cle, Math.max(ici.stats[cle], la.stats[cle])])),
    paliers: normaliserPaliers([...ici.paliers, ...la.paliers]),
    majLe: (ici.majLe ?? '') >= (la.majLe ?? '') ? ici.majLe : la.majLe,
  };
  const modifie = JSON.stringify(fusion) !== JSON.stringify(ici);
  return { profil: fusion, modifie };
}

/** Le profil de l'appareil (neuf si le stockage manque ou ment). */
export function chargerProfil() {
  const stockage = stockageProgression();
  if (!stockage) return profilVide();
  try {
    return normaliserProfil(JSON.parse(lireProgression(RPG_PROFIL_STORAGE_KEY, stockage) ?? 'null'));
  } catch {
    return profilVide();
  }
}

/** Écrit le profil de l'appareil. Rend `true` si l'écriture a eu lieu. */
export function sauverProfil(profil) {
  const stockage = stockageProgression();
  if (!stockage) return false;
  return ecrireProgression(
    RPG_PROFIL_STORAGE_KEY,
    JSON.stringify(normaliserProfil(profil)),
    stockage,
  );
}
