import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANDROID_AUTO, ANDROID_LANDSCAPE,
  isLandscape, isPortrait, lockLandscape, releaseGameLandscape,
  requestGameLandscape, rotationPromptVisible, setAndroidGameOrientation,
  supportsLandscapeLock, unlockLandscape,
} from '../src/games/gameLandscape.js';

/**
 * Faux navigateur : un écran, une API d'orientation (celle qu'on veut tester)
 * et, si on la donne, le pont de l'application Android.
 */
function fakeWindow({ screen: screenSize = [844, 390], lock, legacy, bridge } = {}) {
  const calls = [];
  const win = {
    innerWidth: screenSize[0],
    innerHeight: screenSize[1],
    screen: { width: screenSize[0], height: screenSize[1] },
  };
  if (lock) win.screen.orientation = { lock: (value) => lock(value, calls) };
  if (legacy) win.screen.lockOrientation = (value) => legacy(value, calls);
  if (bridge) win.LetsPlayAndroid = { setGameOrientation: (mode) => bridge(mode, calls) };
  return { win, calls };
}

test('l’orientation se lit sur la fenêtre, puis sur l’écran, et ne panique jamais', () => {
  assert.equal(isLandscape({ innerWidth: 844, innerHeight: 390 }), true);
  assert.equal(isPortrait({ innerWidth: 390, innerHeight: 844 }), true);
  assert.equal(isPortrait({ innerWidth: 844, innerHeight: 390 }), false);

  // Fenêtre muette (WebView) : l'écran prend le relais.
  assert.equal(isLandscape({ screen: { width: 1024, height: 768 } }), true);
  assert.equal(isPortrait({ screen: { width: 600, height: 1024 } }), true);

  // Rien de lisible : on ne réclame rien — mieux vaut ne pas afficher
  // « tournez votre appareil » à quelqu'un qui ne peut pas tourner.
  assert.equal(isPortrait(null), false);
  assert.equal(isLandscape({}), true);
});

test('« tournez votre appareil » ne s’affiche que sur un appareil qui doit se coucher', () => {
  assert.equal(rotationPromptVisible({ landscapeDevice: true, portrait: true, dismissed: false }), true);
  assert.equal(rotationPromptVisible({ landscapeDevice: false, portrait: true, dismissed: false }), false, 'ordinateur et tablette gardent leur orientation');
  assert.equal(rotationPromptVisible({ landscapeDevice: true, portrait: false, dismissed: false }), false, 'déjà couché');
  assert.equal(rotationPromptVisible({ landscapeDevice: true, portrait: true, dismissed: true }), false, '« jouer quand même » a été choisi');
  assert.equal(rotationPromptVisible(), false);
});

test('le verrou demande le paysage à la Screen Orientation API', async () => {
  const { win, calls } = fakeWindow({ lock: (value, log) => { log.push(value); return Promise.resolve(); } });
  assert.equal(supportsLandscapeLock(win), true);
  assert.equal(await lockLandscape(win), true);
  assert.deepEqual(calls, [ANDROID_LANDSCAPE]);
});

test('une API qui refuse passe la main à la suivante, sans jamais lever', async () => {
  const { win, calls } = fakeWindow({
    // Chrome hors plein écran : la promesse est rejetée.
    lock: (value, log) => { log.push(`moderne:${value}`); return Promise.reject(new Error('hors plein écran')); },
    // Vieille API : le booléen dit le refus, puis l'acceptation.
    legacy: (value, log) => { log.push(`ancienne:${value}`); return log.length === 1; },
  });
  assert.equal(await lockLandscape(win), false, 'un refus sync de la vieille API est un échec');

  const accepting = fakeWindow({
    lock: () => Promise.reject(new Error('hors plein écran')),
    legacy: (value, log) => { log.push(value); return true; },
  });
  assert.equal(await lockLandscape(accepting.win), true);
  assert.deepEqual(accepting.calls, [ANDROID_LANDSCAPE]);

  // Aucune API (iOS, Firefox Android) : l'appelant garde la main.
  assert.equal(supportsLandscapeLock(fakeWindow().win), false);
  assert.equal(await lockLandscape(fakeWindow().win), false);
  assert.equal(await lockLandscape(null), false);
});

test('un verrou qui lève ne fait pas planter la page', async () => {
  const { win } = fakeWindow({ lock: () => { throw new Error('refusé'); } });
  assert.equal(await lockLandscape(win), false);
});

test('quitter rend l’orientation au téléphone', () => {
  const unlocked = [];
  const { win } = fakeWindow({});
  win.screen.orientation = { lock: () => Promise.resolve(), unlock: () => unlocked.push('unlock') };
  unlockLandscape(win);
  assert.deepEqual(unlocked, ['unlock']);
  assert.doesNotThrow(() => unlockLandscape(null));
});

test('le pont Android couche l’activité, puis lui rend le téléphone', () => {
  const { win, calls } = fakeWindow({ bridge: (mode, log) => log.push(mode) });
  assert.equal(setAndroidGameOrientation(ANDROID_LANDSCAPE, win), true);
  assert.equal(setAndroidGameOrientation(ANDROID_AUTO, win), true);
  assert.equal(setAndroidGameOrientation('n’importe quoi', win), true, 'tout le reste rend la main');
  assert.deepEqual(calls, [ANDROID_LANDSCAPE, ANDROID_AUTO, ANDROID_AUTO]);

  // APK d'avant le pont : on ne fait rien, et on le dit.
  assert.equal(setAndroidGameOrientation(ANDROID_LANDSCAPE, fakeWindow().win), false);
  assert.equal(setAndroidGameOrientation(ANDROID_LANDSCAPE, null), false);
});

test('le geste complet couche l’écran par les deux chemins, et le rend en sortant', async () => {
  const { win, calls } = fakeWindow({
    lock: (value, log) => { log.push(`web:${value}`); return Promise.resolve(); },
    bridge: (mode, log) => log.push(`app:${mode}`),
  });
  await requestGameLandscape(win);
  assert.deepEqual(calls, ['app:landscape', 'web:landscape'], 'l’activité Android d’abord, le navigateur ensuite');
  releaseGameLandscape(win);
  assert.equal(calls.at(-1), 'app:auto');
});
