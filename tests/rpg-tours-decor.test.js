import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { createStoryTowerDecor } from '../src/games/rpgStoryTowerDecor.js';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const CAMERA_XZ = new THREE.Vector2(0.63, 1).normalize();

// Chaque décor doit porter le folklore de sa tour, lu dans les cartes : pas de
// silhouette générique répétée. On le vérifie par les matériaux signature que
// chaque scène est censée employer (parchemins de la Chambre, glace du Nord,
// algues de l'abîme, or de la pesée des âmes, etc.).
const FOLKLORE = {
  'tour-des-listes': ['parchemin', 'verre-du-sablier', 'laiton'],
  'tour-du-souk': ['tissu-rouge', 'tissu-turquoise', 'laiton'],
  'tour-des-sables': ['socle', 'pierre'],
  'tour-des-abysses': ['algues', 'eau'],
  'tour-des-corsaires': ['bois', 'parchemin', 'tissu-rouge'],
  'tour-du-fjord': ['glace', 'neige', 'bois'],
  'tour-du-soleil-rouge': ['tissu-rouge', 'bois'],
  'tour-de-la-necropole': ['laiton', 'pierre-sombre', 'zellige'],
  'tour-du-corbeau': ['pierre-sombre'],
  'tour-du-sablier-renverse': ['verre-du-sablier', 'tissu-rouge', 'glace'],
  'tour-oubliee': ['pierre-sombre', 'laiton'],
};

function resources(decor) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  decor.group.traverse((part) => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of [].concat(part.material ?? [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  return { geometries, materials, textures };
}
const triangles = (mesh) => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
const materiaux = (decor) => {
  const names = new Set();
  decor.group.traverse((part) => { if (part.isMesh) names.add(part.material.name); });
  return names;
};

test('chaque tour a son décor de fond, fusionné et léger', () => {
  for (const tour of RPG_STORY_TOURS) {
    const decor = createStoryTowerDecor(tour.id);
    try {
      assert.ok(decor && decor.group.isGroup, `${tour.id} : un décor existe`);
      assert.equal(decor.group.name, `decor-${tour.id}`);
      const meshes = [];
      decor.group.traverse((part) => { if (part.isMesh) meshes.push(part); });
      assert.ok(meshes.length >= 2 && meshes.length <= 12, `${tour.id} : pièces fusionnées par matériau (${meshes.length})`);
      assert.ok(meshes.some((mesh) => mesh.name === `${tour.id}:sol`), 'le sol est présent');
      let total = 0, maxY = -Infinity;
      for (const mesh of meshes) {
        total += triangles(mesh);
        assert.ok(mesh.geometry.attributes.normal, 'le décor réagit à la lumière');
        for (const attribute of Object.values(mesh.geometry.attributes)) {
          assert.ok(attribute.array.every(Number.isFinite), `${tour.id}/${mesh.name} : aucun sommet invalide`);
        }
        const bounds = new THREE.Box3().setFromObject(mesh);
        maxY = Math.max(maxY, bounds.max.y);
      }
      assert.ok(total > 100 && total < 12000, `${tour.id} : budget de géométrie borné (${Math.round(total)})`);
      assert.ok(maxY < 3.5, `${tour.id} : le décor reste plus bas que la tour (${maxY.toFixed(2)})`);
    } finally { decor.dispose(); }
  }
  assert.equal(createStoryTowerDecor('tour-inconnue'), null, 'une tour inconnue n’a pas de décor');
});

test('chaque décor porte le folklore de sa tour, pas une silhouette générique', () => {
  for (const tour of RPG_STORY_TOURS) {
    const attendu = FOLKLORE[tour.id];
    assert.ok(attendu, `${tour.id} : un folklore est défini`);
    const decor = createStoryTowerDecor(tour.id);
    try {
      const presents = materiaux(decor);
      for (const signature of attendu) {
        assert.ok(presents.has(signature), `${tour.id} : le décor emploie « ${signature} » (${[...presents].join(', ')})`);
      }
    } finally { decor.dispose(); }
  }
});

test('les silhouettes se tiennent derrière la tour, le sol sous son socle', () => {
  for (const tour of RPG_STORY_TOURS) {
    const decor = createStoryTowerDecor(tour.id);
    try {
      let dot = 0, count = 0, solMinY = Infinity;
      decor.group.traverse((part) => {
        if (!part.isMesh) return;
        const positions = part.geometry.attributes.position;
        if (part.name === `${tour.id}:sol`) {
          const bounds = new THREE.Box3().setFromObject(part);
          solMinY = Math.min(solMinY, bounds.min.y);
          return;
        }
        for (let i = 0; i < positions.count; i += 1) {
          dot += positions.getX(i) * CAMERA_XZ.x + positions.getZ(i) * CAMERA_XZ.y;
          count += 1;
        }
      });
      assert.ok(count > 0 && dot / count < -1, `${tour.id} : les silhouettes sont dans le demi-plan arrière`);
      assert.ok(solMinY < 0, `${tour.id} : le sol est sous le socle de la tour`);
    } finally { decor.dispose(); }
  }
});

test('deux décors ont le même dessin mais ne partagent aucune ressource GPU', () => {
  for (const tour of RPG_STORY_TOURS) {
    const first = createStoryTowerDecor(tour.id), second = createStoryTowerDecor(tour.id);
    try {
      assert.equal(first.group.children.length, second.group.children.length);
      for (let i = 0; i < first.group.children.length; i += 1) {
        const a = first.group.children[i], b = second.group.children[i];
        assert.equal(a.name, b.name);
        assert.notEqual(a.geometry, b.geometry);
        assert.notEqual(a.material, b.material);
        const buffer = (mesh) => {
          const array = mesh.geometry.attributes.position.array;
          return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
        };
        assert.ok(buffer(a).equals(buffer(b)), 'le décor est déterministe');
      }
      const ra = resources(first), rb = resources(second);
      for (const key of ['geometries', 'materials', 'textures']) {
        for (const item of ra[key]) assert.ok(!rb[key].has(item), `aucune ${key} partagée`);
      }
    } finally { first.dispose(); second.dispose(); }
  }
});

test('le démontage du décor rend chaque ressource exactement une fois', () => {
  for (const tour of RPG_STORY_TOURS) {
    const decor = createStoryTowerDecor(tour.id);
    const counts = new Map();
    for (const set of Object.values(resources(decor))) {
      for (const resource of set) {
        counts.set(resource, 0);
        resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
      }
    }
    assert.ok(counts.size > 0);
    decor.dispose();
    decor.dispose();
    assert.equal(decor.group.children.length, 0, 'le groupe est vidé');
    assert.ok([...counts.values()].every((count) => count === 1), `${tour.id} : pas de fuite, ni double libération`);
  }
});

test('la scène monte le décor derrière la tour et le libère avec elle', () => {
  const scene = lire('../src/games/rpgStoryTowerScene.js');
  assert.match(scene, /import \{ createStoryTowerDecor \} from '\.\/rpgStoryTowerDecor\.js'/, 'le décor est importé');
  assert.match(scene, /decor = createStoryTowerDecor\(tourId, theme\)/, 'le décor est créé au montage');
  assert.match(scene, /if \(decor\) scene\.add\(decor\.group\)/, 'le décor entre dans la scène');
  assert.match(scene, /decor\?\.dispose\(\)/, 'le décor est libéré au démontage');
  // Le décor est un groupe séparé du modèle : les plans de coupe de la ruine ne
  // le rognent pas (ils ne parcourent que `model`).
  assert.match(scene, /model\.traverse\(\(part\) => \{[\s\S]{0,200}material\.clippingPlanes = ruin\.planes/, 'seul le modèle est rogné par la ruine');
});
