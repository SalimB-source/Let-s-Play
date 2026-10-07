import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
  CITY_RUSH_BAZOOKA_BLAST_CELLS,
  CITY_RUSH_BAZOOKA_PROJECTILE_SPEED,
  CITY_RUSH_BAZOOKA_WAREHOUSE_PROGRESS,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_LAP_LENGTH,
  cityRushBazookaBlastContains,
  cityRushBazookaPickupCanUse,
  cityRushBazookaTarget,
  cityRushBazookaWarehouseDistance,
} from '../src/games/cityRushRules.js';

const rulesSource = readFileSync(new URL('../src/games/cityRushRules.js', import.meta.url), 'utf8');
const worldSource = readFileSync(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../src/games/vice-city-rush.css', import.meta.url), 'utf8');

test('le bonus jaune donne deux roquettes et la portée du souffle vaut deux cases', () => {
  assert.equal(CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP, 2);
  assert.equal(CITY_RUSH_BAZOOKA_BLAST_CELLS, 2);
  assert.ok(CITY_RUSH_BAZOOKA_PROJECTILE_SPEED > 0);
  assert.equal(CITY_RUSH_BAZOOKA_BLAST_CELLS * CITY_RUSH_LANE_WIDTH, 4.2);
});

test('l’entrepôt est posé dans la première boucle du dernier tour, jamais dans les tours précédents', () => {
  for (const laps of [1, 3, 6]) {
    const distance = cityRushBazookaWarehouseDistance({ laps });
    const lastLapStart = (laps - 1) * CITY_RUSH_LAP_LENGTH;
    const nextLapLine = laps * CITY_RUSH_LAP_LENGTH;
    assert.equal(distance, (laps - 1 + CITY_RUSH_BAZOOKA_WAREHOUSE_PROGRESS) * CITY_RUSH_LAP_LENGTH);
    assert.ok(distance > lastLapStart);
    assert.ok(distance < nextLapLine);
  }
});

test('la roquette verrouille la première voiture de police vivante devant elle, dans sa voie', () => {
  const police = [
    { id: 'behind', isPolice: true, distance: 97, lane: 4 },
    { id: 'other-lane', isPolice: true, distance: 101, lane: 3 },
    { id: 'civilian', isPolice: false, distance: 102, lane: 4 },
    { id: 'destroyed', isPolice: true, distance: 103, lane: 4, health: 0 },
    { id: 'inactive', isPolice: true, distance: 103, lane: 4, active: false },
    { id: 'first', isPolice: true, distance: 104, lane: 4 },
    { id: 'second', isPolice: true, distance: 111, lane: 4 },
  ];
  assert.equal(cityRushBazookaTarget({ attackerDistance: 100, attackerLane: 4, police })?.id, 'first');
  assert.equal(cityRushBazookaTarget({ attackerDistance: 100, attackerLane: 2, police }), null);
  assert.equal(cityRushBazookaTarget({ attackerDistance: 100, attackerLane: 4, police, maxDistance: 3 }), null);
});

test('le souffle circulaire atteint deux cases autour de la voiture visée, pas au-delà', () => {
  const blast = (vehicleDistance, vehicleX) => cityRushBazookaBlastContains({
    centerDistance: 500,
    centerX: 0,
    vehicleDistance,
    vehicleX,
  });
  assert.equal(blast(500, 0), true);
  assert.equal(blast(500, CITY_RUSH_LANE_WIDTH * 2), true);
  assert.equal(blast(500 + CITY_RUSH_LANE_WIDTH * 2, 0), true);
  assert.equal(blast(500 + CITY_RUSH_LANE_WIDTH, CITY_RUSH_LANE_WIDTH), true);
  assert.equal(blast(500 + CITY_RUSH_LANE_WIDTH * 2, CITY_RUSH_LANE_WIDTH * 2), false);
  assert.equal(blast(500, CITY_RUSH_LANE_WIDTH * 2 + 0.01), false);
  assert.equal(cityRushBazookaBlastContains({ centerDistance: NaN, vehicleDistance: 0 }), false);
});

test('le ramassage demande une traversée de l’entrée sur la voie extérieure, une fois par course', () => {
  const crossing = {
    previousDistance: 96,
    nextDistance: 103,
    pickupDistance: 100,
    playerLane: 5,
    pickupLane: 5,
    halfLength: 3,
  };
  assert.equal(cityRushBazookaPickupCanUse(crossing), true);
  assert.equal(cityRushBazookaPickupCanUse({ ...crossing, playerLane: 4 }), false);
  assert.equal(cityRushBazookaPickupCanUse({ ...crossing, used: true }), false);
  assert.equal(cityRushBazookaPickupCanUse({ ...crossing, previousDistance: 101, nextDistance: 99 }), false);
  assert.equal(cityRushBazookaPickupCanUse({ ...crossing, previousDistance: 90, nextDistance: 94 }), false);
});

test('Vice City relie l’inventaire, les helpers de tir direct et le bouton tactile jaune', () => {
  assert.match(worldSource, /cityRushBazookaWarehouseDistance\(\{\s*laps: effectiveLaps\s*\}\)/);
  assert.match(worldSource, /city\.id === 'vice-city' && !sprint && storyWeaponsEnabled && storyPoliceEnabled/);
  assert.match(worldSource, /cityRushBazookaPickupCanUse\(\{/);
  assert.match(worldSource, /function firstPoliceOnLane[\s\S]*?cityRushBazookaTarget\(/);
  assert.match(rulesSource, /function cityRushBazookaTarget\([\s\S]*?return cityRushStraightShotTarget\(/);
  assert.match(worldSource, /cityRushStraightShotSweptHit\(\{[\s\S]*?shot\.bazooka[\s\S]*?bazookaPoliceCandidates\(\)/);
  assert.match(worldSource, /const isBazooka = kind === 'bazooka'[\s\S]*?\? 1/);
  assert.match(worldSource, /function useBazooka\(\)[\s\S]*?bazookaAmmo -= 1[\s\S]*?fireStraightShot\('player', target, 'bazooka'\)/);
  assert.match(worldSource, /bazookaAmmo = CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP/);
  assert.match(pageSource, /city-rush-bazooka-button/);
  assert.match(pageSource, /onClick=\{\(\) => actionsRef\.current\?\.\('bazooka'\)\}/);
  assert.match(pageSource, /X : BAZOOKA/);
  assert.match(pageSource, /city-rush-guide-item is-bazooka/);
  assert.match(pageSource, /city-rush-mode-bazooka-hint/);
  assert.match(baseCss, /\.city-rush-mode-bazooka-hint[\s\S]*?color: #ffd21f/);
  assert.match(baseCss, /\.city-rush-bazooka-button\.is-empty[\s\S]*?color: #9ca3ad/);
  assert.match(baseCss, /\.city-rush-bazooka-button\.is-ready[\s\S]*?border-color: #ffe35b/);
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud \.city-rush-bazooka-button\s*\{\s*pointer-events: auto/);
});
