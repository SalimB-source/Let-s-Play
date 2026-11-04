export const PARKING_CHOICE_EXERCISE = {
  id: 'parking-choice', title: '19 · Choisir le stationnement autorisé', jurisdiction: 'FR', rule: 'parking-choice', article: 'R417-10',
  source: 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074228/',
  trafficSide: 'right', limit: 50, advisorySpeed: 15, duration: 150,
  summary: 'Dépasser une zone interdite au stationnement, puis se garer dans la deuxième place au panneau P.',
  theory: 'Le disque bleu à bord rouge avec une seule barre rouge interdit le stationnement, pas tout arrêt bref nécessaire à la circulation. Le panonceau précise une étendue de 20 m. Continuez jusqu’à la place blanche plus loin, signalée par un panneau P. Garez toute la voiture dans cette deuxième place. Les durées utilisées par la simulation servent à valider la manœuvre, pas à définir légalement un stationnement.',
  center: { x: -200, z: 250 }, spawn: { x: -202.35, z: 225, heading: Math.PI },
  bounds: { minX: -211, maxX: -189, minZ: 218, maxZ: 290 },
  parkingBay: { x: -205.1, z: 274, width: 3.6, depth: 8.2, side: -1 },
  parkingChoice: {
    forbidden: { x: -205.1, z: 244, width: 3.6, depth: 20 },
    sign: { x: -207.9, z: 234, yaw: Math.PI, extent: 20 },
    vehicleHalfWidth: 1.2, vehicleHalfLength: 2.6,
  },
  stages: [
    { x: -202.35, z: 258, radius: 2, kind: 'drive', instruction: 'Stationnement interdit ici. Continuez jusqu’au panneau P.' },
    { x: -205.1, z: 274, radius: 1.8, heading: Math.PI, kind: 'park', hold: 2,
      via: [{ x: -202.35, z: 266 }, { x: -205.1, z: 271 }], instruction: 'Garez-vous dans la deuxième place, au panneau P.' },
  ],
};

export function fitsAllowedParking(exercise, sample) {
  const bay = exercise.parkingBay, config = exercise.parkingChoice;
  if (!bay || !config || !Number.isFinite(sample.heading)) return false;
  const heading = exercise.stages.at(-1).heading;
  if (Math.cos(sample.heading - heading) < Math.cos(Math.PI / 12)) return false;
  const c = Math.abs(Math.cos(sample.heading)), s = Math.abs(Math.sin(sample.heading));
  const halfX = config.vehicleHalfWidth * c + config.vehicleHalfLength * s;
  const halfZ = config.vehicleHalfLength * c + config.vehicleHalfWidth * s;
  return Math.abs(sample.x - bay.x) + halfX <= bay.width / 2
    && Math.abs(sample.z - bay.z) + halfZ <= bay.depth / 2;
}

export function assessParkingChoice(exercise, previous, sample, dt) {
  if (!exercise.parkingChoice) return null;
  const zone = exercise.parkingChoice.forbidden;
  const inZone = Math.abs(sample.x - zone.x) <= zone.width / 2 && Math.abs(sample.z - zone.z) <= zone.depth / 2;
  const attempting = inZone && sample.speed < 1;
  const illegalHold = attempting ? (previous?.illegalHold ?? 0) + dt : 0;
  const alreadyReported = attempting && previous?.reported;
  // A deliberate stationary attempt in this empty exercise, not a legal time definition.
  const fault = illegalHold >= 3 && !alreadyReported;
  return { state: { illegalHold, reported: Boolean(alreadyReported || fault) }, fault };
}

export function drawNoParkingSign(context) {
  context.beginPath(); context.arc(128, 128, 115, 0, Math.PI * 2);
  context.fillStyle = '#1661b1'; context.fill();
  context.strokeStyle = '#d5242b'; context.lineWidth = 18; context.stroke();
  context.beginPath(); context.moveTo(49, 49); context.lineTo(207, 207); context.stroke();
}
