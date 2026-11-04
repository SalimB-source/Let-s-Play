import { viceCityTrafficSignalState } from './viceCityTraffic.js';
import { actorTraveledDistance } from './drivingActorSignals.js';
// Original practice scenarios based on the French Code de la route, not official ETG questions.
export const FRENCH_PRIORITY_SOURCE = 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159602/';
const scenario = (id, title, center, rule, article, summary, theory) => ({
  id, title, center, jurisdiction: 'FR', trafficSide: 'right', rule, article,
  source: FRENCH_PRIORITY_SOURCE, summary, theory, limit: 50, advisorySpeed: 30, duration: 150,
  spawn: { x: center.x + 2.35, z: center.z + 43, heading: 0 },
  bounds: { minX: center.x - 45, maxX: center.x + 45, minZ: center.z - 45, maxZ: center.z + 55 },
  priority: { entryZ: center.z + (rule === 'right' ? 9 : 18), triggerZ: center.z + 34, stopRequired: rule === 'stop',
    actors: [{ id: 'blue', type: 'taxi', speed: 6, clearAt: 56, points: [{ x: center.x + 40, z: center.z - 2.35 }, { x: center.x - 40, z: center.z - 2.35 }] }] },
  stages: [{ x: center.x + 2.35, z: center.z + (rule === 'right' ? 20.5 : 23), radius: rule === 'right' ? 1.5 : 2, kind: 'priority', instruction: rule === 'stop' ? 'STOP : arrêt complet, puis laissez passer la voiture.' : 'Laissez passer la voiture avant de vous engager.' },
    { x: center.x + 2.35, z: center.z - 32, kind: 'stop', instruction: 'Voie libre : traversez. Arrêtez-vous dans le cercle.' }],
});
export const FRENCH_PRIORITY_EXERCISES = [
  scenario('fr-right', '06 · Priorité à droite', { x: 100, z: 100 }, 'right', 'R415-5',
    'Intersection sans feux ni panneaux : laisser passer une voiture venant de droite.',
    'Sans signalisation imposant un autre régime, cédez le passage au conducteur venant de votre droite. Ici la voiture arrive de la droite : ralentissez, observez et laissez-la traverser avant de vous engager. Un arrêt systématique n’est pas imposé par cette seule règle.'),
  scenario('fr-yield', '07 · Cédez-le-passage', { x: 100, z: -100 }, 'yield', 'R415-7',
    'Aborder une route avec un cédez-le-passage et attendre un créneau sûr.',
    'Au cédez-le-passage, laissez passer les véhicules circulant sur la route abordée. L’arrêt n’est pas obligatoire si la voie est libre et si vous pouvez vous engager sans danger. Dans ce scénario, un véhicule prioritaire traverse : laissez-le passer.'),
  scenario('fr-stop', '08 · STOP avec circulation', { x: -100, z: 200 }, 'stop', 'R415-6',
    'Cumuler arrêt obligatoire et respect des véhicules sur la route abordée.',
    'Au STOP, marquez un temps d’arrêt à la limite de la chaussée abordée puis cédez le passage aux véhicules sur cette route. S’arrêter ne donne pas la priorité. Le maintien d’une seconde utilisé ici est une tolérance pédagogique, pas une durée légale imposée.'),
];
// Vary the direction: a signed yield/STOP is not merely a priority-to-right rule.
const yieldExercise = FRENCH_PRIORITY_EXERCISES.find((e) => e.rule === 'yield');
yieldExercise.priority.actors[0].points = [{ x: 60, z: -97.65 }, { x: 140, z: -97.65 }];
const stopExercise = FRENCH_PRIORITY_EXERCISES.find((e) => e.rule === 'stop');
stopExercise.priority.actors.push({ id: 'second', type: 'white-lambo', speed: 5, delay: 2, clearAt: 56,
  points: [{ x: -140, z: 202.35 }, { x: -60, z: 202.35 }] });
const ringPoints = Array.from({ length: 45 }, (_, i) => {
  const angle = 2.8 - i / 44 * (2.8 + Math.PI / 2);
  return { x: 200 + 18 * Math.cos(angle), z: 200 + 18 * Math.sin(angle) };
});
FRENCH_PRIORITY_EXERCISES.push({
  id: 'fr-giratory', title: '09 · Entrer dans un giratoire', jurisdiction: 'FR', trafficSide: 'right',
  center: { x: 200, z: 200 }, rule: 'giratory', article: 'R415-10', source: FRENCH_PRIORITY_SOURCE,
  summary: 'Céder le passage à une voiture déjà engagée, puis suivre l’anneau.',
  theory: 'Au carrefour à sens giratoire, cédez le passage aux usagers déjà engagés dans l’anneau. En France, circulez dans le sens inverse des aiguilles d’une montre. Ne confondez pas ce régime avec un rond-point sans cédez-le-passage, qui peut relever de la priorité à droite. Le clignotant droit s’allume automatiquement pour préparer la sortie ; les contrôles visuels restent nécessaires en conduite réelle.',
  limit: 50, advisorySpeed: 20, duration: 180, spawn: { x: 202.35, z: 247, heading: 0 },
  bounds: { minX: 155, maxX: 245, minZ: 155, maxZ: 255 },
  priority: { entryZ: 228, triggerZ: 242, stopRequired: false,
    actors: [{ id: 'ring', type: 'taxi', speed: 6, clearAt: 33, points: [...ringPoints, { x: 200, z: 159 }] }] },
  stages: [{ x: 202.35, z: 240, kind: 'priority', radius: 2, instruction: 'Laissez passer la voiture dans l’anneau.' },
    { x: 214, z: 213, radius: 5, kind: 'drive', instruction: 'Entrez à droite. Suivez la ligne bleue.' },
    { x: 218, z: 195, radius: 5, kind: 'drive', instruction: 'Suivez l’anneau sans couper l’îlot.' },
    { x: 207, z: 183, radius: 5, kind: 'drive', instruction: 'Sortez en face. Clignotant droit automatique.' },
    { x: 202.35, z: 160, kind: 'stop', instruction: 'Sortez. Arrêtez-vous dans le cercle.' }],
});

export function priorityActorPose(actor, time, triggerTime, pausedSeconds = 0) {
  const traveled = actorTraveledDistance(actor, time, triggerTime, pausedSeconds);
  let remaining = traveled;
  for (let i = 1; i < actor.points.length; i++) {
    const a = actor.points[i - 1], b = actor.points[i];
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= distance || i === actor.points.length - 1) {
      const ratio = Math.min(1, remaining / (distance || 1));
      return { x: a.x + (b.x - a.x) * ratio, z: a.z + (b.z - a.z) * ratio,
        yaw: Math.atan2(-(b.x - a.x), -(b.z - a.z)), clear: traveled >= actor.clearAt, traveled };
    }
    remaining -= distance;
  }
  return { ...actor.points[0], yaw: 0, clear: false, traveled };
}
export function actorPauseSeconds(state, actorId, time) {
  const paused = (state?.actorPauses?.[actorId] ?? 0)
    + (state?.actorPauseRates?.[actorId] ?? 0) * Math.max(0, time - (state?.reactionTime ?? time));
  const holdAfter = state?.actorYieldHolds?.[actorId];
  // Exact hold between telemetry samples: no overshoot followed by a rewind.
  return holdAfter !== undefined && state?.triggerTime != null && !state.releasedActors?.includes(actorId)
    ? Math.max(paused, Math.max(0, time - state.triggerTime - holdAfter)) : paused;
}
export function priorityRoadIsClear(exercise, time, state) {
  return state?.triggerTime != null && exercise.priority.actors.every((actor) => actor.yieldsToPlayer || priorityActorPose(actor, time, state.triggerTime, actorPauseSeconds(state, actor.id, time)).clear);
}
// Slow a priority vehicle facing an unsafe incursion, without silently granting priority.
// Paused timeline seconds are shared by rendering, map and assessment.
export function reactPriorityTraffic(exercise, time, state, sample, dt) {
  const actorPauses = {}, actorPauseRates = {}, reactingActors = [];
  const releasedActors = [...(state.releasedActors ?? [])];
  const actorYieldHolds = { ...(state.actorYieldHolds ?? {}) };
  for (const actor of exercise.priority.actors) {
    if (actor.yieldsToPlayer && actor.speed > 0) actorYieldHolds[actor.id] = (actor.delay ?? 0) + actor.holdDistance / actor.speed;
    // Integrate the previous slowdown before choosing the next one. No rewind
    // when fresh telemetry reaches the renderer between its animation frames.
    actorPauses[actor.id] = actorPauseSeconds(state, actor.id, time);
    if (state.triggerTime == null || dt <= 0 || actor.type === 'pedestrian' || actor.speed <= 0
      || time - state.triggerTime <= (actor.delay ?? 0)) continue;
    if (actor.yieldsToPlayer) {
      if (sample.z < exercise.priority.playerClearZ && !releasedActors.includes(actor.id)) releasedActors.push(actor.id);
      if (!releasedActors.includes(actor.id)) {
        const elapsed = Math.max(0, time - state.triggerTime - (actor.delay ?? 0));
        if (elapsed >= actor.holdDistance / actor.speed) {
          actorPauses[actor.id] = elapsed - actor.holdDistance / actor.speed;
          actorPauseRates[actor.id] = 1;
        }
        continue;
      }
    }
    const pose = priorityActorPose(actor, time, state.triggerTime, actorPauses[actor.id]);
    const dx = sample.x - pose.x, dz = sample.z - pose.z;
    const along = dx * -Math.sin(pose.yaw) + dz * -Math.cos(pose.yaw);
    const across = dx * Math.cos(pose.yaw) - dz * Math.sin(pose.yaw);
    if (along > 0 && along < 14 && Math.abs(across) < (exercise.rule === 'parking-exit' ? 2.5 : 3)) {
      const fraction = Math.max(0, Math.min(1, (along - 5) / 9));
      actorPauseRates[actor.id] = 1 - fraction;
      reactingActors.push(actor.id);
    }
  }
  return { actorPauses, actorPauseRates, reactingActors, releasedActors, actorYieldHolds, reactionTime: time };
}

export function stepPriorityScenario(session, sample, dt) {
  const exercise = session.exercise;
  if (!exercise.priority) return { state: session.priorityState, faults: [] };
  const state = { triggerTime: null, stopHold: 0, stopped: false, faulted: false, ...session.priorityState };
  const config = exercise.priority, faults = [];
  const axis = config.axis ?? 'z', direction = config.direction ?? -1;
  const across = axis === 'x' ? 'z' : 'x';
  const trigger = config.triggerLine ?? config.triggerZ, entry = config.entryLine ?? config.entryZ;
  const activationSignal = exercise.stages.find((stage) => stage.signal)?.signal;
  const activationAllowed = !config.triggerOnGreen || (activationSignal
    && viceCityTrafficSignalState(activationSignal.axis, activationSignal.ix, activationSignal.iz, sample.time) === 'green');
  if (state.triggerTime == null && activationAllowed && direction * (sample[axis] - trigger) >= 0) state.triggerTime = sample.time;
  Object.assign(state, reactPriorityTraffic(exercise, sample.time, state, sample, dt));
  const bumper = config.bumper ?? 2.6;
  const nose = sample[axis] + direction * bumper;
  const beforeLine = -direction * (nose - entry);
  if (beforeLine >= 0 && beforeLine <= 9 && Math.abs(sample[across] - exercise.spawn[across]) <= 3 && sample.speed < 1) {
    state.stopHold += dt;
    if (state.stopHold >= 1) state.stopped = true;
  } else state.stopHold = 0;
  if (!state.faulted && session.previous && -direction * (session.previous[axis] + direction * bumper - entry) > 0 && beforeLine <= 0) {
    if (config.stopRequired && !state.stopped) faults.push('STOP non marqué');
    if (!priorityRoadIsClear(exercise, sample.time, state)) faults.push(exercise.rule === 'narrow-passage' ? 'Passage étroit engagé sans céder en face' : exercise.rule === 'emergency-vehicle' ? 'Passage refusé au véhicule prioritaire en intervention' : exercise.rule === 'giratory' ? 'Priorité refusée au véhicule dans l’anneau' : exercise.rule === 'pedestrian' ? 'Priorité refusée au piéton' : exercise.rule === 'obstacle' ? 'Voie opposée engagée avant le passage du véhicule' : exercise.rule === 'blocked-junction' ? 'Carrefour engagé avec sortie bloquée' : exercise.rule === 'cyclist-turn' ? 'Priorité refusée au cycliste' : exercise.rule === 'left-turn' ? 'Virage à gauche engagé devant un véhicule en face' : exercise.rule === 'parking-exit' ? 'Sortie de stationnement sans céder le passage' : exercise.rule === 'lane-change' ? 'Changement de voie sans créneau suffisant' : 'Refus de priorité');
    if (faults.length) state.faulted = true;
  }
  if (exercise.rule === 'giratory' && session.previous) {
    const before = session.previous;
    const oldRadius = Math.hypot(before.x - 200, before.z - 200), radius = Math.hypot(sample.x - 200, sample.z - 200);
    if (oldRadius >= 12 && oldRadius <= 25 && radius >= 12 && radius <= 25) {
      const oldAngle = Math.atan2(before.z - 200, before.x - 200), angle = Math.atan2(sample.z - 200, sample.x - 200);
      const delta = Math.atan2(Math.sin(angle - oldAngle), Math.cos(angle - oldAngle));
      state.clockwiseTravel = (state.clockwiseTravel || 0) + Math.max(0, delta);
      if (state.clockwiseTravel > .25 && !state.wrongWay) { faults.push('Circulation à contresens dans le giratoire'); state.wrongWay = true; }
    }
  }
  return { state, faults };
}
