import test from 'node:test';
import assert from 'node:assert/strict';
import {
  viceCityTrafficSignalState,
  stepViceCityTrafficVehicle,
  VICE_CITY_TRAFFIC_STOP_LINE,
} from '../src/games/viceCityTraffic.js';

test('les feux alternent entre vert, orange et rouge selon l’axe', () => {
  assert.equal(viceCityTrafficSignalState('x', 0, 0, 0), 'green');
  assert.equal(viceCityTrafficSignalState('x', 0, 0, 10), 'yellow');
  assert.equal(viceCityTrafficSignalState('x', 0, 0, 12), 'red');
  assert.equal(viceCityTrafficSignalState('z', 0, 0, 12), 'red');
  assert.equal(viceCityTrafficSignalState('z', 0, 0, 13), 'green');
  assert.equal(viceCityTrafficSignalState('z', 0, 0, 23), 'yellow');
  assert.equal(viceCityTrafficSignalState('z', 0, 0, 25), 'red');
});

test('le décalage des cycles varie entre intersections', () => {
  assert.equal(viceCityTrafficSignalState('x', 0, 0, 0), 'green');
  assert.equal(viceCityTrafficSignalState('x', 1, 0, 0), 'green');
  assert.notEqual(viceCityTrafficSignalState('x', 2, 0, 4), 'green');
});

test('les voitures ralentissent et restent derrière la ligne au rouge', () => {
  const stopped = stepViceCityTrafficVehicle({ progress: 80, direction: 1, speed: 10, maxSpeed: 12 }, 0.2, VICE_CITY_TRAFFIC_STOP_LINE, 'red');
  assert.equal(stopped.progress, 80);
  assert.equal(stopped.speed, 0);

  const approaching = stepViceCityTrafficVehicle({ progress: 0, direction: 1, speed: 12, maxSpeed: 12 }, 0.1, 25, 'red');
  assert.ok(approaching.progress < 10);
  assert.ok(approaching.speed < 12);
});

test('le freinage des voitures rapides est plus efficace', () => {
  const sameSpeedSlowCar = stepViceCityTrafficVehicle(
    { progress: 0, direction: 1, speed: 15, maxSpeed: 20 }, 0.1, 20, 'red',
  );
  const sameSpeedFastCar = stepViceCityTrafficVehicle(
    { progress: 0, direction: 1, speed: 15, maxSpeed: 40 }, 0.1, 20, 'red',
  );
  assert.ok(sameSpeedFastCar.speed < sameSpeedSlowCar.speed,
    'à vitesse égale, la voiture plus puissante ralentit davantage');
});

test('les voitures repartent lorsque le feu passe au vert', () => {
  const moving = stepViceCityTrafficVehicle({ progress: 82, direction: 1, speed: 0, maxSpeed: 12 }, 0.5, 18, 'green');
  assert.ok(moving.progress > 82);
  assert.ok(moving.speed > 0);
});
