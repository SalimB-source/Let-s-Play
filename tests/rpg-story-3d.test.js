import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { createStoryTowerModel, disposeStoryTowerModel, RPG_STORY_TOWER_THEMES } from '../src/games/rpgStoryTowerModels.js';
import { storyTowerFrame } from '../src/games/rpgStoryTowerScene.js';

const FEATURES = {
  'tour-des-listes': ['sablier', 'astrolabe', 'parchemins'],
  'tour-du-souk': ['etals-suspendus', 'auvents-colores', 'domes-dores'],
  'tour-des-sables': ['portail-ouvert', 'sommet-en-ruines', 'dunes'],
  'tour-des-abysses': ['galeries-aquatiques', 'pont-a-arches', 'algues'],
  'tour-des-corsaires': ['mats-de-voile', 'cordages', 'coque-de-galion'],
  'tour-du-fjord': ['corniches-gelees', 'cristaux-de-glace', 'drakkar'],
  'tour-du-soleil-rouge': ['toits-recourbes', 'torii-ecarlate', 'bannieres-samourai'],
  'tour-de-la-necropole': ['obelisques', 'colonnes-de-lotus', 'sarcophage'],
};

function resources(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse((part) => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of [].concat(part.material ?? [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  return { geometries, materials, textures };
}

test('les tours du catalogue ont chacune leur maquette et leur ambiance', () => {
  assert.deepEqual(Object.keys(RPG_STORY_TOWER_THEMES), RPG_STORY_TOURS.map((tour) => tour.id));
  assert.equal(new Set(Object.values(RPG_STORY_TOWER_THEMES).map((theme) => theme.stone)).size, 7);
  const signatures = new Set();
  for (const tour of RPG_STORY_TOURS) {
    const model = createStoryTowerModel(tour.id);
    try {
      assert.ok(model.isGroup);
      assert.equal(model.userData.tourId, tour.id);
      assert.deepEqual(model.userData.features, FEATURES[tour.id]);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(size.y > 6 && size.y < 9, `${tour.id} : la tour est complète, du socle au sommet`);
      assert.ok(size.x > 3 && size.z > 3, 'une vraie maquette volumétrique, pas une peinture sur un plan');
      assert.ok(model.children.length >= 5 && model.children.length <= 12, 'les pièces sont fusionnées par matériau pour le mobile');
      let triangles = 0;
      model.traverse((part) => {
        if (!part.isMesh) return;
        triangles += part.geometry.attributes.position.count / 3;
        assert.ok(part.geometry.attributes.normal, 'les façades et ornements réagissent à la lumière');
        for (const attribute of Object.values(part.geometry.attributes)) {
          assert.ok(attribute.array.every(Number.isFinite), `${tour.id}/${part.name} : aucun sommet/UV invalide`);
        }
      });
      assert.ok(triangles > 1000 && triangles < 50000, `${tour.id} : budget de géométrie borné (${triangles})`);
      signatures.add(`${size.y}:${triangles}`);
      for (const texture of resources(model).textures) assert.ok(texture.isDataTexture, 'les textures sont locales, sans image/CDN à charger');
    } finally { disposeStoryTowerModel(model); }
  }
  assert.equal(signatures.size, 7, 'ce ne sont pas des recolorations du même modèle');
  assert.equal(createStoryTowerModel('tour-inconnue'), null);
});

test('le portail de la Tour des Sables est vraiment ouvert en 3D', () => {
  const model = createStoryTowerModel('tour-des-sables');
  try {
    model.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.45, 4), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObject(model, true).length, 0, 'on voit à travers l’arche, pas une porte peinte sur un cube');
  } finally { disposeStoryTowerModel(model); }
});

test('le cadrage garde les sommets et socles dans le champ pendant toute la rotation', () => {
  const point = new THREE.Vector3();
  for (const tour of RPG_STORY_TOURS) {
    const model = createStoryTowerModel(tour.id);
    try {
      for (const aspect of [0.65, 4 / 3, 2.4]) {
        const frame = storyTowerFrame(model, aspect);
        const camera = new THREE.OrthographicCamera(-frame.halfHeight * aspect, frame.halfHeight * aspect, frame.halfHeight, -frame.halfHeight, 0.1, 80);
        const target = new THREE.Vector3(0, frame.centerY, 0);
        camera.position.copy(frame.direction).multiplyScalar(20).add(target);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        for (let step = 0; step < 8; step += 1) {
          const angle = step * Math.PI / 4;
          let maxX = 0, maxY = 0;
          model.traverse((part) => {
            const positions = part.geometry?.attributes.position;
            if (!positions) return;
            for (let i = 0; i < positions.count; i += 1) {
              const x = positions.getX(i), z = positions.getZ(i);
              point.set(x * Math.cos(angle) + z * Math.sin(angle), positions.getY(i), -x * Math.sin(angle) + z * Math.cos(angle)).project(camera);
              maxX = Math.max(maxX, Math.abs(point.x));
              maxY = Math.max(maxY, Math.abs(point.y));
            }
          });
          assert.ok(maxX < 0.93 && maxY < 0.93, `${tour.id}, format ${aspect}, angle ${angle} : aucun élément rogné (${maxX}, ${maxY})`);
        }
      }
    } finally { disposeStoryTowerModel(model); }
  }
});

test('deux montages ont le même dessin mais ne partagent aucune ressource GPU', () => {
  for (const tour of RPG_STORY_TOURS) {
    const first = createStoryTowerModel(tour.id), second = createStoryTowerModel(tour.id);
    try {
      assert.equal(first.children.length, second.children.length);
      for (let i = 0; i < first.children.length; i += 1) {
        const a = first.children[i], b = second.children[i];
        assert.equal(a.name, b.name);
        assert.notEqual(a.geometry, b.geometry);
        assert.notEqual(a.material, b.material);
        const buffer = (mesh) => {
          const array = mesh.geometry.attributes.position.array;
          return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
        };
        assert.ok(buffer(a).equals(buffer(b)), 'les géométries sont déterministes');
      }
      for (const texture of resources(first).textures) assert.ok(!resources(second).textures.has(texture));
    } finally { disposeStoryTowerModel(first); disposeStoryTowerModel(second); }
  }
});

test('le démontage rend chaque texture, matériau et géométrie exactement une fois', () => {
  for (const tour of RPG_STORY_TOURS) {
    const model = createStoryTowerModel(tour.id);
    const counts = new Map();
    for (const set of Object.values(resources(model))) {
      for (const resource of set) {
        counts.set(resource, 0);
        resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
      }
    }
    disposeStoryTowerModel(model);
    disposeStoryTowerModel(model);
    assert.equal(model.children.length, 0);
    assert.ok([...counts.values()].every((count) => count === 1), `${tour.id} : pas de fuite, ni double libération`);
  }
  assert.doesNotThrow(() => disposeStoryTowerModel(null));
});
