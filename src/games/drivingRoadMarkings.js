import { rectangleTouchesRoundabout, sidewalkRangesOutsideRoundabout } from './roundaboutSidewalks.js';

export function keepOrdinaryRoadMarking(x, z, halfWidth, halfDepth, roundabout, parkingBounds) {
  if (rectangleTouchesRoundabout(x, z, halfWidth, halfDepth, roundabout)) return false;
  return !parkingBounds || x + halfWidth < parkingBounds.minX || x - halfWidth > parkingBounds.maxX
    || z + halfDepth < parkingBounds.minZ || z - halfDepth > parkingBounds.maxZ;
}

export function trimParkingSeparator(axis, fixed, width, ranges, roundabout, exerciseBounds) {
  const outsideRing = ranges.flatMap(([start, end]) => sidewalkRangesOutsideRoundabout(axis, fixed, width / 2, start, end, roundabout));
  if (!exerciseBounds) return outsideRing;
  const crossMin = axis === 'x' ? exerciseBounds.minZ : exerciseBounds.minX;
  const crossMax = axis === 'x' ? exerciseBounds.maxZ : exerciseBounds.maxX;
  if (fixed + width / 2 < crossMin || fixed - width / 2 > crossMax) return outsideRing;
  const min = axis === 'x' ? exerciseBounds.minX : exerciseBounds.minZ;
  const max = axis === 'x' ? exerciseBounds.maxX : exerciseBounds.maxZ;
  return outsideRing.flatMap(([start, end]) => [[start, Math.min(end, min)], [Math.max(start, max), end]])
    .filter(([start, end]) => end - start > .05);
}
