import { priorityActorPose } from './frenchPriorityExercises.js';

export function schoolPedestrianMotion(actor, time, triggerTime) {
  const pose = priorityActorPose(actor, time, triggerTime);
  const pathLength = actor.points.slice(1).reduce((length, point, i) =>
    length + Math.hypot(point.x - actor.points[i].x, point.z - actor.points[i].z), 0);
  const walking = triggerTime != null && actor.speed > 0 && pose.traveled < pathLength;
  // The model faces local -Z. priorityActorPose already gives its Three.js yaw.
  // Distance-based steps stay in sync with motion, even at low frame rates.
  const phase = walking ? pose.traveled * Math.PI * 2 / .95 : 0;
  return { ...pose, walking, phase, stride: Math.sin(phase) * .42 };
}

export function animateSchoolPedestrian(person, motion) {
  person.group.rotation.y = motion.yaw;
  person.legs.forEach((leg, i) => {
    const stride = motion.stride * (i ? -1 : 1);
    leg.rotation.x = stride;
    if (leg.userData.knee) leg.userData.knee.rotation.x = Math.max(0, -stride) * 1.2;
    if (leg.userData.foot) leg.userData.foot.rotation.x = -Math.max(0, -stride) * .3;
    person.arms[i].rotation.x = -stride * .65;
  });
}
