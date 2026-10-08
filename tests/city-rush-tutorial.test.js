import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CITY_RUSH_TUTORIAL_DURATION_SECONDS,
  CITY_RUSH_TUTORIAL_LESSON_IDS,
  CITY_RUSH_TUTORIAL_POLICE_FROM_ID,
  CITY_RUSH_TUTORIAL_STEP_DURATION_MS,
  CITY_RUSH_TUTORIAL_STEPS,
  CITY_RUSH_TUTORIAL_TICK_MS,
} from '../src/games/cityRushTutorial.js';

const pageSource = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const componentSource = readFileSync(new URL('../src/games/CityRushTutorial.jsx', import.meta.url), 'utf8');
const worldSource = readFileSync(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8');
const tutorialCss = readFileSync(new URL('../src/games/city-rush-tutorial.css', import.meta.url), 'utf8');

test('le tutoriel comprend dix mini-démonstrations lisibles, pour une durée inférieure à une minute', () => {
  assert.equal(CITY_RUSH_TUTORIAL_STEPS.length, 10);
  assert.ok(CITY_RUSH_TUTORIAL_STEP_DURATION_MS >= 4_000);
  assert.ok(CITY_RUSH_TUTORIAL_STEP_DURATION_MS < 6_000);
  assert.equal(CITY_RUSH_TUTORIAL_DURATION_SECONDS, 52);
  assert.ok(CITY_RUSH_TUTORIAL_TICK_MS >= 500 && CITY_RUSH_TUTORIAL_TICK_MS <= 3_000);
  assert.equal(new Set(CITY_RUSH_TUTORIAL_STEPS.map((step) => step.id)).size, CITY_RUSH_TUTORIAL_STEPS.length);
  assert.ok(CITY_RUSH_TUTORIAL_STEPS.every((step) => (
    step.title && step.description && step.tip && step.scene && step.controls.length && step.touch
  )));
  // Chaque leçon sait ce que la voiture doit réussir pour de vrai en piste, et
  // ce qu'affiche le tic vert de réussite.
  assert.ok(CITY_RUSH_TUTORIAL_STEPS.every((step) => step.action && step.success));
  assert.equal(new Set(CITY_RUSH_TUTORIAL_STEPS.map((step) => step.action)).size, CITY_RUSH_TUTORIAL_STEPS.length);
  assert.deepEqual(
    CITY_RUSH_TUTORIAL_LESSON_IDS,
    CITY_RUSH_TUTORIAL_STEPS.map((step) => step.id),
  );
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
  assert.match(steps.police.description, /piste/i);
  assert.match(steps.police.tip, /change de voie/i);
  assert.match(steps.garage.description, /recherche/i);
  assert.match(steps.health.description, /SUV blindé/i);
  assert.match(steps.ramp.description, /En l’air/i);
  assert.match(steps.modes.description, /checkpoint|portes/i);
  // La route reste vide de police jusqu'à la leçon des tirs : c'est celle de
  // l'AK-47 qui fait entrer l'escouade, et les leçons à accessoire portent
  // l'objet que le coach pose devant la voiture.
  assert.equal(CITY_RUSH_TUTORIAL_POLICE_FROM_ID, 'magazine');
  assert.equal(steps.magazine.action, 'shoot');
  assert.ok(steps.magazine.prop);
  assert.ok(steps.boost.prop);
  assert.ok(steps.health.prop);
  assert.equal(steps.steering.action, 'steer');
  assert.equal(steps.ramp.action, 'ramp');
  assert.equal(steps.garage.action, 'garage');
});

test('le moteur joue la démonstration tout seul et le coach suit la leçon en cours', () => {
  // Page : le tutoriel lance une course solo d'un tour, sans police au départ —
  // c'est la leçon des tirs qui fait entrer l'escouade.
  assert.match(pageSource, /className="city-rush-tutorial-launch" onClick=\{startTutorialRace\}/);
  assert.match(pageSource, /function startTutorialRace\(\)[\s\S]*startRace\(\{ carId: garageCarId, cityId: 'vice-city', tutorial: true \}\)/);
  assert.match(pageSource, /const currentLaps = tutorialMode \? 1/);
  assert.match(pageSource, /racePoliceFromStart=\{!tutorialMode &&/);
  assert.match(pageSource, /tutorialMode=\{tutorialMode\}/);
  assert.match(pageSource, /racers\.filter\(\(racer\) => racer\.isPlayer\)/);
  assert.match(pageSource, /onTutorial=\{tutorialEvent\}/);
  assert.match(pageSource, /function tutorialEvent\(event\)[\s\S]*event\.type === 'lesson-complete'/);
  assert.match(pageSource, /<CityRushTutorial\s+inGame\s+visible=\{tutorialGuideOpen/);
  assert.match(pageSource, /lessonIndex=\{tutorialLive\.index\}/);
  assert.match(pageSource, /tutorial: tutorialMode/);
  assert.match(pageSource, /else if \(!tutorialMode\)/);
  // Composant : la fiche suit la démonstration, le tic vert se voit, et les
  // commandes de course ne sont pas détournées.
  assert.match(componentSource, /role=\{inGame \? 'region' : 'dialog'\}/);
  assert.match(componentSource, /coursePhase !== 'playing'/);
  assert.match(componentSource, /cr-tutorial-tick/);
  assert.doesNotMatch(componentSource, /event\.key === 'ArrowLeft'/);
  // Moteur : pilotage automatique, accessoires posés par le coach, réussites
  // notées là où elles se produisent, et police retenue jusqu'aux tirs.
  assert.match(worldSource, /function updateTutorial\(dt\)/);
  assert.match(worldSource, /function noteTutorialAction\(action\)/);
  assert.match(worldSource, /function tutorialTargetLane\(\)/);
  assert.match(worldSource, /function tutorialPlaceProp\(type, lane = playerLane\)/);
  assert.match(worldSource, /function releaseTutorialPolice\(\)/);
  // Le tutoriel (comme le Sprint) ne pose aucun rival : la grille vide est la
  // première branche du plateau, le roster ne sert qu'aux courses à adversaires.
  assert.match(worldSource, /const racerSpecs = \(sprint \|\| tutorialMode\)\s*\n?\s*\? \[\]/);
  assert.match(worldSource, /if \(!policeDeployed && !sprint && storyPoliceEnabled && tutorialPoliceOn\(\)\)/);
  assert.match(worldSource, /noteTutorialAction\('shoot'\)/);
  assert.match(worldSource, /noteTutorialAction\('bazooka'\)/);
  assert.match(worldSource, /noteTutorialAction\('ramp'\)/);
  assert.match(worldSource, /noteTutorialAction\('garage'\)/);
  assert.match(worldSource, /noteTutorialAction\('boost'\)/);
  assert.match(worldSource, /if \(tutorialMode && !sprint\)/);
  assert.match(worldSource, /CITY_RUSH_POWERS\.PISTOL/);
  assert.match(worldSource, /CITY_RUSH_PICKUPS\.BOOST/);
  assert.match(worldSource, /CITY_RUSH_PICKUPS\.HEALTH/);
  assert.match(worldSource, /tutorial: tutorialMode \? \{/);
  assert.match(worldSource, /if \(tutorialMode\) startTutorialLesson\(0\)/);
  // Styles : la plaque du coach en course, le tic vert et les replis mobile.
  assert.match(tutorialCss, /\.cr-tutorial-layer\.is-in-game/);
  assert.match(tutorialCss, /\.cr-tutorial-tick\b/);
  assert.match(tutorialCss, /@media \(max-width: 760px\)/);
  assert.match(tutorialCss, /prefers-reduced-motion: reduce/);
});
