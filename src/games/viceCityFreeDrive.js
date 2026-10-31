const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const BRAKE_DECELERATION = 13.5;

/**
 * Update the signed free-roam speed: down brakes forward motion, then drives
 * backward once stopped; up brakes reverse motion before driving forward.
 */
export function viceCityFreeDriveSpeedStep({
  speed,
  throttle,
  brake,
  dt,
  maxSpeed,
  acceleration,
  reverseMaxSpeed,
}) {
  let nextSpeed = speed;
  const reverseAcceleration = Math.max(2.5, acceleration * 0.65);

  if (brake) {
    if (nextSpeed > 0) nextSpeed = Math.max(0, nextSpeed - BRAKE_DECELERATION * dt);
    else nextSpeed = Math.max(-reverseMaxSpeed, nextSpeed - reverseAcceleration * dt);
  } else if (throttle) {
    if (nextSpeed < 0) nextSpeed = Math.min(0, nextSpeed + BRAKE_DECELERATION * dt);
    else {
      const speedRatio = nextSpeed / maxSpeed;
      nextSpeed += acceleration * Math.max(0.12, 1 - speedRatio * speedRatio) * dt;
    }
  } else {
    const drag = (0.42 + nextSpeed * nextSpeed * 0.0011) * dt;
    nextSpeed = nextSpeed > 0
      ? Math.max(0, nextSpeed - drag)
      : Math.min(0, nextSpeed + drag);
    if (Math.abs(nextSpeed) < 0.12) nextSpeed = 0;
  }

  return clamp(nextSpeed, -reverseMaxSpeed, maxSpeed);
}
