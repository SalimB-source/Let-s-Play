/*
 * Meilleur score local du Survival — indépendant des quizz classiques, de leur
 * classement partagé et de la progression/achievements par niveau.
 */
import { ecrireProgression, effacerProgression, lireProgression } from '../lib/progressionScope.js';

export const SURVIVAL_BEST_KEY = 'letsplay_quiz_survival_best_v2';
const LEGACY_SURVIVAL_BEST_KEYS = ['letsplay_quiz_survival_best_v1'];

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
    // Survival is a quiz mode too: do not carry its old device record across
    // the global quiz reset.
    for (const legacy of LEGACY_SURVIVAL_BEST_KEYS) effacerProgression(legacy);
    return normaliseRun(JSON.parse(lireProgression(SURVIVAL_BEST_KEY) || 'null'));
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
    // Record du joueur (clé `:user:<id>` pour un compte) : le run reste jouable
    // même si le stockage refuse l'écriture, le score vit alors en mémoire.
    ecrireProgression(SURVIVAL_BEST_KEY, JSON.stringify(candidate));
  }
  return { best, isRecord };
}
