import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MIRAGE_ROUTE_CURVES,
  MIRAGE_ROUTE_ELEVATIONS,
  MIRAGE_ROUTE_GLSL,
  mirageRouteAt,
  mirageRouteOffset,
  mirageRouteOrientation,
  mirageRouteSlopeAt,
} from '../src/games/mirageRoute.js';

const closeTo = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
};

test('le chemin visuel ne déplace jamais le repère du joueur', () => {
  for (const progress of [-1000, 0, 1.25, 800, 1e6]) {
    assert.deepEqual(mirageRouteOffset(progress, 0), { x: 0, y: 0 });
  }
});

test('les virages et les reliefs restent doux et bornés', () => {
  const maxX = MIRAGE_ROUTE_CURVES.reduce((sum, wave) => sum + wave.amplitude, 0);
  const maxY = MIRAGE_ROUTE_ELEVATIONS.reduce((sum, wave) => sum + wave.amplitude, 0);
  assert.ok(maxX <= 1.5, `déplacement latéral limité à ${maxX} m`);
  assert.ok(maxY <= 0.61, `relief limité à ${maxY} m`);

  let maxYaw = 0;
  let maxPitch = 0;
  let maxOffsetX = 0;
  let maxOffsetY = 0;
  for (let progress = -400; progress <= 2000; progress += 0.5) {
    const orientation = mirageRouteOrientation(progress);
    maxYaw = Math.max(maxYaw, Math.abs(orientation.yaw));
    maxPitch = Math.max(maxPitch, Math.abs(orientation.pitch));
    for (const z of [-80, -40, 40, 80]) {
      const offset = mirageRouteOffset(progress, z);
      maxOffsetX = Math.max(maxOffsetX, Math.abs(offset.x));
      maxOffsetY = Math.max(maxOffsetY, Math.abs(offset.y));
    }
  }
  assert.ok(maxYaw < 0.09, `virage inférieur à ${((maxYaw * 180) / Math.PI).toFixed(1)}°`);
  assert.ok(maxPitch < 0.05, `pente inférieure à ${((maxPitch * 180) / Math.PI).toFixed(1)}°`);
  assert.ok(maxOffsetX <= maxX * 2 + 1e-6);
  assert.ok(maxOffsetY <= maxY * 2 + 1e-6);
});

test('les pentes calculées suivent les courbes sans cassure', () => {
  const epsilon = 1e-4;
  for (const distance of [-250, -12, 0, 78, 240, 1200]) {
    const before = mirageRouteAt(distance - epsilon);
    const after = mirageRouteAt(distance + epsilon);
    const slope = mirageRouteSlopeAt(distance);
    closeTo((after.x - before.x) / (2 * epsilon), slope.x, 2e-7);
    closeTo((after.y - before.y) / (2 * epsilon), slope.y, 2e-7);
  }
});

test('les shaders du décor du désert partagent les mêmes fonctions de route', () => {
  assert.match(MIRAGE_ROUTE_GLSL, /float mirageRouteX\(float s\)/);
  assert.match(MIRAGE_ROUTE_GLSL, /float mirageRouteY\(float s\)/);
  assert.match(MIRAGE_ROUTE_GLSL, /float mirageRouteDY\(float s\)/);
});

test('la route reste décorative : les règles et la vitesse ne dépendent pas de ses fonctions', () => {
  const world = readFileSync(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8');
  const rules = readFileSync(new URL('../src/games/mirageRules.js', import.meta.url), 'utf8');
  const start = world.indexOf('const updateVisualRoute');
  const end = world.indexOf('// Graphismes baissés :', start);
  const visualUpdate = world.slice(start, end);
  const speedCalculation = world.slice(world.indexOf('const speed = running'), world.indexOf('frameAdvance = 0'));

  assert.ok(start >= 0 && end > start, 'les transformations de route sont isolées dans leur bloc visuel');
  assert.doesNotMatch(rules, /mirageRoute/, 'aucune règle pure de course ne consulte le parcours visuel');
  assert.doesNotMatch(visualUpdate, /resolveCollision|advanceJump|playerLaneAfterAction/);
  assert.doesNotMatch(visualUpdate, /\b(?:distance|speed|laneIndex|jumpLeft)\s*(?:\+\+|[+\-*\/]?=)/);
  assert.doesNotMatch(speedCalculation, /mirageRoute/, 'la route n’entre pas dans le calcul de vitesse');
});
