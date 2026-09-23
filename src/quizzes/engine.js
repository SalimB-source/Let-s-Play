/**
 * Moteur des quizz — logique pure, sans React ni backend.
 * --------------------------------------------------------
 * Comme `src/achievements/engine.js`, tout est testable hors navigateur :
 * mélange déterministe (quizz du jour identique pour tout le monde),
 * barème, paliers de résultat et série de jours.
 *
 *   - `dailyQuizFor(date, quizzes)` : le quizz mis en avant ce jour-là
 *     (rotation par journée locale, comme les succès de fidélité) ;
 *   - `prepareQuiz(quiz, seed)` : questions ET choix mélangés, la bonne
 *     réponse voyageant avec son choix (le barème suit le mélange) ;
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
 * Prépare une partie : questions mélangées, et pour chacune ses choix
 * mélangés avec la bonne réponse marquée. `seed` rend le mélange
 * reproductible (le quizz du jour est le même pour tous) ; sans seed,
 * un mélange aléatoire propre à la partie.
 */
export function prepareQuiz(quiz, seed = null) {
  const rand = seed === null || seed === undefined ? rng((Math.random() * 2 ** 31) | 0) : rng(seed);
  const questions = shuffle(quiz.questions || [], rand).map((question, questionIndex) => {
    // La bonne réponse voyage avec son choix : le barème suit le mélange.
    const marked = (question.choices || []).map((label, originalIndex) => ({
      label,
      correct: originalIndex === question.answer,
    }));
    const choices = shuffle(marked, rand).map((choice, position) => ({
      id: `q${questionIndex}-c${position}`,
      ...choice,
    }));
    return { ...question, choices };
  });
  return { ...quiz, questions };
}

/**
 * Barème d'une partie : `answers` mappe l'identifiant de question vers
 * l'identifiant du choix cliqué. Renvoie le détail question par question
 * (pour l'écran « corrections ») et le palier de résultat.
 */
/**
 * Temps imparti par question, en secondes. Exposé mutable pour que les
 * scripts de vérification (check:quiz) puissent accélérer l'horloge.
 */
export const QUESTION_TIME = { seconds: 15 };

/**
 * Durée du « gel de verdict », en millisecondes. Après un clic — bonne
 * réponse, mauvaise réponse ou temps écoulé — la question reste affichée ce
 * laps de temps : le choix cliqué passe au vert (ou au rouge, la bonne
 * réponse s'illuminant), un bandeau annonce le verdict, puis seulement la
 * question suivante arrive. Défini une seule fois ici : le lecteur, la
 * vérification (check:quiz) et les commentaires de CSS s'y réfèrent.
 */
export const VERDICT_MS = 600;

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

export function gradeQuiz(prepared, answers = {}) {
  const detail = (prepared.questions || []).map((question) => {
    const picked = question.choices.find((choice) => choice.id === answers[question.id]) || null;
    const correct = Boolean(picked && picked.correct);
    const solution = question.choices.find((choice) => choice.correct) || null;
    return { question, picked, solution, correct };
  });
  const total = detail.length;
  const correct = detail.filter((entry) => entry.correct).length;
  const ratio = total ? correct / total : 0;
  return { detail, total, correct, ratio, perfect: total > 0 && correct === total, tier: resultTier(ratio) };
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
