import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_TURNS,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
  cityRushChasePlacement,
} from '../src/games/cityRushRules.js';

// Les panneaux du tōgé dessinent leur police japonaise sur un canvas 2D : on
// fournit le minimum qu'un navigateur donnerait au moteur 3D.
const context2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
  closePath() {}, lineTo() {}, moveTo() {}, clearRect() {}, save() {}, restore() {},
  createLinearGradient: () => ({ addColorStop() {} }),
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  TOUGE_ROAD_HALF,
  CAMERA_CORRIDOR_RADIUS,
  ROAD_CORRIDOR_RADIUS,
  buildCameraCorridor,
  cameraCorridorBlocked,
  cameraCorridorLateral,
  TOUGE_TURN_SIGHTLINE_BUFFER_METERS,
  tougeTurnSightlineClearance,
} = await import('../src/games/tougeStage.js');

const profile = CITY_RUSH_TRACK_PROFILE_TOUGE;
const atKm = (km) => (km / CITY_RUSH_TOUGE.lengthKm) * CITY_RUSH_LAP_LENGTH;
const centreAt = (metre) => ({ x: profile.offset(metre), z: -profile.forward(metre) * CITY_RUSH_SCROLL_SCALE });

/** Les points du couloir, séparés par ce qu'ils protègent. */
function splitCorridor(corridor) {
  const camera = [];
  const road = [];
  for (const points of corridor.values()) {
    for (const [x, z, radius] of points) {
      if (radius === CAMERA_CORRIDOR_RADIUS) camera.push({ x, z });
      else road.push({ x, z, radius });
    }
  }
  return { camera, road };
}

/** Distance d'un point monde à la ligne centrale, cherchée sur tout le tour. */
function distanceToRoad(point, samples) {
  let best = Number.POSITIVE_INFINITY;
  for (const centre of samples) best = Math.min(best, Math.hypot(point.x - centre.x, point.z - centre.z));
  return best;
}

test('le couloir de la caméra couvre la chaussée et les épingles de la descente', () => {
  const corridor = buildCameraCorridor();
  const { camera, road } = splitCorridor(corridor);
  const samples = [];
  for (let metre = 0; metre < CITY_RUSH_LAP_LENGTH; metre += 0.5) samples.push(centreAt(metre));

  // Toute la chaussée est protégée : un point par mètre de piste.
  assert.equal(road.length, CITY_RUSH_LAP_LENGTH, 'la ligne centrale est relevée sur toute la descente');
  assert.ok(road.every((point) => point.radius === ROAD_CORRIDOR_RADIUS));
  assert.ok(ROAD_CORRIDOR_RADIUS > TOUGE_ROAD_HALF,
    `le couloir de la route couvre l'asphalte (${ROAD_CORRIDOR_RADIUS} m pour ${TOUGE_ROAD_HALF} m de demi-largeur)`);
  // Un cèdre de la bande plantée ne peut pas atteindre la chaussée qui longe son
  // propre mètre : le couloir de la route n'écarte que les arbres des virages
  // voisins, pas la forêt du bord de route.
  assert.ok(ROAD_CORRIDOR_RADIUS < TOUGE_ROAD_HALF + 5.5,
    'la forêt du bord de route reste plantée où elle est');

  // La caméra décrochée n’apparaît qu’autour des quatre virages isolés,
  // pas sur les longues lignes droites qui les séparent.
  assert.ok(camera.length > 50 && camera.length < 150,
    `la caméra quitte la chaussée sur ${camera.length} mètres de piste`);

  // À 60°, la caméra quitte le ruban mais reste dans le bas-côté, juste avant
  // la bande plantée : un arbre peut donc encore être à portée de l'objectif.
  let shallowest = Number.POSITIVE_INFINITY;
  let deepest = 0;
  for (const point of camera) {
    const off = distanceToRoad(point, samples);
    shallowest = Math.min(shallowest, off);
    deepest = Math.max(deepest, off);
  }
  assert.ok(deepest > TOUGE_ROAD_HALF + 2.5,
    `la caméra sort de la chaussée, jusqu'à ${deepest.toFixed(1)} m de l'axe`);
  assert.ok(deepest < TOUGE_ROAD_HALF + 5.5,
    `la caméra reste dans le bas-côté, avant la forêt (${deepest.toFixed(1)} m de l'axe)`);
  assert.ok(shallowest >= 0, 'aucun point de caméra illisible');
});

test('aucun arbre de la forêt noire ne bouche l’objectif ni la chaussée', () => {
  const corridor = buildCameraCorridor();
  const inner = TOUGE_ROAD_HALF + 5.5; // 8,7 m : le bord intérieur de la bande plantée
  const outer = inner + 24; // 32,7 m : son bord extérieur
  let planted = 0;
  let pushed = 0;
  let dropped = 0;
  let furthest = 0;
  for (let metre = 0; metre < CITY_RUSH_LAP_LENGTH; metre += 2) {
    for (const side of [-1, 1]) {
      for (let wanted = inner; wanted <= outer; wanted += 1) {
        const lateral = side * wanted;
        const resolved = cameraCorridorLateral(corridor, profile, metre, lateral);
        planted += 1;
        if (resolved === null) { dropped += 1; continue; }
        if (resolved !== lateral) pushed += 1;
        // L'arbre dégagé ne gêne plus rien — ni l'objectif d'une épingle, ni
        // l'asphalte d'un virage voisin — et il est parti vers l'extérieur,
        // jamais vers la route ni de l'autre côté du bas-côté.
        assert.equal(cameraCorridorBlocked(corridor, profile, metre, resolved), false,
          `l'arbre de ${metre} m à ${resolved.toFixed(1)} m empiète encore sur le couloir`);
        assert.equal(Math.sign(resolved), side, `l'arbre de ${metre} m a traversé la route (${resolved.toFixed(1)} m)`);
        assert.ok(Math.abs(resolved) >= wanted - 1e-9, `l'arbre de ${metre} m a été rapproché de la route (${resolved.toFixed(1)} m)`);
        furthest = Math.max(furthest, Math.abs(resolved));
      }
    }
  }
  assert.ok(pushed > 0, 'le couloir repousse bien des arbres dans les épingles');
  assert.ok(pushed / planted < 0.15,
    `la forêt garde sa densité : ${(pushed / planted * 100).toFixed(1)} % des arbres repoussés`);
  assert.ok(dropped / planted < 0.01,
    `${dropped} arbres sur ${planted} n'ont trouvé aucun déport libre`);
  assert.ok(furthest <= outer + 25,
    `le repousse le plus loin reste sur le flan de la montagne (${furthest.toFixed(1)} m)`);
  // Le plus large des feuillages plantés : le cône de base d'un cèdre à
  // l'échelle maximale (1,7 m × 1,5). Le bambou (≈ 1,9 m de portée) et le
  // rocher (≈ 2,1 m) passent sous le même gabarit.
  assert.ok(CAMERA_CORRIDOR_RADIUS > 1.7 * 1.5,
    `le couloir couvre le cône de feuillage le plus large (${CAMERA_CORRIDOR_RADIUS} m)`);

  // Hors des épingles, la caméra roule sur la chaussée : la forêt y reste
  // exactement où le générateur l'a plantée, à l'exception des arbres qui
  // tombent sur l'asphalte d'un virage voisin.
  for (const km of [1, 2.6, 4, 7.5, 10, 13]) {
    const metre = Math.floor(atKm(km));
    assert.equal(cityRushChasePlacement(metre, profile).anchor, 0, `la ligne droite du km ${km} n'ancre pas la poursuite`);
    assert.equal(cameraCorridorLateral(corridor, profile, metre, 12.5), 12.5,
      'hors des épingles, l’arbre du bord de route reste où il était');
  }
});

test('les arbres hauts sont retirés des entrées, sommets et sorties des virages', () => {
  assert.equal(TOUGE_TURN_SIGHTLINE_BUFFER_METERS, 18);
  for (const [km, , spanKm] of CITY_RUSH_TOUGE_TURNS) {
    const center = atKm(km);
    const halfTurn = (spanKm / CITY_RUSH_TOUGE.lengthKm) * CITY_RUSH_LAP_LENGTH / 2;
    const clear = halfTurn + TOUGE_TURN_SIGHTLINE_BUFFER_METERS;
    for (const offset of [-clear, -clear / 2, 0, clear / 2, clear]) {
      assert.equal(tougeTurnSightlineClearance(center + offset), true,
        `le feuillage est absent près du virage du km ${km} (${offset.toFixed(1)} m)`);
    }
    assert.equal(tougeTurnSightlineClearance(center + CITY_RUSH_LAP_LENGTH + clear / 2), true,
      'le dégagement reste valable quand la boucle se répète');
  }
  const isolatedCenter = atKm(6.65);
  const isolatedHalf = (0.3 / CITY_RUSH_TOUGE.lengthKm) * CITY_RUSH_LAP_LENGTH / 2;
  assert.equal(tougeTurnSightlineClearance(isolatedCenter + isolatedHalf + TOUGE_TURN_SIGHTLINE_BUFFER_METERS + 1), false,
    'la forêt reprend après le dégagement du virage isolé de Kazami');
  for (const km of [1, 2.6, 4, 7.5, 10, 13.4]) {
    assert.equal(tougeTurnSightlineClearance(atKm(km)), false,
      `la forêt est conservée sur la ligne droite du km ${km}`);
  }
  assert.equal(tougeTurnSightlineClearance(Number.NaN), false, 'une distance invalide ne coupe pas la forêt');
});
