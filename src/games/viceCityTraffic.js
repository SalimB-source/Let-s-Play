export const VICE_CITY_SIGNAL_CYCLE_SECONDS = 26;
export const VICE_CITY_TRAFFIC_STOP_LINE = 18;

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Green phase for one street axis, with a brief amber and all-red clearance. */
export function viceCityTrafficSignalState(axis, intersectionXIndex, intersectionZIndex, elapsedSeconds) {
  const offsetIndex = positiveModulo(intersectionXIndex * 3 + intersectionZIndex * 5, 7);
  const phase = positiveModulo(elapsedSeconds + offsetIndex * 1.3, VICE_CITY_SIGNAL_CYCLE_SECONDS);
  if (axis === 'x') {
    if (phase < 10) return 'green';
    if (phase < 12) return 'yellow';
    return 'red';
  }
  if (phase >= 13 && phase < 23) return 'green';
  if (phase >= 23 && phase < 25) return 'yellow';
  return 'red';
}

/**
 * Advance a traffic car on its straight road lane. Red and amber phases use a
 * braking-distance speed cap and a hard stop line so frame timing cannot send
 * a car into a junction after its signal changes.
 */
export function stepViceCityTrafficVehicle(vehicle, dt, distanceToSignal, signalState, stopLine = VICE_CITY_TRAFFIC_STOP_LINE) {
  const canProceed = signalState === 'green';
  const distanceBeforeStop = Math.max(0, distanceToSignal - stopLine);
  const brakingDeceleration = 7.5;
  const targetSpeed = canProceed
    ? vehicle.maxSpeed
    : Math.min(vehicle.maxSpeed, Math.sqrt(2 * brakingDeceleration * distanceBeforeStop));
  const accelerationRate = targetSpeed < vehicle.speed ? brakingDeceleration : 3.2;
  const speed = vehicle.speed + clamp(targetSpeed - vehicle.speed, -accelerationRate * dt, accelerationRate * dt);
  let advance = speed * dt;
  let nextSpeed = speed;
  if (!canProceed && distanceToSignal - advance <= stopLine) {
    advance = Math.max(0, distanceBeforeStop);
    nextSpeed = 0;
  }
  return {
    progress: vehicle.progress + vehicle.direction * advance,
    speed: nextSpeed,
  };
}
