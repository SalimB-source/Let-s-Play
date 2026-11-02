const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const BRAKE_DECELERATION = 13.5;
const FREE_ROAM_WHEEL_ANGLE = 0.44;
const FREE_ROAM_WHEELBASE = 3.25;
const FREE_ROAM_MAX_LATERAL_GRIP = 1.55 * 9.81;
const FREE_ROAM_STEER_BUILD_RATE = 3.6;
const FREE_ROAM_STEER_RELEASE_RATE = 10;

/** Prevent a long movement step from tunnelling through either canal wall. */
export function viceCityCanalBarrierCrossed(
  fromX, fromZ, toX, toZ, canalHalfWidth = 20, bridgeHalfWidth = 7.8,
  overpassCenters = [], overpassHalfWidth = 0,
) {
  const deltaX = toX - fromX;
  if (Math.abs(deltaX) < 1e-8) return false;
  // The rendered wall is 0.7 m thick; stop cars at its centreline.
  const wallOffset = 0.35;
  for (const side of [-1, 1]) {
    const wallX = side * (canalHalfWidth + wallOffset);
    const crossed = (fromX < wallX && toX >= wallX) || (fromX > wallX && toX <= wallX);
    if (!crossed) continue;
    const progress = (wallX - fromX) / deltaX;
    const crossingZ = fromZ + (toZ - fromZ) * progress;
    const crossesOuterOverpass = overpassCenters.some((centerZ) =>
      Math.abs(crossingZ - centerZ) <= overpassHalfWidth,
    );
    if (Math.abs(crossingZ) > bridgeHalfWidth && !crossesOuterOverpass) return true;
  }
  return false;
}

/** Tighter parked-car obstacle extents so the player can pass close by. */
export function viceCityFreeDriveParkedCarHitbox(width = 1.94, length = 4) {
  const carWidth = Number(width) || 1.94;
  const carLength = Number(length) || 4;
  return {
    halfWidth: Math.max(1.55, carWidth / 2 + 0.65),
    halfLength: Math.max(3.4, carLength / 2 + 1.45),
  };
}

/** Normalize a virtual stick, leaving a small dead zone around its centre. */
export function viceCityFreeDriveJoystickInput(x = 0, y = 0) {
  const applyDeadZone = (value) => {
    const safe = clamp(Number(value) || 0, -1, 1);
    const magnitude = Math.abs(safe);
    if (magnitude <= 0.14) return 0;
    return Math.sign(safe) * (magnitude - 0.14) / 0.86;
  };
  const steer = applyDeadZone(x);
  const throttleAxis = applyDeadZone(y);
  return {
    steer,
    throttle: throttleAxis < -0.25,
    brake: throttleAxis > 0.25,
  };
}

/** Horizontal keyboard input that rotates the pedestrian body. */
export function viceCityFreeDriveTurnInput(left = false, right = false) {
  return clamp(Number(right) - Number(left), -1, 1);
}

/** Keep the body on its own heading while rotating only the weapon pose toward the aim point. */
export function viceCityFreeDriveAimPose(bodyHeading = 0, aimHeading = bodyHeading) {
  const body = Number(bodyHeading) || 0;
  const aim = Number(aimHeading) || 0;
  const armYaw = body - aim;
  return {
    bodyHeading: body,
    armYaw: Math.atan2(Math.sin(armYaw), Math.cos(armYaw)),
  };
}

/** Convert a 3D aim vector into independent body-relative yaw and weapon pitch. */
export function viceCityFreeDriveAimVectorPose(bodyHeading = 0, directionX = 0, directionY = 0, directionZ = -1) {
  const body = Number(bodyHeading) || 0;
  const x = Number(directionX) || 0;
  const y = Number(directionY) || 0;
  const z = Number(directionZ) || 0;
  const length = Math.hypot(x, y, z);
  if (length < 1e-8) return { ...viceCityFreeDriveAimPose(body, body), pitch: 0 };
  const heading = Math.atan2(x, -z);
  const armYaw = body - heading;
  return {
    bodyHeading: body,
    armYaw: Math.atan2(Math.sin(armYaw), Math.cos(armYaw)),
    pitch: Math.asin(clamp(y / length, -1, 1)),
  };
}

/** Normalize forward and strafe input so diagonal pedestrian movement is not faster. */
export function viceCityFreeDriveFootVector(forward = 0, strafe = 0) {
  const safeForward = clamp(Number(forward) || 0, -1, 1);
  const safeStrafe = clamp(Number(strafe) || 0, -1, 1);
  const length = Math.hypot(safeForward, safeStrafe);
  const scale = length > 1 ? 1 / length : 1;
  return {
    forward: safeForward * scale,
    strafe: safeStrafe * scale,
    magnitude: Math.min(1, length),
  };
}

/** Smooth world-space foot velocity without letting diagonal input exceed its target speed. */
export function viceCityFreeDriveVelocityStep(velocityX, velocityZ, targetX, targetZ, dt) {
  const currentX = Number(velocityX) || 0;
  const currentZ = Number(velocityZ) || 0;
  const desiredX = Number(targetX) || 0;
  const desiredZ = Number(targetZ) || 0;
  const targetSpeed = Math.hypot(desiredX, desiredZ);
  const reversing = targetSpeed > 0.02 && currentX * desiredX + currentZ * desiredZ < 0;
  const acceleration = targetSpeed < 0.02 ? 13 : reversing ? 12 : 8.5;
  const differenceX = desiredX - currentX;
  const differenceZ = desiredZ - currentZ;
  const difference = Math.hypot(differenceX, differenceZ);
  const maxChange = acceleration * Math.max(0, Number(dt) || 0);
  const scale = difference > maxChange && difference > 1e-8 ? maxChange / difference : 1;
  return {
    x: currentX + differenceX * scale,
    z: currentZ + differenceZ * scale,
  };
}

/** Smooth A/D turn-in-place input; aiming never contributes to body rotation. */
export function viceCityFreeDriveTurnStep(turnRate, input, dt, maxRate = 2.35) {
  const safeRate = Number(turnRate) || 0;
  const targetRate = clamp(Number(input) || 0, -1, 1) * Math.max(0, Number(maxRate) || 0);
  const response = Math.abs(targetRate) > 0.01 ? 8.5 : 12;
  const blend = 1 - Math.exp(-response * Math.max(0, Number(dt) || 0));
  return safeRate + (targetRate - safeRate) * blend;
}

/** Fixed-duration, eased in-place 180-degree turn used by the on-foot reverse input. */
export function viceCityFreeDriveTurnAround(startHeading = 0, targetHeading = Math.PI, elapsed = 0, duration = 1) {
  const start = Number(startHeading) || 0;
  const target = Number(targetHeading) || 0;
  const safeDuration = Math.max(0.001, Number(duration) || 1);
  const progress = clamp((Number(elapsed) || 0) / safeDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return {
    heading: start + (target - start) * eased,
    turnRate: (target - start) * 6 * progress * (1 - progress) / safeDuration,
    complete: progress >= 1,
  };
}

/** Dead-zoned, length-limited 2D stick vector for third-person on-foot movement. */
export function viceCityFreeDriveJoystickVector(x = 0, y = 0) {
  const safeX = clamp(Number(x) || 0, -1, 1);
  const safeY = clamp(Number(y) || 0, -1, 1);
  const length = Math.hypot(safeX, safeY);
  if (length <= 0.14) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(1, (length - 0.14) / 0.86);
  const scale = magnitude / length;
  return { x: safeX * scale, y: safeY * scale, magnitude };
}

/** A lightweight projectile nudges the car without overpowering its mass. */
export function viceCityFreeDriveShotImpulse(mass = 1, strength = 5.2) {
  const safeMass = Math.max(0.35, Number(mass) || 1);
  const safeStrength = clamp(Number(strength) || 0, 0, 20);
  return safeStrength / safeMass;
}

/** One impact impulse plus steady pushing while the player keeps contact. */
export function viceCityFreeDriveParkedCarImpulse(speed, mass, dt = 1 / 60, firstContact = false) {
  const impactSpeed = Math.abs(Number(speed) || 0);
  if (impactSpeed <= 0.25) return 0;
  const safeMass = Math.max(0.2, Number(mass) || 1);
  if (firstContact) return Math.min(7, Math.max(1, impactSpeed * 0.62) / safeMass);
  return impactSpeed * Math.max(0, dt) * 1.35 / safeMass;
}

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
    if (nextSpeed > 0) {
      // Le frein mord davantage à haute vitesse ; les modèles très puissants
      // reçoivent un bonus nettement plus marqué lié à leur vitesse maximale.
      const highPerformanceBrakeBonus = Math.max(0, maxSpeed - 25) * 0.2;
      const brakeDeceleration = BRAKE_DECELERATION
        + Math.abs(nextSpeed) * 0.12
        + highPerformanceBrakeBonus;
      nextSpeed = Math.max(0, nextSpeed - brakeDeceleration * dt);
    } else nextSpeed = Math.max(-reverseMaxSpeed, nextSpeed - reverseAcceleration * dt);
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

/** Select the car-glass surface facing the incoming bullet, not the far side. */
export function viceCityFreeDriveGlassEntryFace(directionX = 0, directionZ = -1) {
  const x = Number(directionX) || 0;
  const z = Number(directionZ) || 0;
  if (Math.abs(x) > Math.abs(z)) {
    const side = -Math.sign(x) || 1;
    return { axis: 'side', side, rotation: side * Math.PI / 2 };
  }
  const end = -Math.sign(z) || -1;
  return { axis: 'end', end, rotation: end < 0 ? Math.PI : 0 };
}
