import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VICE_CITY_OUTER_HIGHWAY,
  VICE_CITY_ROAD_HILLS,
  viceCityCanalWaveHeight,
  viceCityOuterHighwayAccessRamps,
  viceCityOuterHighwayLoopPath,
  viceCityOuterHighwayBridgeHeight,
  viceCityOuterHighwayContains,
  viceCityOuterHighwayPaths,
  viceCityRoadElevation,
} from '../src/games/viceCityRoads.js';

test('l’eau du canal ondule doucement et reste dans son tirant d’air', () => {
  const heights = [0, 0.4, 1.2, 2.5, 4, 8].map((time) => viceCityCanalWaveHeight(0, 45, time));
  assert.ok(heights.every((height) => Math.abs(height) <= 0.0791), 'les vagues restent peu profondes');
  assert.ok(new Set(heights).size > 4, 'la surface se déplace au fil du temps');
});

test('les axes vallonnés montent puis redescendent avant les carrefours', () => {
  for (const hill of VICE_CITY_ROAD_HILLS) {
    const point = (along) => hill.axis === 'z' ? [along, hill.fixed] : [hill.fixed, along];
    const heightAt = (along) => viceCityRoadElevation(...point(along));
    assert.equal(heightAt(hill.center - hill.halfLength), 0);
    assert.equal(heightAt(hill.center + hill.halfLength), 0);
    assert.ok(heightAt(hill.center - hill.halfLength / 2) > 0, 'la route doit monter');
    assert.ok(heightAt(hill.center) > heightAt(hill.center - hill.halfLength / 2), 'la route atteint un sommet');
    assert.ok(heightAt(hill.center + hill.halfLength / 2) > 0, 'la route redescend après le sommet');
  }
});

test('les accotements rejoignent progressivement le terrain et les autres routes restent plates', () => {
  assert.ok(viceCityRoadElevation(-150, -200) > viceCityRoadElevation(-150, -208));
  assert.equal(viceCityRoadElevation(-150, -213), 0);
  assert.equal(viceCityRoadElevation(0, 0), 0);
  assert.equal(viceCityRoadElevation(-200, -200), 0);
});

test('quatre sorties courbes relient le périphérique aux carrefours d’angle', () => {
  const { cityGridLimit, edge } = VICE_CITY_OUTER_HIGHWAY;
  const ramps = viceCityOuterHighwayAccessRamps();
  assert.equal(ramps.length, 4);
  for (const ramp of ramps) {
    assert.ok(ramp.length >= 40, 'la courbe est assez finement échantillonnée');
    const start = ramp[0];
    const end = ramp.at(-1);
    assert.equal(Math.abs(start.z), edge, 'la bretelle rejoint le boulevard périphérique');
    assert.equal(Math.abs(end.x), cityGridLimit);
    assert.equal(Math.abs(end.z), cityGridLimit, 'la bretelle rejoint un carrefour de la grille');
    assert.ok(Math.abs(ramp[12].x - start.x) > 8 && Math.abs(ramp[12].z - start.z) > 3,
      'la sortie tourne au lieu de rester une longue ligne droite');
    for (let index = 0; index < ramp.length; index += 3) {
      assert.ok(viceCityOuterHighwayContains(ramp[index].x, ramp[index].z),
        `la chaussée reste continue près du point ${index}`);
    }
    assert.ok(viceCityOuterHighwayContains(end.x, end.z), 'la sortie touche la rue urbaine');
  }
});

test('la chaussée métropolitaine possède trois voies par sens et une trajectoire de trafic fermée', () => {
  assert.ok(VICE_CITY_OUTER_HIGHWAY.halfWidth >= 19, 'les chaussées et accotements sont assez larges pour trois voies par sens');
  const loop = viceCityOuterHighwayLoopPath();
  assert.deepEqual(loop[0], loop.at(-1), 'la trajectoire de trafic referme la boucle');
  assert.ok(loop.length > 500);
  let length = 0;
  for (let index = 1; index < loop.length; index += 1) {
    const segment = Math.hypot(loop[index].x - loop[index - 1].x, loop[index].z - loop[index - 1].z);
    assert.ok(segment <= 6.1, `le trafic ne saute pas d’un tronçon à l’autre (${segment} m)`);
    length += segment;
  }
  assert.ok(length > 3000, 'la boucle constitue un véritable parcours périphérique');
});

test('l’autoroute reçoit un terre-plein, des glissières, des panneaux suspendus et du trafic roulant', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /vice-city-highway-concrete-median/u);
  assert.match(source, /vice-city-highway-continuous-guardrail/u);
  assert.match(source, /vice-city-highway-overhead-exit-sign/u);
  assert.match(source, /highwayCruiseSpeed/u);
  assert.match(source, /highwayLaneChangeDuration: 2\.8/u);
  assert.match(source, /highwayLaneChangeStartedAt/u);
  assert.match(source, /traffic\.axis === 'highway'/u);
  assert.match(source, /city\.isHighwayBarrierBlocked\(x, z\)/u,
    'les barrières visibles ont aussi une collision');
  assert.match(source, /if \(isNearRampCorridor\(centerX, centerZ\)\) continue/u,
    'le terre-plein s’interrompt le long des bretelles');
  assert.match(source, /const rampOpening = isNearRampCorridor/u,
    'les glissières latérales laissent aussi passer les bretelles');
  assert.match(source, /const gantryTangent = tangents\[0\]/u,
    'les panneaux suivent l’orientation de la chaussée principale à l’entrée');
  assert.match(source, /const gantryApproach = 58/u,
    'les panneaux sont annoncés en amont de la sortie');
});

test('l’autoroute forme une boucle continue et traverse le fleuve sur deux ponts en arche', () => {
  const { edge, bankOffset, halfWidth, bridgeDeckHeight } = VICE_CITY_OUTER_HIGHWAY;
  const [riveOuest, riveEst, pontNord, pontSud] = viceCityOuterHighwayPaths();
  assert.equal(riveOuest[0].x, -bankOffset);
  assert.equal(riveEst[0].x, bankOffset);
  assert.ok(riveOuest.every(({ x }) => x <= -bankOffset), 'la boucle ouest reste sur sa rive');
  assert.ok(riveEst.every(({ x }) => x >= bankOffset), 'la boucle est reste sur sa rive');
  assert.equal(pontNord[0].x, -bankOffset);
  assert.equal(pontNord.at(-1).x, bankOffset);
  assert.equal(pontNord[0].z, -edge);
  assert.equal(pontSud.at(-1).z, edge);
  assert.deepEqual(pontNord[0], riveOuest[0]);
  assert.deepEqual(pontNord.at(-1), riveEst[0]);
  assert.deepEqual(pontSud[0], riveOuest.at(-1));
  assert.deepEqual(pontSud.at(-1), riveEst.at(-1));
  assert.ok(viceCityOuterHighwayContains(100, -edge), 'la bretelle rejoint la rive est');
  assert.ok(viceCityOuterHighwayContains(-edge, 0), 'la boucle ouest est continue');
  assert.ok(viceCityOuterHighwayContains(edge, 0), 'la boucle est est continue');
  assert.ok(viceCityOuterHighwayContains(0, -edge), 'le pont nord rejoint les deux rives');
  assert.ok(viceCityOuterHighwayContains(0, edge), 'le pont sud rejoint les deux rives');
  const curvedRamps = viceCityOuterHighwayAccessRamps();
  assert.ok(viceCityOuterHighwayContains(curvedRamps[0][24].x, curvedRamps[0][24].z),
    'la sortie courbe est praticable sur toute sa longueur');
  for (const ramp of curvedRamps) {
    const endpoint = ramp.at(-1);
    assert.ok(viceCityOuterHighwayContains(endpoint.x, endpoint.z),
      'chaque bretelle rejoint un carrefour du centre-ville');
  }
  assert.equal(viceCityOuterHighwayContains(0, 0), false, 'le pont rouge reste le passage du centre-ville');
  assert.equal(viceCityOuterHighwayBridgeHeight(bankOffset, -edge), 0, 'les rampes rejoignent le terrain sans marche');
  assert.equal(viceCityOuterHighwayBridgeHeight(0, -edge), bridgeDeckHeight, 'le tablier culmine au-dessus de l’eau');
  assert.ok(viceCityOuterHighwayBridgeHeight(20, -edge) > bridgeDeckHeight * 0.8,
    `la hauteur garde le tirant d’air pour les bateaux (${halfWidth} m de chaussée)`);
  assert.ok(viceCityOuterHighwayBridgeHeight(30, -edge) < viceCityOuterHighwayBridgeHeight(20, -edge),
    'les arches redescendent progressivement vers les berges');
  assert.equal(viceCityOuterHighwayBridgeHeight(0, 0), 0, 'la hauteur ne déborde pas sur les autres routes');
});
