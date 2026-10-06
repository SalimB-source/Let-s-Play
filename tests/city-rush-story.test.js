/**
 * Scénario « MIDNIGHT REVANCHE » du mode Histoire de Vice City Rush.
 * ------------------------------------------------------------------
 * Vérifie, sans navigateur ni moteur 3D :
 *   — les dix chapitres (prologue + neuf, un par saveur de gameplay) ;
 *   — chaque type d’objectif (classement, sabotage, chrono, survie…) ;
 *   — les étoiles (1 par objectif, +1/+2 par défi), les fins et la migration
 *     des anciennes sauvegardes (6 chapitres) vers le nouveau découpage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  CITY_RUSH_STORY_CAST,
  CITY_RUSH_STORY_CHAPTER_COUNT,
  CITY_RUSH_STORY_CHAPTERS,
  CITY_RUSH_STORY_ENDINGS,
  CITY_RUSH_STORY_VERSION,
  checkStoryObjective,
  getStoryChapter,
  mapLegacyStoryChapter,
  storyArtFor,
  storyEndingUnlocked,
  storyRingTargetTime,
  storySprintParTime,
  storyStarsForChapter,
  storyTotalStars,
} from '../src/games/cityRushStory.js';

const chapter = (id) => getStoryChapter(CITY_RUSH_STORY_CHAPTERS.findIndex((entry) => entry.id === id));

test('le scénario compte dix chapitres jouables dans l’ordre prévu', () => {
  assert.equal(CITY_RUSH_STORY_CHAPTER_COUNT, 10);
  assert.equal(CITY_RUSH_STORY_CHAPTERS.length, 10);
  assert.deepEqual(CITY_RUSH_STORY_CHAPTERS.map((entry) => entry.id), [
    'prologue',
    'retour',
    'heat',
    'mother-road',
    'camino',
    'midnight',
    'duel',
    'ombres',
    'ring',
    'finale',
  ]);
  // Les huit parcours du jeu sont tous utilisés par l’histoire.
  assert.deepEqual(
    [...new Set(CITY_RUSH_STORY_CHAPTERS.map((entry) => entry.city))].sort(),
    ['london', 'mexico-countryside', 'new-york', 'nordschleife', 'paris', 'route-66', 'tokyo', 'vice-city'],
  );
  for (const entry of CITY_RUSH_STORY_CHAPTERS) {
    assert.ok(entry.title.length > 0, `${entry.id} a un titre`);
    assert.ok(entry.objective?.label.length > 0, `${entry.id} a un objectif affiché`);
    assert.ok(entry.comic?.briefing?.length >= 1, `${entry.id} a un briefing BD`);
    assert.ok(entry.comic?.debriefWin?.length >= 1, `${entry.id} a un débrief de victoire`);
    assert.ok(entry.comic?.debriefFail?.length >= 1, `${entry.id} a un débrief d’échec`);
    assert.ok(Array.isArray(entry.radio), `${entry.id} a une banque radio`);
    assert.ok(entry.stars?.two && entry.stars?.three, `${entry.id} a deux défis d’étoiles`);
  }
});

test('le casting est réutilisable (héros, alliée, boss, fixer, rivale)', () => {
  for (const id of ['nico', 'luna', 'dante', 'voss', 'marlow', 'narrator']) {
    const member = CITY_RUSH_STORY_CAST[id];
    assert.ok(member?.name.length > 0, `${id} a un nom`);
    assert.ok(member?.color, `${id} a une couleur`);
    if (id !== 'narrator') assert.ok(member?.avatar && typeof member.avatar === 'object', `${id} a un avatar`);
  }
});

test('chaque chapitre a un décor BD existant sur le disque', () => {
  const checked = new Set();
  for (const entry of CITY_RUSH_STORY_CHAPTERS) {
    for (const kind of ['city', 'action']) {
      const art = storyArtFor(entry, kind);
      if (checked.has(art)) continue;
      checked.add(art);
      assert.equal(existsSync(new URL(`../public/${art}`, import.meta.url)), true, `décor ${art}`);
    }
  }
  assert.ok(checked.size >= 8, 'au moins huit décors distincts');
});

test('les objectifs se jugent sur le bilan de course', () => {
  const win = { rank: 1, destroyed: false, timedOut: false, sabotaged: false };
  const lose = { rank: 3, destroyed: false, timedOut: false, sabotaged: false };
  // Victoire simple (retour, camino, duel, finale) et podium fragile (ombres).
  assert.equal(checkStoryObjective(chapter('retour'), win), true);
  assert.equal(checkStoryObjective(chapter('retour'), lose), false);
  assert.equal(checkStoryObjective(chapter('ombres'), { ...lose, rank: 2 }), true);
  assert.equal(checkStoryObjective(chapter('ombres'), lose), false);
  // Prologue : la panne scriptée fait avancer l’histoire, quoi qu’il arrive.
  assert.equal(checkStoryObjective(chapter('prologue'), { ...win, sabotaged: true, destroyed: true }), true);
  assert.equal(checkStoryObjective(chapter('prologue'), lose), true);
  // Évasion de New York : finir suffit, la place ne compte pas.
  assert.equal(checkStoryObjective(chapter('heat'), lose), true);
  assert.equal(checkStoryObjective(chapter('heat'), { ...lose, destroyed: true }), false);
  // Sprint de Tokyo : livrer le dossier, sans rester en panne sèche.
  assert.equal(checkStoryObjective(chapter('midnight'), { ...win, sprint: true }), true);
  assert.equal(checkStoryObjective(chapter('midnight'), { ...win, sprint: true, timedOut: true }), false);
  // Chrono du Ring : le temps décide, pas la place.
  const target = storyRingTargetTime();
  assert.ok(target > 60, 'le chrono cible du Ring dépasse la minute');
  assert.equal(checkStoryObjective(chapter('ring'), { ...lose, duration: target - 1 }, { targetTime: target }), true);
  assert.equal(checkStoryObjective(chapter('ring'), { ...win, duration: target + 1 }, { targetTime: target }), false);
  // Référence du Sprint : elle suit la voiture engagée.
  const slow = storySprintParTime(30);
  const fast = storySprintParTime(60);
  assert.ok(slow > fast, 'la citadine a droit à un chrono plus large');
  assert.equal(checkStoryObjective(chapter('midnight'), { ...win, sprint: true, duration: 1 }, { sprintPar: 99 }), true);
});

test('les étoiles récompensent l’objectif puis les défis', () => {
  const prologue = chapter('prologue');
  const sabotage = { rank: 4, sabotaged: true, destroyed: true, rankAtBreakdown: 1, hitsTaken: 0 };
  assert.deepEqual(storyStarsForChapter(prologue, sabotage), { stars: 3, met: true, two: true, three: true });
  assert.equal(storyStarsForChapter(prologue, { ...sabotage, rankAtBreakdown: 4 }).stars, 1);
  const duel = chapter('duel');
  assert.equal(storyStarsForChapter(duel, { rank: 1, margin: 120, shotsFired: 0, destroyed: false }).stars, 3);
  assert.equal(storyStarsForChapter(duel, { rank: 1, margin: 5, shotsFired: 9, destroyed: false }).stars, 1);
  assert.equal(storyStarsForChapter(duel, { rank: 2, margin: -30, destroyed: false }).stars, 0);
  const ring = chapter('ring');
  const target = storyRingTargetTime();
  assert.equal(
    storyStarsForChapter(ring, { rank: 2, duration: target * 0.89, destroyed: false }, { targetTime: target }).stars,
    3,
  );
  assert.equal(storyTotalStars({ prologue: 3, duel: 2, ring: 99, unknown: 3 }), 8);
});

test('les fins exigent la finale, la troisième les étoiles', () => {
  assert.deepEqual(Object.keys(CITY_RUSH_STORY_ENDINGS), ['revenge', 'truth', 'double']);
  assert.equal(storyEndingUnlocked('revenge', 0), true);
  assert.equal(storyEndingUnlocked('truth', 12), true);
  assert.equal(storyEndingUnlocked('double', 26), false);
  assert.equal(storyEndingUnlocked('double', 27), true);
  assert.equal(CITY_RUSH_STORY_ENDINGS.double.cashBonus, 250);
});

test('les anciennes sauvegardes sont remappées au chapitre équivalent', () => {
  assert.equal(CITY_RUSH_STORY_VERSION, 2);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(mapLegacyStoryChapter), [0, 2, 5, 6, 7, 9, 10]);
  assert.equal(mapLegacyStoryChapter(99), 10);
  assert.equal(mapLegacyStoryChapter(-3), 0);
  assert.equal(getStoryChapter(99)?.id, 'finale');
  assert.equal(getStoryChapter(-5)?.id, 'prologue');
});
