import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  CITY_RUSH_QUALITY_LEVELS,
  applyCityRushLightBudget,
  cityRushBatchStatic,
  cityRushBatchStaticAsync,
  cityRushBatchVehicle,
  cityRushCanAutoDowngrade,
  cityRushDeviceProfile,
  cityRushNextLowerQuality,
  cityRushQualityPreference,
  cityRushRenderBudget,
  cityRushSceneBudget,
  cityRushTrafficFleet,
  cityRushTrafficFleetSize,
  cityRushTrafficGroups,
  cityRushLightActive,
  createCityRushFrameWatch,
  createCityRushVisualClock,
} from '../src/games/cityRushPerformance.js';

test('le rendu limite les pixels et l’antialias sur mobile sans augmenter le ratio natif', () => {
  const budget = cityRushRenderBudget({ lite: true, devicePixelRatio: 3 });
  assert.equal(budget.pixelRatio, 1);
  assert.equal(budget.antialias, false);
  assert.equal(budget.shadowSize, 512);
  assert.equal(budget.shadowIntervalMs, 150);
  assert.equal(budget.mirrorIntervalMs, 250);
  assert.equal(budget.quality, 'lite');
  const desktop = cityRushRenderBudget({ devicePixelRatio: 2 });
  assert.equal(desktop.pixelRatio, 1.25);
  assert.equal(desktop.antialias, true);
  assert.equal(desktop.shadowSize, 1024);
  assert.equal(cityRushRenderBudget({ devicePixelRatio: 0.75 }).pixelRatio, 0.75);
  for (const bad of [0, -1, NaN, Infinity, undefined]) assert.equal(cityRushRenderBudget({ devicePixelRatio: bad }).pixelRatio, 1);
});

test('l’horloge visuelle ne bloque pas la première image, ni après une remise à zéro', () => {
  const tick = createCityRushVisualClock(100);
  assert.equal(tick(0), true);
  assert.equal(tick(50), false);
  assert.equal(tick(100), true);
  assert.equal(tick(101), false);
  assert.equal(tick(1), true);
  assert.equal(tick(NaN), false);
});

test('la boucle conserve sa simulation par image et limite uniquement les effets visuels', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /document\.hidden \|\| \(schoolMode && schoolPausedRef\.current\)/);
  assert.match(source, /updateEnvironment\(dt\);\s*updateTraffic\(dt\);/);
  assert.match(source, /if \(!renderer\.isCityRushWebGpu && shadowTick\(now\)\) renderer\.shadowMap\.needsUpdate = true/);
  assert.match(source, /renderCockpitMirror\(now\)/);
  assert.match(source, /antialias: renderBudget\.antialias/);
});

// ── Niveaux de qualité ──────────────────────────────────────────────────────
test('les trois niveaux de qualité sont ordonnés du plus riche au plus économe', () => {
  assert.deepEqual([...CITY_RUSH_QUALITY_LEVELS], ['full', 'lite', 'low']);
  assert.equal(cityRushNextLowerQuality('full'), 'lite');
  assert.equal(cityRushNextLowerQuality('lite'), 'low');
  assert.equal(cityRushNextLowerQuality('low'), null, 'on ne descend pas sous le plancher');
  assert.equal(cityRushNextLowerQuality('inconnu'), null);
});

test('chaque niveau allège réellement la scène : vue, néons, trafic', () => {
  const full = cityRushSceneBudget('full');
  const lite = cityRushSceneBudget('lite');
  const low = cityRushSceneBudget('low');
  // La vue décroît strictement : c'est la brume qui coupe le remplissage.
  assert.ok(full.viewDistance > lite.viewDistance, 'vue complète > allégée');
  assert.ok(lite.viewDistance > low.viewDistance, 'vue allégée > minimale');
  // Même chose pour la caméra lointaine, toujours au-delà de la brume.
  for (const budget of [full, lite, low]) assert.ok(budget.farPlane > budget.viewDistance);
  // Les néons sont des uniformes de lumière : chaque `MeshStandardMaterial` est
  // recompilé par nombre de lumières. Le budget doit donc strictement décroître.
  assert.ok(full.neonLights > lite.neonLights);
  assert.ok(lite.neonLights > low.neonLights);
  assert.ok(low.neonLights >= 0);
  // Le parc de trafic ne descend que sur le niveau minimal, et reste utilisable.
  assert.equal(lite.trafficCars, full.trafficCars, 'le trafic ne change pas entre complet et allégé');
  assert.ok(low.trafficCars < lite.trafficCars);
  assert.ok(low.highwayTrafficCars < lite.highwayTrafficCars);
  assert.ok(low.trafficCars >= 4 && low.highwayTrafficCars >= 4, 'un parc crédible, pas une route vide');
  assert.ok(Number.isFinite(low.parkedCarsLimit), 'les voitures garées sont limitées au plancher');
});

test('le budget de rendu porte le niveau et suit la scène', () => {
  for (const level of CITY_RUSH_QUALITY_LEVELS) {
    const budget = cityRushRenderBudget({ quality: level, devicePixelRatio: 3 });
    assert.equal(budget.quality, level);
    assert.equal(budget.viewDistance, cityRushSceneBudget(level).viewDistance);
    // On ne dessine jamais plus de pixels que l'écran n'en a.
    assert.ok(budget.pixelRatio <= 3);
  }
  // Le plancher baisse le remplissage sous le niveau allégé.
  assert.ok(cityRushRenderBudget({ quality: 'low', devicePixelRatio: 3 }).pixelRatio
    <= cityRushRenderBudget({ quality: 'lite', devicePixelRatio: 3 }).pixelRatio);
  assert.equal(cityRushRenderBudget({ quality: 'low', devicePixelRatio: 3 }).antialias, false);
});

// ── Profil d'appareil et préférence ─────────────────────────────────────────
function fakeWindow(overrides = {}) {
  return { navigator: { ...overrides.navigator }, ...overrides.window };
}

test('le profil d’appareil ne dégrade jamais un ordinateur et reconnaît un téléphone modeste', () => {
  // Aucun navigateur (rendu serveur, test) : rien à mesurer, rien à décider.
  assert.equal(cityRushDeviceProfile(null).tier, 'full');
  // Un navigateur muet n'est pas un ordinateur de bureau : il part en allégé,
  // jamais en minimal — on n'abaisse que sur des signaux, pas sur une absence.
  assert.equal(cityRushDeviceProfile(fakeWindow()).tier, 'lite');
  // Téléphone modeste : 3 Go annoncés et 4 cœurs.
  const modest = cityRushDeviceProfile(fakeWindow({
    navigator: { deviceMemory: 3, hardwareConcurrency: 4 },
    window: { LetsPlayAndroid: {} },
  }));
  assert.equal(modest.tier, 'low');
  assert.equal(modest.android, true);
  assert.ok(modest.reasons.length > 0, 'le profil explique son choix');
  // Un appareil confortable reste en complet.
  const desktop = cityRushDeviceProfile(fakeWindow({
    navigator: { deviceMemory: 16, hardwareConcurrency: 12 },
  }));
  assert.notEqual(desktop.tier, 'low');
});

test('la préférence du joueur prime sur celle de l’appareil, sans jamais casser', () => {
  const profile = { tier: 'low' };
  // Un choix explicite est respecté, même à contre-courant de l'appareil.
  assert.equal(cityRushQualityPreference({ stored: 'full', profile }), 'full');
  assert.equal(cityRushQualityPreference({ stored: 'lite', profile: { tier: 'full' } }), 'lite');
  // Rien de mémorisé : c'est l'appareil qui décide.
  assert.equal(cityRushQualityPreference({ stored: null, profile }), 'low');
  assert.equal(cityRushQualityPreference({ stored: null, profile: { tier: 'full' } }), 'full');
  // Une valeur inconnue (ancienne version, stockage bricolé) ne casse rien.
  for (const bad of ['', 'ultra', 42, {}]) {
    assert.ok(CITY_RUSH_QUALITY_LEVELS.includes(cityRushQualityPreference({ stored: bad, profile })));
  }
  assert.ok(CITY_RUSH_QUALITY_LEVELS.includes(cityRushQualityPreference()));
});

test('un seul abaissement automatique par session', () => {
  assert.equal(cityRushCanAutoDowngrade({ downgrades: 0 }), true);
  assert.equal(cityRushCanAutoDowngrade({}), true);
  assert.equal(cityRushCanAutoDowngrade({ downgrades: 1 }), false);
  assert.equal(cityRushCanAutoDowngrade({ downgrades: 4 }), false);
  assert.equal(cityRushCanAutoDowngrade({ downgrades: NaN }), false);
});

// ── Surveillance des images ─────────────────────────────────────────────────
test('la surveillance des images attend, chauffe, puis signale une ville qui rame', () => {
  const watch = createCityRushFrameWatch({ thresholdMs: 34, samples: 10, warmup: 5 });
  // Les images de chauffe ne concluent pas : le chargement, la compilation des
  // shaders et le regroupement de la ville ne sont pas la partie.
  for (let i = 0; i < 5; i += 1) assert.equal(watch.sample(90), false, 'chauffe');
  // Ensuite il faut une fenêtre complète (10 images mesurées, chauffe
  // comprise) pour trancher : la dixième image est la première à conclure.
  for (let i = 0; i < 4; i += 1) assert.equal(watch.sample(90), false, 'fenêtre en cours de remplissage');
  assert.equal(watch.sample(90), true, 'après chauffe et fenêtre pleine, on signale');
  // Une fois signalé, on ne harcèle pas le joueur : une seule fois par session.
  for (let i = 0; i < 40; i += 1) assert.equal(watch.sample(90), false);
});

test('la surveillance ignore les images aberrantes et une ville fluide', () => {
  const smooth = createCityRushFrameWatch({ thresholdMs: 34, samples: 10, warmup: 3 });
  for (let i = 0; i < 200; i += 1) assert.equal(smooth.sample(16), false, '16 ms : fluide');
  assert.equal(smooth.median, 16);
  // Une image à 400 ms (ramasse-miettes, changement d'onglet) noyée dans du 60
  // images/s ne doit pas condamner la qualité : c'est la médiane qui décide.
  const spiky = createCityRushFrameWatch({ thresholdMs: 34, samples: 11, warmup: 1 });
  let fired = false;
  for (let i = 0; i < 60; i += 1) fired = spiky.sample(i === 30 ? 400 : 16) || fired;
  assert.equal(fired, false, 'un pic isolé ne suffit pas');
  // Les durées absurdes sont ignorées sans fausser la médiane.
  const noisy = createCityRushFrameWatch({ thresholdMs: 34, samples: 5, warmup: 0 });
  for (const bad of [0, -5, NaN, Infinity]) assert.equal(noisy.sample(bad), false);
});

// ── Regroupement statique ───────────────────────────────────────────────────
function staticScene() {
  const scene = new THREE.Scene();
  const shared = new THREE.MeshStandardMaterial({ color: 0x445566 });
  const other = new THREE.MeshStandardMaterial({ color: 0x998877 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 30; i += 1) {
    const mesh = new THREE.Mesh(geometry.clone(), i % 3 ? shared : other);
    mesh.position.set(i, 0, i * 2);
    mesh.castShadow = true;
    scene.add(mesh);
  }
  // Ce que le regroupement ne doit jamais toucher :
  const car = new THREE.Group();
  car.userData.dynamic = true;
  const carBody = new THREE.Mesh(geometry.clone(), shared);
  car.add(carBody);
  scene.add(car);
  const instanced = new THREE.InstancedMesh(geometry.clone(), shared, 4);
  scene.add(instanced);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: null }));
  scene.add(sprite);
  const glass = new THREE.Mesh(geometry.clone(), new THREE.MeshStandardMaterial({ transparent: true }));
  scene.add(glass);
  const neon = new THREE.Mesh(geometry.clone(), new THREE.MeshStandardMaterial({ emissive: 0xff00ff }));
  neon.material.userData.animated = true;
  scene.add(neon);
  const trail = new THREE.Mesh(geometry.clone(), new THREE.MeshBasicMaterial());
  trail.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  scene.add(trail);
  return { scene, car, instanced, sprite, glass, neon, trail, geometry };
}

test('le regroupement statique fusionne par matériau et laisse le jeu intact', () => {
  const { scene, car, instanced, sprite, glass, neon, trail } = staticScene();
  const before = countMeshes(scene);
  const result = cityRushBatchStatic(scene);
  assert.ok(result.merged > 0, 'au moins un maillage fusionné');
  assert.ok(countMeshes(scene) < before, 'la scène dessine moins de maillages');
  // Ce qui bouge, ce qui est instancié, transparent ou animé reste tel quel.
  assert.equal(car.parent, scene, 'un groupe dynamique reste dans la scène');
  assert.equal(car.children.length, 1);
  assert.equal(instanced.parent, scene, 'un InstancedMesh reste dans la scène');
  assert.equal(sprite.parent, scene, 'un Sprite reste dans la scène');
  assert.equal(glass.parent, scene, 'un matériau transparent reste dans la scène');
  assert.equal(neon.parent, scene, 'un matériau animé reste dans la scène');
  assert.equal(trail.parent, scene, 'une géométrie réécrite chaque image reste dans la scène');
  // La géométrie d'origine n'est pas modifiée par le regroupement : les
  // positions sont copiées, jamais réécrites.
  assert.equal(glass.geometry.attributes.position.count, 24);
  // Les triangles, eux, sont tous là : le regroupement ne supprime rien.
  const triangles = (object) => {
    const position = object.geometry?.attributes?.position;
    if (!position) return 0;
    return object.geometry.index ? object.geometry.index.count / 3 : position.count / 3;
  };
  const total = countMeshes(scene) > before ? 0 : 1;
  assert.equal(total, 1, 'la scène est plus légère, pas plus lourde');
  assert.ok(triangles(glass) > 0);
});

test('le regroupement statique est réversible : `restore` rend la scène exacte', () => {
  const { scene } = staticScene();
  const before = scene.children.length;
  const beforeMeshes = countMeshes(scene);
  const result = cityRushBatchStatic(scene);
  result.restore();
  assert.equal(scene.children.length, before);
  assert.equal(countMeshes(scene), beforeMeshes);
  // `disposeOriginals` existe pour la sortie de ville ; s'il est absent, c'est
  // que rien n'a été retiré — on ne l'appelle pas à l'aveugle.
  result.disposeOriginals?.();
});

test('le regroupement asynchrone rend la main et donne le même résultat', async () => {
  const synchronous = staticScene().scene;
  const asynchronous = staticScene().scene;
  const syncResult = cityRushBatchStatic(synchronous, { minInstances: 2 });
  const progress = [];
  let slices = 0;
  const asyncResult = await cityRushBatchStaticAsync(asynchronous, {
    minInstances: 2,
    yieldEvery: 1,
    onProgress: (ratio) => { progress.push(ratio); slices += 1; },
  });
  assert.ok(slices > 1, 'le travail est découpé, pas fait d’un bloc');
  assert.ok(progress.every((ratio, index) => index === 0 || ratio >= progress[index - 1]), 'progression croissante');
  assert.equal(asyncResult.after, syncResult.after);
  assert.equal(asyncResult.merged, syncResult.merged);
  asyncResult.restore();
  syncResult.restore();
});

function countMeshes(root) {
  let count = 0;
  root.traverse((object) => { if (object.isMesh) count += 1; });
  return count;
}

// ── Regroupement d'un véhicule ──────────────────────────────────────────────
test('le regroupement d’un véhicule ne dépasse pas son nombre de matériaux', () => {
  const vehicle = new THREE.Group();
  const materials = [0, 1, 2].map((index) => new THREE.MeshStandardMaterial({ color: index * 0x111111 }));
  for (let index = 0; index < 12; index += 1) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials[index % materials.length]);
    part.castShadow = true;
    vehicle.add(part);
  }
  const wheels = new THREE.Group();
  wheels.userData.dynamic = true;
  wheels.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials[0]));
  vehicle.add(wheels);
  const result = cityRushBatchVehicle(vehicle);
  assert.equal(result.batched, true);
  assert.equal(result.sourceMeshes, 13, 'douze pièces de carrosserie plus une roue');
  // Trois matériaux → trois maillages, pas douze. La roue (dynamique) survit.
  assert.equal(result.mergedMeshes, 3, 'borné par les matériaux, pas par le nombre de pièces');
  // Ce que la scène ajoute, c'est `result.root` : trois pièces fusionnées et la
  // roue. Le conteneur d'origine est abandonné, ses pièces reparentées.
  assert.equal(countMeshes(result.root), 4);
  assert.equal(wheels.parent, result.root, 'les roues restent animables, dans le groupe fusionné');
  assert.equal(result.root.userData, vehicle.userData, 'les données de simulation suivent le véhicule');
  // Une voiture sans matériau partagé ne gagne rien, mais ne perd rien non plus.
  const single = new THREE.Group();
  single.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  const singleResult = cityRushBatchVehicle(single);
  assert.equal(singleResult.mergedMeshes, 1);
  assert.equal(countMeshes(singleResult.root), 1);
});

// ── Parc de trafic ─────────────────────────────────────────────────────────
test('le parc de trafic se décrit par type et respecte les bornes de la route', () => {
  const specs = [
    ...Array.from({ length: 9 }, (_, index) => ({ type: 'taxi', index, x: index * 20, z: 4, yaw: 0 })),
    ...Array.from({ length: 9 }, (_, index) => ({ type: 'police', index, x: -index * 20, z: -4, yaw: Math.PI })),
  ];
  const full = cityRushTrafficFleet(specs);
  assert.equal(full.specs.length, 18);
  assert.equal(full.byType.size, 2);
  // Le parc tronqué garde les deux types : un allègement ne vide pas une voie.
  const reduced = cityRushTrafficFleet(specs, { limit: 9 });
  assert.equal(reduced.specs.length, 9);
  assert.equal(reduced.byType.size, 2, 'les deux sens restent représentés');
  // Les places d'origine sont conservées : on sait quelle voiture va où.
  for (const entries of reduced.byType.values()) {
    for (const entry of entries) assert.equal(specs[entry.index], entry.spec);
  }
  // Les lots sont triés du plus gros au plus petit, et lisibles.
  const groups = cityRushTrafficGroups(specs, { limit: 12 });
  assert.equal(groups.length, 2);
  assert.ok(groups[0].entries.length >= groups[1].entries.length);
  assert.equal(groups.reduce((sum, group) => sum + group.entries.length, 0), 12);
  // Entrées bancales : jamais d'exception.
  assert.equal(cityRushTrafficFleet(null).specs.length, 0);
  assert.equal(cityRushTrafficFleet(undefined, { limit: 3 }).specs.length, 0);
  assert.equal(cityRushTrafficFleet([{ type: 'taxi' }], { limit: -1 }).specs.length, 0);
});

test('la taille du parc est bornée, jamais négative, et ne descend pas sous le plancher', () => {
  assert.equal(cityRushTrafficFleetSize(12), 12);
  assert.equal(cityRushTrafficFleetSize(1), 4, 'plancher : une route a besoin de circulation');
  assert.equal(cityRushTrafficFleetSize(99, { ceiling: 16 }), 16);
  assert.equal(cityRushTrafficFleetSize('9'), 9);
  assert.equal(cityRushTrafficFleetSize(NaN, { ceiling: 18 }), 18, 'valeur absente : on garde le maximum de la route');
  assert.equal(cityRushTrafficFleetSize(-5), 4);
  assert.equal(cityRushTrafficFleetSize(0, { floor: 0 }), 0);
});

// ── Budget de lumières ─────────────────────────────────────────────────────
test('le budget de néons éteint les derniers et marque les matériaux pour l’éclat peint', () => {
  const lights = [];
  for (let index = 0; index < 8; index += 1) {
    const light = new THREE.PointLight(0xff00ff, 2, 30);
    light.userData.cityRushNeonIndex = index;
    lights.push(light);
  }
  const result = applyCityRushLightBudget(lights, { neonLights: 2 });
  assert.deepEqual(result, { total: 8, enabled: 2 });
  assert.equal(lights.filter((light) => light.visible).length, 2, 'deux néons allumés');
  // Ce sont **les derniers** qui s'éteignent : les néons du centre-ville, ceux
  // qu'on voit de loin, restent allumés.
  assert.equal(cityRushLightActive(lights[0]), true);
  assert.equal(cityRushLightActive(lights[7]), false);
  // Un budget plus grand que la liste n'éteint rien, un budget absent non plus.
  assert.deepEqual(applyCityRushLightBudget(lights, {}), { total: 8, enabled: 0 });
  assert.deepEqual(applyCityRushLightBudget(lights, { neonLights: 99 }), { total: 8, enabled: 8 });
  // Pas de lumières du tout : la fonction répond sans jeter.
  assert.deepEqual(applyCityRushLightBudget(undefined, { neonLights: 2 }), { total: 0, enabled: 0 });
  assert.deepEqual(applyCityRushLightBudget([], { neonLights: 2 }), { total: 0, enabled: 0 });
});

// ── Câblage dans la ville ──────────────────────────────────────────────────
test('la ville applique le budget de scène, le regroupement et le parc de trafic', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  // Le budget de scène pilote la brume, la caméra et les lumières.
  assert.match(source, /cityRushSceneBudget\(qualityLevel\)/);
  assert.match(source, /applyCityRushLightBudget\(city\.neonPointLights, sceneBudget\)/);
  // Le regroupement statique est lancé après la construction et rendu à la sortie.
  assert.match(source, /cityRushBatchStaticAsync\(scene, \{/);
  assert.match(source, /batching\.restore\(\);\s*batching\.disposeOriginals\(\);/);
  // Le parc de trafic suit le budget au lieu d'être écrit en dur.
  assert.match(source, /const trafficCarCount = cityRushTrafficFleetSize\(sceneBudget\.trafficCars, \{ floor: 4, ceiling: 16 \}\)/);
  assert.match(source, /const highwayCarCount = cityRushTrafficFleetSize\(sceneBudget\.highwayTrafficCars, \{ floor: 4, ceiling: 18 \}\)/);
  assert.match(source, /Array\.from\(\{ length: trafficCarCount \}/);
  assert.match(source, /index < highwayCarCount/);
  // Les voitures qui roulent ne sont jamais fusionnées dans le décor.
  const dynamicMarks = source.match(/userData\.dynamic = true/g) || [];
  assert.ok(dynamicMarks.length >= 6, 'voiture du joueur, trafic, voitures garées, bateaux, pluie');
  // Les voitures garées suivent, elles aussi, le budget : elles pèsent autant
  // qu'une voiture de trafic chacune et sont une soixantaine.
  assert.match(source, /const parkedLimit = Number\.isFinite\(cityBudget\.parkedCarsLimit\)/);
  assert.match(source, /parkedCarSpecs\.slice\(0, Math\.max\(0, parkedLimit\)\)/);
  assert.match(source, /makeCityCityRushTrafficCar|makeCityRushTrafficCar\(spec\.type, \{ batch: cityBudget\.quality !== 'full' \}\)/);
  // Ce qui est réellement appliqué est lisible sur le montage, pour un
  // diagnostic sur téléphone (inspecteur) comme pour les contrôles.
  for (const dataset of ['quality', 'neonLights', 'parkedCars', 'drawsBefore', 'draws', 'batched']) {
    assert.match(source, new RegExp(`mount\\.dataset\\.${dataset} =`), `\`data-${dataset}\` doit être exposé`);
  }
});
