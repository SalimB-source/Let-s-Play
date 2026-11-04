import { schoolRoadSpeedLimit } from './drivingSchoolRoads.js';

export const FRENCH_SPEED_SOURCE = 'https://www.securite-routiere.gouv.fr/reglementation-liee-aux-risques/reglementation-de-la-vitesse-au-volant';
export const FRENCH_URBAN_SPEED_LIMIT = 50;
// Gameplay tolerance only; never changes the legal limit shown on signs.
export const SCHOOL_SPEED_MARGIN_KMH = 3;

// Current exercises are urban, in normal visibility. Only the explicitly
// signed 20 km/h sections around bumps override the urban default.
export function drivingSpeedStatus(exercise, sample) {
  const limit = schoolRoadSpeedLimit(sample.x, sample.z);
  const speed = Math.abs(Number(sample.speed) || 0);
  const advisory = exercise.advisorySpeed ?? 30;
  return { limit, speed, advisory, excess: Math.max(0, speed - limit),
    overspeed: speed > limit, penalizedOverspeed: speed > limit + SCHOOL_SPEED_MARGIN_KMH,
    showWarning: speed > FRENCH_URBAN_SPEED_LIMIT + SCHOOL_SPEED_MARGIN_KMH, aboveAdvice: speed > advisory };
}
