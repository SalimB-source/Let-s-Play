// Timings vary per attempt; paths, signs, stop lines and right-hand lanes never do.
// Render and assessment share this same exercise instance throughout a run.
export function varyDrivingTraffic(exercise, random = Math.random) {
  if (!exercise.priority) return exercise;
  const actors = exercise.priority.actors.map((actor) => {
    if (actor.speed === 0) return actor;
    const speedFactor = .9 + random() * .2;
    const arrivalDelay = random() * 1.2;
    return { ...actor, speed: actor.speed * speedFactor, delay: (actor.delay ?? 0) + arrivalDelay };
  });
  return { ...exercise, priority: { ...exercise.priority, actors } };
}
