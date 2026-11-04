/**
 * Le corps de `check:city-rush-webgpu` — entrée de `city-rush-webgpu-check.mjs`.
 *
 * Une course par parcours, renderer marqué WebGPU, et l'on inspecte les
 * matériaux que three.js devrait compiler en WGSL.
 */
import assert from 'node:assert/strict';
import { CITY_RUSH_CARS, CITY_RUSH_COURSES } from '../src/games/cityRushRules.js';
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

/**
 * Les types de matériaux que three.js sait convertir en WGSL : ceux du
 * catalogue `NodeMaterials` (Standard, Lambert, Phong, Basic, Matcap, Toon,
 * Physical, Normal, Shadow, Sprite, Points, Line). Un matériau d'auteur n'y est
 * pas — il n'a pas de version « nœuds ».
 */
const TRANSLATED = new Set([
  'MeshStandardMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial',
  'MeshBasicMaterial', 'MeshMatcapMaterial', 'MeshToonMaterial',
  'MeshPhysicalMaterial', 'MeshNormalMaterial', 'ShadowMaterial',
  'SpriteMaterial', 'PointsMaterial', 'LineBasicMaterial', 'LineDashedMaterial',
]);

const rows = [];
for (const city of CITY_RUSH_COURSES) {
  const world = createCityRushWorld(
    mount,
    city,
    () => ({ hud() {}, graphics() {} }),
    CITY_RUSH_CARS[0].id,
    null,
    null,
    1,
  );

  const materials = new Map();
  const shaders = [];
  let skyName = '';
  world.scene.traverse((object) => {
    if (object.name === 'sky-dome-painted' || object.name === 'sky-dome') skyName = object.name;
    const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of list) {
      materials.set(material.type, (materials.get(material.type) || 0) + 1);
      if (material.isShaderMaterial || material.isRawShaderMaterial) shaders.push(`${object.type}/${material.type}`);
    }
  });

  rows.push({ city: city.id, skyName, shaders, materials: Object.fromEntries(materials) });

  // 1. Le ciel : le dôme peint, et lui seul.
  assert.equal(skyName, 'sky-dome-painted', `${city.id} : c’est le ciel peint qui est monté`);
  // 2. Pas un seul shader GLSL dans la scène.
  assert.equal(shaders.length, 0, `${city.id} : aucun ShaderMaterial (${shaders.slice(0, 3).join(', ')})`);
  // 3. Tous les matériaux ont une version « nœuds ».
  for (const type of Object.keys(rows.at(-1).materials)) {
    assert.ok(TRANSLATED.has(type), `${city.id} : ${type} se traduit en WGSL`);
  }

  world.destroy();
}

assert.equal(rows.length, CITY_RUSH_COURSES.length, 'les neuf parcours sont passés');

// Rapport : ce que la scène demande de compiler, par parcours.
const catalog = new Map();
for (const row of rows) {
  for (const [type, count] of Object.entries(row.materials)) catalog.set(type, (catalog.get(type) || 0) + count);
  console.log(`  ${row.city.padEnd(18)} ${row.skyName.padEnd(17)} ${Object.keys(row.materials).length} types de matériaux, 0 shader GLSL`);
}
console.log('  types présents :', [...catalog.entries()].map(([type, count]) => `${type.replace('Mesh', '').replace('Material', '')}×${count}`).join(', '));
console.log('check:city-rush-webgpu ✓ — en essai WebGPU les neuf parcours montent un ciel peint et ne demandent plus un seul shader GLSL : every matériau de la scène a une version « nœuds », donc trois.js peut compiler la course en WGSL.'.replace('every', 'chaque'));
