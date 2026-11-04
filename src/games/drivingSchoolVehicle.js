// Vehicle tuning only: these are not legal road speed limits.
export function drivingSchoolVehicleTuning(tuning, schoolMode) {
  if (!schoolMode) return tuning;
  return {
    ...tuning,
    maxSpeed: Math.min(tuning.maxSpeed, 50 / 3.6),
    acceleration: Math.min(tuning.acceleration, 2),
    reverseMaxSpeed: Math.min(tuning.reverseMaxSpeed, 2),
  };
}

// A modest steering assist for school manoeuvres; free driving stays unchanged.
export function drivingSchoolYawRate(yawRate, schoolMode) {
  return yawRate * (schoolMode ? 1.15 : 1);
}
