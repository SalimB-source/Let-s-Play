export const VICE_CITY_POINTS_OF_INTEREST = Object.freeze([
  Object.freeze({ id: 'garage', name: 'GARAGE MUNICIPAL', short: 'GARAGE', kind: 'garage', x: -200, z: 0 }),
  Object.freeze({ id: 'port', name: 'PORT DE VICE CITY', short: 'PORT', kind: 'poi', x: -200, z: 200 }),
  Object.freeze({ id: 'vice-point', name: 'VICE POINT', short: 'VICE POINT', kind: 'poi', x: 200, z: -200 }),
  Object.freeze({ id: 'downtown', name: 'DOWNTOWN', short: 'DOWNTOWN', kind: 'poi', x: 100, z: 100 }),
  Object.freeze({ id: 'airport', name: 'AÉROPORT', short: 'AÉROPORT', kind: 'poi', x: 300, z: -300 }),
]);

export const VICE_CITY_CHALLENGES = Object.freeze([
  Object.freeze({ id: 'delivery', title: 'Livraison express', category: 'MISSION', detail: 'Conduisez jusqu’au repère rose de Vice Point et entrez dans son cercle, à moins de 13 m.', reward: 180, target: { x: 200, z: -200 }, duration: 90 }),
  Object.freeze({ id: 'checkpoints', title: 'Parcours de checkpoints', category: 'MISSION', detail: 'Suivez le trait turquoise sur la minicarte et traversez les 4 cercles de checkpoint dans l’ordre.', reward: 240, checkpoints: [{ x: -100, z: 100 }, { x: -100, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }], duration: 110 }),
  Object.freeze({ id: 'speed', title: 'Défi de vitesse', category: 'MISSION', detail: 'Accélérez avec ↑ / W ou le joystick. Maintenez plus de 75 km/h sans interruption pendant 5 secondes.', reward: 150, targetSpeed: 20.84, duration: 35 }),
  Object.freeze({ id: 'escape', title: 'Échapper à la police', category: 'MISSION', detail: 'Maintenez plus de 67 km/h tout en restant à plus de 23 m de la patrouille, sans interruption pendant 12 secondes.', reward: 300, targetSpeed: 18.62, duration: 45 }),
  Object.freeze({ id: 'time-trial', title: 'Contre-la-montre', category: 'ACTIVITÉ', detail: 'Suivez le trait turquoise et traversez les 3 checkpoints dans l’ordre avant la fin du chrono.', reward: 220, checkpoints: [{ x: -100, z: -100 }, { x: 0, z: 0 }, { x: 200, z: 200 }], duration: 65 }),
  Object.freeze({ id: 'jump', title: 'Sauts du pont', category: 'ACTIVITÉ', detail: 'Roulez à plus de 32 km/h puis appuyez sur Espace (ou ↟ sur mobile). Réussissez 3 sauts.', reward: 200, targetCount: 3, duration: 60 }),
  Object.freeze({ id: 'slalom', title: 'Slalom urbain', category: 'ACTIVITÉ', detail: 'À plus de 25 km/h, passez à 3,6–10 m de 6 voitures différentes sans les percuter.', reward: 180, targetCount: 6, duration: 60 }),
  Object.freeze({ id: 'drift', title: 'Zone de drift', category: 'ACTIVITÉ', detail: 'À plus de 25 km/h, braquez à gauche ou à droite pour déraper et atteindre 800 points.', reward: 200, targetScore: 800, duration: 75 }),
]);

const STREET_NAMES = Object.freeze([
  'WASHINGTON AVE', 'OCEAN DR', 'COLLINS AVE', 'VICE POINT BLVD',
  'PALM AVE', 'BISCAYNE AVE', 'STARFISH ISLAND RD',
]);
const CROSS_STREETS = Object.freeze(['1ST ST', '2ND ST', '3RD ST', '4TH ST', '5TH ST', '6TH ST', '7TH ST']);

export function viceCityStreetName(x, z) {
  const xIndex = Math.max(0, Math.min(6, Math.round((x + 300) / 100)));
  const zIndex = Math.max(0, Math.min(6, Math.round((z + 300) / 100)));
  const vertical = STREET_NAMES[xIndex];
  const cross = CROSS_STREETS[zIndex];
  return Math.abs(x - (xIndex * 100 - 300)) <= Math.abs(z - (zIndex * 100 - 300))
    ? vertical : cross;
}

export function viceCityGpsRoute(start, target) {
  if (!start || !target) return [];
  const route = [{ x: start.x, z: start.z }];
  const startSide = Math.sign(start.x);
  const targetSide = Math.sign(target.x);
  if (startSide && targetSide && startSide !== targetSide) {
    const bridgeEdge = 25;
    route.push({ x: startSide * bridgeEdge, z: start.z });
    route.push({ x: startSide * bridgeEdge, z: 0 });
    route.push({ x: -startSide * bridgeEdge, z: 0 });
    route.push({ x: -startSide * bridgeEdge, z: target.z });
    route.push({ x: target.x, z: target.z });
  } else {
    route.push({ x: target.x, z: start.z });
    route.push({ x: target.x, z: target.z });
  }
  return route.filter((point, index) => index === 0
    || Math.hypot(point.x - route[index - 1].x, point.z - route[index - 1].z) > 0.1);
}

export function createViceCityChallenge(id, startedAt = 0) {
  const spec = VICE_CITY_CHALLENGES.find((challenge) => challenge.id === id);
  if (!spec) return null;
  return {
    ...spec,
    checkpoints: spec.checkpoints ? spec.checkpoints.map((point) => ({ ...point })) : undefined,
    startedAt,
    remaining: spec.duration,
    checkpointIndex: 0,
    progress: 0,
    score: 0,
    passedVehicles: new Set(),
    status: 'active',
  };
}


export function viceCityChallengeProgress(challenge) {
  if (!challenge) return { label: '', ratio: 0 };
  const bounded = (value, total) => Math.max(0, Math.min(1, total > 0 ? value / total : 0));
  if (challenge.status === 'complete') return { label: 'OBJECTIF ATTEINT', ratio: 1 };
  if (challenge.id === 'delivery') return { label: 'LIVRAISON · REPÈRE ROSE', ratio: bounded(challenge.checkpointIndex, 1) };
  if (challenge.checkpoints) {
    const total = challenge.checkpoints.length;
    return { label: `CHECKPOINT ${Math.min(challenge.checkpointIndex + 1, total)} / ${total}`, ratio: bounded(challenge.checkpointIndex, total) };
  }
  if (challenge.id === 'speed') return { label: `MAINTENIR 75 KM/H · ${Math.min(challenge.progress, 5).toFixed(1)} / 5 S`, ratio: bounded(challenge.progress, 5) };
  if (challenge.id === 'escape') return { label: `> 23 M DES PATROUILLES · ${Math.min(challenge.progress, 12).toFixed(1)} / 12 S`, ratio: bounded(challenge.progress, 12) };
  if (challenge.id === 'jump') return { label: `SAUTS RÉUSSIS · ${Math.floor(challenge.progress)} / ${challenge.targetCount}`, ratio: bounded(challenge.progress, challenge.targetCount) };
  if (challenge.id === 'slalom') return { label: `VOITURES FRÔLÉES · ${Math.floor(challenge.progress)} / ${challenge.targetCount}`, ratio: bounded(challenge.progress, challenge.targetCount) };
  if (challenge.id === 'drift') return { label: `SCORE DRIFT · ${Math.floor(challenge.score)} / ${challenge.targetScore} PTS`, ratio: bounded(challenge.score, challenge.targetScore) };
  return { label: '', ratio: 0 };
}
