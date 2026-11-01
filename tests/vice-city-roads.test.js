import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VICE_CITY_OUTER_HIGHWAY,
  VICE_CITY_ROAD_HILLS,
  viceCityCanalWaveHeight,
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
  assert.ok(viceCityOuterHighwayContains(100, -400), 'une bretelle relie la boucle aux rues de la ville');
  assert.ok(viceCityOuterHighwayContains(400, 300), 'une bretelle rejoint aussi les rues latérales');
  assert.equal(viceCityOuterHighwayContains(0, 0), false, 'le pont rouge reste le passage du centre-ville');
  assert.equal(viceCityOuterHighwayBridgeHeight(bankOffset, -edge), 0, 'les rampes rejoignent le terrain sans marche');
  assert.equal(viceCityOuterHighwayBridgeHeight(0, -edge), bridgeDeckHeight, 'le tablier culmine au-dessus de l’eau');
  assert.ok(viceCityOuterHighwayBridgeHeight(20, -edge) > bridgeDeckHeight * 0.8,
    `la hauteur garde le tirant d’air pour les bateaux (${halfWidth} m de chaussée)`);
  assert.ok(viceCityOuterHighwayBridgeHeight(30, -edge) < viceCityOuterHighwayBridgeHeight(20, -edge),
    'les arches redescendent progressivement vers les berges');
  assert.equal(viceCityOuterHighwayBridgeHeight(0, 0), 0, 'la hauteur ne déborde pas sur les autres routes');
});
