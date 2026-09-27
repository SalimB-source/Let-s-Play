/**
 * Moteur des quizz — logique pure, sans React ni backend.
 * --------------------------------------------------------
 * Comme `src/achievements/engine.js`, tout est testable hors navigateur :
 * mélange déterministe (quizz du jour identique pour tout le monde),
 * barème, paliers de résultat et série de jours.
 *
 *   - `dailyQuizFor(date, quizzes)` : le quizz mis en avant ce jour-là
 *     (rotation par journée locale, comme les succès de fidélité) ;
 *   - `prepareQuiz(quiz, level, seed)` : questions du niveau demandé
 *     (`easy` / `medium` / `hard`, voir `QUIZ_LEVELS`) ET choix mélangés, la
 *     bonne réponse voyageant avec son choix (le barème suit le mélange) ;
 *   - `gradeQuiz(prepared, answers)` : score + palier + sans-faute ;
 *   - `bestDayRun(days)` : meilleure série de jours consécutifs — la
 *     métrique « série de quizz du jour » lue par les succès.
 */

/** Index de jour UTC dérivé de la clé locale « AAAA-MM-JJ ». */
export function dayNumber(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${date.getFullYear()}-${month}-${day}`;
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates piloté par `rand` (ne mute pas l'entrée). */
export function shuffle(items, rand) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return list;
}

/** Le quizz du jour : rotation quotidienne sur le catalogue. */
export function dailyQuizFor(date = new Date(), quizzes = []) {
  if (!quizzes.length) return null;
  const index = ((dayNumber(date) % quizzes.length) + quizzes.length) % quizzes.length;
  return quizzes[index] || null;
}

/**
 * Prépare une partie : questions du NIVEAU demandé mélangées, et pour chacune
 * ses choix mélangés avec la bonne réponse marquée. `level` est un identifiant
 * de `QUIZ_LEVELS` (`easy` par défaut, `src/quizzesData.js`) ; `seed` rend le
 * mélange reproductible (le quizz du jour est le même pour tous) ; sans seed,
 * un mélange aléatoire propre à la partie. Le niveau joué voyage avec la
 * partie préparée (`level`), pour l'affichage et la progression.
 * `options.extraDistractors` (niveau expert, `LEVEL_RULES`) ajoute à chaque
 * question autant de pièges tirés des autres questions du même niveau.
 */
/**
 * Pièges disponibles pour une question : toutes les réponses des AUTRES
 * questions du même niveau, qui ne figurent pas déjà dans celle-ci. Le niveau
 * expert y puise une proposition supplémentaire — cinq choix au lieu de
 * quatre, tous plausibles puisqu'ils viennent des mêmes questions.
 */
function trapPool(questions, question) {
  const own = new Set((question.choices || []).map((label) => JSON.stringify(label)));
  const pool = [];
  const seen = new Set();
  for (const other of questions) {
    if (other === question) continue;
    for (const label of other.choices || []) {
      const key = JSON.stringify(label);
      if (own.has(key) || seen.has(key)) continue;
      seen.add(key);
      pool.push(label);
    }
  }
  return pool;
}

export function prepareQuiz(quiz, level = 'easy', seed = null, { extraDistractors = 0 } = {}) {
  const rand = seed === null || seed === undefined ? rng((Math.random() * 2 ** 31) | 0) : rng(seed);
  // Lecture directe des niveaux : le moteur reste chargeable par Node (les
  // vérifications `check:achievements` l'importent sans passer par Vite),
  // là où `src/quizzesData.js` tire `./data` (import.meta.env). Même règle que
  // `quizLevelQuestions` de `quizzesData` : le niveau demandé, repli Facile.
  const levels = quiz && quiz.levels ? quiz.levels : {};
  const source = levels[level] || levels.easy || [];
  const traps = Math.max(0, Math.floor(Number(extraDistractors) || 0));
  const questions = shuffle(source, rand).map((question, questionIndex) => {
    // La bonne réponse voyage avec son choix : le barème suit le mélange.
    const marked = (question.choices || []).map((label, originalIndex) => ({
      label,
      correct: originalIndex === question.answer,
    }));
    // Niveau expert : une proposition de plus, tirée des autres questions du
    // niveau. Un piège n'est jamais la bonne réponse — il est marqué
    // `trap: true` pour le rendu (et les vérifications).
    if (traps) {
      for (const label of shuffle(trapPool(source, question), rand).slice(0, traps)) {
        marked.push({ label, correct: false, trap: true });
      }
    }
    const choices = shuffle(marked, rand).map((choice, position) => ({
      id: `q${questionIndex}-c${position}`,
      ...choice,
    }));
    return { ...question, choices };
  });
  const { levels: _levels, ...meta } = quiz || {};
  return { ...meta, level, questions };
}

/**
 * Banque globale du Survival : toutes les questions de tous les quizz et de
 * tous leurs niveaux, sans modifier les données source. L'identifiant est
 * namespacé (quizz + niveau) pour rester unique même si un futur quizz
 * réutilise un ancien identifiant de question.
 */
export function survivalQuestionPool(quizzes = []) {
  return (Array.isArray(quizzes) ? quizzes : []).flatMap((quiz) => (
    Object.entries(quiz?.levels || {}).flatMap(([level, questions]) => (
      (Array.isArray(questions) ? questions : []).map((question, index) => ({
        ...question,
        id: `survival:${quiz.slug || 'quiz'}:${level}:${question.id || index}`,
        sourceQuiz: quiz.slug || null,
        sourceLevel: level,
      }))
    ))
  ));
}

/**
 * Un cycle du Survival : toutes les questions du pool, dans un ordre mélangé,
 * avec les propositions mélangées comme dans les parties classiques. À la fin
 * du cycle, le lecteur en prépare un nouveau ; `previousQuestionId` évite une
 * répétition immédiate à la frontière entre deux cycles (ou deux parties).
 */
export function prepareSurvivalCycle(quizzes = [], seed = null, previousQuestionId = null) {
  const pool = survivalQuestionPool(quizzes);
  if (!pool.length) return [];
  const prepared = prepareQuiz(
    { slug: 'survival', levels: { easy: pool } },
    'easy',
    seed,
    { extraDistractors: 1 },
  ).questions;
  if (previousQuestionId && prepared.length > 1 && prepared[0].id === previousQuestionId) {
    [prepared[0], prepared[1]] = [prepared[1], prepared[0]];
  }
  return prepared;
}

/**
 * Barème d'une partie : `answers` mappe l'identifiant de question vers
 * l'identifiant du choix cliqué. Renvoie le détail question par question
 * (pour l'écran « corrections »), le palier de résultat et `answered` — le
 * nombre de questions réellement jouées, qui distingue un 3/8 « arrêté par les
 * vies » (niveau expert) d'un 3/8 joué jusqu'au bout.
 */
/**
 * Durée du « gel de verdict », en millisecondes — la valeur de référence
 * (niveaux facile et confirmé ; l'expert gèle moins longtemps, voir
 * `LEVEL_RULES`). Après un clic — bonne réponse, mauvaise réponse ou temps
 * écoulé — la question reste affichée ce laps de temps : le choix cliqué passe
 * au vert (ou au rouge, la bonne réponse s'illuminant), un bandeau annonce le
 * verdict, puis seulement la question suivante arrive. Défini une seule fois
 * ici : le lecteur, la vérification (check:quiz) et les commentaires de CSS
 * s'y réfèrent.
 */
export const VERDICT_MS = 600;

/**
 * Temps imparti par question, en secondes — la référence du niveau
 * « confirmé ». Exposé mutable pour que les scripts de vérification
 * (check:quiz) puissent accélérer l'horloge : chaque niveau est exprimé en
 * secondes absolues dans `LEVEL_RULES` et ramené à cette référence par
 * `questionBudgetMs`, donc baisser `QUESTION_TIME.seconds` raccourcit les
 * trois niveaux d'un coup.
 */
export const QUESTION_TIME = { seconds: 15 };

/**
 * Règles par niveau — ce que « Facile / Confirmé / Expert » change VRAIMENT
 * dans la partie, au-delà des questions du niveau et du multiplicateur de
 * points (`DIFFICULTY_MULTIPLIER`, plus bas) :
 *
 *   - `seconds`          : temps par question (20 s → 15 s → 10 s) ;
 *   - `extraDistractors` : pièges ajoutés à chaque question (l'expert passe à
 *                          cinq propositions, toutes crédibles) ;
 *   - `lives`            : vies avant arrêt de la partie (0 = pas de vies ;
 *                          l'expert en a trois — une erreur ou un temps écoulé
 *                          en coûte une) ;
 *   - `jokers`           : 50/50 et gel du chrono disponibles au départ
 *                          (l'expert n'en a aucun) ;
 *   - `verdictMs`        : durée du gel après une réponse (plus court en
 *                          expert : moins de temps pour souffler).
 */
export const LEVEL_RULES = {
  easy: {
    id: 'easy', seconds: 20, extraDistractors: 0, lives: 0,
    jokers: { fifty: 2, freeze: 1 }, verdictMs: VERDICT_MS,
  },
  medium: {
    id: 'medium', seconds: 15, extraDistractors: 0, lives: 0,
    jokers: { fifty: 1, freeze: 1 }, verdictMs: VERDICT_MS,
  },
  hard: {
    id: 'hard', seconds: 10, extraDistractors: 1, lives: 3,
    jokers: { fifty: 0, freeze: 0 }, verdictMs: Math.round(VERDICT_MS * 0.75),
  },
};

/** Niveau appliqué quand un identifiant est absent ou inconnu. */
export const DEFAULT_LEVEL = 'easy';

/** Les règles d'un niveau — jamais `null`, on retombe sur « facile ». */
export function levelRules(level) {
  return LEVEL_RULES[level] || LEVEL_RULES[DEFAULT_LEVEL];
}

/**
 * Budget d'une question en millisecondes : les secondes du niveau ramenées à
 * la référence `QUESTION_TIME` (que les vérifications raccourcissent).
 */
export function questionBudgetMs(level = DEFAULT_LEVEL) {
  const reference = LEVEL_RULES.medium.seconds;
  const seconds = QUESTION_TIME.seconds * (levelRules(level).seconds / reference);
  return Math.round(seconds * 1000);
}

/** Jokers de départ d'une partie (copie : chaque partie a les siens). */
export function startJokers(level) {
  const { fifty = 0, freeze = 0 } = levelRules(level).jokers || {};
  return { fifty, freeze };
}

/** Secondes rendues par le joker « gel du chrono ». */
export const FREEZE_BONUS = { seconds: 8 };

/**
 * Paliers de la série en cours : la flamme chauffe avec les bonnes réponses
 * consécutives. Le seuil le plus haut atteint gagne.
 */
export const STREAK_LEVELS = [
  { id: 'cold', min: 0 },
  { id: 'warm', min: 2 },
  { id: 'hot', min: 4 },
  { id: 'blazing', min: 6 },
];

/** Le palier de flamme d'une série (id, pour la classe CSS et le libellé). */
export function streakLevel(streak) {
  const value = Math.max(0, Math.floor(Number(streak) || 0));
  const reached = STREAK_LEVELS.filter((step) => value >= step.min);
  return (reached[reached.length - 1] || STREAK_LEVELS[0]).id;
}

/**
 * Résumé chiffré des règles d'un niveau — ce que le sélecteur de niveaux,
 * l'écran de partie et l'écran de résultat annoncent : temps par question,
 * nombre de propositions, vies et jokers. Le multiplicateur de points reste
 * lu dans `DIFFICULTY_MULTIPLIER` (une seule source, bornée côté serveur).
 */
export function levelBrief(quiz, level = DEFAULT_LEVEL) {
  const rules = levelRules(level);
  const levels = quiz && quiz.levels ? quiz.levels : {};
  const questions = levels[level] || levels.easy || (quiz && quiz.questions) || [];
  const baseChoices = questions[0]?.choices?.length || 4;
  return {
    id: rules.id,
    seconds: rules.seconds,
    choices: baseChoices + rules.extraDistractors,
    lives: rules.lives,
    jokers: { ...rules.jokers },
    jokerCount: (rules.jokers?.fifty || 0) + (rules.jokers?.freeze || 0),
  };
}

/**
 * Barème des points d'une bonne réponse : une base, un bonus de rapidité
 * (répondre vite rapporte jusqu'à `speedMax`) et un bonus de combo (chaque
 * bonne réponse consécutive au-delà de la première rapporte `comboPer`,
 * plafonné à `comboCap × comboPer`).
 *
 * Les points font le classement des quizz et le record de l'appareil (la
 * meilleure partie = le plus de points, `correct/total` en départage) ; les
 * succès et les paliers de résultat, eux, restent calculés sur
 * `correct/total`. Les points s'affichent en direct dans la partie et sur
 * l'écran de résultat.
 */
export const QUIZ_POINTS = { base: 100, speedMax: 50, comboPer: 10, comboCap: 5 };

/**
 * Points d'une bonne réponse. `elapsedMs` : temps écoulé depuis l'affichage
 * de la question ; `budgetMs` : le budget complet (15 000 ms par défaut) ;
 * `streak` : la série de bonnes réponses consécutives, celle-ci comprise.
 * Renvoie `{ base, speed, combo, total }` en entiers, bornés entre `base` et
 * `base + speedMax + comboPer × comboCap` (200 par question).
 */
export function quizPoints({ elapsedMs = 0, budgetMs = 0, streak = 1 } = {}) {
  const budget = Number(budgetMs) > 0 ? Number(budgetMs) : 1;
  const spent = Math.min(budget, Math.max(0, Number(elapsedMs) || 0));
  const speed = Math.round(QUIZ_POINTS.speedMax * ((budget - spent) / budget));
  const combo = Math.max(0, Math.min(Math.floor(streak) - 1, QUIZ_POINTS.comboCap)) * QUIZ_POINTS.comboPer;
  return { base: QUIZ_POINTS.base, speed, combo, total: QUIZ_POINTS.base + speed + combo };
}

/**
 * Multiplicateur de points par niveau : plus le palier est exigeant, plus les
 * points rapportés valent cher — facile ×1, confirmé ×1,5, expert ×2
 * (plafond par question : 200 / 300 / 400). La borne haute est revérifiée côté
 * serveur dans `submit_quiz_attempt` (supabase/schema.sql, section 8) sur le
 * suffixe `slug:niveau` de l'identifiant.
 */
export const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };

export function pointsMultiplier(level) {
  return DIFFICULTY_MULTIPLIER[level] || 1;
}

/**
 * Points d'une bonne réponse, mis à l'échelle du niveau joué
 * (`quizPoints` × `DIFFICULTY_MULTIPLIER`). Détail (base/rapidité/combo) et
 * total remis en entiers — c'est le total qui s'affiche, qui part au
 * classement et qui devient de l'XP joueur.
 */
export function quizPointsFor(level, { elapsedMs = 0, budgetMs = 0, streak = 1 } = {}) {
  const multiplier = pointsMultiplier(level);
  const points = quizPoints({ elapsedMs, budgetMs, streak });
  if (multiplier === 1) return points;
  const base = Math.round(points.base * multiplier);
  const speed = Math.round(points.speed * multiplier);
  const combo = Math.round(points.combo * multiplier);
  return { base, speed, combo, total: base + speed + combo };
}

export function gradeQuiz(prepared, answers = {}) {
  const detail = (prepared.questions || []).map((question) => {
    const picked = question.choices.find((choice) => choice.id === answers[question.id]) || null;
    const correct = Boolean(picked && picked.correct);
    const solution = question.choices.find((choice) => choice.correct) || null;
    return { question, picked, solution, correct, answered: Boolean(picked) };
  });
  const total = detail.length;
  const correct = detail.filter((entry) => entry.correct).length;
  const answered = detail.filter((entry) => entry.answered).length;
  const ratio = total ? correct / total : 0;
  return {
    detail,
    total,
    correct,
    answered,
    ratio,
    perfect: total > 0 && correct === total,
    tier: resultTier(ratio),
  };
}

/** Paliers de résultat : id + seuil minimum (le plus haut seuil atteint gagne). */
export const RESULT_TIERS = [
  { id: 'rookie', min: 0 },
  { id: 'player', min: 0.4 },
  { id: 'veteran', min: 0.7 },
  { id: 'legend', min: 1 },
];

export function resultTier(ratio) {
  const tiers = RESULT_TIERS.filter((tier) => ratio >= tier.min - 1e-9);
  return (tiers[tiers.length - 1] || RESULT_TIERS[0]).id;
}

/** Meilleure série de jours consécutifs dans une liste de clés « AAAA-MM-JJ ». */
export function bestDayRun(days = []) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    const before = previous ? Date.parse(`${previous}T00:00:00Z`) : NaN;
    const after = Date.parse(`${day}T00:00:00Z`);
    run = previous && Number.isFinite(before) && after - before === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
