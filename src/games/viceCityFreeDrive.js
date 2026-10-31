const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const BRAKE_DECELERATION = 13.5;
const FREE_ROAM_WHEEL_ANGLE = 0.44;
const FREE_ROAM_WHEELBASE = 3.25;
const FREE_ROAM_MAX_LATERAL_GRIP = 1.55 * 9.81;
const FREE_ROAM_STEER_BUILD_RATE = 3.6;
const FREE_ROAM_STEER_RELEASE_RATE = 10;

/** Steering builds while a key is held, but eases back promptly on release. */
export function viceCityFreeDriveSteerStep(steer, input, dt) {
  const rate = input === 0 ? FREE_ROAM_STEER_RELEASE_RATE : FREE_ROAM_STEER_BUILD_RATE;
  return steer + (input - steer) * Math.min(1, Math.max(0, dt) * rate);
}

/** Gentler low-speed steering, with a more forgiving lateral-grip ceiling. */
export function viceCityFreeDriveYawRate(speed, steer) {
  if (Math.abs(speed) <= 0.1) return 0;
  const requestedYawRate = (speed / FREE_ROAM_WHEELBASE) * Math.tan(steer * FREE_ROAM_WHEEL_ANGLE);
  const gripYawLimit = FREE_ROAM_MAX_LATERAL_GRIP / Math.abs(speed);
  return Math.max(-gripYawLimit, Math.min(gripYawLimit, requestedYawRate));
}

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
    // Engine braking is deliberately noticeable when the accelerator is released.
    const drag = (0.9 + nextSpeed * nextSpeed * 0.0024) * dt;
    nextSpeed = nextSpeed > 0
      ? Math.max(0, nextSpeed - drag)
      : Math.min(0, nextSpeed + drag);
    if (Math.abs(nextSpeed) < 0.12) nextSpeed = 0;
  }

  return clamp(nextSpeed, -reverseMaxSpeed, maxSpeed);
}
