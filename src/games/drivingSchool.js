import { captureDrivingReview } from './drivingLearning.js';
import { assessParkingChoice } from './parkingChoiceExercise.js';
import { drivingFaultFeedback } from './drivingFaultFeedback.js';
import { drivingSpeedStatus } from './drivingSpeedRules.js';
import { stepPriorityScenario } from './frenchPriorityExercises.js';
import { SCHOOL_STOP_JUNCTION, schoolStopApproach } from './drivingSchoolRoads.js';
import { viceCityTrafficSignalState } from './viceCityTraffic.js';

export { DRIVING_EXERCISES as DRIVING_LESSONS } from './drivingExercises.js';
import { DRIVING_EXERCISES, insideExercise, stepExerciseObjective } from './drivingExercises.js';

export function createDrivingSession(mode, lesson = DRIVING_EXERCISES[0]) {
  return { mode, exercise: lesson, limit: lesson.limit, route: lesson.stages, checkpoint: 0, elapsed: 0, distance: 0, faults: [], score: 100, status: 'active', previous: null, stops: {}, bumpFaults: {}, speeding: 0, lastSpeedFault: -10, lastCollision: -10 };
}
export function stepDrivingSession(session, sample) {
  if (session.status !== 'active') return session;
  const next = { ...session, faults: [...session.faults], stops: { ...session.stops }, bumpFaults: { ...session.bumpFaults }, previous: sample };
  const prev = session.previous;
  const dt = prev ? Math.max(0, Math.min(0.5, sample.time - prev.time)) : 0;
  next.elapsed += dt;
  if (prev) next.distance += Math.hypot(sample.x - prev.x, sample.z - prev.z);
  const fault = (label, points, critical = false) => {
    const context = { limit: next.roadLimit, speed: sample.speed, exercise: session.exercise };
    next.faults.push({ label, points, critical, at: next.elapsed, checkpoint: session.checkpoint,
      review: captureDrivingReview(session.exercise, next.priorityState, sample, prev),
      position: { x: sample.x, z: sample.z }, speed: sample.speed, distance: next.distance,
      ...drivingFaultFeedback(label, context) });
    next.score = Math.max(0, next.score - points);
  };
  next.speedStatus = drivingSpeedStatus(session.exercise, sample);
  next.roadLimit = next.speedStatus.limit;
  next.speeding = next.speedStatus.penalizedOverspeed ? session.speeding + dt : 0;
  // Apply the requested game margin, without changing posted legal limits.
  // The score is pedagogical: one penalty per continuous speeding episode.
  if (next.speedStatus.penalizedOverspeed && !session.speedStatus?.penalizedOverspeed) {
    fault('Vitesse maximale autorisée dépassée', 10); next.lastSpeedFault = next.elapsed;
  }
  if (!prev) return next;
  const parking = assessParkingChoice(session.exercise, session.parkingState, sample, dt);
  if (parking) {
    next.parkingState = parking.state;
    if (parking.fault) fault('Stationnement dans la zone interdite', 30, true);
  }
  if (sample.damage > prev.damage && next.elapsed - next.lastCollision > 2) { fault('Collision', 25, true); next.lastCollision = next.elapsed; }
  for (const axis of ['x', 'z']) for (const direction of [-1, 1]) {
    const approach = schoolStopApproach(axis, direction);
    const across = axis === 'x' ? 'z' : 'x';
    const key = `${axis}:${direction}`;
    const before = direction * (prev[axis] - approach.line);
    const after = direction * (sample[axis] - approach.line);
    if (Math.abs(sample[across] - approach.across) > 7) { next.stops[key] = 0; continue; }
    if (after < -12 || after > 15) { next.stops[key] = 0; continue; }
    if (after >= -8 && after <= 0 && sample.speed < 1) next.stops[key] = (next.stops[key] || 0) + dt;
    if (before < 0 && after >= 0 && (next.stops[key] || 0) < 1) fault('STOP non marqué', 30, true);
  }
  const priority = stepPriorityScenario({ ...next, previous: prev }, sample, dt);
  next.priorityState = priority.state;
  for (const label of priority.faults) fault(label, 30, true);
  // Entry across the same 18 m control line used by the map’s traffic.
  for (const axis of ['x', 'z']) {
    const across = axis === 'x' ? 'z' : 'x';
    const crossIndex = Math.round(sample[across] / 100);
    if (Math.abs(sample[across] - crossIndex * 100) > 7) continue;
    const direction = Math.sign(sample[axis] - prev[axis]);
    if (!direction) continue;
    const index = Math.round(sample[axis] / 100);
    const ix = axis === 'x' ? index : crossIndex;
    const iz = axis === 'z' ? index : crossIndex;
    if (session.exercise.priority && !session.exercise.priority.keepTrafficLights && ix * 100 === session.exercise.center.x && iz * 100 === session.exercise.center.z) continue;
    if (ix * 100 === SCHOOL_STOP_JUNCTION.x && iz * 100 === SCHOOL_STOP_JUNCTION.z) continue;
    if (Math.abs(ix) > 3 || Math.abs(iz) > 3 || ix === 0 || (iz === 0 && Math.abs(ix * 100) <= 120) || (ix === 2 && iz === 2)) continue;
    const line = index * 100 - direction * 18;
    if (direction * (prev[axis] - line) < 0 && direction * (sample[axis] - line) >= 0 && viceCityTrafficSignalState(axis, ix, iz, sample.time) === 'red') fault('Feu rouge franchi', 30, true);
  }
  if (!insideExercise(session.exercise.bounds, sample.x, sample.z)) {
    next.status = 'outside'; return next;
  }
  const stage = session.exercise.stages[session.checkpoint];
  const signal = stage?.signal;
  const objective = stepExerciseObjective({ ...next, previous: prev }, {
    ...sample, signal: signal ? viceCityTrafficSignalState(signal.axis, signal.ix, signal.iz, sample.time) : null,
  }, dt);
  next.checkpoint = objective.checkpoint; next.hold = objective.hold; next.bumpCrossed = objective.bumpCrossed;
  if (next.checkpoint > session.checkpoint) next.lastCheckpointAt = next.elapsed;
  if (next.checkpoint === session.route.length) next.status = 'complete';
  if (next.elapsed >= session.exercise.duration) next.status = 'timeout';
  return next;
}
export function drivingSessionPassed(session) {
  return session.status === 'complete' && session.score >= 70 && !session.faults.some((fault) => fault.critical);
}
