import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_COURSE,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
  cityRushChasePlacement,
} from '../src/games/cityRushRules.js';
import { seededRandom } from '../src/games/cityRushBuilder.js';
import { cityRushTheme } from '../src/games/cityRushThemes.js';

const context2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
  closePath() {}, lineTo() {}, moveTo() {}, clearRect() {}, save() {}, restore() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: () => ({ width: 10 }), drawImage() {}, setTransform() {}, scale() {},
  translate() {}, rotate() {}, resetTransform() {}, transform() {},
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  buildTougeTrack,
  makeTougeSkyline,
  tougeTurnSightlineClearance,
  TOUGE_ROAD_HALF,
} = await import('../src/games/tougeStage.js');

// Un lot de construction qui enregistre les positions au lieu de les fondre.
function recordingBatch() {
  const calls = [];
  const recorder = (kind) => (material, position, size, rotation, options) => {
    calls.push({ kind, material, position, size, options });
  };
  const batch = {
    box: recorder('box'), plane: recorder('plane'), cylinder: recorder('cylinder'),
    cone: recorder('cone'), sphere: recorder('sphere'), torus: recorder('torus'), custom: recorder('custom'),
  };
  return { batch, calls };
}

const metresOf = (z) => -z / CITY_RUSH_SCROLL_SCALE;

// Les arbres ne masquent pas les virages ; les tours restent au fond de la vallée.
const route = CITY_RUSH_TOUGE;
const { batch, calls } = recordingBatch();
const city = CITY_RUSH_TOUGE_COURSE;
const stage = buildTougeTrack({ city, theme: { materials: {} }, materials: {}, batch, cityIndex: 0, lite: false, route });

// Les fleurs de cerisier sont les sphères des matériaux `blossom` (rose).
const blossoms = calls.filter((call) => call.kind === 'sphere'
  && call.material?.emissive?.getHex?.() === 0x4a1f33);
const valleyBlocks = calls.filter((call) => call.kind === 'box'
  && call.material?.isMeshBasicMaterial && call.material.map);

test('des cerisiers en fleurs bordent la route, sans jamais toucher l’asphalte', () => {
  assert.ok(blossoms.length >= 60, `${blossoms.length} sphères de fleurs : des cerisiers sont plantés`);
  for (const call of blossoms) {
    const [x, , z] = call.position;
    assert.ok(Math.abs(x) > TOUGE_ROAD_HALF,
      `une fleur tombe sur la chaussée à ${x.toFixed(1)} m de l'axe`);
    assert.ok(Math.abs(x) < TOUGE_ROAD_HALF + 5.5,
      `un cerisier est planté trop loin dans la forêt (${x.toFixed(1)} m)`);
    assert.equal(tougeTurnSightlineClearance(metresOf(z), route), false,
      `un cerisier masque un virage à ${metresOf(z).toFixed(0)} m`);
  }
});

test('les immeubles de la vallée restent au-delà de la forêt et sont éclairés', () => {
  assert.ok(valleyBlocks.length >= 6, `${valleyBlocks.length} blocs d'immeubles dans la vallée`);
  for (const call of valleyBlocks) {
    const [x, y, z] = call.position;
    const depth = call.size[0];
    const innerEdge = Math.abs(x) - depth / 2;
    assert.ok(innerEdge >= 91.9, `un immeuble empiète sur la forêt (bord à ${innerEdge.toFixed(1)} m)`);
    assert.ok(y > 8, 'un immeuble a une vraie hauteur');
    assert.ok(call.material.map.repeat !== undefined, 'la façade porte une texture de fenêtres');
    assert.ok(Math.abs(metresOf(z)) < CITY_RUSH_LAP_LENGTH + 1, 'le bloc tient dans le tour de la descente');
  }
  // Les fenêtres allumées : la texture de façade contient bien des fenêtres
  // jaunes ou bleues, et non un mur uniforme.
  assert.ok(new Set(valleyBlocks.map((call) => call.material)).size >= 2,
    'plusieurs façades différentes se partagent la vallée');
});


test('l’horizon devant le pilote contient de vrais immeubles aux fenêtres éclairées', () => {
  const rectangles = [];
  const originalFill = context2d.fillRect;
  let skyline;
  try {
    context2d.fillRect = function (x, y, width, height) {
      rectangles.push({ x, y, width, height, color: this.fillStyle });
    };
    skyline = makeTougeSkyline(city, cityRushTheme('touge'), seededRandom(2007));
  } finally {
    context2d.fillRect = originalFill;
  }
  try {
    const image = skyline.object.material.map.image;
    assert.equal(image.width, 2048);
    const central = rectangles.filter(({ x }) => x > image.width * 0.35 && x < image.width * 0.65);
    const towers = central.filter(({ width, height }) => width >= 20 && width <= 80 && height >= 90);
    const windows = central.filter(({ width, height }) => width === 4 && height === 6);
    assert.ok(towers.length >= 12, `${towers.length} tours se détachent au centre du panorama`);
    assert.ok(windows.length >= 200, `${windows.length} fenêtres allumées devant nous, pas seulement des points au sol`);
    assert.ok(new Set(windows.map(({ color }) => color)).size >= 2, 'fenêtres chaudes et bleutées');
    assert.equal(skyline.object.material.fog, false, 'la brume n’efface pas le fond lointain');
    assert.equal(skyline.object.material.depthWrite, false, 'le fond ne masque pas la route');
  } finally {
    skyline.object.geometry.dispose();
    skyline.object.material.map.dispose();
    skyline.object.material.dispose();
  }
});

test('les immeubles restent dans notre direction, même après un virage et au tour suivant', () => {
  const skyline = makeTougeSkyline(city, cityRushTheme('touge'), seededRandom(2007));
  const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 420);
  const direction = new THREE.Vector3();
  const delta = new THREE.Vector3();
  try {
    // Caméra en descente, caps droits puis ±60°, toutes les entrées/sorties
    // et la couture du tour. La même mise à jour sert au mode léger du mobile.
    for (const aspect of [16 / 9, 9 / 16]) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      for (let metre = -20; metre < CITY_RUSH_LAP_LENGTH * 2 + 20; metre += 5) {
        const chase = cityRushChasePlacement(metre, CITY_RUSH_TRACK_PROFILE_TOUGE);
        camera.position.set(chase.cameraX, 6.6 + chase.cameraHill, 3.1 + chase.cameraZ);
        camera.lookAt(chase.lookX, 1.3 + chase.lookHill, 3.1 + chase.lookZ);
        camera.updateMatrixWorld();
        skyline.update(camera);
        skyline.object.updateMatrixWorld();
        camera.getWorldDirection(direction);
        delta.copy(skyline.object.position).sub(camera.position);
        assert.ok(Math.abs(delta.x * direction.z - delta.z * direction.x) < 1e-8,
          `le fond est dans l’axe du regard à ${metre} m`);
        assert.ok(delta.dot(direction) > 200, 'les tours restent au loin, jamais sur la chaussée');
        // Point du toit de la tour centrale peinte dans le panorama.
        const roof = new THREE.Vector3(-13, 18, 0);
        skyline.object.localToWorld(roof);
        roof.project(camera);
        assert.ok(Math.abs(roof.x) < 0.25 && roof.y > 0 && roof.y < 0.8 && roof.z > -1 && roof.z < 1,
          `le toit reste visible devant nous à ${metre} m (x=${roof.x.toFixed(2)}, y=${roof.y.toFixed(2)})`);
        assert.equal(skyline.object.rotation.x, 0, 'les tours restent verticales dans la pente');
        assert.equal(skyline.object.rotation.z, 0);
      }
    }
  } finally {
    skyline.object.geometry.dispose();
    skyline.object.material.map.dispose();
    skyline.object.material.dispose();
  }
});


test('les spectateurs des deux épingles isolées restent sur le bas-côté', () => {
  assert.equal(stage.dynamicProps.length, 2);
  for (const prop of stage.dynamicProps) {
    assert.ok(prop.trackPos > 0 && prop.trackPos < CITY_RUSH_LAP_LENGTH);
    prop.group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      assert.ok(Math.abs(mesh.position.x) > TOUGE_ROAD_HALF + 1,
        'les lanternes, spectateurs et drapeaux ne sont pas posés au milieu de la chaussée');
    });
  }
});
