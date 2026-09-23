/**
 * Moteur des succès — logique pure, sans React ni DOM.
 * ----------------------------------------------------
 * Le moteur ne connaît que deux choses :
 *
 *   1. `reduce(state, action)` — une action faite sur le site (lire un
 *      article, lancer une vidéo, commenter, changer de langue…) met à jour
 *      l'état du joueur, puis débloque les succès devenus vrais ;
 *   2. `METRICS` — la table à compléter pour exposer une nouvelle action :
 *      chaque métrique transforme l'état en un nombre, que les succès du
 *      catalogue (`src/achievements/catalog.js`) comparent à leur `target`.
 *
 * Ajouter un succès pour une action déjà suivie = une entrée dans le
 * catalogue. Ajouter une *nouvelle* action = un cas dans `reduce()` + une
 * métrique ici, puis autant de succès qu'on veut.
 *
 * Tout est sans effet de bord (l'état est recopié, jamais muté) et vérifié
 * hors navigateur par `npm run check:achievements`.
 */
import { ACHIEVEMENTS } from './catalog.js';
import { bestDayRun } from '../quizzes/engine.js';

export const STATE_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Dates : la journée est celle du visiteur (fuseau local)             */
/* ------------------------------------------------------------------ */

/** Clé de jour locale « AAAA-MM-JJ » (le streak suit le calendrier du joueur). */
export function dayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Heure locale d'un horodatage (null si illisible). */
function hourOf(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours();
}

/** Le jour `day` suit-il immédiatement `previous` ? */
function isNextDay(previous, day) {
  if (!previous || !day) return false;
  const before = Date.parse(`${previous}T00:00:00Z`);
  const after = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(before) || Number.isNaN(after)) return false;
  return after - before === 86400000;
}

/* ------------------------------------------------------------------ */
/* État du joueur                                                      */
/* ------------------------------------------------------------------ */

export function createState(now = new Date()) {
  const stamp = now instanceof Date ? now.toISOString() : String(now);
  return {
    version: STATE_VERSION,
    createdAt: stamp,
    updatedAt: stamp,
    // Compteurs cumulés (chaque action compte).
    counters: {},
    // Ensembles de choses distinctes (un article déjà lu ne compte qu'une fois).
    sets: {},
    // Faits ponctuels (ex. avoir lu après minuit).
    flags: {},
    // Jours de visite, du plus ancien au plus récent.
    days: [],
    lastVisitDay: null,
    streak: 0,
    bestStreak: 0,
    // Succès débloqués : id → horodatage ISO.
    unlocked: {},
  };
}

/** État valide, même si le stockage local a été vidé ou partiellement écrit. */
export function normalizeState(raw, now = new Date()) {
  const base = createState(now);
  if (!raw || typeof raw !== 'object') return base;
  const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
  const asArray = (value) => (Array.isArray(value) ? value : []);
  const asNumber = (value) => (Number.isFinite(value) ? value : 0);

  const counters = {};
  for (const [key, value] of Object.entries(asObject(raw.counters))) counters[key] = asNumber(value);

  const sets = {};
  for (const [key, value] of Object.entries(asObject(raw.sets))) {
    sets[key] = [...new Set(asArray(value).filter((entry) => typeof entry === 'string' && entry))];
  }

  const unlocked = {};
  for (const [key, value] of Object.entries(asObject(raw.unlocked))) {
    if (typeof key === 'string' && key) unlocked[key] = typeof value === 'string' ? value : base.createdAt;
  }

  return {
    version: STATE_VERSION,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    counters,
    sets,
    flags: { ...asObject(raw.flags) },
    days: [...new Set(asArray(raw.days).filter((day) => typeof day === 'string' && day))].sort(),
    lastVisitDay: typeof raw.lastVisitDay === 'string' ? raw.lastVisitDay : null,
    streak: asNumber(raw.streak),
    bestStreak: asNumber(raw.bestStreak),
    unlocked,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

// Clé d'ensemble par famille d'article (les métriques lisent ces clés).
const ARTICLE_SET_KEYS = { news: 'news_read', review: 'reviews_read', dossier: 'dossiers_read' };

const counter = (state, key, amount = 1) => ({
  ...state,
  counters: { ...state.counters, [key]: (state.counters[key] || 0) + amount },
});

const addToSet = (state, key, value) => {
  if (typeof value !== 'string' || !value) return state;
  const current = state.sets[key] || [];
  if (current.includes(value)) return state;
  return { ...state, sets: { ...state.sets, [key]: [...current, value].sort() } };
};

/**
 * Applique une action à l'état et renvoie `{ state, unlocked }` : `unlocked`
 * liste les succès débloqués *par cette action*, dans l'ordre du catalogue
 * (c'est ce que l'interface annonce au joueur).
 *
 * Toutes les actions : `{ type, ...payload, at }`, `at` étant l'horodatage ISO.
 * Une action inconnue est ignorée (l'état reste valide), ce qui permet à une
 * page de suivre une action avant même qu'un succès ne l'exploite.
 */
export function reduce(state, action = {}) {
  const current = normalizeState(state);
  const at = typeof action.at === 'string' ? action.at : new Date().toISOString();
  let next = current;

  switch (action.type) {
    // Une page ouverte (toutes confondues).
    case 'page_view':
      next = counter(current, 'pages_viewed');
      break;

    // Une visite datée : c'est ce qui alimente les succès de fidélité.
    case 'visit': {
      const day = dayKey(action.day || at);
      if (!day) break;
      next = { ...current };
      if (!next.days.includes(day)) next.days = [...next.days, day].sort();
      if (next.lastVisitDay !== day) {
        next.streak = isNextDay(next.lastVisitDay, day) ? next.streak + 1 : 1;
        next.bestStreak = Math.max(next.bestStreak, next.streak);
        next.lastVisitDay = day;
      }
      break;
    }

    // Lecture d'un article : le sujet précis (actu / test / dossier) est
    // mémorisé pour ne compter qu'une fois par contenu. Les lectures nocturnes
    // (0 h – 5 h) et matinales (5 h – 8 h) sont aussi repérées : ce sont les
    // gestes les plus rares, ils alimentent les succès or et platine.
    case 'article_read': {
      const kind = action.kind === 'review' || action.kind === 'dossier' ? action.kind : 'news';
      next = addToSet(addToSet(current, 'articles_read', action.id), ARTICLE_SET_KEYS[kind], action.id);
      const hour = hourOf(at);
      if (hour !== null && hour < 5) {
        next = { ...next, flags: { ...next.flags, night_reading: true } };
        // La nuit précise est retenue : « 3 nuits différentes » ne peut pas
        // être trompé par trois lectures la même nuit.
        next = addToSet(next, 'nights_read', dayKey(at));
      } else if (hour !== null && hour < 8) {
        next = { ...next, flags: { ...next.flags, early_reading: true } };
      }
      break;
    }

    case 'section_visited':
      next = addToSet(current, 'sections_visited', action.id);
      break;

    case 'video_played':
      next = addToSet(current, 'videos_watched', action.id);
      break;

    case 'language_used':
      next = addToSet(current, 'languages_used', action.code);
      break;

    case 'provider_linked':
      next = addToSet(current, 'providers_linked', action.provider);
      break;

    case 'comment_posted':
      next = counter(current, 'comments_posted');
      break;

    // Une recherche compte, et la requête est gardée pour distinguer
    // « chercher une fois » de « chercher cinq choses différentes ».
    case 'search_performed':
      next = addToSet(counter(current, 'search_performed'), 'searches', action.query);
      break;

    // Partie de quizz terminée : compteur global + runs (quizz×difficulté)
    // distincts, sans-faute par quizz, et jour crédité pour la série du
    // « quizz du jour ».
    // Règle anti-farm : un quizz ne rapporte qu'à sa PREMIÈRE complétion
    // À CHAQUE DIFFICULTÉ — un run est identifié par `slug:difficulté`.
    // Rejoué à la même difficulté, il ne fait plus avancer aucun succès
    // (ni compteur, ni sans-faute) — donc plus aucun XP ni aucun point.
    // Une autre difficulté du même quizz, elle, rapporte à nouveau (de
    // vraies questions différentes, des points multipliés). Seule exception
    // au blocage : le jour de quizz du jour reste crédité, sinon la
    // rotation (un quizz déjà fait tous les huit jours) casserait
    // mécaniquement la série « Semaine parfaite ».
    case 'quiz_completed': {
      if (quizAlreadyCompleted(current, action.id, action.difficulty)) {
        if (action.daily) next = addToSet(current, 'quiz_days', dayKey(at));
        break;
      }
      next = addToSet(counter(current, 'quizzes_completed'), 'quizzes_played', quizRunKey(action.id, action.difficulty));
      if (action.perfect) next = addToSet(next, 'perfect_quizzes', action.id);
      if (action.daily) next = addToSet(next, 'quiz_days', dayKey(at));
      break;
    }

    // Défi envoyé à un ami depuis l'écran de résultat d'un quizz.
    case 'quiz_challenge':
      next = counter(current, 'challenges_sent');
      break;

    case 'account_created':
      next = counter(current, 'account_created');
      break;

    case 'signed_in':
      next = counter(current, 'signed_in');
      break;

    case 'profile_updated':
      next = counter(current, 'profile_updated');
      break;

    default:
      break;
  }

  return award({ ...next, updatedAt: at }, at);
}

/**
 * Clé d'un run noté : `slug:difficulté` (un slug nu quand l'action n'en
 * porte pas — ancien format). C'est la clé de l'ensemble `quizzes_played`,
 * celle du record de l'appareil et de la tentative serveur (`quiz_id`).
 */
export function quizRunKey(quizId, difficulty) {
  return quizId && difficulty ? `${quizId}:${difficulty}` : quizId;
}

/**
 * Ce quizz a-t-il déjà été terminé par le joueur, À CETTE DIFFICULTÉ ?
 * Si oui, le rejouer ne rapporte plus d'XP ni de points (voir
 * `quiz_completed` dans `reduce`). L'ensemble `quizzes_played` n'est
 * alimenté qu'à la fin d'une partie : c'est bien « terminé », pas
 * « commencé ». Un quizz terminé dans l'ancien format (au slug nu, sans
 * difficulté) est considéré comme terminé à TOUTES les difficultés — la
 * migration ne redonne pas de points aux vieux comptes.
 */
export function quizAlreadyCompleted(state, quizId, difficulty = null) {
  if (!quizId) return false;
  const played = state?.sets?.quizzes_played || [];
  return played.includes(quizId) || (difficulty ? played.includes(quizRunKey(quizId, difficulty)) : false);
}

/**
 * Ce quizz a-t-il déjà été terminé par le joueur, À TOUTE DIFFICULTÉ ?
 * (Pour l'affichage « complet » d'un quizz, pas pour le blocage des points.)
 */
export function quizCompletedAnyDifficulty(state, quizId) {
  if (!quizId) return false;
  return (state?.sets?.quizzes_played || []).some((key) => String(key).split(':')[0] === quizId);
}

/** Débloque les succès satisfaits, sans action — utilisé au chargement. */
export function evaluate(state, at = new Date().toISOString()) {
  return award(normalizeState(state), at);
}

/* ------------------------------------------------------------------ */
/* Métriques : état → nombre comparé à la cible d'un succès            */
/* ------------------------------------------------------------------ */

const setSize = (state, key) => (state.sets[key] || []).length;
const counterValue = (state, key) => state.counters[key] || 0;

export const METRICS = {
  /** Pages ouvertes (toutes confondues). */
  pagesVisited: (state) => counterValue(state, 'pages_viewed'),
  /** Articles lus, sans doublon. */
  articlesRead: (state) => setSize(state, 'articles_read'),
  newsRead: (state) => setSize(state, 'news_read'),
  reviewsRead: (state) => setSize(state, 'reviews_read'),
  dossiersRead: (state) => setSize(state, 'dossiers_read'),
  /** Sections distinctes visitées (accueil, actus, tests, dossiers, events, calendrier…). */
  sectionsVisited: (state) => setSize(state, 'sections_visited'),
  /** Le hub du profil joueur a-t-il été ouvert ? */
  profileOpened: (state) => ((state.sets.sections_visited || []).includes('account') ? 1 : 0),
  /** Vidéos lancées, sans doublon. */
  videosWatched: (state) => setSize(state, 'videos_watched'),
  /** Le lecteur du direct de la chaîne a-t-il été lancé ? */
  liveWatched: (state) => ((state.sets.videos_watched || []).includes('live_stream') ? 1 : 0),
  commentsPosted: (state) => counterValue(state, 'comments_posted'),
  searchesPerformed: (state) => counterValue(state, 'search_performed'),
  distinctSearches: (state) => setSize(state, 'searches'),
  /** Langues dans lesquelles le joueur a navigué. */
  languagesUsed: (state) => setSize(state, 'languages_used'),
  /** Comptes tiers associés (Google, Microsoft). */
  providersLinked: (state) => setSize(state, 'providers_linked'),
  profileUpdates: (state) => counterValue(state, 'profile_updated'),
  accountsCreated: (state) => counterValue(state, 'account_created'),
  sessions: (state) => counterValue(state, 'signed_in'),
  /** Jours de visite différents (pas forcément consécutifs). */
  visitDays: (state) => (state.days || []).length,
  /** Meilleure série de jours consécutifs. */
  bestStreak: (state) => state.bestStreak || 0,
  /** Lecture entre minuit et 5 h. */
  nightReading: (state) => (state.flags?.night_reading ? 1 : 0),
  /** Lecture tôt le matin, entre 5 h et 8 h. */
  earlyReading: (state) => (state.flags?.early_reading ? 1 : 0),
  /** Nuits différentes (0 h – 5 h) avec au moins une lecture : la métrique
      des succès platine — trois nuits, pas trois lectures la même nuit. */
  nightReadingDays: (state) => setSize(state, 'nights_read'),
  /** Au moins une actu, un test et un dossier lus : les trois familles
      éditoriales du site, toutes touchées. */
  readAllKinds: (state) =>
    setSize(state, 'news_read') > 0 && setSize(state, 'reviews_read') > 0 && setSize(state, 'dossiers_read') > 0 ? 1 : 0,
  /** Parties de quizz terminées (toutes confondues — chaque
      quizz×difficulté complète compte une partie). */
  quizzesCompleted: (state) => counterValue(state, 'quizzes_completed'),
  /** Quizz DISTINCTS joués (à quelle que ce soit difficulté) : les clés
      `slug:difficulté` sont ramenées à leur slug avant dédoublonnage, pour
      que « Tour complet » reste un succès par quizz, pas par palier. */
  distinctQuizzes: (state) => new Set((state.sets.quizzes_played || []).map((key) => String(key).split(':')[0])).size,
  /** Quizz distincts terminés sans faute. */
  perfectQuizzes: (state) => setSize(state, 'perfect_quizzes'),
  /** Jours différents avec le quizz du jour terminé. */
  dailyQuizDays: (state) => setSize(state, 'quiz_days'),
  /** Meilleure série de jours consécutifs de quizz du jour. */
  dailyQuizStreak: (state) => bestDayRun(state.sets.quiz_days || []),
  /** Défis envoyés à des amis depuis les écrans de résultat. */
  challengesSent: (state) => counterValue(state, 'challenges_sent'),
};

/** Valeur d'une métrique (0 si la métrique n'existe pas — jamais d'exception). */
export function metricValue(state, metric) {
  const reader = METRICS[metric];
  return reader ? reader(state) : 0;
}

/* ------------------------------------------------------------------ */
/* Attribution des succès                                              */
/* ------------------------------------------------------------------ */

/**
 * Débloque les succès dont la métrique atteint la cible et renvoie
 * `{ state, unlocked }`. Les succès nouvellement obtenus sont annoncés dans
 * l'ordre du catalogue.
 */
export function award(state, at = new Date().toISOString()) {
  const unlocked = { ...state.unlocked };
  const justUnlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (unlocked[achievement.id]) continue;
    if (metricValue(state, achievement.metric) >= achievement.target) {
      unlocked[achievement.id] = at;
      justUnlocked.push(achievement.id);
    }
  }
  if (justUnlocked.length === 0) return { state, unlocked: [] };
  return { state: { ...state, unlocked }, unlocked: justUnlocked };
}

/* ------------------------------------------------------------------ */
/* Niveau / XP                                                         */
/* ------------------------------------------------------------------ */

export const XP_PER_LEVEL_STEP = 150;

/** XP à gagner pour passer du niveau `level` au suivant (paliers croissants). */
export function xpForNextLevel(level) {
  return XP_PER_LEVEL_STEP * Math.max(1, level);
}

/** Palier de niveau à partir de l'XP total des succès débloqués. */
export function levelFromXp(totalXp = 0) {
  let level = 1;
  let inLevel = Math.max(0, Math.round(totalXp));
  let need = xpForNextLevel(level);
  while (inLevel >= need) {
    inLevel -= need;
    level += 1;
    need = xpForNextLevel(level);
  }
  return {
    level,
    xpInLevel: inLevel,
    xpForNextLevel: need,
    percent: need > 0 ? Math.min(100, Math.round((inLevel / need) * 100)) : 0,
  };
}

/** XP total d'un état = somme des succès débloqués. */
export function totalXp(state, entries = ACHIEVEMENTS) {
  const unlocked = normalizeState(state).unlocked;
  return entries.reduce((sum, achievement) => (unlocked[achievement.id] ? sum + (achievement.xp || 0) : sum), 0);
}

/**
 * Palier de niveau franchi entre deux états, ou null si le joueur n'a pas
 * changé de niveau. C'est ce que la fenêtre de déblocage affiche quand le ou
 * les succès qui viennent de tomber font monter d'un niveau.
 */
export function levelUpBetween(previous, next) {
  const before = levelFromXp(totalXp(previous)).level;
  const after = levelFromXp(totalXp(next)).level;
  return after > before ? { from: before, to: after } : null;
}

/* ------------------------------------------------------------------ */
/* Lecture pour l'interface                                            */
/* ------------------------------------------------------------------ */

/** Progression d'un succès : `{ unlocked, unlockedAt, current, target, percent, remaining }`. */
export function achievementProgress(state, achievement) {
  const current = metricValue(state, achievement.metric);
  const target = Math.max(1, achievement.target || 1);
  return {
    unlocked: Boolean(state.unlocked?.[achievement.id]),
    unlockedAt: state.unlocked?.[achievement.id] || null,
    current,
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
    remaining: Math.max(0, target - current),
  };
}

/** Vue complète : chaque succès avec sa progression, plus les compteurs globaux. */
export function summarize(state, entries = ACHIEVEMENTS) {
  const items = entries.map((achievement) => ({
    ...achievement,
    ...achievementProgress(state, achievement),
  }));
  const xp = items.reduce((sum, item) => (item.unlocked ? sum + (item.xp || 0) : sum), 0);
  const unlockedIds = items.filter((item) => item.unlocked).map((item) => item.id);
  return {
    items,
    xp,
    level: levelFromXp(xp),
    unlockedCount: unlockedIds.length,
    totalCount: items.length,
    unlockedIds,
    completed: items.length > 0 && unlockedIds.length === items.length,
    percent: items.length > 0 ? Math.round((unlockedIds.length / items.length) * 100) : 0,
    // Prochain succès le plus accessible : le plus proche du but, hors débloqués.
    next: items
      .filter((item) => !item.unlocked)
      .sort((a, b) => b.percent - a.percent || a.target - b.target)[0] || null,
  };
}

/* ------------------------------------------------------------------ */
/* Fusion (appareil ↔ compte connecté)                                 */
/* ------------------------------------------------------------------ */

/**
 * Fusionne deux états sans jamais perdre de progression : compteurs au
 * maximum, ensembles en union, meilleure série conservée, succès débloqués
 * datés au plus tôt. C'est ce qui permet de jouer sans compte puis de se
 * connecter (ou l'inverse) sans rien reperdre.
 */
export function mergeStates(a, b) {
  const left = normalizeState(a);
  const right = normalizeState(b);

  const counters = { ...left.counters };
  for (const [key, value] of Object.entries(right.counters)) {
    counters[key] = Math.max(counters[key] || 0, value);
  }

  const setKeys = new Set([...Object.keys(left.sets), ...Object.keys(right.sets)]);
  const sets = {};
  for (const key of setKeys) sets[key] = [...new Set([...(left.sets[key] || []), ...(right.sets[key] || [])])].sort();

  const unlocked = { ...left.unlocked };
  for (const [id, at] of Object.entries(right.unlocked)) {
    if (!unlocked[id] || (at && at < unlocked[id])) unlocked[id] = at;
  }

  const days = [...new Set([...left.days, ...right.days])].sort();
  const lastVisitDay = [left.lastVisitDay, right.lastVisitDay].filter(Boolean).sort().pop() || null;

  return normalizeState({
    version: STATE_VERSION,
    createdAt: left.createdAt < right.createdAt ? left.createdAt : right.createdAt,
    updatedAt: left.updatedAt > right.updatedAt ? left.updatedAt : right.updatedAt,
    counters,
    sets,
    flags: { ...left.flags, ...right.flags },
    days,
    lastVisitDay,
    streak: Math.max(left.streak, right.streak),
    bestStreak: Math.max(left.bestStreak, right.bestStreak),
    unlocked,
  });
}

/** Deux états portent-ils la même progression ? (évite une écriture inutile) */
export function statesMatch(a, b) {
  const left = normalizeState(a);
  const right = normalizeState(b);
  return JSON.stringify(left.counters) === JSON.stringify(right.counters)
    && JSON.stringify(left.sets) === JSON.stringify(right.sets)
    && JSON.stringify(left.days) === JSON.stringify(right.days)
    && JSON.stringify(left.unlocked) === JSON.stringify(right.unlocked);
}
