/*
 * Meilleur score local du Survival — indépendant des quizz classiques, de leur
 * classement partagé et de la progression/achievements par niveau.
 */
export const SURVIVAL_BEST_KEY = 'letsplay_quiz_survival_best_v1';

function normaliseRun(run) {
  if (!run || typeof run !== 'object') return null;
  return {
    points: Math.max(0, Math.floor(Number(run.points) || 0)),
    correct: Math.max(0, Math.floor(Number(run.correct) || 0)),
    questions: Math.max(0, Math.floor(Number(run.questions) || 0)),
  };
}

/** Record sauvegardé sur cet appareil, ou `null` quand il n'y en a pas. */
export function readSurvivalBest() {
  try {
    if (typeof window === 'undefined') return null;
    return normaliseRun(JSON.parse(window.localStorage.getItem(SURVIVAL_BEST_KEY) || 'null'));
  } catch (error) {
    return null;
  }
}

/**
 * Enregistre une nouvelle meilleure partie (points d'abord, bonnes réponses
 * en départage). Le résultat mémoire reste disponible si le stockage local
 * est bloqué par le navigateur.
 */
export function recordSurvivalRun(run) {
  const candidate = normaliseRun(run) || { points: 0, correct: 0, questions: 0 };
  const current = readSurvivalBest();
  const isRecord = !current
    || candidate.points > current.points
    || (candidate.points === current.points && candidate.correct > current.correct);
  const best = isRecord ? candidate : current;
  if (isRecord) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SURVIVAL_BEST_KEY, JSON.stringify(candidate));
      }
    } catch (error) {
      // Le run reste jouable : le score affiché en mémoire n'est pas perdu.
    }
  }
  return { best, isRecord };
}
