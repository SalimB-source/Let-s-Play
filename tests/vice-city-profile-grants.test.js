/**
 * Progression de compte de Vice City Rush et grant administrateur.
 * ---------------------------------------------------------------
 * Vérifie, sans navigateur ni base de données :
 *   — le cache local est isolé par compte (et reprend une fois l'ancienne
 *     campagne Histoire des installations précédentes) ;
 *   — la sauvegarde accordée par le grant ouvre bien tout le contenu livré
 *     (les identifiants sont lus dans `cityRushRules`, pas recopiés) ;
 *   — le SQL pose la table privée, protège le badge et n'est ni public ni
 *     rejouable pour la prime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITY_RUSH_CARS, CITY_RUSH_COURSES, CITY_RUSH_FREE_CAR_IDS } from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_LEGACY_STORY_ENDING_KEY,
  CITY_RUSH_LEGACY_STORY_KEY,
  CITY_RUSH_PROGRESS_KEY,
  CITY_RUSH_STORY_CHAPTERS,
  cityRushStorageKey,
  isCityRushCarOwned,
  isCityRushCourseUnlocked,
  loadCityRushAccountSave,
  migrateCityRushLegacyStory,
  normalizeCityRushSave,
  readCityRushSave,
  writeCityRushSave,
} from '../src/games/cityRushProgress.js';
import { CITY_RUSH_STORY_CHAPTER_COUNT, CITY_RUSH_STORY_VERSION } from '../src/games/cityRushStory.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const schema = read('../supabase/schema.sql');
const grants = read('../supabase/vice-city-account-grants.sql');
const page = read('../src/games/ViceCityRushPage.jsx');
const api = read('../src/games/viceCityApi.js');

/** Stockage mémoire minimal (getItem/setItem/removeItem), comme localStorage. */
function fakeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('le cache local de la progression est isolé par compte', () => {
  assert.equal(cityRushStorageKey(), CITY_RUSH_PROGRESS_KEY);
  assert.equal(cityRushStorageKey(''), CITY_RUSH_PROGRESS_KEY);
  assert.equal(cityRushStorageKey('user-a'), `${CITY_RUSH_PROGRESS_KEY}:user:user-a`);
  assert.notEqual(cityRushStorageKey('user-a'), cityRushStorageKey('user-b'));
});

test('la sauvegarde accordée ouvre les sept parcours, les huit voitures et la campagne', () => {
  // Exactement ce que pose la fonction SQL du grant.
  const granted = normalizeCityRushSave({
    cash: 5000,
    ownedCarIds: CITY_RUSH_CARS.map((car) => car.id),
    completedCourseIds: CITY_RUSH_COURSES.map((course) => course.id),
    storyChapter: CITY_RUSH_STORY_CHAPTERS,
  });
  assert.equal(granted.cash, 5000);
  assert.equal(granted.storyChapter, CITY_RUSH_STORY_CHAPTERS);
  assert.equal(granted.storyEnding, '', 'la fin de l’histoire reste au choix du joueur');
  assert.deepEqual(granted.completedCourseIds, CITY_RUSH_COURSES.map((course) => course.id));
  for (const course of CITY_RUSH_COURSES) {
    assert.equal(isCityRushCourseUnlocked(granted, course.id), true, `parcours ${course.id} ouvert`);
  }
  for (const car of CITY_RUSH_CARS) {
    assert.equal(isCityRushCarOwned(granted, car.id), true, `voiture ${car.id} au garage`);
  }
});

test('la sauvegarde complète garde la carrière et la campagne dans une seule ligne', () => {
  const storage = fakeStorage();
  const saved = writeCityRushSave({
    cash: 700,
    ownedCarIds: ['city-hatch', 'toro-v12'],
    completedCourseIds: ['vice-city', 'new-york'],
    storyChapter: 3,
    storyEnding: '',
  }, storage);
  assert.equal(storage.values.has(CITY_RUSH_PROGRESS_KEY), true);
  // Le trio le moins puissant est offert à tous : il rejoint la ligne écrite.
  assert.deepEqual(storedJson(storage), {
    cash: 700,
    ownedCarIds: [...CITY_RUSH_FREE_CAR_IDS, 'toro-v12'],
    completedCourseIds: ['vice-city', 'new-york'],
    storyChapter: 3,
    storyEnding: '',
    storyVersion: CITY_RUSH_STORY_VERSION,
    storyStars: {},
    completedTournamentIds: [],
    tournamentTitles: {},
  });
  assert.deepEqual(readCityRushSave(storage), saved);
  // Données hostiles : chapitre hors bornes, identifiants inconnus, fin inconnue.
  assert.deepEqual(normalizeCityRushSave({ storyChapter: 99, storyEnding: 'x'.repeat(80) }), {
    cash: 0,
    ownedCarIds: [...CITY_RUSH_FREE_CAR_IDS],
    completedCourseIds: [],
    storyChapter: CITY_RUSH_STORY_CHAPTERS,
    storyEnding: '',
    storyVersion: CITY_RUSH_STORY_VERSION,
    storyStars: {},
    completedTournamentIds: [],
    tournamentTitles: {},
  });
});

test('le récit des anciennes clés locales est repris une seule fois', () => {
  const storage = fakeStorage({
    [CITY_RUSH_LEGACY_STORY_KEY]: '4',
    [CITY_RUSH_LEGACY_STORY_ENDING_KEY]: 'revenge',
  });
  const migrated = migrateCityRushLegacyStory(storage);
  // Les anciennes clés datent des 6 chapitres : Londres (4) devient le chapitre 7.
  assert.equal(migrated.storyChapter, 7);
  assert.equal(migrated.storyEnding, 'revenge');
  assert.equal(storage.values.has(CITY_RUSH_LEGACY_STORY_KEY), false);
  assert.equal(storage.values.has(CITY_RUSH_LEGACY_STORY_ENDING_KEY), false);

  // Rejouer la reprise ne casse rien : la sauvegarde porte déjà l'histoire.
  const again = migrateCityRushLegacyStory(storage);
  assert.deepEqual(again, migrated);
});

test('la première connexion reprend la sauvegarde de l’appareil, puis l’isole', () => {
  const storage = fakeStorage({
    [CITY_RUSH_PROGRESS_KEY]: JSON.stringify({ cash: 50, completedCourseIds: ['vice-city'], storyChapter: 1, storyVersion: CITY_RUSH_STORY_VERSION }),
  });
  const accountSave = loadCityRushAccountSave('user-a', storage);
  assert.equal(accountSave.cash, 50);
  assert.equal(accountSave.storyChapter, 1);
  // La copie partagée est retirée : le compte suivant ne l'hérite pas.
  assert.equal(storage.values.has(CITY_RUSH_PROGRESS_KEY), false);
  assert.equal(storage.values.has(cityRushStorageKey('user-a')), true);
  assert.deepEqual(loadCityRushAccountSave('user-b', storage), normalizeCityRushSave(null));
});

test('la migration SQL pose la table privée, ses politiques et le badge protégé', () => {
  assert.match(schema, /create table if not exists public\.vice_city_rush_progress/i);
  assert.match(schema, /Players read their own Vice City Rush progress/);
  assert.match(schema, /Players insert their own Vice City Rush progress/);
  assert.match(schema, /Players update their own Vice City Rush progress/);
  assert.match(schema, /revoke all on public\.vice_city_rush_progress from public, anon/i);
  assert.match(schema, /grant select, insert, update on public\.vice_city_rush_progress to authenticated/i);
  assert.match(schema, /progression Vice City Rush privée par compte/);
  assert.match(schema, /create trigger profiles_protect_verification_badge/i);
  assert.match(schema, /new\.is_verified := old\.is_verified/i);
  assert.match(schema, /new\.is_verified := false/i);
});

test('le grant admin est privé, idempotent, additif et couvre tout le catalogue', () => {
  assert.match(grants, /alter table public\.profiles\s+add column if not exists is_verified/i);
  assert.match(grants, /create table if not exists public\.vice_city_rush_progress/i);
  assert.match(grants, /create table if not exists public\.vice_city_rush_grant_receipts/i);
  assert.match(grants, /primary key \(user_id, grant_code\)/i);
  assert.match(grants, /on conflict \(user_id, grant_code\) do nothing/i);
  assert.match(grants, /bonus integer := 5000/i);
  assert.match(grants, /'cash', current_cash \+ case when coalesce\(did_grant, false\) then bonus else 0 end/i);
  assert.match(grants, /'storyChapter', 10/);
  assert.match(grants, /insert into public\.vice_city_rush_progress \(user_id, progress, updated_at\)/i);
  assert.match(grants, /on conflict \(user_id\) do update/i);
  assert.match(grants, /'already_granted', not coalesce\(did_grant, false\)/i);
  assert.match(grants, /revoke all on function public\.admin_grant_vice_city_rush_access\(text, text\) from anon, authenticated/i);
  for (const car of CITY_RUSH_CARS) assert.ok(grants.includes(`'${car.id}'`), `le grant doit inclure la voiture ${car.id}`);
  for (const course of CITY_RUSH_COURSES) assert.ok(grants.includes(`'${course.id}'`), `le grant doit inclure le parcours ${course.id}`);
  // Le grant ne présélectionne jamais la fin de l'histoire.
  assert.doesNotMatch(grants, /storyEnding/);
  assert.doesNotMatch(grants, /bakuryuokiba@gmail\.com/i, 'l’adresse du destinataire ne doit pas être versionnée');
});

test('le jeu connecté charge et publie sa progression par la table privée', () => {
  assert.match(api, /VICE_CITY_PROGRESS_TABLE = 'vice_city_rush_progress'/);
  assert.match(api, /\.from\(VICE_CITY_PROGRESS_TABLE\)/);
  assert.doesNotMatch(api, /from\('profiles'\)/);
  assert.match(page, /fetchViceCityProgress\(ownerId\)/);
  assert.match(page, /saveViceCityProgress\(ownerId, nextSave\)/);
  assert.match(page, /saveViceCityProgress\(ownerId, next\)/);
  assert.match(page, /loadCityRushAccountSave\(ownerId\)/);
  assert.match(page, /if \(connected && !progressionReady\) return;/);
  assert.doesNotMatch(page, /letsplay_vice_city_rush_story_v1/);
  // Le nombre de chapitres de la sauvegarde suit le scénario.
  assert.equal(CITY_RUSH_STORY_CHAPTER_COUNT, CITY_RUSH_STORY_CHAPTERS);
});

test('les listes du SQL ne dérivent pas du catalogue du jeu', () => {
  for (const car of CITY_RUSH_CARS) assert.ok(car.id.length > 0);
  for (const course of CITY_RUSH_COURSES) assert.ok(course.id.length > 0);
  assert.match(grants, new RegExp(`jsonb_build_array\\([\\s\\S]*?'${CITY_RUSH_CARS.length === 0 ? '' : CITY_RUSH_CARS[0].id}'`));
  assert.equal(CITY_RUSH_CARS.length, 11);
  assert.equal(CITY_RUSH_COURSES.length, 8);
});

/** Contenu brut du document écrit sous une clé (pour vérifier la forme exacte). */
function storedJson(storage, key = CITY_RUSH_PROGRESS_KEY) {
  return JSON.parse(storage.values.get(key));
}
