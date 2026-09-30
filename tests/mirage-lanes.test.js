import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANES, LANE_COUNTS, LANE_SPACING, createCourse, duelRivalsForTrack, hitsMudPuddle,
  laneCount, lanePosition, planNpcLane, playerLaneAfterAction, seededRandom, setLaneCount,
  trackWidth,
} from '../src/games/mirageRules.js';
import {
  APP_LANE_COUNT, WEB_LANE_COUNT, applyLaneCountForDevice, isAppTrack, laneCountForDevice,
  runningInAndroidApp,
} from '../src/games/mirageLanes.js';

/*
 * Les voies sont un état de module (le tableau `LANES` est remplacé sur place
 * par `setLaneCount()`) : chaque test qui change de piste la remet en place
 * ensuite, pour que la fin du fichier reparte toujours du site à quatre voies.
 */

test('le site joue sur quatre voies, l’application Android sur trois', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  setLaneCount(WEB_LANE_COUNT);
  assert.equal(WEB_LANE_COUNT, 4);
  assert.equal(APP_LANE_COUNT, 3);
  assert.deepEqual([...LANE_COUNTS], [3, 4]);
  assert.equal(laneCount(), 4);
  assert.deepEqual([...LANES], [-3.15, -1.05, 1.05, 3.15]);
  assert.equal(trackWidth(), 4 * LANE_SPACING);
});

test('la piste de l’app resserre trois voies de 2,1 m au centre (6,3 m de large)', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  assert.equal(setLaneCount(APP_LANE_COUNT), 3);
  assert.equal(laneCount(), 3);
  assert.deepEqual([...LANES], [-2.1, 0, 2.1]);
  assert.ok(Math.abs(trackWidth() - 6.3) < 1e-10);
  assert.ok(Math.abs(trackWidth(4) - 8.4) < 1e-10);
  for (let lane = 1; lane < laneCount(); lane += 1) {
    assert.ok(Math.abs(LANES[lane] - LANES[lane - 1] - LANE_SPACING) < 1e-10, 'les voies restent espacées de 2,1 m');
  }
  assert.equal(LANES[0] + LANES[2], 0, 'la piste reste centrée sur la route');
  assert.throws(() => setLaneCount(5), /Nombre de voies inconnu/);
});

test('une course à trois voies reste variée et franchissable sur 1000 rangées', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  setLaneCount(APP_LANE_COUNT);
  const next = createCourse(seededRandom(7));
  const patterns = new Set();
  let previous;
  for (let i = 0; i < 1000; i += 1) {
    const row = next();
    patterns.add(row.pattern);
    assert.notEqual(row.pattern, previous);
    previous = row.pattern;
    for (const item of row.items) {
      if (item.lanes) {
        assert.equal(item.lanes.length, 2, 'un obstacle double occupe deux voies');
        assert.equal(item.lanes[1], item.lanes[0] + 1, 'les deux voies sont voisines');
        assert.ok(item.lanes.every((lane) => lane >= 0 && lane < 3));
      } else {
        assert.ok(item.lane >= 0 && item.lane < 3, 'chaque objet tient dans la piste');
      }
    }
    const cacti = row.items.filter((item) => item.kind === 'cactus');
    assert.ok(cacti.length < laneCount(), 'il reste toujours une voie sans cactus (ils ne se sautent pas)');
  }
  assert.equal(patterns.size, 5, 'les cinq motifs de course apparaissent');
});

test('le Duel s’aligne sur la piste : trois rivaux à quatre voies, deux à trois voies', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  setLaneCount(WEB_LANE_COUNT);
  const four = duelRivalsForTrack();
  assert.deepEqual(four.map((r) => r.id), ['ombre', 'sauge', 'amethyste']);
  assert.deepEqual(four.map((r) => r.startLane), [0, 2, 3]);

  setLaneCount(APP_LANE_COUNT);
  const three = duelRivalsForTrack();
  assert.deepEqual(three.map((r) => r.id), ['ombre', 'sauge'], 'Améthyste reste au vestiaire à trois voies');
  assert.deepEqual(three.map((r) => r.startLane), [0, 2]);
  assert.ok(three.every((r) => r.startLane < laneCount() && r.startLane >= 0));
});

test('les voies hors piste sont ramenées sur la dernière voie (clients à quatre voies)', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  setLaneCount(APP_LANE_COUNT);
  assert.equal(lanePosition(0), -2.1);
  assert.equal(lanePosition(2), 2.1);
  assert.equal(lanePosition(3), 2.1, 'un cavalier à la voie 3 vu depuis l’app court sur la voie 2');
  assert.equal(lanePosition(9), 2.1);
  assert.equal(lanePosition('2'), 2.1, 'une voie venue du réseau (chaîne) est acceptée');
  assert.equal(lanePosition(undefined), LANES[1], 'voie inconnue : le centre de la piste');

  const puddle = { kind: 'mud', lane: 2 };
  assert.equal(hitsMudPuddle(puddle, LANES[2], 0), true);
  assert.equal(hitsMudPuddle(puddle, LANES[0], 0), false);
});

test('les règles butent sur la dernière voie de la piste courante', (t) => {
  t.after(() => setLaneCount(WEB_LANE_COUNT));
  setLaneCount(APP_LANE_COUNT);
  assert.equal(playerLaneAfterAction(2, 'right', 0), 2);
  assert.equal(playerLaneAfterAction(0, 'left', 0), 0);
  assert.equal(playerLaneAfterAction(1, 'right', 0), 2);
  assert.equal(planNpcLane([], 2, []).lane, 2);
  const planned = planNpcLane(
    [{ kind: 'cactus', lane: 0 }, { kind: 'cactus', lane: 1 }, { kind: 'crystal', lane: 2, tier: 3 }],
    2,
    [],
  );
  assert.equal(planned.lane, 2);

  setLaneCount(WEB_LANE_COUNT);
  assert.equal(playerLaneAfterAction(3, 'right', 0), 3);
});

test('l’appareil choisit la piste : trois voies dans l’APK, quatre sur le site', (t) => {
  const hadWindow = 'window' in globalThis;
  const previousWindow = globalThis.window;
  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    setLaneCount(WEB_LANE_COUNT);
  });

  globalThis.window = {};
  assert.equal(runningInAndroidApp(), false);
  assert.equal(laneCountForDevice(), WEB_LANE_COUNT);
  assert.equal(applyLaneCountForDevice(), 4);
  assert.equal(isAppTrack(), false);

  // La WebView de l'APK expose son pont avant tout script de la page.
  globalThis.window = { LetsPlayAndroid: { setCallAudio() {} } };
  assert.equal(runningInAndroidApp(), true);
  assert.equal(laneCountForDevice(), APP_LANE_COUNT);
  assert.equal(applyLaneCountForDevice(), 3);
  assert.equal(isAppTrack(), true);
  assert.deepEqual([...LANES], [-2.1, 0, 2.1]);

  // Retour sur le site : la piste se rouvre à quatre voies.
  globalThis.window = {};
  assert.equal(applyLaneCountForDevice(), 4);
  assert.equal(isAppTrack(), false);
  assert.deepEqual([...LANES], [-3.15, -1.05, 1.05, 3.15]);
});
