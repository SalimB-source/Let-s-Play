import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read=name=>readFileSync(new URL(`../src/games/${name}`,import.meta.url),'utf8');
test('game entry exposes driving school and an explicit free-drive city, not legacy modes', () => {
  const source=read('ViceCityRushPage.jsx');
  assert.match(source,/DrivingSchoolPage onFreeDrive=/);
  assert.match(source,/const ViceCityFreeRoam = lazy/);
  assert.match(source,/onExit=\{\(\) => setFreeDrive\(false\)\}/);
  assert.doesNotMatch(source,/LegacyViceCityRushPage|import.*(?:ViceCityWorld|cityRushStory|cityRushTournaments)/);
});
test('shared 3D renderer is loaded only on demand, not when opening the catalogue', () => {
  assert.match(read('DrivingSchoolPage.jsx'),/lazy\(\(\) => import\('\.\/ViceCityFreeRoam'\)\)/);
  assert.doesNotMatch(read('DrivingSchoolPage.jsx'),/import ViceCityFreeRoam from/);
  assert.match(read('DrivingSchoolHub.jsx'),/Conduite libre/);
});
test('legacy renderer and race/story/tournament UI sheets were physically removed', () => {
  for(const name of ['ViceCityWorld.jsx','ViceCityRushMainMenu.jsx','ViceCityGarageStage.jsx','CityRushComic.jsx','cityRushStage.js','city-rush-story.css','city-rush-tournament.css','vice-city-rush.css']) assert.equal(existsSync(new URL(`../src/games/${name}`,import.meta.url)),false,name);
});
test('free driving keeps its own save while the learning hub stays mounted on return', () => {
  assert.match(read('ViceCityRushPage.jsx'),/<div hidden=\{freeDrive\}><DrivingSchoolPage/);
  assert.match(read('ViceCityFreeRoam.jsx'),/letsplay_vice_city_free_roam_progress_v1/);
  assert.match(read('drivingProgress.js'),/letsplay_driving_progress_v1/);
});
