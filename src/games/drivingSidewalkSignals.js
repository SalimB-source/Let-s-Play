// Attach a roadside signal to the pavement support of its overhead counterpart.
// The support is already placed on the right-hand verge for that approach.
export function sidewalkSignalFor(overhead) {
  return { axis: overhead.axis, ix: overhead.ix, iz: overhead.iz,
    x: overhead.supportX, z: overhead.supportZ, yaw: overhead.yaw, sidewalk: true };
}

// Allocate only after both lists are complete. Interleaved construction must not
// let one intersection's overhead lamps overwrite another's roadside lamps.
export function indexTrafficSignalLenses(roadside, overhead) {
  [...roadside, ...overhead].forEach((spec, index) => {
    spec.lensIndices = { red: index * 3, yellow: index * 3 + 1, green: index * 3 + 2 };
  });
}
