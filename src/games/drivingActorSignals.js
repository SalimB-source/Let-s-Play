import { viceCityTrafficSignalState, VICE_CITY_SIGNAL_CYCLE_SECONDS } from './viceCityTraffic.js';
const schedules = new WeakMap();

// Straight actors stop with their front before the same control line as cars.
// Once engaged on green they finish crossing, even if the phase changes.
export function actorTraveledDistance(actor, time, triggerTime, pausedSeconds = 0) {
  if (triggerTime == null || actor.speed <= 0) return 0;
  const startAt = triggerTime + (actor.delay ?? 0);
  const elapsed = Math.max(0, time - startAt - pausedSeconds);
  if (!actor.signal) return elapsed * actor.speed;
  let schedule = schedules.get(actor);
  if (!schedule || schedule.triggerTime !== triggerTime) {
    const { axis, direction, line, ix, iz } = actor.signal;
    const stopDistance = Math.max(0, direction * (line - actor.points[0][axis]) - (actor.signal.bumper ?? 2.6));
    let goAt = startAt + stopDistance / actor.speed;
    for (let i = 0; i <= VICE_CITY_SIGNAL_CYCLE_SECONDS * 20; i++) {
      if (viceCityTrafficSignalState(axis, ix, iz, goAt) === 'green') break;
      goAt += .05;
    }
    schedule = { triggerTime, goAt, stopDistance }; schedules.set(actor, schedule);
  }
  if (elapsed * actor.speed <= schedule.stopDistance) return elapsed * actor.speed;
  return schedule.stopDistance + Math.max(0, time - schedule.goAt - pausedSeconds) * actor.speed;
}
