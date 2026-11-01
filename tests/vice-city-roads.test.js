import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VICE_CITY_OUTER_HIGHWAY,
  VICE_CITY_ROAD_HILLS,
  viceCityOuterHighwayContains,
  viceCityOuterHighwayPaths,
  viceCityRoadElevation,
} from '../src/games/viceCityRoads.js';

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

test('les autoroutes contournent les deux rives sans créer un second passage sur le canal', () => {
  const { edge, bankOffset, halfWidth } = VICE_CITY_OUTER_HIGHWAY;
  const [riveOuest, riveEst] = viceCityOuterHighwayPaths();
  assert.equal(riveOuest[0].x, -bankOffset);
  assert.equal(riveEst[0].x, bankOffset);
  assert.ok(viceCityOuterHighwayContains(100, -edge), 'la branche nord reste sur la rive est');
  assert.equal(viceCityOuterHighwayContains(0, -edge), false, 'aucune chaussée ne traverse l’eau au nord');
  assert.ok(viceCityOuterHighwayContains(-edge, 0), 'la branche ouest longe tout son côté');
  assert.ok(viceCityOuterHighwayContains(edge, 0), 'la branche est longe tout son côté');
  assert.ok(viceCityOuterHighwayContains(-100, edge), 'la branche sud reste sur la rive ouest');
  assert.equal(viceCityOuterHighwayContains(0, edge), false, 'aucune chaussée ne traverse l’eau au sud');
  assert.ok(viceCityOuterHighwayContains(100, -400), 'une bretelle relie la boucle aux rues de la ville');
  assert.ok(viceCityOuterHighwayContains(400, 300), 'une bretelle rejoint aussi les rues latérales');
  assert.equal(viceCityOuterHighwayContains(0, 0), false, 'le pont rouge reste le seul passage de la rivière');
  assert.ok(riveOuest.every(({ x }) => x < -20) && riveEst.every(({ x }) => x > 20),
    `les deux tracés restent chacun sur leur rive, chaussée de ${halfWidth * 2} m comprise`);
});
