export const DRIVING_PROGRESS_KEY = 'letsplay_driving_progress_v1';
export const DRIVING_SKILLS = [
  { id: 'pace', title: 'Allure et arrêts', badge: 'Allure maîtrisée', exercises: ['control', 'bump', 'precision'] },
  { id: 'priority', title: 'Priorités', badge: 'Priorités maîtrisées', exercises: ['fr-right', 'fr-yield', 'fr-stop', 'fr-giratory', 'traffic-yield', 'left-turn-oncoming', 'blocked-junction', 'priority-road', 'yield-clear', 'narrow-passage', 'emergency-vehicle'] },
  { id: 'signals', title: 'Feux et STOP', badge: 'Signalisation comprise', exercises: ['signal', 'stop', 'fr-stop', 'pedestrian-crossing', 'blocked-junction', 'priority-road', 'yield-clear', 'narrow-passage', 'emergency-vehicle'] },
  { id: 'vulnerable', title: 'Usagers vulnérables', badge: 'Partage de la route', exercises: ['pedestrian-crossing', 'right-turn-cyclist'] },
  { id: 'position', title: 'Placement et voies', badge: 'Placement précis', exercises: ['blocked-lane', 'right-turn', 'lane-change', 'narrow-passage'] },
  { id: 'parking', title: 'Stationnement', badge: 'Stationnement prudent', exercises: ['parking-exit', 'parking-choice'] },
];
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function normalizeDrivingProgress(value) {
  const result = { version: 1, sequence: count(value?.sequence), exercises: {} };
  if (value?.version !== 1) return result;
  for (const id of new Set(DRIVING_SKILLS.flatMap(skill => skill.exercises))) {
    const record = value.exercises?.[id]; if (!record || typeof record !== 'object') continue;
    result.exercises[id] = { attempts: count(record.attempts), guided: count(record.guided), autonomous: count(record.autonomous),
      bestScore: Math.min(100, count(record.bestScore)), lastAttempt: count(record.lastAttempt), lastPassed: record.lastPassed === true };
    result.sequence = Math.max(result.sequence, result.exercises[id].lastAttempt);
  }
  return result;
}
export function readDrivingProgress(storage) {
  try { return normalizeDrivingProgress(JSON.parse(storage.getItem(DRIVING_PROGRESS_KEY))); }
  catch { return normalizeDrivingProgress(null); }
}
export function saveDrivingProgress(storage, progress) {
  try { storage.setItem(DRIVING_PROGRESS_KEY, JSON.stringify(progress)); } catch { /* optional local storage */ }
}
export function drivingSkillProgress(progress, skill) {
  const records = skill.exercises.map(id => progress.exercises[id]).filter(Boolean);
  const successes = records.reduce((n, r) => n + r.guided + r.autonomous, 0);
  const autonomy = records.reduce((n, r) => n + r.autonomous, 0);
  const scenarios = records.filter(r => r.guided + r.autonomous > 0).length;
  const attempts = records.reduce((n, r) => n + r.attempts, 0);
  const confirmed = successes >= 3 && autonomy >= 1 && scenarios >= 2;
  return { successes, autonomy, scenarios, confirmed, status: confirmed ? 'Confirmée' : attempts > 0 ? 'En cours d’acquisition' : 'À découvrir' };
}
export function recordDrivingProgress(previous, session, passed) {
  if (!['complete', 'outside', 'timeout'].includes(session.status)) return previous;
  const progress = normalizeDrivingProgress(previous), id = session.exercise.id;
  if (!DRIVING_SKILLS.some(skill => skill.exercises.includes(id))) return previous;
  const old = progress.exercises[id] ?? { attempts: 0, guided: 0, autonomous: 0, bestScore: 0, lastAttempt: 0, lastPassed: false };
  const clean = passed && session.status === 'complete' && session.faults.length === 0;
  const level = session.exercise.teachingAssistance === 'autonomous' ? 'autonomous' : 'guided';
  progress.sequence++;
  progress.exercises[id] = { ...old, attempts: old.attempts + 1, [level]: old[level] + (clean ? 1 : 0),
    bestScore: Math.max(old.bestScore, session.score), lastAttempt: progress.sequence, lastPassed: clean };
  return progress;
}
export function newlyEarnedDrivingBadges(before, after) {
  return DRIVING_SKILLS.filter(skill => !drivingSkillProgress(before, skill).confirmed && drivingSkillProgress(after, skill).confirmed).map(skill => skill.badge);
}
export function recommendDrivingExercise(progress, lessons) {
  const retry = lessons.filter(e => progress.exercises[e.id]?.lastPassed === false)
    .sort((a,b) => progress.exercises[b.id].lastAttempt - progress.exercises[a.id].lastAttempt)[0];
  if (retry) return { exercise: retry, assistance: 'guided', reason: 'Reprenez cette situation après votre dernière tentative à retravailler.' };
  for (const skill of DRIVING_SKILLS) {
    const state = drivingSkillProgress(progress, skill); if (state.confirmed) continue;
    const candidates = lessons.filter(e => skill.exercises.includes(e.id)).sort((a,b) => {
      const ra = progress.exercises[a.id], rb = progress.exercises[b.id];
      return ((ra?.guided ?? 0) + (ra?.autonomous ?? 0)) - ((rb?.guided ?? 0) + (rb?.autonomous ?? 0));
    });
    if (!candidates.length) continue;
    const autonomy = state.successes >= 2 && state.autonomy === 0;
    return { exercise: candidates[0], assistance: autonomy ? 'autonomous' : 'guided',
      reason: autonomy ? 'Essayez sans conseils pour vérifier votre compréhension.' : `Travaillez une nouvelle situation : ${skill.title.toLowerCase()}.` };
  }
  return null;
}
