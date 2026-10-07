import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CITY_RUSH_TUTORIAL_DURATION_SECONDS,
  CITY_RUSH_TUTORIAL_STEP_DURATION_MS,
  CITY_RUSH_TUTORIAL_STEPS,
} from '../src/games/cityRushTutorial.js';

const pageSource = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const componentSource = readFileSync(new URL('../src/games/CityRushTutorial.jsx', import.meta.url), 'utf8');
const tutorialCss = readFileSync(new URL('../src/games/city-rush-tutorial.css', import.meta.url), 'utf8');

test('le tutoriel comprend dix mini-démonstrations lisibles, pour une durée inférieure à une minute', () => {
  assert.equal(CITY_RUSH_TUTORIAL_STEPS.length, 10);
  assert.ok(CITY_RUSH_TUTORIAL_STEP_DURATION_MS >= 4_000);
  assert.ok(CITY_RUSH_TUTORIAL_STEP_DURATION_MS < 6_000);
  assert.equal(CITY_RUSH_TUTORIAL_DURATION_SECONDS, 52);
  assert.equal(new Set(CITY_RUSH_TUTORIAL_STEPS.map((step) => step.id)).size, CITY_RUSH_TUTORIAL_STEPS.length);
  assert.ok(CITY_RUSH_TUTORIAL_STEPS.every((step) => (
    step.title && step.description && step.tip && step.scene && step.controls.length && step.touch
  )));
});

test('les mini-tutos couvrent le volant, les bonus, les armes, la police, les soins, les rampes et les modes', () => {
  const steps = Object.fromEntries(CITY_RUSH_TUTORIAL_STEPS.map((step) => [step.id, step]));
  assert.deepEqual(Object.keys(steps), [
    'steering', 'speed', 'magazine', 'boost', 'bazooka', 'police', 'garage', 'health', 'ramp', 'modes',
  ]);
  assert.match(steps.steering.description, /Q \/ D/);
  assert.match(steps.magazine.description, /Z/);
  assert.match(steps.boost.description, /automatique/);
  assert.match(steps.bazooka.description, /conteneur|entrepôt/i);
  assert.match(steps.police.tip, /change de voie/i);
  assert.match(steps.garage.description, /recherche/i);
  assert.match(steps.health.description, /SUV blindé/i);
  assert.match(steps.ramp.description, /En l’air/i);
  assert.match(steps.modes.description, /checkpoint|portes/i);
});

test('le guide est accessible depuis le menu et la pause, puis se ferme sans lancer ni reprendre une course', () => {
  assert.match(pageSource, /className="city-rush-tutorial-launch" onClick=\{\(\) => setTutorialOpen\(true\)\}/);
  assert.match(pageSource, /REVOIR LE TUTORIEL/);
  assert.match(pageSource, /tutorialOpen && <CityRushTutorial onClose=\{\(\) => setTutorialOpen\(false\)\} \/>/);
  assert.match(componentSource, /role="dialog"/);
  assert.match(componentSource, /aria-modal="true"/);
  assert.match(componentSource, /event\.key === 'Escape'/);
  assert.match(componentSource, /setPlaying\(\(value\) => !value\)/);
  assert.match(tutorialCss, /@media \(max-width: 760px\)/);
  assert.match(tutorialCss, /prefers-reduced-motion: reduce/);
});
