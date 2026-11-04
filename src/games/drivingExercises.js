import { ROAD_CODE_EXERCISES } from './roadCodeExercises.js';
import { PARKING_CHOICE_EXERCISE, fitsAllowedParking } from './parkingChoiceExercise.js';
import { DRIVING_MERGE_EXERCISES } from './drivingMergeExercises.js';
import { REAL_SITUATION_EXERCISES } from './realSituationExercises.js';
import { SCHOOL_SPEED_MARGIN_KMH } from './drivingSpeedRules.js';
import { ADDITIONAL_DRIVING_EXERCISES } from './additionalDrivingExercises.js';
import { FRENCH_PRIORITY_EXERCISES, priorityRoadIsClear } from './frenchPriorityExercises.js';
// Each exercise owns a small, distinct section of the existing street grid.
export const DRIVING_EXERCISES = [
  { trafficSide: 'right', id: 'control', title: '01 · Démarrer et s’arrêter', summary: 'Parcourir une ligne droite puis s’immobiliser dans la zone d’arrivée.', theory: 'Démarrez en douceur, restez à droite puis arrêtez-vous dans le cercle pendant une seconde.', limit: 50, advisorySpeed: 30, duration: 120, spawn: { x: 97.65, z: -280, heading: Math.PI }, bounds: { minX: 89, maxX: 111, minZ: -292, maxZ: -215 }, stages: [{ x: 97.65, z: -230, kind: 'stop', instruction: 'Suivez le bleu. Arrêtez-vous 1 s dans le cercle.' }] },
  { trafficSide: 'right', id: 'bump', title: '02 · Franchir un dos d’âne', summary: 'Ralentir avant le dos d’âne, le franchir puis s’arrêter après.', theory: 'Le panneau 20 de cette section impose 20 km/h. Ce n’est pas une limite nationale pour tous les dos d’âne : respectez le panneau et adaptez votre allure au relief. Arrêtez-vous ensuite dans la zone finale.', limit: 50, advisorySpeed: 30, duration: 120, spawn: { x: -197.65, z: -10, heading: 0 }, bounds: { minX: -211, maxX: -189, minZ: -90, maxZ: -2 }, stages: [{ x: -197.65, z: -50, kind: 'bump', instruction: 'Passez le dos d’âne à 20 km/h maximum.' }, { x: -197.65, z: -78, kind: 'stop', instruction: 'Arrêtez-vous 1 s dans le cercle.' }] },
  { trafficSide: 'right', id: 'signal', title: '03 · S’arrêter au feu', summary: 'Marquer un arrêt avant la ligne et traverser uniquement au vert.', theory: 'Au rouge, arrêtez-vous avant la ligne et attendez le vert. Au vert, vous pouvez passer si la voie est libre, sans arrêt systématique. Terminez par un arrêt après le carrefour.', limit: 50, advisorySpeed: 30, duration: 150, spawn: { x: -97.65, z: -48, heading: 0 }, bounds: { minX: -111, maxX: -89, minZ: -160, maxZ: -36 }, stages: [{ x: -97.65, z: -78, kind: 'signal', instruction: 'Rouge : stop. Vert : avancez si la voie est libre.', signal: { axis: 'z', ix: -1, iz: -1 } }, { x: -97.65, z: -145, kind: 'stop', instruction: 'Traversez au vert. Arrêtez-vous dans le cercle.' }] },
  { trafficSide: 'right', id: 'stop', title: '04 · Marquer le STOP', summary: 'S’arrêter avant la ligne d’un carrefour sans feux, puis traverser.', theory: 'Arrêtez complètement la voiture avant la ligne pendant une seconde, vérifiez le carrefour puis continuez jusqu’à l’arrivée.', limit: 50, advisorySpeed: 30, duration: 120, spawn: { x: -245, z: -202.35, heading: -Math.PI / 2 }, bounds: { minX: -327, maxX: -235, minZ: -211, maxZ: -189 }, stages: [{ x: -278, z: -202.35, kind: 'stop', instruction: 'STOP : arrêt complet avant la ligne.' }, { x: -321, z: -202.35, radius: 2, kind: 'stop', instruction: 'Traversez. Arrêtez-vous dans le cercle.' }] },
  { trafficSide: 'right', id: 'precision', title: '05 · Arrêt de précision', summary: 'Atteindre une petite zone et y maintenir le véhicule immobile.', theory: 'Avancez lentement, dosez le freinage et restez immobile deux secondes dans la zone finale.', limit: 50, advisorySpeed: 20, duration: 120, spawn: { x: 202.35, z: -125, heading: 0 }, bounds: { minX: 189, maxX: 211, minZ: -186, maxZ: -114 }, stages: [{ x: 202.35, z: -171, kind: 'stop', radius: 2.5, hold: 2, instruction: 'Arrêtez-vous 2 s au centre du cercle.' }] },
  ...FRENCH_PRIORITY_EXERCISES,
  ...ADDITIONAL_DRIVING_EXERCISES,
  ...REAL_SITUATION_EXERCISES,
  ...DRIVING_MERGE_EXERCISES,
  PARKING_CHOICE_EXERCISE,
  ...ROAD_CODE_EXERCISES,
];
export function insideExercise(bounds, x, z, margin = 0) {
  return x >= bounds.minX + margin && x <= bounds.maxX - margin && z >= bounds.minZ + margin && z <= bounds.maxZ - margin;
}
export function stepExerciseObjective(session, sample, dt) {
  const stage = session.exercise.stages[session.checkpoint];
  if (!stage) return session;
  const nearby = Math.hypot(sample.x - stage.x, sample.z - stage.z) <= (stage.radius ?? 4);
  const aligned = stage.heading === undefined || (Number.isFinite(sample.heading)
    && Math.cos(sample.heading - stage.heading) >= Math.cos(Math.PI / 9));
  const hold = nearby && aligned && sample.speed < 1 ? (session.hold || 0) + dt : 0;
  if (stage.kind === 'park') {
    const parked = fitsAllowedParking(session.exercise, sample) && sample.speed < 1;
    const parkingHold = parked ? (session.hold ?? 0) + dt : 0;
    const done = parkingHold >= (stage.hold ?? 2);
    return { ...session, checkpoint: session.checkpoint + (done ? 1 : 0), hold: done ? 0 : parkingHold };
  }
  if (stage.kind === 'signal') return { ...session, checkpoint: session.checkpoint + (nearby && sample.signal === 'green' ? 1 : 0), hold: 0 };
  if (stage.kind === 'drive' || stage.kind === 'reverse') {
    const movingCorrectly = stage.kind !== 'reverse' || sample.signedSpeed < -.5;
    return { ...session, checkpoint: session.checkpoint + (nearby && aligned && movingCorrectly ? 1 : 0), hold: 0 };
  }
  if (stage.kind === 'priority') {
    const clear = priorityRoadIsClear(session.exercise, sample.time, session.priorityState);
    const stopped = !session.exercise.priority.stopRequired || session.priorityState?.stopped;
    return { ...session, checkpoint: session.checkpoint + (nearby && clear && stopped && (!stage.signal || sample.signal === 'green') ? 1 : 0), hold: 0 };
  }
  let done = false;
  if (stage.kind === 'bump') {
    const crossed = (session.previous?.z ?? sample.z) > -45 && sample.z <= -45;
    const bumpCrossed = crossed ? Math.max(session.previous?.speed ?? sample.speed, sample.speed) <= 20 + SCHOOL_SPEED_MARGIN_KMH : session.bumpCrossed;
    return { ...session, bumpCrossed, checkpoint: nearby && bumpCrossed ? session.checkpoint + 1 : session.checkpoint, hold: 0 };
  }
  if (hold >= (stage.hold ?? 1)) {
    done = stage.kind !== 'green-stop' || sample.signal === 'green';
  }
  return { ...session, checkpoint: session.checkpoint + (done ? 1 : 0), hold: done ? 0 : hold };
}
