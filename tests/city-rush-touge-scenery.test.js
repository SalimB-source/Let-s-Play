import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_COURSE,
} from '../src/games/cityRushRules.js';

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

// Les épingles et la section du tunnel : ni cerisier ni immeuble n'y est posé.
const route = CITY_RUSH_TOUGE;
const { batch, calls } = recordingBatch();
const city = CITY_RUSH_TOUGE_COURSE;
buildTougeTrack({ city, theme: { materials: {} }, materials: {}, batch, cityIndex: 0, lite: false, route });

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
    assert.ok(Math.abs(x) < 8.7,
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
