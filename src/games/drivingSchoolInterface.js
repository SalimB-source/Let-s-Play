export const SCHOOL_INTERFACE_KEY = 'letsplay_driving_interface_v1';
export const SCHOOL_CHAPTERS = [
  { id: 'basics', number: '01', title: 'Premiers réflexes', description: 'Prenez le volant en douceur.', icon: 'wheel', color: '#d8edca', exercises: ['control', 'bump', 'precision'] },
  { id: 'junctions', number: '02', title: 'Intersections', description: 'Observez, décidez, puis avancez.', icon: 'signal', color: '#ffdfab', exercises: ['signal', 'stop', 'fr-right', 'fr-yield', 'fr-stop', 'fr-giratory', 'traffic-yield', 'blocked-junction', 'priority-road', 'yield-clear'] },
  { id: 'sharing', number: '03', title: 'Partager la route', description: 'Une place pour chaque usager.', icon: 'pedestrian', color: '#cbe8f0', exercises: ['pedestrian-crossing', 'blocked-lane', 'left-turn-oncoming', 'right-turn-cyclist', 'narrow-passage', 'emergency-vehicle'] },
  { id: 'manoeuvres', number: '04', title: 'Manœuvres', description: 'Trouvez votre place, sans gêner.', icon: 'parking', color: '#e7dcf6', exercises: ['right-turn', 'parking-exit', 'lane-change', 'parking-choice'] },
];
export function schoolChapter(exercise) { return SCHOOL_CHAPTERS.find(chapter => chapter.exercises.includes(exercise.id)) ?? SCHOOL_CHAPTERS[0]; }
export function normalizeSchoolSettings(value) { return { steering: value?.steering === 'wheel' ? 'wheel' : 'buttons', textSize: value?.textSize === 'large' ? 'large' : 'standard' }; }
export function readSchoolSettings(storage) { try { return normalizeSchoolSettings(JSON.parse(storage.getItem(SCHOOL_INTERFACE_KEY))); } catch { return normalizeSchoolSettings(null); } }
export function saveSchoolSettings(storage, value) { try { storage.setItem(SCHOOL_INTERFACE_KEY,JSON.stringify(normalizeSchoolSettings(value))); } catch { /* optional */ } }
export function schoolCardStatus(progress, id) {
  const r = progress.exercises[id];
  return !r ? 'À découvrir' : r.guided + r.autonomous > 0 ? 'Réussi sans faute' : 'À retravailler';
}
export function schoolResultSummary(session, passed) {
  const fault = session.faults.at(-1);
  const interrupted = session.status === 'abandoned';
  return { title: interrupted ? 'Une pause dans votre parcours.' : passed ? 'Un bon réflexe de plus !' : 'On apprend aussi en réessayant.',
    positive: session.checkpoint > 0 ? `${session.checkpoint} étape${session.checkpoint > 1 ? 's' : ''} validée${session.checkpoint > 1 ? 's' : ''}.` : 'Vous avez découvert la situation.',
    improvement: fault?.advice ?? (session.status === 'timeout' ? 'Reprenez la situation pour mieux anticiper les étapes.' : session.status === 'outside' ? 'Suivez le tracé bleu et restez dans la section.' : interrupted ? 'Reprenez quand vous êtes prêt.' : 'Essayez ensuite sans les aides visuelles.') };
}
