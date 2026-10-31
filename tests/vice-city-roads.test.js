import test from 'node:test';
import assert from 'node:assert/strict';
import { VICE_CITY_ROAD_HILLS, viceCityRoadElevation } from '../src/games/viceCityRoads.js';

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
