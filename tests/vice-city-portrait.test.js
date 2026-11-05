/**
 * Vice City se joue dans les deux sens.
 *
 * Ce contrôle tient trois promesses, et il les tient dans le **code source**
 * autant que dans les feuilles de style, parce que c'est là que la régression
 * est silencieuse : un `session.enter()` remis « pour le confort », un
 * `@media(max-width)` qui ne couvre pas un téléphone dont la fenêtre de mise en
 * page a été élargie, un écran de rotation réintroduit.
 *
 *   1. Aucun verrou d'orientation côté Vice City (libre comme école).
 *   2. Le Sablier, lui, garde le sien — on n'y touche pas.
 *   3. Les mises en page portrait existent, avec la condition téléphone du site.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const HANDHELD = 'max-device-width:600px';

test('Vice City ne verrouille plus l’orientation : ni plein écran imposé, ni écran de rotation', async () => {
  const source = await read('src/games/ViceCityFreeRoam.jsx');
  // Le composant n'ouvre plus de session paysage : c'est ce qui forçait l'écran.
  assert.doesNotMatch(source, /createRpgLandscapeSession/, 'plus de session paysage dans Vice City');
  assert.doesNotMatch(source, /landscapeSessionRef/, 'plus de référence à une session paysage');
  assert.doesNotMatch(source, /session\.enter\(/, 'plus d’entrée en paysage forcée');
  // L'écran « tournez votre téléphone » a disparu, remplacé par un bouton.
  assert.doesNotMatch(source, /vice-free-roam-rotate/, 'plus d’écran de rotation');
  assert.doesNotMatch(source, /SE JOUE EN PAYSAGE/, 'plus d’injonction à tourner l’appareil');
  // Le paysage reste accessible : plein écran à la demande, jamais imposé.
  assert.match(source, /requestFullscreen/, 'le plein écran reste possible');
  assert.match(source, /vice-free-roam-expand/, 'et il a un bouton');
});

test('la rotation ne remonte pas la scène : la ville n’est reconstruite que sur un vrai changement', async () => {
  const source = await read('src/games/ViceCityFreeRoam.jsx');
  // Le montage 3D dépend du véhicule, de la leçon et du rendu — jamais de la
  // taille de la fenêtre. Un `resize` redimensionne le renderer, il ne
  // reconstruit pas la ville : la partie continue pendant la rotation.
  const effect = source.match(/\}, \[carId, schoolMode, schoolExercise, liteDevice, graphicsEpoch\]\);/);
  assert.ok(effect, 'les dépendances du montage 3D sont connues');
  assert.doesNotMatch(source, /\}, \[[^\]]*portrait[^\]]*\]\);/);
  assert.doesNotMatch(source, /\}, \[[^\]]*innerWidth[^\]]*\]\);/);
  assert.doesNotMatch(source, /\}, \[[^\]]*innerHeight[^\]]*\]\);/);
  // Le redimensionnement passe par le renderer et la caméra, à chaud.
  assert.match(source, /const resize = \(\) => \{/);
  assert.match(source, /renderer\.setSize\(width, height, false\)/);
  assert.match(source, /camera\.aspect = width \/ height/);
});

test('le Sablier garde son orientation : ce mode n’a pas été touché', async () => {
  const shell = await read('src/games/PaysageSablier.jsx');
  assert.match(shell, /createRpgLandscapeSession/, 'le Sablier verrouille toujours le paysage');
  const session = await read('src/games/rpgLandscape.js');
  assert.match(session, /SENSOR_LANDSCAPE|setPaysageSablier|screen\.orientation/);
  // Et la page Sablier est toujours enveloppée dans sa coque paysage.
  const main = await read('src/main.jsx');
  const sablier = main.split('\n').filter((line) => line.includes('sablier-de-bab-el'));
  assert.ok(sablier.length >= 3, 'les routes du Sablier existent');
  for (const line of sablier) assert.match(line, /<PaysageSablier>/, 'chaque route Sablier reste en paysage');
});

test('le plein écran est demandé sans casser la partie : refus silencieux', async () => {
  const source = await read('src/games/ViceCityFreeRoam.jsx');
  // iOS refuse `requestFullscreen` sur un élément : la promesse échoue, le jeu
  // continue en fenêtre. Pas de `throw`, pas d'écran d'erreur.
  assert.match(source, /Promise\.resolve\(target\?\.requestFullscreen\?\.\(\{ navigationUI: 'hide' \}\)\)\.catch\(\(\) => \{\}\)/);
  assert.match(source, /Promise\.resolve\(document\.exitFullscreen\?\.\(\)\)\.catch\(\(\) => \{\}\)/);
  assert.match(source, /addEventListener\('fullscreenchange'/);
});

test('les feuilles de style ont une mise en page portrait, avec la condition téléphone du site', async () => {
  for (const file of ['src/games/vice-city-free-roam.css', 'src/games/driving-school.css']) {
    const css = await read(file);
    const portrait = [...css.matchAll(/@media([^{]*orientation:portrait[^{]*)\{/g)].map((match) => match[1]);
    assert.ok(portrait.length > 0, `${file} : au moins une requête portrait`);
    for (const query of portrait) {
      assert.match(query, new RegExp(`max-device-width\\s*:\\s*600px`), `${file} : condition téléphone attendue dans « ${query.trim()} »`);
    }
  }
});

test('en portrait, les commandes restent atteignables et ne se recouvrent pas', async () => {
  const css = await read('src/games/vice-city-free-roam.css');
  const portraitBlocks = [...css.matchAll(/@media[^{]*orientation:portrait[^{]*\{([\s\S]*?)\n\}/g)].map((match) => match[1]).join('\n');
  assert.ok(portraitBlocks.length > 0, 'bloc portrait trouvé');
  // Le joystick ne passe pas sous la barre système, et remonte au-dessus des
  // commandes : le pouce gauche ne touche jamais la barre d'accueil.
  assert.match(portraitBlocks, /\.vice-free-roam-joystick\{[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(portraitBlocks, /\.vice-free-roam-speed\{[^}]*bottom:/);
  // La minicarte ne prend pas le coin haut-gauche du jeu : elle passe à droite.
  assert.match(portraitBlocks, /\.vice-free-roam-minimap\{[^}]*right:/);
  // Les panneaux plein écran tiennent dans la largeur du téléphone.
  assert.match(portraitBlocks, /\.vice-free-roam-feature-panel\{[^}]*left:/);
  // École : les rétroviseurs restent visibles mais plus petits qu'en paysage.
  const school = await read('src/games/driving-school.css');
  assert.match(school, /@media[^{]*orientation:portrait[^{]*\{[\s\S]*?driving-side-mirror/);
  assert.match(school, /@media[^{]*orientation:portrait[^{]*\{[\s\S]*?driving-top-brief/);
});

// ── Reprise en place ────────────────────────────────────────────────────────
// Changer de qualité reconstruit la ville, et le jeu ne doit pas repartir du
// point de départ pour autant. C'est la même promesse que la rotation : une
// partie en cours ne s'interrompt pas.
import {
  cityRushResumeSnapshot,
  cityRushResumeState,
} from '../src/games/cityRushPerformance.js';

const SPAWN = { x: -138, z: 0, heading: Math.PI / 2 };

test('la pose de la voiture survit à une reconstruction de la ville', () => {
  const driving = { x: 42.5, z: -17.25, heading: -1.2, speed: 23.4, time: 512.75 };
  const snapshot = cityRushResumeSnapshot(driving);
  const resumed = cityRushResumeState(SPAWN, snapshot);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.x, driving.x);
  assert.equal(resumed.z, driving.z);
  assert.equal(resumed.heading, driving.heading);
  assert.equal(resumed.speed, driving.speed, 'la vitesse est reprise : on ne repart pas à l’arrêt');
  assert.equal(resumed.time, driving.time, 'les chronomètres continuent');
});

test('sans pose mémorisée, la ville repart de son point de départ', () => {
  const fresh = cityRushResumeState(SPAWN, null);
  assert.deepEqual(fresh, { x: -138, z: 0, heading: Math.PI / 2, resumed: false });
  assert.deepEqual(cityRushResumeSnapshot(null), null);
  assert.deepEqual(cityRushResumeSnapshot(undefined), null);
});

test('une pose corrompue est ignorée plutôt que propagée', () => {
  // Une image aberrante peut produire des `NaN` : reprendre une telle pose
  // enverrait la voiture hors du monde, sous le décor.
  for (const bad of [{ x: NaN }, { z: Infinity }, { heading: undefined }, { speed: NaN, x: 1, z: 1, heading: 0, time: 1 }]) {
    const state = { x: 1, z: 2, heading: 0, speed: 0, time: 0, ...bad };
    const snapshot = cityRushResumeSnapshot(state);
    if (snapshot) {
      const resumed = cityRushResumeState(SPAWN, snapshot);
      assert.ok(Number.isFinite(resumed.x) && Number.isFinite(resumed.heading), 'pose toujours utilisable');
    }
  }
  assert.equal(cityRushResumeSnapshot({ x: NaN, z: 0, heading: 0, speed: 0, time: 0 }), null);
  assert.equal(cityRushResumeState(SPAWN, { x: NaN, z: 0, heading: 0, speed: 0, time: 0 }).resumed, false);
  // Une vitesse ou un temps absent ne casse pas la reprise de la position.
  const partial = cityRushResumeState(SPAWN, { x: 5, z: 6, heading: 0.3 });
  assert.equal(partial.resumed, true);
  assert.equal(partial.x, 5);
  assert.equal(partial.speed, 0);
  assert.equal(partial.time, 0);
});

test('la ville mémorise la pose au démontage et l’oublie quand on quitte', async () => {
  const source = await read('src/games/ViceCityFreeRoam.jsx');
  // Mémorisée dans le nettoyage de l'effet (donc à chaque reconstruction)…
  assert.match(source, /rememberPose = \(\) => \{ resumeRef\.current = cityRushResumeSnapshot\(state\); \};/);
  assert.match(source, /return \(\) => \{\s*cancelled = true;\s*rememberPose\(\);/);
  // …et effacée quand le joueur retourne au menu : on ne reprend pas une partie
  // qu'on a quittée.
  assert.match(source, /const exitFreeRoam = \(\) => \{\s*resumeRef\.current = null;/);
  assert.match(source, /onClick=\{exitFreeRoam\}/);
});
