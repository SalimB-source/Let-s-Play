import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANES, LANE_COUNTS, LANE_SPACING, createCourse, duelRivalsForTrack, hitsMudPuddle,
  laneCount, lanePosition, planNpcLane, playerLaneAfterAction, seededRandom, setLaneCount,
  trackWidth,
} from '../src/games/mirageRules.js';
import {
  DESKTOP_LANE_COUNT, PHONE_LANE_COUNT, PHONE_PACE, applyLaneCountForDevice, isAndroidWebView,
  isCompactTrack, laneCountForDevice, paceForTrack, runningInAndroidApp, usesCompactTrack,
} from '../src/games/mirageLanes.js';

/*
 * Les voies sont un état de module (le tableau `LANES` est remplacé sur place
 * par `setLaneCount()`) : chaque test qui change de piste la remet en place
 * ensuite, pour que la fin du fichier reparte toujours des quatre voies de
 * l'ordinateur.
 */

test('l’ordinateur joue sur quatre voies, le téléphone sur trois', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(DESKTOP_LANE_COUNT);
  assert.equal(DESKTOP_LANE_COUNT, 4);
  assert.equal(PHONE_LANE_COUNT, 3);
  assert.deepEqual([...LANE_COUNTS], [3, 4]);
  assert.equal(laneCount(), 4);
  assert.deepEqual([...LANES], [-3.15, -1.05, 1.05, 3.15]);
  assert.equal(trackWidth(), 4 * LANE_SPACING);
});

test('la piste du téléphone resserre trois voies de 2,1 m au centre (6,3 m de large)', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  assert.equal(setLaneCount(PHONE_LANE_COUNT), 3);
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
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(PHONE_LANE_COUNT);
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
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(DESKTOP_LANE_COUNT);
  const four = duelRivalsForTrack();
  assert.deepEqual(four.map((r) => r.id), ['ombre', 'sauge', 'amethyste']);
  assert.deepEqual(four.map((r) => r.startLane), [0, 2, 3]);

  setLaneCount(PHONE_LANE_COUNT);
  const three = duelRivalsForTrack();
  assert.deepEqual(three.map((r) => r.id), ['ombre', 'sauge'], 'Améthyste reste au vestiaire à trois voies');
  assert.deepEqual(three.map((r) => r.startLane), [0, 2]);
  assert.ok(three.every((r) => r.startLane < laneCount() && r.startLane >= 0));
});

test('les voies hors piste sont ramenées sur la dernière voie (clients à quatre voies)', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(PHONE_LANE_COUNT);
  assert.equal(lanePosition(0), -2.1);
  assert.equal(lanePosition(2), 2.1);
  assert.equal(lanePosition(3), 2.1, 'un cavalier à la voie 3 vu depuis un téléphone court sur la voie 2');
  assert.equal(lanePosition(9), 2.1);
  assert.equal(lanePosition('2'), 2.1, 'une voie venue du réseau (chaîne) est acceptée');
  assert.equal(lanePosition(undefined), LANES[1], 'voie inconnue : le centre de la piste');

  const puddle = { kind: 'mud', lane: 2 };
  assert.equal(hitsMudPuddle(puddle, LANES[2], 0), true);
  assert.equal(hitsMudPuddle(puddle, LANES[0], 0), false);
});

test('les règles butent sur la dernière voie de la piste courante', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(PHONE_LANE_COUNT);
  assert.equal(playerLaneAfterAction(2, 'right'), 2);
  assert.equal(playerLaneAfterAction(0, 'left'), 0);
  assert.equal(playerLaneAfterAction(1, 'right'), 2);
  assert.equal(planNpcLane([], 2, []).lane, 2);
  const planned = planNpcLane(
    [{ kind: 'cactus', lane: 0 }, { kind: 'cactus', lane: 1 }, { kind: 'crystal', lane: 2, tier: 3 }],
    2,
    [],
  );
  assert.equal(planned.lane, 2);

  setLaneCount(DESKTOP_LANE_COUNT);
  assert.equal(playerLaneAfterAction(3, 'right'), 3);
});

/* ── La matrice des appareils ────────────────────────────────────────────── */

const UA = {
  windowsDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  // WebView Android : le marqueur `; wv)` est celui de l'application.
  androidWebViewPhone: 'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  androidWebViewTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X910 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Safari/537.36',
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};

/**
 * Faux `window` d'appareil : écran, agent, doigts et requêtes média.
 * `matchMedia` répond à `(hover:none) and (pointer:coarse)` et à
 * `max-width:800px` — les deux seules requêtes lues par `mirageLanes.js`.
 */
function deviceWindow({
  screen,
  userAgent = UA.windowsDesktop,
  maxTouchPoints = 0,
  coarsePointer = false,
  narrowWindow = false,
  bridge = false,
  search = '',
} = {}) {
  const fake = {
    location: { search },
    navigator: { userAgent, maxTouchPoints },
    matchMedia(query) {
      let matched = true;
      if (query.includes('pointer:coarse')) matched = coarsePointer;
      if (query.includes('max-width')) matched = matched && narrowWindow;
      if (!query.includes('pointer:coarse') && !query.includes('max-width')) matched = false;
      return { matches: matched, media: query };
    },
  };
  if (screen) fake.screen = screen;
  if (bridge) fake.LetsPlayAndroid = { setCallAudio() {} };
  return fake;
}

const DEVICE_MATRIX = [
  {
    title: 'ordinateur 1920×1080, même tactile',
    window: deviceWindow({
      screen: { width: 1920, height: 1080 },
      maxTouchPoints: 10,
      userAgent: `${UA.windowsDesktop} Touch`,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'tablette Android 820×1180, portrait',
    window: deviceWindow({
      screen: { width: 820, height: 1180 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidTablet,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'tablette Android 1180×820, paysage',
    window: deviceWindow({
      screen: { width: 1180, height: 820 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidTablet,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'iPad 820×1180 (Safari)',
    window: deviceWindow({
      screen: { width: 820, height: 1180 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.ipadSafari,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'téléphone Chrome Android 412×915, portrait',
    window: deviceWindow({
      screen: { width: 412, height: 915 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidPhone,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'téléphone Chrome Android 915×412, paysage',
    window: deviceWindow({
      screen: { width: 915, height: 412 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidPhone,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'iPhone 390×844 (Safari)',
    window: deviceWindow({
      screen: { width: 390, height: 844 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.iphoneSafari,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'APP Android, APK récente (pont `LetsPlayAndroid`)',
    window: deviceWindow({
      screen: { width: 412, height: 915 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidWebViewPhone,
      bridge: true,
    }),
    lanes: PHONE_LANE_COUNT,
    bridge: true,
  },
  {
    title: 'APP Android, APK ancienne (pas de pont)',
    window: deviceWindow({
      screen: { width: 412, height: 915 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidWebViewPhone,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'APP Android sur tablette (pas de pont)',
    window: deviceWindow({
      screen: { width: 820, height: 1180 },
      maxTouchPoints: 5,
      coarsePointer: true,
      userAgent: UA.androidWebViewTablet,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'écran muet + pointeur grossier + fenêtre ≤ 800 px',
    window: deviceWindow({
      coarsePointer: true,
      narrowWindow: true,
      userAgent: UA.androidPhone,
    }),
    lanes: PHONE_LANE_COUNT,
  },
  {
    title: 'écran muet + pointeur grossier + fenêtre large (tablette sans `screen`)',
    window: deviceWindow({
      coarsePointer: true,
      narrowWindow: false,
      userAgent: UA.androidTablet,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'petit écran sans tactile (borne, fenêtre d’émulateur)',
    window: deviceWindow({
      screen: { width: 412, height: 915 },
      maxTouchPoints: 0,
      coarsePointer: false,
      userAgent: UA.windowsDesktop,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
  {
    title: 'fenêtre étroite mais souris : un ordinateur redimensionné',
    window: deviceWindow({
      screen: { width: 1920, height: 1080 },
      narrowWindow: true,
      userAgent: UA.windowsDesktop,
    }),
    lanes: DESKTOP_LANE_COUNT,
  },
];

for (const device of DEVICE_MATRIX) {
  test(`l’appareil choisit la piste : ${device.title} → ${device.lanes} voies`, (t) => {
    const hadWindow = 'window' in globalThis;
    const previousWindow = globalThis.window;
    t.after(() => {
      if (hadWindow) globalThis.window = previousWindow;
      else delete globalThis.window;
      setLaneCount(DESKTOP_LANE_COUNT);
    });

    globalThis.window = device.window;
    assert.equal(laneCountForDevice(), device.lanes);
    assert.equal(usesCompactTrack(), device.lanes === PHONE_LANE_COUNT);
    assert.equal(applyLaneCountForDevice(), device.lanes);
    assert.equal(isCompactTrack(), device.lanes === PHONE_LANE_COUNT);
    assert.deepEqual(
      [...LANES],
      device.lanes === PHONE_LANE_COUNT ? [-2.1, 0, 2.1] : [-3.15, -1.05, 1.05, 3.15],
    );
  });
}

test('l’APK se reconnaît à son agent `; wv)`, avec ou sans pont JavaScript', (t) => {
  const hadWindow = 'window' in globalThis;
  const previousWindow = globalThis.window;
  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    setLaneCount(DESKTOP_LANE_COUNT);
  });

  globalThis.window = deviceWindow({
    screen: { width: 412, height: 915 },
    userAgent: UA.androidWebViewPhone,
    bridge: true,
  });
  assert.equal(isAndroidWebView(), true, 'la WebView de l’APK porte le marqueur `; wv)`');
  assert.equal(runningInAndroidApp(), true, 'le pont `LetsPlayAndroid` est toujours reconnu');
  assert.equal(usesCompactTrack(), true);

  globalThis.window = deviceWindow({
    screen: { width: 412, height: 915 },
    userAgent: UA.androidWebViewPhone,
  });
  assert.equal(isAndroidWebView(), true);
  assert.equal(runningInAndroidApp(), false, 'une APK antérieure au pont n’expose rien');
  assert.equal(usesCompactTrack(), true, 'la piste reste à trois voies sans le pont');

  // Chrome Android n'est pas une WebView : c'est l'écran qui décide.
  globalThis.window = deviceWindow({
    screen: { width: 412, height: 915 },
    maxTouchPoints: 5,
    coarsePointer: true,
    userAgent: UA.androidPhone,
  });
  assert.equal(isAndroidWebView(), false, 'le navigateur Android ne porte pas `; wv)`');
  assert.equal(usesCompactTrack(), true);
});

test('`?android=1` est ignoré hors build de développement', (t) => {
  const hadWindow = 'window' in globalThis;
  const previousWindow = globalThis.window;
  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    setLaneCount(DESKTOP_LANE_COUNT);
  });

  // `node --test` ne définit pas `import.meta.env` : c'est le cas d'un build
  // de production, où le drapeau de développement ne doit rien changer.
  globalThis.window = deviceWindow({
    screen: { width: 1920, height: 1080 },
    search: '?android=1',
  });
  assert.equal(runningInAndroidApp(), false);
  assert.equal(laneCountForDevice(), DESKTOP_LANE_COUNT);
  assert.equal(applyLaneCountForDevice(), 4);
  assert.equal(isCompactTrack(), false);
  assert.deepEqual([...LANES], [-3.15, -1.05, 1.05, 3.15]);

  // Ni sur un téléphone : la piste compacte y vient de l'appareil, pas du drapeau.
  globalThis.window = deviceWindow({
    screen: { width: 412, height: 915 },
    maxTouchPoints: 5,
    coarsePointer: true,
    userAgent: UA.androidPhone,
    search: '?android=1',
  });
  assert.equal(runningInAndroidApp(), false);
  assert.equal(applyLaneCountForDevice(), PHONE_LANE_COUNT);
});

test('sans `window` (rendu serveur), la piste reste à quatre voies', (t) => {
  const hadWindow = 'window' in globalThis;
  const previousWindow = globalThis.window;
  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    setLaneCount(DESKTOP_LANE_COUNT);
  });

  delete globalThis.window;
  assert.equal(runningInAndroidApp(), false);
  assert.equal(isAndroidWebView(), false);
  assert.equal(usesCompactTrack(), false);
  assert.equal(laneCountForDevice(), DESKTOP_LANE_COUNT);
  assert.equal(applyLaneCountForDevice(), 4);
});

test('la course est un peu plus lente sur la piste du téléphone', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));

  // Trois voies : le rythme baisse, mais pas la difficulté relative — le
  // joueur comme ses rivaux lisent le même facteur dans MirageWorld.
  setLaneCount(PHONE_LANE_COUNT);
  assert.equal(isCompactTrack(), true);
  assert.equal(paceForTrack(), PHONE_PACE);
  assert.ok(PHONE_PACE < 1 && PHONE_PACE >= 0.8, `rythme du téléphone inattendu : ${PHONE_PACE}`);
  assert.equal(PHONE_PACE, 0.85);

  // Quatre voies (ordinateur, tablette) : rien ne change.
  setLaneCount(DESKTOP_LANE_COUNT);
  assert.equal(isCompactTrack(), false);
  assert.equal(paceForTrack(), 1);
});
