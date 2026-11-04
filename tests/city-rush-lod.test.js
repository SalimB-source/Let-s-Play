import test from 'node:test';
import assert from 'node:assert/strict';

// Des toiles muettes : voitures et roues se construisent en Node, sans navigateur.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const {
  CITY_RUSH_LOD_FAR,
  CITY_RUSH_LOD_LEVELS,
  CITY_RUSH_LOD_MID,
  CITY_RUSH_LOD_NEAR,
  CITY_RUSH_LOD_NEAR_DISTANCE,
  CITY_RUSH_LOD_MID_DISTANCE,
  CITY_RUSH_LOD_DROP_MID,
  applyCityRushVehicleLod,
  cityRushLodLevel,
  cityRushTrafficLod,
} = await import('../src/games/cityRushLod.js');
const { makeTrafficVehicle } = await import('../src/games/cityRushCars.js');
const { CITY_RUSH_TRAFFIC_TYPES } = await import('../src/games/cityRushRules.js');

test('les seuils : près, milieu, loin, et une voiture derrière reste près', () => {
  assert.deepEqual([...CITY_RUSH_LOD_LEVELS], ['near', 'mid', 'far']);
  assert.equal(cityRushLodLevel(0), CITY_RUSH_LOD_NEAR);
  assert.equal(cityRushLodLevel(-40), CITY_RUSH_LOD_NEAR, 'une voiture doublée (derrière) reste en pleine définition');
  assert.equal(cityRushLodLevel(CITY_RUSH_LOD_NEAR_DISTANCE - 1), CITY_RUSH_LOD_NEAR);
  assert.equal(cityRushLodLevel(CITY_RUSH_LOD_NEAR_DISTANCE), CITY_RUSH_LOD_MID);
  assert.equal(cityRushLodLevel(CITY_RUSH_LOD_MID_DISTANCE - 1), CITY_RUSH_LOD_MID);
  assert.equal(cityRushLodLevel(CITY_RUSH_LOD_MID_DISTANCE), CITY_RUSH_LOD_FAR);
  assert.equal(cityRushLodLevel(400), CITY_RUSH_LOD_FAR);
  // Distances inconnues (véhicule en cours de placement) : le plus économe.
  for (const value of [undefined, null, NaN, Infinity]) {
    assert.equal(cityRushLodLevel(value), CITY_RUSH_LOD_FAR, `${String(value)} → far`);
  }
});

test('la brume ne peut que rapprocher le niveau lointain', () => {
  // Brume plus longue que le seuil : c'est le seuil qui décide — le `far` tombe
  // à 150 m sur la Nordschleife (480 m de brume) comme sur Vice City (330 m).
  assert.equal(cityRushLodLevel(160, 480), CITY_RUSH_LOD_FAR);
  assert.equal(cityRushLodLevel(140, 480), CITY_RUSH_LOD_MID);
  assert.equal(cityRushLodLevel(160, 330), CITY_RUSH_LOD_FAR);
  // Brume plus courte : c'est la brume qui décide, le `mid` s'arrête dedans.
  assert.equal(cityRushLodLevel(90, 100), CITY_RUSH_LOD_MID);
  assert.equal(cityRushLodLevel(110, 100), CITY_RUSH_LOD_FAR);
  // Brume très courte : le seuil « près » garde la main — une voiture à 40 m
  // reste toujours détaillée, on la percute dans deux secondes.
  assert.equal(cityRushLodLevel(40, 35), CITY_RUSH_LOD_NEAR);
  assert.equal(cityRushLodLevel(80, 35), CITY_RUSH_LOD_FAR);
  // Sans brume connue : les seuils par défaut.
  assert.equal(cityRushLodLevel(160, Infinity), CITY_RUSH_LOD_FAR);
  assert.equal(cityRushLodLevel(160, undefined), CITY_RUSH_LOD_FAR);
});

test('une voiture qui arrive garde sa caisse jusqu’à la brume', () => {
  // Contresens à 160 m : de dos elle serait en `far`, de face elle reste `mid`.
  assert.equal(cityRushTrafficLod({ gap: 160, fogFar: 330 }), CITY_RUSH_LOD_FAR);
  assert.equal(cityRushTrafficLod({ gap: 160, fogFar: 330, approaching: true }), CITY_RUSH_LOD_MID);
  // Au-delà de la brume + marge, même de face elle tombe en `far`.
  assert.equal(cityRushTrafficLod({ gap: 365, fogFar: 330, approaching: true }), CITY_RUSH_LOD_FAR);
  // Près : la règle commune s'applique, `approaching` n'y change rien.
  assert.equal(cityRushTrafficLod({ gap: 30, fogFar: 330, approaching: true }), CITY_RUSH_LOD_NEAR);
  assert.equal(cityRushTrafficLod({ gap: 100, fogFar: 330, approaching: true }), CITY_RUSH_LOD_MID);
});

const nearCount = (type) => {
  const mesh = makeTrafficVehicle(type);
  let count = 0;
  mesh.traverse((object) => { if ((object.isMesh || object.isSprite) && object.visible) count += 1; });
  return count;
};

test('chaque véhicule du catalogue publie ses deux niveaux de détail', () => {
  for (const spec of CITY_RUSH_TRAFFIC_TYPES) {
    const mesh = makeTrafficVehicle(spec.id);
    const data = mesh.userData;
    assert.equal(data.kind, 'traffic', `${spec.id} : un véhicule de trafic`);
    assert.ok(data.lodBody, `${spec.id} : la caisse fusionnée`);
    assert.ok(Array.isArray(data.lodDetail) && data.lodDetail.length > 0, `${spec.id} : des détails à éteindre`);
    assert.equal(data.lodLevel, CITY_RUSH_LOD_NEAR, `${spec.id} : livré en pleine définition`);
    // La caisse porte l'essentiel : c'est le groupe fusionné par matériau rendu
    // par `Batch.build` (caisse, glaces, feux).
    assert.ok(data.lodBody.isGroup, `${spec.id} : la caisse est le groupe fusionné`);
    const bodyMeshes = data.lodBody.children;
    assert.ok(bodyMeshes.length >= 2, `${spec.id} : la caisse garde ses matériaux (${bodyMeshes.length})`);
    // La silhouette du niveau lointain : une boîte, invisible au départ.
    assert.ok(data.lodProxy?.isMesh, `${spec.id} : une silhouette`);
    assert.equal(data.lodProxy.visible, false, `${spec.id} : silhouette rangée en pleine définition`);
    assert.equal(data.lodProxy.castShadow, false, `${spec.id} : la silhouette ne projette pas d’ombre`);
    // Les familles étiquetées : vitres et décalcomanies tombent en `mid`, les
    // roues aussi ; les gyrophares ne portent aucune étiquette de retrait.
    const tagged = [];
    mesh.traverse((object) => {
      if (object.userData?.lod) tagged.push(object.userData.lod);
      if (object.userData?.lodDrop) tagged.push(object.userData.lodDrop);
    });
    assert.ok(tagged.includes('glass'), `${spec.id} : les vitres sont étiquetées`);
    for (const wheel of data.wheels) {
      assert.equal(wheel.userData.lodDrop, 'mid', `${spec.id} : roue retirée en mid`);
      assert.ok(data.lodDetail.includes(wheel), `${spec.id} : la roue est une pièce à part`);
    }
    for (const beacon of data.beacons) {
      assert.equal(beacon.userData.lodDrop, undefined, `${spec.id} : le gyrophare n’est jamais retiré`);
    }
    assert.ok(CITY_RUSH_LOD_DROP_MID.includes('glass') && CITY_RUSH_LOD_DROP_MID.includes('wheels'));
  }
});

test('le niveau éteint des maillages, jamais la voiture', () => {
  const mesh = makeTrafficVehicle('police');
  const data = mesh.userData;
  const visibleCount = () => {
    let count = 0;
    mesh.traverse((object) => { if ((object.isMesh || object.isSprite) && object.visible) count += 1; });
    return count;
  };
  const near = visibleCount();
  assert.ok(near >= 12, `une berline neuve compte ses maillages (${near})`);

  // `mid` : les vitres, les décalcomanies et les roues tombent (8 appels au
  // lieu de 14 sur une berline de police).
  applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_MID);
  const mid = visibleCount();
  assert.ok(mid <= near - data.wheels.length, `le niveau mid retire les roues (${mid} < ${near})`);
  assert.equal(mesh.visible, true, 'le groupe reste visible');
  assert.equal(data.lodBody.visible, true, 'la caisse reste');
  assert.equal(data.lodProxy.visible, false, 'la silhouette reste rangée en mid');
  for (const wheel of data.wheels) assert.equal(wheel.visible, false, 'roue retirée en mid');
  for (const beacon of data.beacons) assert.equal(beacon.visible, true, 'gyrophare visible en mid');
  for (const child of data.lodBody.children) {
    if (child.userData.lod === 'glass' || child.userData.lod === 'ghost') {
      assert.equal(child.visible, false, 'vitre ou décalcomanie retirée en mid');
    }
  }

  // `far` : la silhouette et les gyrophares, rien d'autre.
  applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_FAR);
  const far = visibleCount();
  assert.ok(far < mid, `le niveau far allège encore (${far} < ${mid})`);
  assert.equal(far, 1 + data.beacons.length, `silhouette + gyrophares (${far})`);
  assert.equal(data.lodProxy.visible, true, 'la silhouette prend le relais');
  assert.equal(data.lodBody.visible, false, 'la caisse fusionnée s’efface');

  // Retour en pleine définition : tout revient, exactement.
  applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_NEAR);
  assert.equal(visibleCount(), near, 'le retour en near rend tout');
  assert.equal(data.lodProxy.visible, false, 'et range la silhouette');
});

test('rappeler le même niveau ne touche rien (appelé à chaque image)', () => {
  const mesh = makeTrafficVehicle('taxi');
  applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_MID);
  const level = mesh.userData.lodLevel;
  assert.equal(applyCityRushVehicleLod(mesh, CITY_RUSH_LOD_MID), level);
  assert.equal(mesh.userData.lodLevel, CITY_RUSH_LOD_MID);
  // Valeur inconnue (état abîmé) : retour en pleine définition, jamais un
  // véhicule vide à l'écran.
  assert.equal(applyCityRushVehicleLod(mesh, 'ultra'), CITY_RUSH_LOD_NEAR);
  // Un objet qui n'est pas un véhicule de trafic est ignoré sans lever.
  assert.equal(applyCityRushVehicleLod({ userData: {} }, CITY_RUSH_LOD_FAR), CITY_RUSH_LOD_FAR);
  assert.equal(applyCityRushVehicleLod(null, CITY_RUSH_LOD_FAR), CITY_RUSH_LOD_FAR);
});
