import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
  CITY_RUSH_BAZOOKA_AMMO_PER_RACE,
  CITY_RUSH_BAZOOKA_BLAST_CELLS,
  CITY_RUSH_BAZOOKA_PICKUP_SHARES,
  CITY_RUSH_BAZOOKA_PROJECTILE_SPEED,
  CITY_RUSH_COURSES,
  CITY_RUSH_LANE_WIDTH,
  cityRushBazookaBlastContains,
  cityRushBazookaPickupCanUse,
  cityRushBazookaTarget,
  cityRushBazookaTrackDistances,
  cityRushDriveSide,
  cityRushLaneConfig,
  cityRushMiniGarageMidRaceDistance,
  cityRushRaceDistance,
} from '../src/games/cityRushRules.js';

const rulesSource = readFileSync(new URL('../src/games/cityRushRules.js', import.meta.url), 'utf8');
const worldSource = readFileSync(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../src/games/vice-city-rush.css', import.meta.url), 'utf8');

test('le bonus jaune donne un seul tir — deux roquettes par course — et la portée du souffle couvre huit cases pour toucher les patrouilles à côté', () => {
  assert.equal(CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP, 1);
  assert.equal(CITY_RUSH_BAZOOKA_AMMO_PER_RACE, 2, 'une roquette par conteneur, deux conteneurs');
  assert.equal(CITY_RUSH_BAZOOKA_BLAST_CELLS, 8);
  assert.ok(CITY_RUSH_BAZOOKA_PROJECTILE_SPEED > 0);
  assert.ok(Math.abs(CITY_RUSH_BAZOOKA_BLAST_CELLS * CITY_RUSH_LANE_WIDTH - 16.8) < 1e-9);
});

test('deux entrepôts par course, à 30 % et 65 % du parcours — le premier avant le garage de vie', () => {
  assert.deepEqual([...CITY_RUSH_BAZOOKA_PICKUP_SHARES], [0.3, 0.65]);
  for (const laps of [1, 3, 6]) {
    const distances = cityRushBazookaTrackDistances({ laps });
    const total = cityRushRaceDistance(laps);
    const garage = cityRushMiniGarageMidRaceDistance({ laps });
    assert.equal(distances.length, 2);
    assert.equal(distances[0], total * 0.3);
    assert.equal(distances[1], total * 0.65);
    // Le premier entrepôt précède le garage de vie de mi-course (50 %),
    // le second le suit.
    assert.ok(distances[0] < garage);
    assert.ok(distances[1] > garage);
    assert.ok(distances.every((distance) => distance > 0 && distance < total));
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

test('le souffle circulaire atteint les voitures de police situées à côté dans le rayon de huit cases, pas au-delà', () => {
  const blast = (vehicleDistance, vehicleX) => cityRushBazookaBlastContains({
    centerDistance: 500,
    centerX: 0,
    vehicleDistance,
    vehicleX,
  });
  assert.equal(blast(500, 0), true);
  assert.equal(blast(500, CITY_RUSH_LANE_WIDTH * 2), true);
  assert.equal(blast(500 + 12, CITY_RUSH_LANE_WIDTH * 2), true);
  assert.equal(blast(500, CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS), true);
  assert.equal(blast(500 + CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS, 0), true);
  assert.equal(blast(500 + CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS, CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS), false);
  assert.equal(blast(500, CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS + 0.01), false);
  assert.equal(cityRushBazookaBlastContains({ centerDistance: NaN, vehicleDistance: 0 }), false);
});

test('le ramassage demande une traversée de l’entrée sur la voie extérieure, une fois par entrepôt', () => {
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

test('chaque conteneur prend les deux voies extérieures du sens de course, sans mordre sur le contresens', () => {
  // Le conteneur n'est plus un hangar de bas-côté : c'est une caisse de 40
  // pieds posée sur la chaussée, large de **deux voies** — celle du ramassage
  // et celle qui la borde vers l'axe jaune. En conduite à gauche (Londres,
  // Shutō C1), tout le conteneur est reflété : sans ce miroir, il s'étalerait
  // sur les voies du contresens au lieu de rester de son côté de l'axe.
  assert.match(worldSource, /function makeBazookaContainer\(city, pickupLaneX, side = 1\)/);
  assert.match(worldSource, /neonText\(ctx, 'BAZOOKA HERE'/);
  assert.match(worldSource, /sign\.userData = \{ label: 'BAZOOKA HERE' \}/);
  assert.match(worldSource, /const bazookaOutwardSide = driveSide === 'left' \? -1 : 1/);
  assert.match(worldSource, /makeBazookaContainer\(city, laneX\(bazookaPickupLane\), bazookaOutwardSide\)/);
  assert.match(worldSource, /const out = \(offset\) => pickupLaneX \+ side \* offset/);
  // La caisse fait exactement deux voies, de la voie de ramassage à la voie
  // voisine vers l'axe, et c'est cette largeur qui est posée sur la chaussée.
  assert.match(worldSource, /const WIDTH = CITY_RUSH_LANE_WIDTH \* 2/);
  assert.match(worldSource, /const innerX = out\(-CITY_RUSH_LANE_WIDTH \* 1\.5\)/);
  assert.match(worldSource, /const outerX = out\(CITY_RUSH_LANE_WIDTH \/ 2\)/);
  assert.match(worldSource, /addBox\('bazooka-container-inner-wall', \[WALL, CEILING, LENGTH\], \[innerWallX/);
  assert.match(worldSource, /addBox\('bazooka-container-outer-wall', \[WALL, CEILING, LENGTH\], \[outerWallX/);
  // Les sept parcours à trafic en face suivent leur côté de conduite ; le Ring,
  // à sens unique, garde l'extérieur droit comme le reste du jeu.
  for (const course of CITY_RUSH_COURSES) {
    const leftHand = cityRushDriveSide(course) === 'left';
    const laneConfig = cityRushLaneConfig(course);
    const pickupLane = leftHand ? laneConfig.forwardLanes[0] : laneConfig.forwardLanes.at(-1);
    const pickupLaneX = laneConfig.laneX(pickupLane);
    const side = leftHand ? -1 : 1;
    // La voie de ramassage est bien la plus à l'extérieur du sens de course.
    assert.ok(
      laneConfig.forwardLanes.every((lane) => side * laneConfig.laneX(lane) <= side * pickupLaneX + 1e-9),
      `voie extérieure de ${course.name}`,
    );
    assert.equal(side, leftHand ? -1 : 1);
    // Les deux voies du conteneur : une voie et demie vers l'axe, une demie
    // vers le bas-côté, soit deux voies pleines pour la caisse.
    const innerEdge = pickupLaneX - side * CITY_RUSH_LANE_WIDTH * 1.5;
    const outerEdge = pickupLaneX + side * CITY_RUSH_LANE_WIDTH / 2;
    const containerWidth = (outerEdge - innerEdge) * side;
    assert.ok(Math.abs(containerWidth - CITY_RUSH_LANE_WIDTH * 2) < 1e-9, `largeur du conteneur de ${course.name}`);
    // Le conteneur ne franchit jamais l'axe jaune — sur le Ring, à sens
    // unique, sa paroi intérieure tombe exactement sur l'axe de la piste...
    assert.ok(side * innerEdge >= -1e-9, `le conteneur de ${course.name} doit rester de son côté de l'axe`);
    // ...et il ne quitte jamais le bitume de son côté : la paroi extérieure
    // reste en deçà du bord de la chaussée.
    assert.ok(side * outerEdge <= laneConfig.roadHalf + 1e-9, `le conteneur de ${course.name} doit rester sur la chaussée`);
  }
  assert.deepEqual(
    CITY_RUSH_COURSES.filter((course) => cityRushDriveSide(course) === 'left').map((course) => course.id).sort(),
    ['london', 'tokyo'],
  );
});

test('deux entrepôts sur toutes les cartes, reliés à l’inventaire, au tir direct et au bouton de tir unique', () => {
  assert.match(worldSource, /cityRushBazookaTrackDistances\(\{\s*laps: effectiveLaps\s*\}\)/);
  assert.match(worldSource, /const bazookaWarehouseEnabled = !sprint && storyWeaponsEnabled && storyPoliceEnabled/);
  assert.doesNotMatch(worldSource, /city\.id === 'vice-city' && !sprint && storyWeaponsEnabled/);
  assert.match(worldSource, /const bazookaWarehouses = bazookaWarehouseEnabled\s*\?\s*bazookaTrackDistances\.map/);
  assert.match(worldSource, /bazookaWarehouses\.forEach\(placeBazookaWarehouse\)/);
  assert.match(worldSource, /updateBazookaWarehouses\(priorDistance, dt\)/);
  assert.match(worldSource, /cityRushBazookaPickupCanUse\(\{/);
  assert.match(worldSource, /function firstPoliceOnLane[\s\S]*?cityRushBazookaTarget\(/);
  assert.match(rulesSource, /function cityRushBazookaTarget\([\s\S]*?return cityRushStraightShotTarget\(/);
  assert.match(worldSource, /cityRushStraightShotSweptHit\(\{[\s\S]*?shot\.bazooka[\s\S]*?bazookaPoliceCandidates\(\)/);
  assert.match(worldSource, /const isBazooka = kind === 'bazooka'[\s\S]*?\? 1/);
  assert.match(worldSource, /function useBazooka\([\s\S]*?bazookaAmmo -= 1[\s\S]*?fireStraightShot\('player', target, 'bazooka'\)/);
  assert.match(worldSource, /bazookaAmmo = CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP/);
  // La roquette occupe l'emplacement d'arme unique, comme le tir rouge ou
  // bleu : traverser un conteneur jaune vide l'AK-47 et le pompe, ramasser
  // un bonus rouge ou bleu vide la roquette.
  assert.match(worldSource, /bazookaAmmo = CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP;[\s\S]*?inventory = cityRushEquipWeapon\(inventory, CITY_RUSH_POWERS\.PISTOL, 0\)/);
  assert.match(worldSource, /inventory = cityRushEquipWeapon\(inventory, type, pickupAmount\);\s*\n\s*bazookaAmmo = 0;/);
  assert.match(worldSource, /if \(bazookaAmmo > 0\) \{\s*\n\s*return Object\.freeze\(\{ type: 'bazooka', ammo: bazookaAmmo, max: CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP \}\);/);
  // Le bouton de tir (et la touche Z) tire l'arme en main — roquette comprise.
  assert.match(worldSource, /weapon\.type === 'bazooka' \? useBazooka\(\) : usePower\(weapon\.type\)/);
  // Le bouton de bazooka séparé a disparu : la roquette remplace l'arme en
  // main sur le bouton de tir unique, avec sa livrée jaune.
  assert.doesNotMatch(pageSource, /city-rush-bazooka-button/);
  assert.doesNotMatch(hudCss, /city-rush-bazooka-button/);
  assert.match(pageSource, /bazookaRockets > 0[\s\S]*?\{ type: 'bazooka', ammo: bazookaRockets, max: CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP \}/);
  assert.match(pageSource, /isBazooka \|\| bazookaExhausted \? ' is-bazooka' : ''/);
  assert.match(pageSource, /Z : TIR \(AK-47 · POMPE · BAZOOKA\)/);
  assert.match(pageSource, /city-rush-guide-item is-bazooka/);
  assert.match(pageSource, /city-rush-mode-bazooka-hint/);
  assert.match(pageSource, /const bazookaMode = !sprintMode && storyWeaponsOn && storyPoliceOn/);
  assert.doesNotMatch(pageSource, /const bazookaMode = cityId === 'vice-city'/);
  assert.match(baseCss, /\.city-rush-mode-bazooka-hint[\s\S]*?color: #ffd21f/);
  assert.match(baseCss, /\.city-rush-machine-gun-button\.is-bazooka\.is-ready[\s\S]*?#ffc61b 48%/);
  assert.match(baseCss, /\.city-rush-machine-gun-button\.is-bazooka \.city-rush-machine-gun-ammo path\.is-loaded[\s\S]*?stroke: #ffd21f/);
});

test('le tir laisse un cratère noir durable et une explosion en champignon, avec secousse et vignette rouge', () => {
  assert.match(worldSource, /const BAZOOKA_EXPLOSION_SECONDS = 1\.85/);
  assert.match(worldSource, /const BAZOOKA_SCORCH_SECONDS = 4\.8/);
  assert.match(worldSource, /group\.name = 'bazooka-mushroom-cloud'/);
  assert.match(worldSource, /bazooka-mushroom-stem-smoke/);
  assert.match(worldSource, /new THREE\.CircleGeometry\(bazooka \? 2\.35 : 1\.5/);
  assert.match(worldSource, /scorch\.name = bazooka \? 'bazooka-scorch-mark'/);
  assert.match(worldSource, /cameraKick = Math\.max\(cameraKick, reduceMotion \? 0\.35 : 1\.45\)/);
  assert.match(pageSource, /effect\.type === 'bazooka-impact'[\s\S]*?setBazookaImpactPulse/);
  assert.match(pageSource, /worldElement\.classList\.add\('is-bazooka-shaking'\)/);
  assert.match(pageSource, /bazookaImpactPulse > 0 && \([\s\S]*?city-rush-bazooka-blast-vignette[\s\S]*?onAnimationEnd=\{\(\) => setBazookaImpactPulse/);
  assert.match(baseCss, /@keyframes crBazookaScreenShake/);
  assert.match(baseCss, /@keyframes crBazookaBlastVignette/);
  assert.match(baseCss, /rgba\(255, 22, 48, 0\.78\)/);
});

test('le bazooka remplace l’arme en main sur le bouton de tir unique — plus de bouton jaune séparé', () => {
  const weaponDock = pageSource.match(/city-rush-weapon-controls[\s\S]*?<\/button>/)?.[0] || '';
  assert.ok(weaponDock, 'le dock d’armes porte le bouton de tir unique');
  assert.doesNotMatch(weaponDock, /city-rush-bazooka-button/, 'le bazooka n’a plus son propre bouton');
  assert.match(weaponDock, /is-bazooka/, 'le bouton unique prend la livrée jaune quand la roquette est en main');
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud \.city-rush-weapon-controls\s*\{[^}]*display: flex;[^}]*flex-direction: row;/);
});
