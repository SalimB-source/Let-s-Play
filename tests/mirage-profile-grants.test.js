import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CUPS, isCupUnlocked, unlockedCups } from '../src/games/mirageCup.js';
import {
  defaultProgress,
  isStageUnlocked,
  progressionStorageKey,
  sanitizeProgress,
  STAGE_IDS,
  unlockedStages,
} from '../src/games/mirageProgression.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const schema = read('../supabase/schema.sql');
const grants = read('../supabase/mirage-account-grants.sql');
const profile = read('../src/pages/Profile.jsx');
const auth = read('../src/pages/Auth.jsx');
const miragePage = read('../src/games/MirageRushPage.jsx');
const mirageApi = read('../src/games/mirageApi.js');


test('Mirage Rush local caches are isolated by account id', () => {
  assert.equal(progressionStorageKey(), 'letsplay_mirage_progression_v1');
  assert.equal(progressionStorageKey('user-a'), 'letsplay_mirage_progression_v1:user:user-a');
  assert.notEqual(progressionStorageKey('user-a'), progressionStorageKey('user-b'));
});

test('the granted progression opens every current map and cup and carries 5,000 OR', () => {
  const progress = sanitizeProgress({
    ...defaultProgress(),
    coins: 5000,
    wonStages: [...STAGE_IDS],
    completedCups: CUPS.map((cup) => cup.id),
  });
  assert.equal(progress.coins, 5000);
  assert.deepEqual(unlockedStages(progress.wonStages), STAGE_IDS);
  assert.ok(STAGE_IDS.every((id) => isStageUnlocked(id, progress.wonStages)));
  assert.deepEqual(unlockedCups(progress.completedCups), CUPS);
  assert.ok(CUPS.every((cup) => isCupUnlocked(cup.id, progress.completedCups)));
});

test('the database migration stores account progression and protects the curated badge', () => {
  assert.match(schema, /is_verified boolean not null default false/);
  assert.match(schema, /create table if not exists public\.mirage_rush_progress/i);
  assert.match(schema, /Players read their own Mirage Rush progress/);
  assert.match(schema, /revoke all on public\.mirage_rush_progress from public, anon/i);
  assert.match(schema, /create trigger profiles_protect_verification_badge/i);
  assert.match(schema, /new\.is_verified := old\.is_verified/i);
  assert.match(schema, /new\.is_verified := false/i);
});

test('the admin grant is private, idempotent, additive, and covers the complete catalogue', () => {
  assert.match(grants, /alter table public\.profiles\s+add column if not exists is_verified/i);
  assert.match(grants, /create table if not exists public\.mirage_rush_progress/i);
  assert.match(grants, /create table if not exists public\.mirage_rush_grant_receipts/i);
  assert.match(grants, /primary key \(user_id, grant_code\)/i);
  assert.match(grants, /on conflict \(user_id, grant_code\) do nothing/i);
  assert.match(grants, /current_coins \+ 5000/i);
  assert.match(grants, /insert into public\.mirage_rush_progress \(user_id, progress, updated_at\)/i);
  assert.match(grants, /'already_granted', true/i);
  assert.match(grants, /revoke all on function public\.admin_grant_mirage_rush_access\(text, text\) from anon, authenticated/i);
  for (const id of STAGE_IDS) assert.ok(grants.includes(`'${id}'`), `grant must include map ${id}`);
  for (const cup of CUPS) assert.ok(grants.includes(`'${cup.id}'`), `grant must include cup ${cup.id}`);
  assert.doesNotMatch(grants, /bakuryuokiba@gmail\.com/i, 'the recipient email must not be committed to the repository');
});

test('the verified database flag is rendered on the account hub and public profile', () => {
  assert.match(auth, /select\('is_verified'\)/);
  assert.match(auth, /const isVerified = isDemo \|\| profileVerified/);
  assert.match(profile, /remoteProfile\.is_verified === true/);
  assert.match(profile, /profileVerified && <span className="player-badge-verified player-badge-verified-check"/);
});

test('connected Mirage Rush progress hydrates and saves through the private account table', () => {
  assert.match(mirageApi, /from\('mirage_rush_progress'\)/);
  assert.doesNotMatch(mirageApi, /from\('profiles'\)/);
  assert.match(miragePage, /fetchMirageProgress\(ownerId\)/);
  assert.match(miragePage, /saveMirageProgress\(ownerId, nextProgress\)/);
  assert.match(miragePage, /saveMirageProgress\(ownerId, clean\)/);
  assert.match(miragePage, /if \(connected && !progressionReady\) return/);
});
