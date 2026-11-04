import { priorityActorPose, actorPauseSeconds } from './frenchPriorityExercises.js';
import { schoolPedestrianMotion } from './drivingSchoolPedestrian.js';

export function withDrivingAssistance(exercise, assistance = 'guided') {
  return { ...exercise, teachingAssistance: assistance === 'autonomous' ? 'autonomous' : 'guided' };
}
export function drivingTeachingEnabled(exercise) {
  return exercise?.teachingAssistance !== 'autonomous';
}
export function drivingLearningNotice(previous, next) {
  if (!previous || previous.status !== 'active') return null;
  if (next.faults.length > previous.faults.length) {
    const fault = next.faults.at(-1);
    return { kind: 'error', text: fault.reason || fault.label, until: next.elapsed + 6 };
  }
  if (next.checkpoint <= previous.checkpoint) return null;
  const stage = previous.route[previous.checkpoint];
  let text = 'Étape validée : poursuivez votre progression.';
  if (['stop', 'park', 'green-stop'].includes(stage.kind)) text = stage.kind === 'park' ? 'Voiture alignée et immobilisée dans la place autorisée.' : 'Arrêt complet validé dans la zone demandée.';
  if (stage.kind === 'bump') text = 'Ralentisseur franchi à allure adaptée.';
  if (stage.kind === 'signal') text = 'Passage autorisé par le feu : étape validée.';
  if (stage.kind === 'priority') text = previous.exercise.rule === 'priority-road' ? 'Route prioritaire : avancez sans arrêt systématique si la voie est libre.' : previous.exercise.id === 'yield-clear' ? 'Voie libre : aucun arrêt systématique n’était imposé.' : previous.exercise.rule === 'blocked-junction'
    ? 'Vous avez attendu que la sortie du carrefour soit libre.' : 'Vous avez laissé passer les usagers prioritaires.';
  return { kind: 'success', text, until: next.elapsed + 5 };
}
export function captureDrivingReview(exercise, state, sample, previous) {
  return {
    player: { x: sample.x, z: sample.z, heading: sample.heading ?? 0 },
    previous: previous ? { x: previous.x, z: previous.z } : null,
    actors: (exercise.priority?.actors ?? []).map(actor => {
      const pose = actor.type === 'pedestrian'
        ? schoolPedestrianMotion(actor, sample.time, state?.triggerTime)
        : priorityActorPose(actor, sample.time, state?.triggerTime, actorPauseSeconds(state, actor.id, sample.time));
      return { id: actor.id, type: actor.type, x: pose.x, z: pose.z, clear: pose.clear };
    }),
  };
}
export function reviewMapPoint(bounds, point) {
  return { x: 16 + (point.x - bounds.minX) / (bounds.maxX - bounds.minX) * 288,
    y: 16 + (point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ) * 188 };
}
