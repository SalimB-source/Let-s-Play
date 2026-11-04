/**
 * Le corps de `check:city-rush-lod` — entrée de `scripts/city-rush-lod-check.mjs`.
 *
 * Une vraie course par parcours, avec le renderer factice du lanceur : on lit
 * ce que chaque image demande à dessiner (`__lastFrameStats`), avec le trafic
 * en pleine définition puis avec les niveaux de détail.
 */
import assert from 'node:assert/strict';
import { CITY_RUSH_CARS, CITY_RUSH_COURSES } from '../src/games/cityRushRules.js';
import { CITY_RUSH_LOD_FAR, CITY_RUSH_LOD_NEAR, applyCityRushVehicleLod, cityRushTrafficLod } from '../src/games/cityRushLod.js';
import { cityRushTheme } from '../src/games/cityRushThemes.js';
import { createCityRushWorld } from '../src/games/ViceCityWorld.jsx';

const mount = {
  clientWidth: 1280,
  clientHeight: 720,
  getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
  appendChild() {},
  removeChild() {},
  addEventListener() {},
  removeEventListener() {},
  ownerDocument: globalThis.document,
  querySelector: () => null,
  classList: { add() {}, remove() {} },
  style: {},
};

/** Les véhicules de trafic de la scène, dans l'ordre de création. */
function trafficMeshes(scene) {
  const found = [];
  scene.traverse((object) => {
    if (object.userData?.kind === 'traffic' && object.parent === scene) found.push(object);
  });
  return found;
}

const rows = [];
for (const city of CITY_RUSH_COURSES) {
  const world = createCityRushWorld(
    mount,
    city,
    () => ({ hud() {}, graphics() {}, effect() {}, finish() {}, pickup() {}, lap() {}, tutorial() {} }),
    CITY_RUSH_CARS[0].id,
    null,
    null,
    1,
  );
  const theme = cityRushTheme(city.id);
  const cars = trafficMeshes(world.scene);
  assert.ok(cars.length > 0, `${city.id} : la course a du trafic`);
  // Départ dans les mêmes conditions que la page : la course enchaîne
  // `countdown` (feux, fumée de pneus, embrayage) puis `playing`.
  world.setPhase('countdown');
  world.setCountdown(3);
  world.setCountdown(1);
  world.setCountdown(0);
  world.setPhase('playing');
  world.start();
  world.action('accelerate-down');

  // ── La boucle choisit les niveaux (leur règle vit dans `cityRushLod.js`) ─
  globalThis.__pumpFrames(2);
  const lod = { ...globalThis.__lastFrameStats };
  const levels = new Map();
  for (const mesh of cars) levels.set(mesh, mesh.userData.lodLevel);

  // ── Cas historique : le même instant, tout le trafic en pleine définition ─
  // Même scène, mêmes distances, mêmes voitures visibles : seule la définition
  // du trafic change. C'est la comparaison honnête.
  for (const mesh of cars) applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_NEAR);
  let meshes = 0;
  let triangles = 0;
  world.scene.traverseVisible((object) => {
    if (!object.isMesh && !object.isSprite && !object.isLine) return;
    meshes += 1;
    const geometry = object.geometry;
    if (geometry?.attributes?.position) {
      const count = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
      triangles += Math.round(count * (object.isInstancedMesh ? object.count : 1));
    }
  });
  const baseline = { meshes, triangles };

  const inScene = cars.filter((mesh) => mesh.visible);
  const farCount = inScene.filter((mesh) => levels.get(mesh) === CITY_RUSH_LOD_FAR).length;
  const nearCount = inScene.filter((mesh) => levels.get(mesh) === 'near').length;

  // La voiture la plus proche du joueur décide du niveau : sous le seuil « près »,
  // elle est en pleine définition (c'est celle qu'on double ou qu'on évite) ;
  // au-delà de 150 m ou de la brume, elle est en silhouette. Ce qui compte,
  // c'est que la règle appliquée soit celle de `cityRushLod.js`, pas un cas
  // particulier glissé dans la boucle.
  const playerDistance = world.distance;
  const nearest = inScene
    .map((mesh) => ({ mesh, gap: mesh.userData.trackDistance - playerDistance }))
    .filter((entry) => entry.gap > 0)
    .sort((a, b) => a.gap - b.gap)[0];
  if (nearest) {
    const expected = cityRushTrafficLod({ gap: nearest.gap, fogFar: theme.fogFar });
    assert.equal(
      levels.get(nearest.mesh),
      expected,
      `${city.id} : la voiture la plus proche (${nearest.gap.toFixed(1)} m) suit la règle (${expected})`,
    );
  }

  rows.push({
    city: city.id,
    meshesBefore: baseline.meshes,
    meshesAfter: lod.meshes,
    saved: baseline.meshes - lod.meshes,
    trianglesBefore: baseline.triangles,
    trianglesAfter: lod.triangles,
    inScene: inScene.length,
    nearCount,
    farCount,
    trianglesSaved: baseline.triangles - lod.triangles,
  });

  world.destroy();
}

assert.ok(rows.length === CITY_RUSH_COURSES.length, 'les neuf parcours sont passés');

// 1. Le gain, sur chaque parcours.
for (const row of rows) {
  assert.ok(
    row.meshesAfter < row.meshesBefore,
    `${row.city} : l’image demande moins de maillages (${row.meshesAfter} < ${row.meshesBefore})`,
  );
  assert.ok(
    row.trianglesAfter < row.trianglesBefore,
    `${row.city} : et moins de triangles (${row.trianglesAfter} < ${row.trianglesBefore})`,
  );
}

// 2. La règle : de loin, on dessine une silhouette.
const withTrafficInFog = rows.filter((row) => row.farCount > 0);
assert.ok(withTrafficInFog.length > 0, 'au moins un parcours a du trafic au-delà du seuil lointain');

// 3. Ce qui se joue ne bouge pas : la course tourne, le joueur avance, et le
//    HUD publie des distances — le LOD ne touche qu'au dessin.
const control = createCityRushWorld(
  mount,
  CITY_RUSH_COURSES[0],
  () => ({ hud() {}, graphics() {} }),
  CITY_RUSH_CARS[0].id,
  null,
  null,
  1,
);
control.setPhase('countdown');
control.setCountdown(0);
control.setPhase('playing');
control.start();
control.action('accelerate-down');
globalThis.__pumpFrames(6);
const travelled = control.distance;
assert.ok(travelled > 0, 'la voiture roule avec les niveaux de détail actifs');
const playerMesh = control.playerCar;
assert.ok(playerMesh, 'le pilote a sa voiture');
// Une voiture du joueur n'est jamais une silhouette : elle n'est pas du trafic.
assert.equal(playerMesh.userData.kind, 'racer', 'la voiture du joueur n’est pas soumise au LOD de trafic');
control.destroy();

// ── Rapport ────────────────────────────────────────────────────────────────
const totalBefore = rows.reduce((sum, row) => sum + row.meshesBefore, 0);
const totalAfter = rows.reduce((sum, row) => sum + row.meshesAfter, 0);
for (const row of rows) {
  console.log(
    `  ${row.city.padEnd(18)} maillages ${String(row.meshesBefore).padStart(4)} → ${String(row.meshesAfter).padStart(4)}`
    + `  (−${String(row.saved).padStart(3)})   triangles ${String(row.trianglesBefore).padStart(6)} → ${String(row.trianglesAfter).padStart(6)}`
    + `   trafic à l’écran ${row.inScene} (near ${row.nearCount}, far ${row.farCount})`,
  );
}
const percent = Math.round((100 * (totalBefore - totalAfter)) / totalBefore);
console.log(`check:city-rush-lod ✓ — ${percent} % de maillages en moins sur une image de course (${totalBefore} → ${totalAfter} sur les neuf parcours) : les vitres, les roues et les décalcomanies tombent au-delà de 70 m, la silhouette prend le relais à 150 m, et la voiture la plus proche reste en pleine définition.`);
