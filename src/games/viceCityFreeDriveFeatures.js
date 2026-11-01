export const VICE_CITY_POINTS_OF_INTEREST = Object.freeze([
  Object.freeze({ id: 'garage', name: 'GARAGE MUNICIPAL', short: 'GARAGE', kind: 'garage', x: -200, z: 0 }),
  Object.freeze({ id: 'port', name: 'PORT DE VICE CITY', short: 'PORT', kind: 'poi', x: -200, z: 200 }),
  Object.freeze({ id: 'vice-point', name: 'VICE POINT', short: 'VICE POINT', kind: 'poi', x: 200, z: -200 }),
  Object.freeze({ id: 'downtown', name: 'DOWNTOWN', short: 'DOWNTOWN', kind: 'poi', x: 100, z: 100 }),
  Object.freeze({ id: 'airport', name: 'AÉROPORT', short: 'AÉROPORT', kind: 'poi', x: 300, z: -300 }),
]);

export const VICE_CITY_CHALLENGES = Object.freeze([
  Object.freeze({ id: 'delivery', title: 'Livraison express', category: 'MISSION', detail: 'Livrez le colis à Vice Point avant la fin du chrono.', reward: 180, target: { x: 200, z: -200 }, duration: 90 }),
  Object.freeze({ id: 'checkpoints', title: 'Parcours de checkpoints', category: 'MISSION', detail: 'Traversez les quatre points de contrôle du centre-ville.', reward: 240, checkpoints: [{ x: -100, z: 100 }, { x: -100, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }], duration: 110 }),
  Object.freeze({ id: 'speed', title: 'Défi de vitesse', category: 'MISSION', detail: 'Tenez plus de 75 km/h pendant cinq secondes.', reward: 150, targetSpeed: 20.84, duration: 35 }),
  Object.freeze({ id: 'escape', title: 'Échapper à la police', category: 'MISSION', detail: 'Atteignez 67 km/h et semez les patrouilles pendant 12 secondes.', reward: 300, targetSpeed: 18.62, duration: 45 }),
  Object.freeze({ id: 'time-trial', title: 'Contre-la-montre', category: 'ACTIVITÉ', detail: 'Enchaînez trois checkpoints le plus vite possible.', reward: 220, checkpoints: [{ x: -100, z: -100 }, { x: 0, z: 0 }, { x: 200, z: 200 }], duration: 65 }),
  Object.freeze({ id: 'jump', title: 'Sauts du pont', category: 'ACTIVITÉ', detail: 'Utilisez Espace pour sauter en roulant vite; réussissez trois sauts.', reward: 200, targetCount: 3, duration: 60 }),
  Object.freeze({ id: 'slalom', title: 'Slalom urbain', category: 'ACTIVITÉ', detail: 'Faufilez-vous près de six véhicules différents.', reward: 180, targetCount: 6, duration: 60 }),
  Object.freeze({ id: 'drift', title: 'Zone de drift', category: 'ACTIVITÉ', detail: 'Accumulez 800 points de dérapage.', reward: 200, targetScore: 800, duration: 75 }),
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
