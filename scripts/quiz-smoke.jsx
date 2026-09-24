/**
 * Entrée SSR utilisée par scripts/quiz-check.mjs — `npm run check:quiz`.
 *
 * Contrôles, comme les autres vérifications du dépôt :
 *
 *   1. le moteur des quizz (mélange déterministe du quizz du jour, barème,
 *      série de jours, barème « fun » des points MULTIPLIÉ par le niveau)
 *      se comporte comme annoncé, les quizz portent chacun leurs TROIS
 *      banques de questions (une par niveau), et le pool Survival mêle les
 *      questions sans doublon à l'intérieur d'un cycle ;
 *   2. une partie complète est réellement jouée dans le navigateur simulé
 *      (jsdom) avec la vraie pile de l'application — LanguageProvider +
 *      AuthProvider + AchievementProvider — : huit bonnes réponses donnent
 *      un sans-faute (confettis inclus), le verdict de chaque réponse (gel,
 *      vert/rouge, points), les corrections s'affichent, et la progression
 *      des succès est écrite dans le stockage local ;
 *   3. le déblocage en cascade tient (Facile → Confirmé → Expert), les points
 *      du run deviennent de l'XP joueur, et la règle « un niveau rapporte une
 *      fois » aussi : rejouer un niveau déjà terminé ne rapporte plus rien
 *      (ni points, ni record de l'appareil, ni tentative serveur) ;
 *   4. le Survival est réellement infini (trois vies, timeout pénalisé, score
 *      local et restart complet), exclu de la progression classique, et sa
 *      page comme les deux catégories restent traduites en FR / EN / AR.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { STORAGE_KEY } from '../src/achievements/storage';
import { FriendsProvider } from '../src/friends/FriendsContext';
import { MessagesProvider } from '../src/messages/MessagesContext';
import { readDemoMessages } from '../src/messages/messagesApi';
import { translations } from '../src/i18n/translations';
import { searchContent } from '../src/search/searchIndex';
import QuizzesPage from '../src/quizzes/QuizzesPage';
import QuizPage from '../src/quizzes/QuizPage';
import QuizLeaderboard from '../src/quizzes/QuizLeaderboard';
import Profile from '../src/pages/Profile';
import {
  QUIZ_LEVELS,
  baseUrl,
  quizBySlug,
  quizLabel,
  quizLevelQuestions,
  quizQuestionsCount,
  quizThumbUrl,
  quizzes,
} from '../src/quizzesData';
import {
  DIFFICULTY_MULTIPLIER, FREEZE_BONUS, LEVEL_RULES, QUESTION_TIME, VERDICT_MS, bestDayRun,
  dailyQuizFor, gradeQuiz, levelBrief, levelRules, pointsMultiplier, prepareQuiz,
  prepareSurvivalCycle, questionBudgetMs, quizPoints, quizPointsFor, startJokers, streakLevel,
  survivalQuestionPool,
} from '../src/quizzes/engine';
import { quizRunKey, quizLevelCompleted, totalXp } from '../src/achievements/engine';
import { formatBest, readLocalBest, readLocalBestRun, writeLocalBest } from '../src/quizzes/quizApi';
import { SURVIVAL_BEST_KEY, readSurvivalBest } from '../src/quizzes/survivalProgress';
import {
  LEVELS_KEY,
  isLevelCompleted,
  isLevelUnlocked,
  isQuizFinished,
  markLevelCompleted,
  nextLevel,
} from '../src/quizzes/quizProgress';
import {
  playQuizAnswerSound,
  playQuizComboSound,
  playQuizJokerSound,
  playQuizResultFanfare,
  quizSoundEnabled,
  startQuizClock,
  stopQuizClock,
  tickIntervalMs,
  unlockQuizAudio,
  updateQuizClock,
} from '../src/quizzes/quizSounds';
// Personas de démonstration (livrés vides dans l'application) : comme les
// autres scripts de vérification, on réinjecte les fixtures avant le rendu.
import { DEMO_PROFILE_FIXTURES, seedDemoProfiles } from './demoFixtures';

const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const DEMO_AUTH_KEY = 'letsplay_auth_demo_profile';

/** Langue active + progression vierge : le vrai `window` jsdom (et son
    localStorage) est installé par scripts/quiz-check.mjs. */
function seedLang(lang) {
  globalThis.window.localStorage.clear();
  globalThis.window.localStorage.setItem('letsplay-lang', lang);
}

/**
 * Faux contexte Web Audio (jsdom n'en fournit aucun) : il enregistre les
 * oscillateurs réellement lancés — type et fréquence — pour vérifier que le
 * tick-tack bat et que les verdicts partent bien, sans rien écouter.
 */
function installFakeAudioContext() {
  const notes = [];
  class FakeParam {
    constructor(value) { this.value = value; }
    setValueAtTime(value) { this.value = value; return this; }
    linearRampToValueAtTime(value) { this.value = value; return this; }
    exponentialRampToValueAtTime(value) { this.value = value; return this; }
  }
  class FakeNode { connect() { return this; } disconnect() {} }
  class FakeOscillator extends FakeNode {
    constructor() { super(); this.type = 'sine'; this.frequency = new FakeParam(0); }
    start() { notes.push({ type: this.type, frequency: this.frequency.value }); }
    stop() {}
    setPeriodicWave() {}
  }
  class FakeGain extends FakeNode { constructor() { super(); this.gain = new FakeParam(1); } }
  class FakeFilter extends FakeNode { constructor() { super(); this.type = 'lowpass'; this.frequency = new FakeParam(0); this.Q = new FakeParam(0); } }
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new FakeNode(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    createBiquadFilter() { return new FakeFilter(); }
  }
  globalThis.window.AudioContext = FakeAudioContext;
  return { notes, reset: () => { notes.length = 0; } };
}

export async function checkQuiz(assert) {
  /* ------------------------------------------------ 1. Moteur ------------- */
  const date = new Date(2026, 8, 23, 12); // mercredi 23 septembre 2026
  const today = dailyQuizFor(date, quizzes);
  assert.ok(today, 'le quizz du jour existe');
  assert.equal(dailyQuizFor(date, quizzes).slug, today.slug);
  const tomorrow = new Date(2026, 8, 24, 12);
  assert.notEqual(dailyQuizFor(tomorrow, quizzes).slug, today.slug);

  // Les trois nouveaux thèmes cinéma/pop culture s'ajoutent au catalogue sans
  // réutiliser les questions du quizz historique sur les adaptations gaming.
  const newSlugs = ['films-cultes', 'super-heros-cinema', 'series-cultes'];
  assert.equal(quizzes.length, 25, '22 quizz existants + 3 nouveaux thèmes cinéma/pop culture');
  assert.equal(new Set(quizzes.map((quiz) => quiz.slug)).size, quizzes.length, 'slugs uniques');
  assert.equal(new Set(quizzes.map((quiz) => quiz.route)).size, quizzes.length, 'routes uniques');
  for (const slug of newSlugs) {
    const quiz = quizBySlug(slug);
    assert.ok(quiz, `${slug} : présent dans le catalogue`);
    assert.equal(quiz.route, `/quizz/${slug}`, `${slug} : page jouable`);
    assert.ok(searchContent(slug.replaceAll('-', ' ')).some((item) => item.type === 'quiz' && item.slug === slug), `${slug} : présent dans la recherche`);
    for (const level of QUIZ_LEVELS) {
      for (const question of quizLevelQuestions(quiz, level)) {
        assert.ok(question.q.fr && question.why.fr, `${slug} [${level}] : question et explication en français`);
        assert.equal(question.choices.length, 4, `${slug} [${level}] : quatre propositions`);
        assert.ok(question.choices.every((choice) => choice.fr), `${slug} [${level}] : propositions en français`);
        assert.equal(new Set(question.choices.map((choice) => choice.fr)).size, 4, `${slug} [${level}] : propositions distinctes`);
        assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, `${slug} [${level}] : réponse valide`);
      }
    }
  }

  for (const quiz of quizzes) {
    // Trois niveaux de huit questions par quizz : les questions du niveau
    // joué, et elles seules, partent dans la partie.
    assert.equal(quizQuestionsCount(quiz), QUIZ_LEVELS.length * 8, `${quiz.slug} : trois niveaux de huit questions`);
    const seenIds = new Set();
    for (const level of QUIZ_LEVELS) {
      const levelQuestions = quizLevelQuestions(quiz, level);
      assert.equal(levelQuestions.length, 8, `${quiz.slug} [${level}] : huit questions`);
      for (const question of levelQuestions) seenIds.add(question.id);

      const prepared = prepareQuiz(quiz, level, 42);
      const again = prepareQuiz(quiz, level, 42);
      assert.equal(prepared.level, level, `${quiz.slug} [${level}] : le niveau voyage avec la partie`);
      assert.equal(prepared.questions.length, levelQuestions.length, `${quiz.slug} [${level}] : seules les questions du niveau sont posées`);
      assert.deepEqual(
        prepared.questions.map((question) => question.choices.map((choice) => choice.label.fr)),
        again.questions.map((question) => question.choices.map((choice) => choice.label.fr)),
        `${quiz.slug} [${level}] : même graine, même mélange`,
      );
      // Un autre niveau ne partage aucune question : le tirage est bien celui
      // du palier demandé.
      const otherLevel = nextLevel(level);
      if (otherLevel) {
        const otherIds = new Set(quizLevelQuestions(quiz, otherLevel).map((question) => question.id));
        assert.ok(
          prepared.questions.every((question) => !otherIds.has(question.id)),
          `${quiz.slug} [${level}] : aucune question du niveau ${otherLevel}`,
        );
      }
      for (const question of prepared.questions) {
        assert.equal(question.choices.filter((choice) => choice.correct).length, 1, `${quiz.slug} [${level}] : une seule bonne réponse par question`);
      }
      // Toutes bonnes réponses quel que soit le mélange : 100 %.
      const perfectAnswers = {};
      for (const question of prepared.questions) {
        perfectAnswers[question.id] = question.choices.find((choice) => choice.correct).id;
      }
      assert.equal(gradeQuiz(prepared, perfectAnswers).perfect, true, `${quiz.slug} [${level}] : sans-faute détecté`);
      assert.equal(gradeQuiz(prepared, {}).correct, 0, `${quiz.slug} [${level}] : aucune réponse, aucun point`);
    }
    assert.equal(seenIds.size, QUIZ_LEVELS.length * 8, `${quiz.slug} : identifiants de questions uniques d'un niveau à l'autre`);
  }

  // Le Survival prend le pool global des quizz × 3 niveaux, soit N*24
  // questions. Un cycle est un vrai mélange sans doublon ; le nouveau cycle
  // évite aussi de répéter tout de suite la question qui clôt le précédent.
  const survivalPool = survivalQuestionPool(quizzes);
  const expectedPoolSize = quizzes.length * 24;
  assert.equal(survivalPool.length, expectedPoolSize, `le pool Survival réunit les ${expectedPoolSize} questions existantes`);
  assert.equal(new Set(survivalPool.map((question) => question.id)).size, expectedPoolSize, 'identifiants Survival uniques entre quizz et niveaux');
  assert.equal(new Set(survivalPool.map((question) => question.sourceQuiz)).size, quizzes.length, `le pool inclut les ${quizzes.length} quizz`);
  const survivalCycle = prepareSurvivalCycle(quizzes, 4242);
  const sameSurvivalCycle = prepareSurvivalCycle(quizzes, 4242);
  assert.equal(survivalCycle.length, expectedPoolSize, 'un cycle propose une fois chaque question du pool');
  assert.deepEqual(
    survivalCycle.map((question) => question.id),
    sameSurvivalCycle.map((question) => question.id),
    'le mélange Survival reste reproductible avec une graine fixe',
  );
  assert.equal(new Set(survivalCycle.map((question) => question.id)).size, expectedPoolSize, 'aucun doublon à l’intérieur d’un cycle Survival');
  for (const question of survivalCycle) {
    assert.equal(question.choices.length, 5, 'Survival : quatre choix source et un piège expert');
    assert.equal(question.choices.filter((choice) => choice.correct).length, 1, 'Survival : une bonne réponse par question');
    assert.equal(question.choices.filter((choice) => choice.trap).length, 1, 'Survival : piège jamais compté comme bonne réponse');
  }
  const nextSurvivalCycle = prepareSurvivalCycle(quizzes, 4242, survivalCycle[0].id);
  assert.notEqual(nextSurvivalCycle[0].id, survivalCycle[0].id, 'le cycle suivant ne répète pas immédiatement sa première question');
  assert.deepEqual(
    new Set(nextSurvivalCycle.map((question) => question.id)),
    new Set(survivalCycle.map((question) => question.id)),
    'le recyclage garde exactement le pool complet',
  );

  // Déblocage en cascade : Facile ouvert, Confirmé après le Facile, Expert
  // après le Confirmé — et jamais l'inverse.
  assert.equal(isLevelUnlocked({}, 'culture-gaming', 'easy'), true, 'le niveau Facile est ouvert sans rien avoir joué');
  assert.equal(isLevelUnlocked({}, 'culture-gaming', 'medium'), false, 'le niveau Confirmé est verrouillé au départ');
  assert.equal(isLevelUnlocked({}, 'culture-gaming', 'hard'), false, 'le niveau Expert est verrouillé au départ');
  const afterEasy = markLevelCompleted('culture-gaming', 'easy');
  assert.equal(isLevelCompleted(afterEasy, 'culture-gaming', 'easy'), true, 'le niveau Facile est enregistré comme terminé');
  assert.equal(isLevelUnlocked(afterEasy, 'culture-gaming', 'medium'), true, 'le Confirmé s’ouvre après le Facile');
  assert.equal(isLevelUnlocked(afterEasy, 'culture-gaming', 'hard'), false, 'l’Expert reste fermé tant que le Confirmé n’est pas fait');
  assert.equal(isLevelUnlocked(afterEasy, 'consoles-retro', 'medium'), false, 'le déblocage ne fuit pas vers les autres quizz');
  const afterMedium = markLevelCompleted('culture-gaming', 'medium');
  assert.equal(isLevelUnlocked(afterMedium, 'culture-gaming', 'hard'), true, 'l’Expert s’ouvre après le Confirmé');
  assert.ok(globalThis.window.localStorage.getItem(LEVELS_KEY), 'la progression est écrite dans le stockage local');
  globalThis.window.localStorage.removeItem(LEVELS_KEY);

  assert.equal(bestDayRun(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-25']), 3);
  assert.equal(bestDayRun([]), 0);

  // Temps imparti : la valeur par défaut est celle annoncée (15 s par question).
  assert.equal(QUESTION_TIME.seconds, 15, 'quinze secondes par question');

  // Règles par niveau : ce que « Facile / Confirmé / Expert » change VRAIMENT
  // en partie, au-delà des questions du niveau et du multiplicateur de points.
  // L'expert est plus dur sur tous les axes (temps, propositions, vies, jokers).
  assert.equal(questionBudgetMs('easy'), 20000, 'facile : 20 s par question');
  assert.equal(questionBudgetMs('medium'), 15000, 'confirmé : 15 s par question');
  assert.equal(questionBudgetMs('hard'), 10000, 'expert : 10 s par question');
  QUESTION_TIME.seconds = 6;
  assert.equal(questionBudgetMs('hard'), 4000, 'la référence QUESTION_TIME met les trois niveaux à l’échelle');
  QUESTION_TIME.seconds = 15;
  assert.equal(levelRules('hard').extraDistractors, 1, 'expert : une proposition de plus par question');
  assert.equal(levelRules('easy').extraDistractors, 0, 'facile : les quatre propositions d’origine');
  assert.equal(levelRules('easy').lives, 0, 'facile : aucune vie à perdre');
  assert.equal(levelRules('hard').lives, 3, 'expert : trois vies, puis la partie s’arrête');
  assert.equal(startJokers('easy').fifty + startJokers('easy').freeze, 3, 'facile : deux 50/50 et un gel du chrono');
  assert.equal(startJokers('medium').fifty + startJokers('medium').freeze, 2, 'confirmé : deux jokers');
  assert.equal(startJokers('hard').fifty + startJokers('hard').freeze, 0, 'expert : aucun joker');
  assert.ok(LEVEL_RULES.hard.verdictMs <= VERDICT_MS, 'expert : le gel de verdict est plus court');
  assert.equal(levelRules('niveau-inconnu').id, 'easy', 'niveau inconnu : repli sur « facile »');
  assert.equal(FREEZE_BONUS.seconds, 8, 'le gel du chrono rend huit secondes');

  // Mélange expert : cinq propositions, une seule bonne, un piège marqué — et
  // jamais la bonne réponse, jamais un doublon. Même graine, même mélange.
  for (const entry of quizzes) {
    const expertPrepared = prepareQuiz(entry, 'hard', 7, { extraDistractors: 1 });
    const againExpert = prepareQuiz(entry, 'hard', 7, { extraDistractors: 1 });
    assert.deepEqual(
      expertPrepared.questions.map((question) => question.choices.map((choice) => JSON.stringify(choice.label))),
      againExpert.questions.map((question) => question.choices.map((choice) => JSON.stringify(choice.label))),
      `${entry.slug} : le mélange expert est déterministe`,
    );
    for (const question of expertPrepared.questions) {
      assert.equal(
        question.choices.length,
        entry.levels.hard[0].choices.length + 1,
        `${entry.slug} : une proposition de plus en expert`,
      );
      assert.equal(question.choices.filter((choice) => choice.correct).length, 1, `${entry.slug} : une seule bonne réponse`);
      assert.equal(question.choices.filter((choice) => choice.trap).length, 1, `${entry.slug} : un piège, marqué comme tel`);
      assert.equal(question.choices.find((choice) => choice.trap).correct, false, `${entry.slug} : le piège n’est pas la bonne réponse`);
      const labels = question.choices.map((choice) => JSON.stringify(choice.label));
      assert.equal(new Set(labels).size, labels.length, `${entry.slug} : aucune proposition en double`);
    }
  }

  // Série en cours (paliers de la flamme) et résumé de règles (sélecteur).
  assert.equal(streakLevel(1), 'cold', 'une bonne réponse : rien ne chauffe encore');
  assert.equal(streakLevel(2), 'warm');
  assert.equal(streakLevel(4), 'hot');
  assert.equal(streakLevel(8), 'blazing');
  assert.deepEqual(
    levelBrief(quizBySlug('culture-gaming'), 'hard'),
    { id: 'hard', seconds: 10, choices: 5, lives: 3, jokers: { fifty: 0, freeze: 0 }, jokerCount: 0 },
    'résumé du niveau expert : cinq propositions, trois vies, aucun joker',
  );
  assert.equal(levelBrief(quizBySlug('culture-gaming'), 'easy').choices, 4, 'résumé du niveau facile : quatre propositions');
  assert.equal(pointsMultiplier('hard'), DIFFICULTY_MULTIPLIER.hard, 'les règles ne réinventent pas le multiplicateur de points');

  // Barème d'une partie arrêtée par les vies : `answered` distingue joué de
  // répondu, et un arrêt prématuré n'est jamais un sans-faute.
  const stoppedPrepared = prepareQuiz(quizBySlug('culture-gaming'), 'hard', 3, { extraDistractors: 1 });
  const stoppedFirst = stoppedPrepared.questions[0];
  const stoppedGrade = gradeQuiz(stoppedPrepared, {
    [stoppedFirst.id]: stoppedFirst.choices.find((choice) => choice.correct).id,
  });
  assert.equal(stoppedGrade.answered, 1, 'une seule question réellement jouée');
  assert.equal(stoppedGrade.total, 8, 'le total reste celui du niveau');
  assert.equal(stoppedGrade.perfect, false, 'arrêt prématuré : pas de sans-faute');

  // Barème des points (le classement se joue dessus) : base + rapidité +
  // combo, en entiers et bornés — 200 points maximum par question.
  assert.deepEqual(
    quizPoints({ elapsedMs: 0, budgetMs: 15000, streak: 1 }),
    { base: 100, speed: 50, combo: 0, total: 150 },
    'réponse immédiate : base + rapidité max',
  );
  assert.deepEqual(
    quizPoints({ elapsedMs: 15000, budgetMs: 15000, streak: 1 }),
    { base: 100, speed: 0, combo: 0, total: 100 },
    'réponse sur le chrono : plus de bonus de rapidité',
  );
  assert.equal(quizPoints({ elapsedMs: 100, budgetMs: 15000, streak: 3 }).combo, 20, 'combo ×3 : deux bonnes consécutives au-delà de la première');
  assert.equal(quizPoints({ elapsedMs: 0, budgetMs: 15000, streak: 99 }).total, 200, 'pointage maximal, borné');

  // Multiplicateurs de niveau : plus le palier est dur, plus la bonne réponse
  // vaut cher — Facile ×1, Confirmé ×1,5, Expert ×2 (plafond par question
  // 200/300/400, borné comme le barème de base et revérifié côté serveur).
  assert.deepEqual(DIFFICULTY_MULTIPLIER, { easy: 1, medium: 1.5, hard: 2 }, 'un multiplicateur par niveau');
  assert.deepEqual(
    quizPointsFor('easy', { elapsedMs: 0, budgetMs: 15000, streak: 1 }),
    { base: 100, speed: 50, combo: 0, total: 150 },
    'Facile : même barème que la base',
  );
  assert.deepEqual(
    quizPointsFor('medium', { elapsedMs: 0, budgetMs: 15000, streak: 1 }),
    { base: 150, speed: 75, combo: 0, total: 225 },
    'Confirmé : réponse immédiate ×1,5',
  );
  assert.deepEqual(
    quizPointsFor('hard', { elapsedMs: 0, budgetMs: 15000, streak: 1 }),
    { base: 200, speed: 100, combo: 0, total: 300 },
    'Expert : réponse immédiate ×2',
  );
  assert.equal(quizPointsFor('medium', { elapsedMs: 0, budgetMs: 15000, streak: 99 }).total, 300, 'Confirmé : plafond 300, borné');
  assert.equal(quizPointsFor('hard', { elapsedMs: 0, budgetMs: 15000, streak: 99 }).total, 400, 'Expert : plafond 400, borné');
  assert.equal(quizPointsFor('medium', { elapsedMs: 15000, budgetMs: 15000, streak: 1 }).total, 150, 'Confirmé : réponse sur le chrono = base ×1,5, sans bonus');
  assert.equal(pointsMultiplier('ultra'), 1, 'niveau inconnu : repli ×1');

  // Tick-tack du minuteur : le tempo est une fonction pure, donc testable sans
  // navigateur. Il accélère par paliers quand le temps baisse, et jamais
  // l'inverse — le dernier palier s'emballe pile quand la barre passe au rouge.
  const budget = QUESTION_TIME.seconds * 1000;
  const startTempo = tickIntervalMs(budget, budget);
  const midTempo = tickIntervalMs(budget * 0.4, budget);
  const lowTempo = tickIntervalMs(budget * 0.15, budget);
  const lastTempo = tickIntervalMs(600, budget);
  assert.equal(startTempo, 1000, 'une pulsation par seconde en début de question');
  assert.ok(
    startTempo > midTempo && midTempo > lowTempo && lowTempo > lastTempo,
    `le tick-tack accélère par paliers (${startTempo} → ${midTempo} → ${lowTempo} → ${lastTempo} ms)`,
  );
  assert.ok(lastTempo <= 250, 'dernière ligne droite frénétique');
  assert.equal(tickIntervalMs(3001, budget), midTempo, 'juste avant les trois dernières secondes : tempo normal');
  assert.equal(tickIntervalMs(3000, budget), lowTempo, 'le tempo s’emballe avec la barre rouge (3 s)');
  let previousTempo = Infinity;
  for (let left = budget; left >= 0; left -= 250) {
    const tempo = tickIntervalMs(left, budget);
    assert.ok(tempo <= previousTempo, `tempo jamais plus lent quand le temps baisse (à ${left} ms restants)`);
    previousTempo = tempo;
  }

  // Miniatures : chaque quizz a sa propre illustration maison
  // (`public/quizzes/<slug>.jpg`), et l'épisode lié reste disponible comme
  // repli (`videoId`).
  const thumbs = quizzes.map((quiz) => quiz.image);
  for (const quiz of quizzes) {
    assert.equal(quiz.image, quizThumbUrl(quiz.slug), `${quiz.slug} : miniature maison du bon slug`);
    assert.ok(quiz.image.startsWith(`${baseUrl}quizzes/`), `${quiz.slug} : miniature dans public/quizzes/`);
    assert.match(quiz.image, /\/quizzes\/[a-z0-9-]+\.jpg$/, `${quiz.slug} : nom de fichier attendu`);
    assert.ok(quiz.videoId, `${quiz.slug} : épisode lié conservé en repli`);
  }
  assert.equal(new Set(thumbs).size, quizzes.length, 'une miniature distincte par quizz');

  /* ------------------------------------- 2. Partie complète (jsdom) -------- */
  seedLang('fr');
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);

  const slug = 'culture-gaming';
  const quiz = quizBySlug(slug);
  await act(async () => root.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));

  const click = async (el) => {
    assert.ok(el, 'élément cliquable présent');
    await act(async () => el.click());
    // Popup de confirmation de niveau (portail vers document.body) : si elle
    // vient de s'ouvrir après ce clic (bouton "Jouer ce niveau" ou
    // "Niveau suivant"), confirmer immédiatement pour que les tests
    // continuent comme avant — l'utilisateur réel, lui, voit la popup et
    // doit confirmer manuellement.
    const overlay = document.body.querySelector('.quiz-confirm-overlay');
    if (overlay) {
      const confirm = overlay.querySelector('.quiz-confirm-dialog .quiz-cta--primary');
      if (confirm) await act(async () => confirm.click());
    }
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Le gel de verdict (VERDICT_MS) retient la question suivante après chaque
  // réponse : les boucles de jeu attendent que l'écran avance (nouvelle
  // question, ou disparition de la question au profit du résultat).
  const waitQuestionChange = async (container, previous, timeoutMs = 3000) => {
    const startedAt = Date.now();
    for (;;) {
      const el = container.querySelector('.quiz-question');
      if (!el || el.textContent !== previous) return;
      if (Date.now() - startedAt > timeoutMs) throw new Error(`la question n'avance pas (${String(previous).slice(0, 40)}…)`);
      await act(async () => { await sleep(50); });
    }
  };

  // Répond juste à toutes les questions en cours : chacune est reconnue à son
  // libellé FR (l'ordre est mélangé par le moteur), la bonne réponse au barème.
  // `expectNoPoints` (rejouer un niveau déjà terminé) : ni le bandeau de
  // verdict, ni le compteur ⚡ du HUD ne doivent afficher de point gagné.
  const playQuestions = async (container, questions, { expectNoPoints = false } = {}) => {
    for (let step = 0; step < questions.length; step += 1) {
      const prompt = container.querySelector('.quiz-question')?.textContent || '';
      const question = questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
      assert.ok(question, `la question affichée existe dans les données (${prompt.slice(0, 40)}…)`);
      const rightText = quizLabel(question.choices[question.answer], 'fr');
      await click([...container.querySelectorAll('.quiz-choice')].find((el) => el.textContent === rightText));
      if (expectNoPoints) {
        const verdictText = container.querySelector('.quiz-verdict')?.textContent || '';
        assert.ok(!/PTS/.test(verdictText), 'niveau rejoué : le verdict n’annonce aucun point');
        const livePoints = (container.querySelector('.quiz-live-item--points')?.textContent || '').replace(/\D/g, '');
        assert.equal(livePoints, '0', 'niveau rejoué : le compteur de points reste à 0');
      }
      await waitQuestionChange(container, prompt);
    }
  };

  // Joue les questions d'un niveau dans l'ordre affiché : la bonne réponse est
  // reconnue à son libellé FR (`quizLevelQuestions`), `skip` saute les `skip`
  // premières questions (déjà jouées par un test précédent).
  const answerLevel = async (container, game, level, skip = 0) => {
    const questions = quizLevelQuestions(game, level);
    for (let step = skip; step < questions.length; step += 1) {
      const prompt = container.querySelector('.quiz-question')?.textContent || '';
      const question = questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
      assert.ok(question, `[${level}] la question affichée existe dans les données (${prompt.slice(0, 40)}…)`);
      const rightText = quizLabel(question.choices[question.answer], 'fr');
      await click([...container.querySelectorAll('.quiz-choice')]
        .find((el) => el.querySelector('.quiz-choice-label')?.textContent === rightText && !el.disabled));
      await waitQuestionChange(container, prompt);
    }
  };

  // Joue une partie parfaite d'un niveau : on clique le bouton du palier
  // (`[data-level]`, verrouillé ou non selon la progression), puis on répond
  // juste aux huit questions.
  const playPerfect = async (container, game, level = 'easy', options = undefined) => {
    await click(container.querySelector(`[data-level="${level}"] .quiz-level-play`));
    await playQuestions(container, quizLevelQuestions(game, level), options);
  };

  // Écran d'intro : titre du quizz + sélecteur des trois niveaux. Le Facile
  // est ouvert, le Confirmé et l'Expert affichent leur cadenas et leur
  // condition de déblocage.
  assert.ok(node.textContent.includes(quizLabel(quiz.labels, 'fr').title));
  assert.equal(node.querySelectorAll('.quiz-level').length, 3, 'trois niveaux proposés dans le quizz');
  assert.ok(node.querySelector('.quiz-level--easy .quiz-level-play:not([disabled])'), 'le niveau Facile est ouvert');
  assert.ok(node.querySelector('.quiz-level--medium .quiz-level-play[disabled]'), 'le niveau Confirmé est verrouillé au départ');
  assert.ok(node.querySelector('.quiz-level--hard .quiz-level-play[disabled]'), 'le niveau Expert est verrouillé au départ');
  assert.equal(node.querySelectorAll('.quiz-level.is-locked').length, 2, 'deux cadenas affichés (Confirmé, Expert)');
  assert.ok(node.textContent.includes('🔒'), 'le cadenas est visible sur les niveaux fermés');
  assert.ok(node.textContent.includes('Termine le niveau Facile pour débloquer celui-ci'), 'la condition de déblocage est écrite');
  assert.ok(node.textContent.includes('0/3 niveaux'), 'la progression part de zéro');
  assert.ok(node.textContent.includes(`${QUIZ_LEVELS.length * 8} questions`), 'le total de questions du quizz est affiché');
  // Les multiplicateurs de points sont annoncés dès le choix du niveau (le
  // sélecteur dit ce que chaque palier rapporte, pas seulement qu'il est dur).
  assert.ok(node.textContent.includes('×1,5'), 'le multiplicateur du palier Confirmé est annoncé');
  assert.ok(node.textContent.includes('×2'), 'le multiplicateur du palier Expert est annoncé');
  assert.ok(
    node.querySelectorAll('.quiz-level .quiz-level-meta').length === QUIZ_LEVELS.length,
    'chaque niveau annonce son nombre de questions et son barème',
  );

  // Partie Facile : le niveau joué est rappelé pendant la partie.
  await playPerfect(node, quiz, 'easy');
  assert.ok(node.textContent.includes('Facile'), 'le niveau joué est rappelé en partie');

  // Résultat : sans-faute 8/8, palier légende, huit corrections du niveau.
  const easyQuestions = quizLevelQuestions(quiz, 'easy');
  assert.ok(node.querySelector('.quiz-result'), 'écran de résultat affiché');
  assert.ok(node.textContent.includes('8/8 bonnes réponses'), 'score 8/8 affiché');
  assert.ok(node.textContent.includes('SANS FAUTE'), 'sans-faute annoncé');
  assert.ok(node.textContent.includes('LÉGENDE'), 'palier légende');
  assert.equal(node.querySelectorAll('.quiz-fix').length, easyQuestions.length);
  assert.equal(node.querySelectorAll('.quiz-fix.is-right').length, easyQuestions.length);

  // Les points du résultat : total de la partie (ils font le classement),
  // meilleure série, et les confettis du sans-faute.
  const pointsMatch = node.textContent.match(/(\d{3,4}) PTS/);
  assert.ok(pointsMatch, 'les points de la partie sont affichés');
  const playedPoints = Number(pointsMatch[1]);
  assert.ok(playedPoints > 800 && playedPoints <= 1600, `points bornés entre 800 et 1600 (${playedPoints})`);
  assert.ok(node.textContent.includes('×8'), 'la meilleure série ×8 est affichée');
  assert.ok(node.querySelectorAll('.quiz-confetti span').length > 0, 'confettis du sans-faute');

  // La progression des succès est écrite : quizz joué + sans-faute + jour de
  // quizz du jour (le quizz joué est ou non celui du jour selon la date, mais
  // le compteur de parties, lui, est toujours crédité).
  const stored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.ok(stored, 'progression des succès écrite dans le stockage');
  assert.ok(
    (stored.sets?.quizzes_played || []).includes(quizRunKey(slug, 'easy')),
    'le run est crédité sous sa clé slug:niveau',
  );
  assert.ok(quizLevelCompleted(stored, slug, 'easy'), 'le niveau joué est crédité');
  assert.ok(!quizLevelCompleted(stored, slug, 'hard'), 'un niveau jamais joué ne l’est pas pour autant');
  assert.ok((stored.sets?.perfect_quizzes || []).includes(slug), 'sans-faute crédité');
  assert.equal(stored.counters?.quizzes_completed, 1, 'compteur de parties à 1');
  // Les points du run sont devenus de l'XP joueur (clé `slug:niveau`), donc du
  // niveau du joueur : c'est la raison du multiplicateur par palier.
  assert.equal(stored.quizPoints?.[quizRunKey(slug, 'easy')], playedPoints, 'les points du run sont crédités en XP');
  assert.ok(totalXp(stored) >= playedPoints, 'le total d’XP inclut les points du quizz');
  assert.ok((stored.unlocked || {})['first-quiz'], 'succès « Premier quizz » débloqué');
  assert.ok((stored.unlocked || {})['perfect-score'], 'succès « Sans faute » débloqué');

  // Déblocage : le Facile terminé ouvre le Confirmé — annoncé à l'écran, écrit
  // dans la progression locale, et le record du niveau est conservé à part.
  assert.ok(node.textContent.includes('Niveau Confirmé débloqué'), 'le niveau Confirmé est annoncé comme débloqué');
  const storedLevels = JSON.parse(globalThis.window.localStorage.getItem(LEVELS_KEY) || '{}');
  assert.ok(storedLevels[slug]?.easy, 'le niveau Facile est enregistré comme terminé');
  assert.ok(!storedLevels[slug]?.medium, 'le niveau Confirmé n’est pas terminé pour autant');
  assert.ok(readLocalBestRun(slug, 'easy'), 'le record du niveau Facile est enregistré');
  assert.equal(readLocalBestRun(slug, 'medium'), null, 'aucun record pour un niveau jamais joué');

  // Écran de résultat épuré : « Niveau suivant » (flèche vers la droite, vers
  // le palier au-dessus du niveau joué) et « Voir tous les quizz » — plus
  // aucun autre bouton (Rejouer, Rejouer mes erreurs, dossier lié).
  const resultActions = [...node.querySelectorAll('.quiz-result-actions > *')];
  assert.equal(resultActions.length, 2, 'seulement deux boutons sur l’écran de résultat');
  const nextLevelCta = resultActions.find((el) => el.textContent.includes('Niveau suivant'));
  assert.ok(nextLevelCta, '« Niveau suivant » proposé dès le premier niveau terminé');
  assert.ok(nextLevelCta.textContent.includes('→'), '« Niveau suivant » avec sa flèche vers la droite');
  assert.ok(
    resultActions.some((el) => el.textContent.includes('Voir tous les quizz')),
    'bouton « Voir tous les quizz »',
  );
  assert.ok(!node.textContent.includes('Rejouer'), 'ni « Rejouer » ni « Rejouer mes erreurs »');
  assert.ok(!node.textContent.includes('Lire le dossier lié'), 'le lien vers le dossier lié est retiré du résultat');

  // Partie Confirmé : le palier s'enchaîne, et l'Expert s'ouvre à son tour.
  await click(nextLevelCta);
  assert.ok(node.textContent.includes('Confirmé'), 'le niveau Confirmé est annoncé en partie');
  await playQuestions(node, quizLevelQuestions(quiz, 'medium'));
  assert.ok(node.textContent.includes('8/8 bonnes réponses'), 'sans-faute au niveau Confirmé');
  assert.ok(node.textContent.includes('Niveau Expert débloqué'), 'le niveau Expert s’ouvre après le Confirmé');
  assert.ok(readLocalBestRun(slug, 'medium'), 'le record du niveau Confirmé est enregistré séparément');
  const storedMedium = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(storedMedium.counters?.quizzes_completed, 2, 'deux niveaux joués, deux parties comptées');
  assert.equal(
    (storedMedium.sets?.quizzes_played || []).filter((entry) => String(entry).split(':')[0] === slug).length,
    2,
    'deux runs du même quizz, un par niveau',
  );
  assert.ok(quizLevelCompleted(storedMedium, slug, 'medium'), 'les deux niveaux joués sont enregistrés (Facile puis Confirmé)');

  // Classement sans backend : message d'explication + meilleure partie locale
  // (points + bonnes réponses, les points faisant le classement).
  assert.ok(node.textContent.includes('CLASSEMENT'), 'section classement présente');
  assert.ok(node.textContent.includes('Connecte-toi avec un compte joueur'), 'repli hors-ligne expliqué');
  assert.ok(node.textContent.includes('Meilleur score sur cet appareil'), 'meilleur score local affiché');
  assert.ok(node.textContent.includes('8/8'), 'meilleur score local à 8/8');
  assert.ok(/8\/8 · \d+ PTS/.test(node.textContent), 'meilleur score local : points + bonnes réponses');

  // REJOUER le niveau Confirmé : le résultat ne le propose plus (épuré) — on
  // repasse par la grille (« Voir tous les quizz » → carte du quizz → niveau
  // Confirmé du sélecteur). La partie relancée ne rapporte PLUS RIEN — le
  // verdict n'a pas de points, le HUD reste à 0, le résultat affiche 0 PTS et
  // rien n'est réécrit (ni progression, ni record, ni XP).
  const beforeReplay = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  const xpBeforeReplay = totalXp(beforeReplay);
  const bestBefore = readLocalBestRun(slug, 'medium');
  await click([...node.querySelectorAll('a')].find((el) => el.getAttribute('href') === '/quizz'));
  assert.ok(node.querySelectorAll('.quiz-card').length, '« Voir tous les quizz » ramène à la grille');
  await click([...node.querySelectorAll('a')].find((el) => el.getAttribute('href') === `/quizz/${slug}`));
  assert.ok(node.querySelector('.quiz-levels'), 'la carte du quizz rouvre son sélecteur de niveaux');
  await click(node.querySelector('[data-level="medium"] .quiz-level-play'));
  assert.ok(node.querySelector('.quiz-question'), 'le niveau Confirmé se relance depuis le sélecteur');
  assert.ok(node.textContent.includes('Confirmé'), 'la partie relancée garde son niveau');
  await playQuestions(node, quizLevelQuestions(quiz, 'medium'), { expectNoPoints: true });
  assert.ok(node.textContent.includes('0 PTS'), 'résultat du replay : 0 point');
  assert.ok(node.textContent.includes('Niveau déjà terminé'), 'résultat du replay : le niveau est marqué terminé');
  const afterReplay = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(afterReplay.counters?.quizzes_completed, 2, 'le replay n’ajoute aucune partie au compteur');
  assert.equal((afterReplay.sets?.quizzes_played || []).length, 2, 'le replay n’ajoute aucun run à la progression');
  assert.equal(totalXp(afterReplay), xpBeforeReplay, 'le replay n’ajoute aucun XP');
  assert.equal(readLocalBestRun(slug, 'medium').points, bestBefore.points, 'le replay ne remplace pas le record de l’appareil');

  await act(async () => root.unmount());

  /* ------------------------- 3. Défi entre amis (session démo) -------------- */
  seedLang('fr');
  seedDemoProfiles();
  globalThis.window.localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(DEMO_PROFILE_FIXTURES.vortex));
  const demoNode = document.createElement('div');
  document.body.append(demoNode);
  const demoRoot = createRoot(demoNode);
  await act(async () => demoRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
          <FriendsProvider>
            <MessagesProvider>
              <AchievementProvider>
                <Routes>
                  <Route path="/quizz" element={<QuizzesPage />} />
                  <Route path="/quizz/:slug" element={<QuizPage />} />
                </Routes>
              </AchievementProvider>
            </MessagesProvider>
          </FriendsProvider>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  ));

  // Session démo : partie parfaite (niveau Facile) puis défi envoyé au premier
  // ami listé — le message nomme le niveau joué.
  await playPerfect(demoNode, quiz, 'easy');
  assert.ok(demoNode.querySelector('.quiz-result'), '[démo] écran de résultat');
  await click([...demoNode.querySelectorAll('button')].find((el) => el.textContent.includes('Défier un ami')));
  const friendButtons = demoNode.querySelectorAll('.quiz-challenge-friend');
  assert.ok(friendButtons.length >= 1, '[démo] les amis sont listés pour le défi');
  const firstName = demoNode.querySelector('.quiz-challenge-name')?.textContent || '';
  assert.ok(firstName, '[démo] le premier ami a un nom');
  await act(async () => friendButtons[0].click());

  // Confirmation à l'écran, message déposé dans la messagerie démo, succès
  // « Rival trouvé » crédité dans la progression locale.
  assert.ok(demoNode.textContent.includes(`Défi envoyé à ${firstName}`), '[démo] confirmation d’envoi');
  const demoMessages = JSON.stringify(readDemoMessages(DEMO_PROFILE_FIXTURES.vortex));
  assert.ok(demoMessages.includes('Défi Let’s Play'), '[démo] le défi arrive dans la messagerie');
  assert.ok(demoMessages.includes('8/8'), '[démo] le score à battre est dans le message');
  assert.ok(demoMessages.includes('Facile'), '[démo] le niveau joué fait partie du défi');
  const demoStored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.ok((demoStored?.unlocked || {})['first-challenge'], '[démo] succès « Rival trouvé » débloqué');

  await act(async () => demoRoot.unmount());

  /* ------------------------------------- 4. Page grille (trois langues) ---- */
  for (const lang of ['fr', 'en', 'ar']) {
    seedLang(lang);
    const gridNode = document.createElement('div');
    document.body.append(gridNode);
    const gridRoot = createRoot(gridNode);
    await act(async () => gridRoot.render(
      <LanguageProvider>
        <AuthProvider>
          <AchievementProvider>
            <MemoryRouter initialEntries={['/quizz']}>
              <Routes>
                <Route path="/quizz" element={<QuizzesPage />} />
                <Route path="/quizz/:slug" element={<QuizPage />} />
              </Routes>
            </MemoryRouter>
          </AchievementProvider>
        </AuthProvider>
      </LanguageProvider>,
    ));
    assert.equal(gridNode.querySelectorAll('.quiz-card').length, quizzes.length, `[${lang}] ${quizzes.length} cartes de quizz`);
    assert.ok(gridNode.querySelector('.quiz-daily'), `[${lang}] bannière quizz du jour`);
    assert.equal(gridNode.querySelector('#quiz-category-main-title')?.textContent, translations[lang].quiz.categoryMainTitle, `[${lang}] catégorie des quizz classiques traduite`);
    assert.equal(gridNode.querySelector('#quiz-category-survival-title')?.textContent, translations[lang].quiz.categorySurvivalTitle, `[${lang}] catégorie Survival traduite`);
    assert.equal(gridNode.querySelectorAll('.quiz-category--main .quiz-card').length, quizzes.length, `[${lang}] la catégorie classique regroupe les ${quizzes.length} cartes`);
    assert.ok(gridNode.querySelector('.quiz-category--main .quiz-category-heading p')?.textContent.includes(String(quizzes.length)), `[${lang}] le nombre de quizz dans le texte suit le catalogue`);
    assert.ok(gridNode.querySelector('.quiz-category--survival .quiz-category-heading p')?.textContent.includes(String(expectedPoolSize)), `[${lang}] le texte Survival annonce le pool complet`);
    for (const slug of newSlugs) {
      assert.ok(gridNode.querySelector(`a.quiz-card[href="/quizz/${slug}"]`), `[${lang}] ${slug} : carte jouable dans la grille`);
    }
    const survivalLink = gridNode.querySelector('.quiz-survival-card');
    assert.ok(survivalLink, `[${lang}] carte Survival affichée`);
    assert.equal(survivalLink.getAttribute('href'), '/quizz/survival', `[${lang}] carte Survival ouvre sa route dédiée`);
    assert.ok(survivalLink.textContent.includes(translations[lang].quiz.categorySurvivalPlay), `[${lang}] CTA Survival traduit`);
    assert.ok(survivalLink.textContent.includes(translations[lang].quiz.categorySurvivalPool.replace('{n}', String(expectedPoolSize))), `[${lang}] pool global de ${expectedPoolSize} questions annoncé`);
    // Tous les quizz sont jouables dès l'arrivée, et la grille ne classe plus
    // rien par difficulté : aucune pastille Facile/Confirmé/Expert sur les
    // cartes, mais la progression des niveaux à la place.
    assert.equal(
      gridNode.querySelectorAll('.quiz-chip--easy, .quiz-chip--medium, .quiz-chip--hard').length,
      0,
      `[${lang}] aucune pastille de difficulté sur la grille`,
    );
    assert.equal(gridNode.querySelectorAll('.quiz-card .quiz-chip--levels').length, quizzes.length, `[${lang}] une progression par carte`);
    assert.ok(gridNode.textContent.includes(translations[lang].quiz.levelProgress.replace('{done}', '0').replace('{total}', '3')), `[${lang}] progression 0/3 niveaux affichée`);

    // Cartes compactes : le chapeau du quizz n'est plus affiché sur la grille
    // (il reste lu sur la bannière du jour et l'écran d'intro du quizz), seul
    // le titre reste — et il est bien là, en entier, sur chaque carte.
    assert.equal(gridNode.querySelectorAll('.quiz-card-copy p').length, 0, `[${lang}] aucune description sur les cartes`);
    assert.equal(gridNode.querySelectorAll('.quiz-card-copy h3').length, quizzes.length, `[${lang}] un titre par carte`);
    const cardTitles = [...gridNode.querySelectorAll('.quiz-card-copy h3')].map((el) => el.textContent.trim());
    const cards = [...gridNode.querySelectorAll('.quiz-card')];
    for (const entry of quizzes) {
      const title = quizLabel(entry.labels, lang)?.title;
      const intro = quizLabel(entry.labels, lang)?.text;
      assert.ok(title, `[${lang}] ${entry.slug} : le quizz a bien un titre dans sa langue`);
      assert.ok(cardTitles.includes(title), `[${lang}] ${entry.slug} : son titre est affiché sur sa carte`);
      assert.ok(
        !intro || !cards.some((card) => card.textContent.includes(intro)),
        `[${lang}] ${entry.slug} : son chapeau n'est pas recopié sur la carte`,
      );
    }

    // Chaque carte affiche sa miniature maison (aucune requête YouTube), et
    // la bannière du jour affiche celle du quizz mis en avant.
    const cardThumbs = [...gridNode.querySelectorAll('.quiz-card-media img')].map((img) => img.getAttribute('src'));
    assert.equal(cardThumbs.length, quizzes.length, `[${lang}] une miniature par carte`);
    assert.equal(new Set(cardThumbs).size, quizzes.length, `[${lang}] ${quizzes.length} miniatures distinctes`);
    assert.deepEqual(
      [...cardThumbs].sort(),
      quizzes.map((entry) => entry.image).sort(),
      `[${lang}] les cartes demandent les fichiers de public/quizzes/`,
    );
    assert.ok(
      cardThumbs.every((src) => !src.includes('ytimg.com')),
      `[${lang}] aucune requête YouTube pour les cartes`,
    );
    assert.ok(
      (gridNode.querySelector('.quiz-daily-media img')?.getAttribute('src') || '').startsWith(`${baseUrl}quizzes/`),
      `[${lang}] la bannière du jour utilise la miniature maison`,
    );
    await act(async () => gridRoot.unmount());
  }

  /* --------------------------- 4 bis. Survival mode ------------------------- */
  seedLang('fr');
  globalThis.window.localStorage.removeItem(SURVIVAL_BEST_KEY);
  const survivalNode = document.createElement('div');
  document.body.append(survivalNode);
  const survivalRoot = createRoot(survivalNode);
  await act(async () => survivalRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={['/quizz/survival']}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));
  assert.ok(survivalNode.textContent.includes('SURVIVAL MODE'), 'la route dédiée ouvre le Survival');
  assert.ok(survivalNode.textContent.includes(`${expectedPoolSize} questions dans le pool global`), 'le pool de questions est annoncé');
  assert.ok(!survivalNode.querySelector('.quiz-levels'), 'le Survival ne demande aucun niveau classique');
  assert.ok(!survivalNode.querySelector('.quiz-board') && !survivalNode.querySelector('.quiz-comments'), 'le Survival est exclu du classement et des commentaires classiques');
  const survivalStartQuestion = survivalNode.querySelector('.quiz-question');
  assert.equal(survivalStartQuestion, null, 'aucune question avant de lancer le mode');

  // Le timeout coûte une vie comme une mauvaise réponse. On raccourcit le
  // temps partagé du moteur pour vérifier la vraie horloge sans attendre 10 s.
  const survivalBudgetBefore = QUESTION_TIME.seconds;
  QUESTION_TIME.seconds = 0.3;
  await click(survivalNode.querySelector('.quiz-player-intro .quiz-cta--primary'));
  assert.ok(survivalNode.querySelector('.quiz-player--hard'), 'le lecteur Survival réutilise le HUD du mode Expert');
  assert.equal(survivalNode.querySelectorAll('.quiz-heart').length, 3, 'trois vies visibles au départ');
  assert.equal(survivalNode.querySelectorAll('.quiz-choice').length, 5, 'les choix sont mélangés avec le piège Expert');
  const firstSurvivalQuestionId = survivalNode.querySelector('.quiz-question')?.getAttribute('data-question-id');
  assert.ok(firstSurvivalQuestionId, 'la question Survival provient du pool global');
  const waitSurvivalAdvance = async (previousLabel, timeoutMs = 4000) => {
    const startedAt = Date.now();
    for (;;) {
      const currentLabel = survivalNode.querySelector('.quiz-progress-label')?.textContent || '';
      if (survivalNode.querySelector('.quiz-survival-result') || (currentLabel && currentLabel !== previousLabel)) return;
      if (Date.now() - startedAt > timeoutMs) throw new Error('le Survival ne passe pas à la question suivante');
      await act(async () => { await sleep(50); });
    }
  };
  const waitSurvivalVerdict = async (timeoutMs = 3000) => {
    const startedAt = Date.now();
    while (!survivalNode.querySelector('.quiz-verdict')) {
      if (Date.now() - startedAt > timeoutMs) throw new Error('le timeout Survival ne produit pas de verdict');
      await act(async () => { await sleep(40); });
    }
  };
  const firstProgressLabel = survivalNode.querySelector('.quiz-progress-label')?.textContent || '';
  await waitSurvivalVerdict();
  assert.equal(survivalNode.querySelectorAll('.quiz-heart.is-lost').length, 1, 'un timeout fait perdre une vie');
  assert.ok(survivalNode.textContent.includes(translations.fr.quiz.survival.timeout), 'le timeout est annoncé comme une erreur');
  await waitSurvivalAdvance(firstProgressLabel);
  QUESTION_TIME.seconds = survivalBudgetBefore;

  const answerSurvivalWrong = async () => {
    const prompt = survivalNode.querySelector('.quiz-question');
    const questionId = prompt?.getAttribute('data-question-id');
    const source = survivalPool.find((entry) => entry.id === questionId);
    assert.ok(source, 'la question courante appartient à la banque globale');
    const wrongLabel = quizLabel(source.choices[(source.answer + 1) % source.choices.length], 'fr');
    const previousLabel = survivalNode.querySelector('.quiz-progress-label')?.textContent || '';
    await click([...survivalNode.querySelectorAll('.quiz-choice')]
      .find((button) => button.querySelector('.quiz-choice-label')?.textContent === wrongLabel));
    await waitSurvivalAdvance(previousLabel);
  };
  await answerSurvivalWrong();
  assert.equal(survivalNode.querySelectorAll('.quiz-heart.is-lost').length, 2, 'chaque erreur retire exactement une vie');
  await answerSurvivalWrong();
  assert.ok(survivalNode.querySelector('.quiz-survival-result'), 'la partie s’arrête à zéro vie');
  assert.ok(survivalNode.textContent.includes(translations.fr.quiz.survival.gameOver), 'écran Game Over affiché');
  assert.ok(survivalNode.textContent.includes('0 PTS'), 'le score final est affiché');
  assert.ok(survivalNode.textContent.includes('3') && survivalNode.textContent.includes(translations.fr.quiz.survival.questionsPlayed), 'le résumé compte les trois questions jouées');
  assert.equal(survivalNode.querySelectorAll('.quiz-stat').length, 3, 'le résumé donne questions, bonnes réponses et record local');
  assert.equal(readSurvivalBest()?.questions, 3, 'le record Survival est stocké localement');
  const survivalAchievements = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.ok(!quizLevelCompleted(survivalAchievements, 'survival', 'hard'), 'le Survival ne crédite aucun niveau classique');
  assert.ok(!(JSON.parse(globalThis.window.localStorage.getItem(LEVELS_KEY) || '{}').survival), 'le Survival ne touche pas à la progression classique');

  // Recommencer repart sur un nouvel ordre, trois vies, question 1 et score 0.
  await click(survivalNode.querySelector('.quiz-survival-restart'));
  assert.notEqual(survivalNode.querySelector('.quiz-question')?.getAttribute('data-question-id'), firstSurvivalQuestionId, 'le restart remélange le pool depuis une autre première question');
  assert.equal(survivalNode.querySelectorAll('.quiz-heart.is-lost').length, 0, 'le restart restaure les trois vies');
  assert.ok(survivalNode.querySelector('.quiz-progress-label')?.textContent.includes('Question 1'), 'le compteur repart de zéro');
  assert.equal((survivalNode.querySelector('.quiz-live-item--points')?.textContent || '').replace(/\D/g, ''), '0', 'le score du run repart à zéro');
  assert.equal(readSurvivalBest()?.points, 0, 'le meilleur score local survit au redémarrage');
  await act(async () => survivalRoot.unmount());

  /* ------------------ 5. Record + compte à rebours sur la grille ------------ */
  // Le localStorage garde la langue FR et le record écrit par la partie de
  // l'étape 2 n'existe plus (vidé par seedLang) : on le repose comme le ferait
  // une partie, puis la grille doit montrer le badge et le décompte.
  globalThis.window.localStorage.setItem('letsplay-lang', 'fr');
  writeLocalBest('culture-gaming', 8, 8, 1250, 'easy');
  // Progression : deux niveaux terminés sur trois, pour vérifier le badge.
  markLevelCompleted('culture-gaming', 'easy');
  markLevelCompleted('culture-gaming', 'medium');
  const bestNode = document.createElement('div');
  document.body.append(bestNode);
  const bestRoot = createRoot(bestNode);
  await act(async () => bestRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={['/quizz']}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));
  assert.ok(bestNode.textContent.includes('Nouveau quizz dans'), 'compte à rebours du prochain quizz du jour');
  assert.ok(
    [...bestNode.querySelectorAll('.quiz-card-best')].some((el) => el.textContent.includes('8/8') && el.textContent.includes('1250 PTS')),
    'record 8/8 · 1250 PTS affiché sur la carte du quizz joué',
  );
  assert.ok(
    [...bestNode.querySelectorAll('.quiz-card .quiz-chip--levels')].some((el) => el.textContent.trim() === '2/3 niveaux'),
    'la carte affiche la progression des niveaux (2/3)',
  );
  assert.equal(readLocalBestRun('culture-gaming', 'medium'), null, 'le record est bien rangé par niveau');
  await act(async () => bestRoot.unmount());

  /* ---------------- 6. Classement par points + rang global profil ----------- */
  // Record de l'appareil : la meilleure partie est celle qui marque le plus
  // de points (à égalité, le plus de bonnes réponses l'emporte) — la règle du
  // classement, pas le nombre de bonnes réponses.
  writeLocalBest('culture-gaming', 8, 8, 900, 'easy');
  writeLocalBest('culture-gaming', 6, 8, 1300, 'easy');
  let deviceBest = readLocalBestRun('culture-gaming', 'easy');
  assert.deepEqual(
    { score: deviceBest.score, points: deviceBest.points },
    { score: 6, points: 1300 },
    'le record suit les points, pas les bonnes réponses (6/8 à 1300 pts bat 8/8 à 900)',
  );
  writeLocalBest('culture-gaming', 7, 8, 1300, 'easy');
  deviceBest = readLocalBestRun('culture-gaming', 'easy');
  assert.equal(deviceBest.score, 7, 'à points égaux, le plus de bonnes réponses dépasse le record');
  writeLocalBest('culture-gaming', 8, 8, 1299, 'easy');
  deviceBest = readLocalBestRun('culture-gaming', 'easy');
  assert.equal(deviceBest.points, 1300, 'moins de points ne remplace pas le record');
  assert.equal(formatBest(deviceBest), '7/8 · 1300 PTS', 'le libellé du record affiche points + bonnes réponses');
  // Chaque niveau garde son record ; la carte, elle, montre le meilleur des trois.
  writeLocalBest('culture-gaming', 4, 8, 500, 'hard');
  assert.equal(readLocalBestRun('culture-gaming', 'hard').points, 500, 'le niveau Expert a son propre record');
  assert.equal(readLocalBestRun('culture-gaming', 'easy').points, 1300, 'le record du Facile ne bouge pas');
  const acrossLevels = readLocalBest('culture-gaming');
  assert.equal(acrossLevels.points, 1300, 'le record affiché sur la carte prend le meilleur des niveaux');
  assert.equal(acrossLevels.level, 'easy', 'le record affiché nomme son niveau');
  assert.equal(readLocalBestRun('culture-gaming', 'medium'), null, 'un niveau jamais joué n’a pas de record');
  assert.equal(formatBest({ score: 8, total: 8 }), '8/8', 'record antérieur aux points : repli score/total');

  // Classement d'un quizz : les lignes arrivent déjà triées par points (RPC)
  // et s'affichent avec les points en premier, les bonnes réponses en
  // secondaire. Sans points (ancien backend), l'ancien affichage reste.
  const boardRows = [
    { username: 'Rapide', score: 6, total: 8, points: 1300, perfect: false },
    { username: 'Parfait', score: 8, total: 8, points: 900, perfect: true },
    { username: 'Legacy', score: 8, total: 8, perfect: true },
  ];
  const boardNode = document.createElement('div');
  document.body.append(boardNode);
  const boardRoot = createRoot(boardNode);
  await act(async () => boardRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter>
          <QuizLeaderboard quiz={quiz} lastBoard={boardRows} />
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  ));
  const boardLines = [...boardNode.querySelectorAll('.quiz-board-row')];
  assert.equal(boardLines.length, 3, 'trois lignes au classement');
  assert.ok(
    boardNode.querySelector('.quiz-board .section-label')?.textContent.includes('Facile'),
    'le classement affiché est celui du niveau courant',
  );
  assert.ok(
    boardLines[0].textContent.includes('Rapide') && boardLines[0].textContent.includes('1300 PTS'),
    'la ligne la mieux pourvue en points mène (1300 PTS devant 8/8 à 900)',
  );
  assert.ok(
    boardLines[1].textContent.includes('900 PTS') && boardLines[1].textContent.includes('8/8'),
    'points en premier, bonnes réponses en secondaire',
  );
  assert.ok(boardLines[2].textContent.includes('8/8'), 'ancien backend sans points : repli sur score/total');
  assert.ok(boardLines[1].textContent.includes('★') && !boardLines[0].textContent.includes('★'), 'le sans-faute garde son étoile');
  await act(async () => boardRoot.unmount());

  // Pages de profil : le classement global des quizz s'affiche partout.
  // Sans backend (ni compte serveur, comme ici en session démo), les fiches
  // scriptées montrent un rang déterministe hors-ligne — jamais une section
  // vide — et les états de repli restent explicites.
  seedDemoProfiles();
  globalThis.window.localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(DEMO_PROFILE_FIXTURES.vortex));
  const renderProfileRank = async (profileId) => {
    const rankNode = document.createElement('div');
    document.body.append(rankNode);
    const rankRoot = createRoot(rankNode);
    await act(async () => rankRoot.render(
      <LanguageProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/profile/${profileId}`]}>
            <FriendsProvider>
              <MessagesProvider>
                <AchievementProvider>
                  <Routes>
                    <Route path="/profile/:userId" element={<Profile />} />
                  </Routes>
                </AchievementProvider>
              </MessagesProvider>
            </FriendsProvider>
          </MemoryRouter>
        </AuthProvider>
      </LanguageProvider>,
    ));
    const rankSection = rankNode.querySelector('.quiz-global-rank');
    assert.ok(rankSection, `[${profileId}] section « classement global des quizz » présente sur le profil`);
    assert.ok(rankSection.textContent.includes('CLASSEMENT GLOBAL DES QUIZZ'), `[${profileId}] titre de la section classement global`);
    assert.ok(rankSection.textContent.trim().length > 'CLASSEMENT GLOBAL DES QUIZZ'.length, `[${profileId}] section non vide`);
    return { rankNode, rankRoot, rankSection };
  };

  const ownRank = await renderProfileRank(DEMO_PROFILE_FIXTURES.vortex.id);
  assert.ok(ownRank.rankNode.textContent.includes('VOTRE PROFIL'), 'propre profil rendu (hub joueur)');
  assert.ok(ownRank.rankSection.textContent.includes('Rang de démo hors-ligne'), '[profil personnel] rang scripté hors-ligne expliqué');
  assert.ok(/#\d+/.test(ownRank.rankSection.textContent), '[profil personnel] position scriptée affichée');
  assert.ok(ownRank.rankSection.textContent.includes('Points gagnés'), '[profil personnel] points du rang global affichés');
  await act(async () => ownRank.rankRoot.unmount());

  const personaRank = await renderProfileRank(DEMO_PROFILE_FIXTURES.pixel.id);
  assert.ok(personaRank.rankNode.textContent.includes('APERÇU DÉMO'), 'fiche persona démo rendue');
  assert.ok(personaRank.rankSection.textContent.includes('Rang de démo hors-ligne'), '[persona] rang scripté hors-ligne expliqué');
  assert.ok(/#\d+/.test(personaRank.rankSection.textContent), '[persona] position scriptée affichée');
  await act(async () => personaRank.rankRoot.unmount());

  const communityRank = await renderProfileRank('demo-player-3105');
  assert.ok(communityRank.rankNode.textContent.includes('COMMUNAUTÉ DÉMO'), 'fiche joueur communauté démo rendue');
  assert.ok(communityRank.rankSection.textContent.includes('Rang de démo hors-ligne'), '[communauté démo] rang scripté hors-ligne expliqué');
  assert.ok(/#\d+/.test(communityRank.rankSection.textContent), '[communauté démo] position scriptée affichée');
  await act(async () => communityRank.rankRoot.unmount());

  /* ------------------------- 7. Partie tout faux ---------------------------- */
  seedLang('fr');
  const revNode = document.createElement('div');
  document.body.append(revNode);
  const revRoot = createRoot(revNode);
  await act(async () => revRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));

  // Partie tout faux : à chaque question, un choix qui n'est pas le bon.
  const wrongQuestions = quizLevelQuestions(quiz, 'easy');
  await click(revNode.querySelector('[data-level="easy"] .quiz-level-play'));
  for (let step = 0; step < wrongQuestions.length; step += 1) {
    const prompt = revNode.querySelector('.quiz-question')?.textContent || '';
    const question = wrongQuestions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    const wrongText = quizLabel(question.choices[(question.answer + 1) % question.choices.length], 'fr');
    await click([...revNode.querySelectorAll('.quiz-choice')].find((el) => el.textContent === wrongText));
    if (step === 0) {
      // Pendant le gel : le choix raté passe au rouge, la bonne réponse
      // s'illumine sur le choix non cliqué, le bandeau annonce, et tous les
      // choix sont verrouillés.
      assert.ok(revNode.querySelector('.quiz-choice.is-wrong'), 'le choix raté passe au rouge');
      assert.ok(revNode.querySelector('.quiz-choice.is-reveal'), 'la bonne réponse s’illumine');
      assert.ok(revNode.querySelector('.quiz-verdict.is-wrong'), 'le bandeau de verdict s’affiche');
      assert.equal([...revNode.querySelectorAll('.quiz-choice')].filter((el) => el.disabled).length, 4, 'choix verrouillés pendant le gel');
    }
    await waitQuestionChange(revNode, prompt);
  }
  assert.ok(revNode.textContent.includes('0/8 bonnes réponses'), 'premier tour tout faux : 0/8');

  // Le résultat reste épuré même sans bonne réponse : « Niveau suivant » vers
  // le Confirmé (le niveau Facile est terminé, même à 0/8) et « Voir tous les
  // quizz » — le tour de révision a disparu avec son bouton.
  const revActions = [...revNode.querySelectorAll('.quiz-result-actions > *')];
  assert.equal(revActions.length, 2, '[tout faux] seulement deux boutons sur l’écran de résultat');
  assert.ok(
    revActions.some((el) => el.textContent.includes('Niveau suivant')),
    '[tout faux] « Niveau suivant » proposé même sans bonne réponse',
  );

  // Une seule partie créditée, aucun sans-faute, et seule la progression du
  // niveau joué est écrite.
  const revStored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(revStored?.counters?.quizzes_completed, 1, 'une seule partie comptée');
  assert.ok(!(revStored?.sets?.perfect_quizzes || []).includes(slug), 'aucun sans-faute crédité');
  const revLevels = JSON.parse(globalThis.window.localStorage.getItem(LEVELS_KEY) || '{}');
  assert.deepEqual(Object.keys(revLevels[slug] || {}), ['easy'], 'seul le niveau Facile est enregistré');

  await act(async () => revRoot.unmount());

  /* --------------------------- 7. Minuteur ---------------------------------- */
  // On raccourcit le budget à 300 ms : sans cliquer, chaque question doit
  // expirer toute seule et la partie finir en 0/8 avec « Temps écoulé ».
  QUESTION_TIME.seconds = 0.3;
  seedLang('fr');
  const timerNode = document.createElement('div');
  document.body.append(timerNode);
  const timerRoot = createRoot(timerNode);
  await act(async () => timerRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));

  await click(timerNode.querySelector('[data-level="easy"] .quiz-level-play'));
  assert.ok(timerNode.querySelector('.quiz-timer'), 'le minuteur est affiché pendant la partie');
  // Une question à la fois : chaque `act` laisse le décompte expirer, le
  // verdict sonner, puis le gel faire avancer la question. L'attente se calcule
  // depuis le moteur (budget du niveau + gel du verdict) : chaque niveau a son
  // propre budget (`questionBudgetMs`), un délai codé en dur casserait dès
  // qu'un niveau change.
  const expireWait = questionBudgetMs('easy') + levelRules('easy').verdictMs + 300;
  for (let step = 0; step < quizLevelQuestions(quiz, 'easy').length; step += 1) {
    await act(async () => { await sleep(expireWait); });
  }
  assert.ok(timerNode.textContent.includes('0/8 bonnes réponses'), 'le minuteur écoulé compte chaque question comme ratée');
  assert.ok(timerNode.textContent.includes('Temps écoulé'), 'les corrections signalent le temps écoulé');
  QUESTION_TIME.seconds = 15;

  await act(async () => timerRoot.unmount());

  /* ------------------------------ 9. Sons du quizz -------------------------- */
  // Sans Web Audio (le jsdom de ce script n'en fournit aucun), tout est no-op :
  // la partie se joue quand même et rien ne casse.
  assert.equal(unlockQuizAudio(), false, 'sans Web Audio, aucun contexte à déverrouiller');
  assert.equal(playQuizAnswerSound(true), false, 'sans Web Audio, le verdict juste ne joue pas (sans planter)');
  assert.equal(playQuizAnswerSound(false, { timeout: true }), false, 'sans Web Audio, le verdict raté non plus');
  assert.equal(startQuizClock(1000), true, 'l’horloge démarre même sans audio');
  assert.equal(stopQuizClock(), true, 'et s’arrête proprement');

  // Avec un faux contexte Web Audio, on vérifie ce qui part réellement :
  // tick-tack pendant la question, accord montant sur une bonne réponse,
  // descente sur une mauvaise, note grave en plus quand le temps s'écoule.
  const audio = installFakeAudioContext();
  QUESTION_TIME.seconds = 15;
  seedLang('fr');
  const soundNode = document.createElement('div');
  document.body.append(soundNode);
  const soundRoot = createRoot(soundNode);
  await act(async () => soundRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));

  // Réglage accessible dès l'intro (le tick-tack démarre avec la partie).
  const introSound = soundNode.querySelector('.quiz-sound-toggle');
  assert.ok(introSound, 'bouton son sur l’écran d’introduction');
  assert.equal(introSound.getAttribute('aria-pressed'), 'true', 'son actif par défaut');
  assert.equal(introSound.getAttribute('aria-label'), 'Couper les sons du quizz', 'le libellé annonce l’action');

  // Coupé depuis l'intro : la partie démarre en silence complet, et la
  // préférence est retenue pour l'appareil.
  await act(async () => introSound.click());
  assert.equal(globalThis.window.localStorage.getItem('letsplay_quiz_sound_v1'), 'off', 'préférence « son coupé » retenue');
  assert.equal(quizSoundEnabled(), false, 'le module lit la préférence');
  assert.equal(playQuizAnswerSound(true), false, 'aucun verdict tant que c’est coupé');

  audio.reset();
  await click(soundNode.querySelector('[data-level="easy"] .quiz-level-play'));
  assert.ok(soundNode.querySelector('.quiz-timer'), 'minuteur toujours en place');
  assert.equal(soundNode.querySelector('.quiz-hud .quiz-sound-toggle').getAttribute('aria-pressed'), 'false', 'bouton son de la partie annoncé coupé');
  await act(async () => { await sleep(1200); });
  assert.equal(audio.notes.length, 0, 'aucun son pendant la partie muette');

  // Rallumé en pleine question : le tick-tack reprend sans attendre la
  // suivante, et bat en triangles (donc distinct des verdicts).
  await act(async () => soundNode.querySelector('.quiz-hud .quiz-sound-toggle').click());
  assert.equal(quizSoundEnabled(), true, 'le son se rallume');
  const ticks = async (limit = 1500) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < limit) {
      if (audio.notes.some((note) => note.type === 'triangle')) return true;
      await act(async () => { await sleep(100); });
    }
    return audio.notes.some((note) => note.type === 'triangle');
  };
  assert.ok(await ticks(), 'le tick-tack bat pendant la question, dès le rallumage');

  // Une réponse : le même choix que le barème, reconnu à son libellé FR.
  // Renvoie le libellé de la question posée (pour attendre l'avance après le
  // gel de verdict).
  const answerOnce = async (nodeEl, right) => {
    const prompt = nodeEl.querySelector('.quiz-question')?.textContent || '';
    const question = quizLevelQuestions(quiz, 'easy').find((entry) => quizLabel(entry.q, 'fr') === prompt);
    assert.ok(question, `la question affichée existe dans les données (${prompt.slice(0, 40)}…)`);
    const choice = right
      ? question.choices[question.answer]
      : question.choices[(question.answer + 1) % question.choices.length];
    await click([...nodeEl.querySelectorAll('.quiz-choice')].find((el) => el.textContent === quizLabel(choice, 'fr')));
    return prompt;
  };

  // Bonne réponse : accord montant do–mi–sol en sinusoïdes, et compteur ✓.
  // Pendant le gel de verdict : le choix cliqué passe au vert, le bandeau
  // annonce le verdict (phrase + points gagnés), les autres choix verrouillés.
  audio.reset();
  const rightPrompt = await answerOnce(soundNode, true);
  const rightNotes = audio.notes.filter((note) => note.type === 'sine');
  assert.equal(rightNotes.length, 3, 'bonne réponse : trois notes');
  assert.deepEqual(
    rightNotes.map((note) => Math.round(note.frequency)),
    [523, 659, 784],
    'bonne réponse : accord montant do–mi–sol',
  );
  assert.ok(soundNode.textContent.includes('✓ 1'), 'compteur de bonnes réponses à 1');
  assert.ok(soundNode.querySelector('.quiz-choice.is-correct'), 'le choix cliqué passe au vert pendant le gel');
  assert.ok(soundNode.querySelector('.quiz-verdict.is-right'), 'le bandeau de verdict s’affiche');
  assert.ok(/PTS/.test(soundNode.querySelector('.quiz-verdict')?.textContent || ''), 'les points gagnés sont annoncés');
  assert.equal([...soundNode.querySelectorAll('.quiz-choice')].filter((el) => el.disabled).length, 4, 'choix verrouillés pendant le gel');
  await waitQuestionChange(soundNode, rightPrompt);

  // Mauvaise réponse : deux notes descendantes en dents de scie. Le budget de
  // la question suivante tombe à 400 ms, pour éprouver le temps écoulé.
  audio.reset();
  await answerOnce(soundNode, false);
  QUESTION_TIME.seconds = 0.4;
  const wrongNotes = audio.notes.filter((note) => note.type === 'sawtooth');
  assert.equal(wrongNotes.length, 2, 'mauvaise réponse : deux notes');
  assert.ok(wrongNotes[0].frequency > wrongNotes[1].frequency, 'mauvaise réponse : la descente descend');
  const wrongLive = Number((soundNode.querySelector('.quiz-live-item--wrong')?.textContent || '').replace(/\D/g, '')) || 0;
  assert.equal(wrongLive, 1, 'compteur de mauvaises réponses à 1');
  assert.ok(soundNode.querySelector('.quiz-choice.is-wrong'), 'le choix raté passe au rouge');
  assert.ok(soundNode.querySelector('.quiz-choice.is-reveal'), 'la bonne réponse s’illumine sur le choix non cliqué');

  // Temps écoulé : la question suivante apparaît après le gel du verdict de la
  // mauvaise réponse (VERDICT_MS), expire toute seule (400 ms), et sa note
  // grave part pendant la sonnerie de ce même verdict — ne pas répondre n'est
  // pas se tromper, le son le dit. On n'avance pas la question en attendant :
  // il faut que la suivante expire pendant que la précédente est encore gelée.
  // Temps écoulé : la descente plus une note grave — ne pas répondre n'est pas
  // se tromper, le son le dit. La question suivante apparaît après le gel du
  // verdict de la mauvaise réponse (VERDICT_MS) et expire toute seule
  // (400 ms) : on attend ses trois notes en polling (comme le tick-tack plus
  // haut) plutôt que sur un délai fixe — le gel et le rendu n'étant pas
  // instantanés, seul le son fait foi.
  audio.reset();
  const timeoutSound = async (limit = 6000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < limit) {
      if (audio.notes.filter((note) => note.type === 'sawtooth').length >= 3) return true;
      await act(async () => { await sleep(50); });
    }
    return audio.notes.filter((note) => note.type === 'sawtooth').length >= 3;
  };
  assert.ok(await timeoutSound(), 'temps écoulé : le verdict sonore part aussi');
  const timeoutNotes = audio.notes.filter((note) => note.type === 'sawtooth');
  assert.ok(timeoutNotes.some((note) => note.frequency < 150), 'temps écoulé : note grave supplémentaire');
  const wrongCount = Number((soundNode.querySelector('.quiz-live-item--wrong')?.textContent || '').replace(/\D/g, '')) || 0;
  assert.ok(wrongCount >= 2, `le temps écoulé compte comme une mauvaise réponse (✗ ${wrongCount})`);
  // Budget de 15 s restauré aussitôt : il doit l'être avant l'apparition de la
  // question suivante (à VERDICT_MS après l'expiration) pour que la fin de
  // partie se joue à budget plein.
  QUESTION_TIME.seconds = 15;
  await waitQuestionChange(soundNode, soundNode.querySelector('.quiz-question')?.textContent || '');

  // Fin de partie : cinq bonnes réponses consécutives (6/8 au total). Le
  // compteur de sons est remis à zéro juste avant la dernière — l'écran de
  // résultat (palier vétérane) doit jouer sa fanfare en plus du verdict de la
  // réponse, et le combo de la série sonne encore.
  for (let step = 0; step < 5; step += 1) {
    const prompt = soundNode.querySelector('.quiz-question')?.textContent || '';
    if (step === 4) audio.reset();
    await answerOnce(soundNode, true);
    await waitQuestionChange(soundNode, prompt);
  }
  assert.ok(soundNode.textContent.includes('6/8 bonnes réponses'), 'résultat de la partie : 6/8');
  assert.ok(soundNode.textContent.includes('VÉTÉRAN'), 'palier vétérane pour 6/8');
  const resultNotes = audio.notes.filter((note) => note.type === 'sine');
  assert.equal(resultNotes.length, 6, 'verdict de la dernière réponse (3 notes) + fanfare du palier (3 notes)');
  assert.equal(audio.notes.filter((note) => note.type === 'square').length, 1, 'le combo de la dernière réponse sonne (série en cours)');

  // Raccourcis clavier : « Niveau suivant » lance directement le palier
  // au-dessus, et la touche 1 valide le premier choix affiché. Une seconde
  // touche pendant le gel est ignorée — une seule question avance.
  await click([...soundNode.querySelectorAll('button')].find((el) => el.textContent.includes('Niveau suivant')));
  assert.ok(soundNode.querySelector('.quiz-question'), 'la partie du niveau suivant est lancée');
  const keyPrompt = soundNode.querySelector('.quiz-question')?.textContent || '';
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '2', bubbles: true }));
  });
  assert.ok(soundNode.querySelector('.quiz-verdict'), 'la touche 1 a répondu : verdict affiché');
  await waitQuestionChange(soundNode, keyPrompt);
  const answeredCount = Number((soundNode.querySelector('.quiz-live-item--right')?.textContent || '').replace(/\D/g, '')) || 0;
  const rejectedCount = Number((soundNode.querySelector('.quiz-live-item--wrong')?.textContent || '').replace(/\D/g, '')) || 0;
  assert.equal(answeredCount + rejectedCount, 1, 'la touche 2, pendant le gel, est ignorée : une seule question avancée');

  await act(async () => soundRoot.unmount());

  // Accélération en conditions réelles : on fait défiler le temps restant
  // (comme le minuteur React, toutes les 100 ms) jusqu'à la dernière ligne
  // droite — le battement en attente doit être reprogrammé tout de suite, et
  // non à la seconde suivante comme au début de la question.
  audio.reset();
  startQuizClock(budget);
  const fastForwardAt = Date.now();
  for (let left = budget; left >= budget * 0.05; left -= 250) updateQuizClock(left, budget);
  await act(async () => { await sleep(260); });
  const fastBeat = audio.notes.find((note) => note.type === 'triangle');
  assert.ok(fastBeat, 'le palier franchi reprogramme le battement immédiatement');
  assert.ok(Date.now() - fastForwardAt < 900, 'il bat moins d’une seconde après le franchissement (rythme accéléré)');
  assert.equal(stopQuizClock(), true, 'l’horloge s’arrête (aucun minuteur ne survit à la partie)');

  // Combo et fanfare : les deux nouveaux sons, testés directement comme les
  // verdicts — le bip monte avec la série, la fanfare suit le palier.
  audio.reset();
  assert.equal(playQuizComboSound(2), true, 'le combo sonne');
  const comboNotes = audio.notes.filter((note) => note.type === 'square');
  assert.equal(comboNotes.length, 1, 'un bip par combo');
  assert.equal(Math.round(comboNotes[0].frequency), 659, 'le combo ×2 part sur le mi');
  audio.reset();
  playQuizComboSound(9);
  const longCombo = audio.notes.find((note) => note.type === 'square');
  assert.ok(longCombo && Math.round(longCombo.frequency) > 659, 'la note du combo monte avec la série');
  audio.reset();
  assert.equal(playQuizResultFanfare('legend'), true, 'la fanfare de légende sonne');
  assert.deepEqual(
    audio.notes.map((note) => Math.round(note.frequency)),
    [523, 659, 784, 1047],
    'quatre notes montantes pour la légende',
  );
  audio.reset();
  assert.equal(playQuizResultFanfare('rookie'), true, 'la fanfare de novice sonne aussi');
  assert.equal(audio.notes.length, 2, 'deux notes pour le novice');

  // Réglage compris avant de lancer la partie : le bouton son existe dans les
  // trois langues, avec le libellé traduit (pas le repli anglais).
  /* ------------- 10. Refonte : CTA compacts, pastilles, jokers -------------- */
  // Le lecteur de partie : boutons d'action compacts (`.quiz-cta`, et plus le
  // `.button` géant du site), pastilles de progression, jokers 50/50 + gel du
  // chrono, détail de partie au résultat.
  seedLang('fr');
  const funNode = document.createElement('div');
  document.body.append(funNode);
  const funRoot = createRoot(funNode);
  await act(async () => funRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));

  // Sélecteur de niveaux : chaque niveau annonce ses règles (temps,
  // propositions, vies, jokers) et se lance d'un CTA compact.
  assert.equal(funNode.querySelectorAll('.quiz-level-rules').length, 3, 'les trois niveaux annoncent leurs règles');
  assert.ok(funNode.querySelector('[data-level="easy"] .quiz-level-rules').textContent.includes('20 s'), 'facile : 20 s annoncées');
  assert.ok(funNode.querySelector('[data-level="hard"] .quiz-level-rules').textContent.includes('♥ 3'), 'expert : trois vies annoncées');
  assert.ok(funNode.querySelector('[data-level="easy"] .quiz-keys-hint, .quiz-keys-hint'), 'l’astuce clavier est affichée');
  assert.ok(funNode.textContent.includes('touches 1–4 pour répondre'), 'facile : l’astuce clavier suit les quatre propositions');
  const easyCta = funNode.querySelector('[data-level="easy"] .quiz-level-play');
  assert.ok(easyCta.classList.contains('quiz-cta'), 'l’action du niveau est un CTA compact');
  assert.ok(!easyCta.classList.contains('button'), 'le quizz n’utilise plus le gros bouton global');

  await click(easyCta);
  // Jokers du niveau facile (deux 50/50, un gel) et une pastille par question.
  const jokerButtons = () => [...funNode.querySelectorAll('.quiz-joker')];
  assert.equal(jokerButtons().length, 2, 'facile : un bouton 50/50 et un bouton gel');
  assert.equal(funNode.querySelectorAll('.quiz-pip').length, quizLevelQuestions(quiz, 'easy').length, 'une pastille par question');
  assert.ok(funNode.querySelector('.quiz-player--easy'), 'le lecteur porte l’accent du niveau joué');

  // 50/50 : deux propositions sortent du jeu — sans disparaître (la grille ne
  // bouge pas) — et la bonne réponse survit toujours.
  const promptFifty = funNode.querySelector('.quiz-question')?.textContent || '';
  const questionFifty = quizLevelQuestions(quiz, 'easy').find((entry) => quizLabel(entry.q, 'fr') === promptFifty);
  const rightFifty = quizLabel(questionFifty.choices[questionFifty.answer], 'fr');
  const totalChoices = funNode.querySelectorAll('.quiz-choice').length;
  audio.reset();
  await click(jokerButtons()[0]);
  assert.equal(funNode.querySelectorAll('.quiz-choice').length, totalChoices, 'le 50/50 garde les boutons en place');
  assert.equal(funNode.querySelectorAll('.quiz-choice.is-eliminated').length, 2, 'deux propositions éliminées');
  assert.ok(
    [...funNode.querySelectorAll('.quiz-choice.is-eliminated')].every((el) => el.disabled),
    'les propositions éliminées ne sont plus cliquables',
  );
  const eliminatedLabels = [...funNode.querySelectorAll('.quiz-choice.is-eliminated')]
    .map((el) => el.querySelector('.quiz-choice-label')?.textContent || '');
  assert.ok(!eliminatedLabels.includes(rightFifty), 'le 50/50 ne touche jamais la bonne réponse');
  assert.equal(audio.notes.filter((note) => note.type === 'sine').length, 2, 'le 50/50 sonne (deux notes)');
  const jokerCounts = () => [...jokerButtons()].map((el) => el.querySelector('.quiz-joker-count')?.textContent);
  assert.deepEqual(jokerCounts(), ['1', '1'], 'un 50/50 dépensé sur deux, le gel encore intact');

  // Gel du chrono : la barre passe en mode gel et le compte à rebours remonte.
  const secondsOf = () => Number((funNode.querySelector('.quiz-timer-count')?.textContent || '').replace(/\D/g, '')) || 0;
  const beforeFreeze = secondsOf();
  await click(jokerButtons()[1]);
  assert.ok(funNode.querySelector('.quiz-timer.is-frozen'), 'le chrono passe en mode gel');
  assert.ok(secondsOf() >= beforeFreeze + FREEZE_BONUS.seconds - 1, `le gel rend ses secondes (${beforeFreeze} → ${secondsOf()} s)`);
  assert.deepEqual(jokerCounts(), ['1', '0'], 'le gel est dépensé');
  assert.ok(jokerButtons()[1].disabled, 'un joker épuisé n’est plus cliquable');

  // Réponse juste : la pastille passe au vert, et la question suivante repart
  // avec toutes ses propositions (les éliminations ne survivent pas).
  await click([...funNode.querySelectorAll('.quiz-choice')]
    .find((el) => el.querySelector('.quiz-choice-label')?.textContent === rightFifty && !el.disabled));
  assert.ok(funNode.querySelector('.quiz-pip.is-right'), 'la pastille de la question jouée passe au vert');
  await waitQuestionChange(funNode, promptFifty);
  assert.equal(funNode.querySelectorAll('.quiz-choice').length, quizLevelQuestions(quiz, 'easy')[0].choices.length, 'la question suivante a toutes ses propositions');
  assert.equal(funNode.querySelectorAll('.quiz-choice.is-eliminated').length, 0, 'les éliminations ne suivent pas d’une question à l’autre');

  // Le reste du niveau, puis l'écran de résultat : détail de la partie
  // (réussite, points, série, temps moyen, jokers) et boutons compacts.
  await answerLevel(funNode, quiz, 'easy', 1);
  assert.ok(funNode.querySelector('.quiz-result'), 'écran de résultat de la refonte');
  assert.equal(funNode.querySelectorAll('.quiz-stat').length, 5, 'réussite, points, série, temps moyen, jokers (pas de vies en facile)');
  assert.ok(funNode.textContent.includes('Réussite'), 'la réussite fait partie du détail');
  assert.ok(funNode.textContent.includes('Jokers utilisés'), 'les jokers dépensés sont comptés');
  const nextCta = [...funNode.querySelectorAll('button')].find((el) => el.textContent.includes('Niveau suivant'));
  assert.ok(nextCta && nextCta.classList.contains('quiz-cta'), 'le bouton « Niveau suivant » est compact aussi');
  assert.ok(
    [...funNode.querySelectorAll('.quiz-result-actions > *')].every((el) => el.classList.contains('quiz-cta') || el.classList.contains('arrow-link')),
    'les actions du résultat sont toutes compactes',
  );

  /* ------------------- 11. Niveau expert : plus dur, vraiment --------------- */
  // L'expert s'ouvre en terminant le Confirmé : on enchaîne depuis l'écran de
  // résultat (bouton « Niveau suivant ») pour l'atteindre en conditions réelles.
  const unlockButton = () => [...funNode.querySelectorAll('.quiz-result-actions .quiz-cta--primary')]
    .find((el) => el.textContent.includes('Niveau suivant'));
  assert.ok(unlockButton(), 'le niveau Confirmé vient de se débloquer');
  await click(unlockButton());
  await answerLevel(funNode, quiz, 'medium');
  assert.ok(funNode.textContent.includes('8/8 bonnes réponses'), 'niveau Confirmé terminé');
  assert.ok(funNode.textContent.includes('touches 1–4 pour répondre') || funNode.querySelector('.quiz-result'), 'le résultat du Confirmé s’affiche');
  await click(unlockButton());

  // Niveau expert : dix secondes, cinq propositions (quatre + un piège), trois
  // vies, aucun joker, points ×2 — et la partie s'arrête à la troisième erreur.
  assert.ok(funNode.querySelector('.quiz-player--hard'), 'le lecteur porte l’accent du niveau expert');
  assert.equal(funNode.querySelectorAll('.quiz-choice').length, 5, 'expert : cinq propositions (quatre + un piège)');
  assert.equal(funNode.querySelectorAll('.quiz-heart').length, 3, 'expert : trois vies affichées');
  assert.equal(funNode.querySelectorAll('.quiz-joker').length, 0, 'expert : aucun bouton joker');
  assert.ok(funNode.textContent.includes('EXPERT — AUCUN JOKER'), 'expert : l’absence de joker est dite');

  // Partie experte parfaite : cinq propositions à chaque question et la base
  // ×2 sur chaque bonne réponse (200 pts minimum, `DIFFICULTY_MULTIPLIER`).
  let expertVerdictPoints = 0;
  const expertQuestions = quizLevelQuestions(quiz, 'hard');
  for (let step = 0; step < expertQuestions.length; step += 1) {
    const prompt = funNode.querySelector('.quiz-question')?.textContent || '';
    const question = expertQuestions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    assert.equal(funNode.querySelectorAll('.quiz-choice').length, 5, 'expert : cinq propositions à chaque question');
    const rightText = quizLabel(question.choices[question.answer], 'fr');
    await click([...funNode.querySelectorAll('.quiz-choice')]
      .find((el) => el.querySelector('.quiz-choice-label')?.textContent === rightText));
    expertVerdictPoints = Math.max(
      expertVerdictPoints,
      Number((funNode.querySelector('.quiz-verdict-points')?.textContent.match(/\d+/) || [0])[0]),
    );
    await waitQuestionChange(funNode, prompt);
  }
  assert.ok(funNode.querySelector('.quiz-result'), 'la partie experte se termine');
  assert.ok(expertVerdictPoints >= 200, `une bonne réponse experte rapporte au moins la base ×2 (${expertVerdictPoints})`);
  assert.ok(funNode.textContent.includes('8/8 bonnes réponses'), 'sans-faute en niveau expert');

  // Dernier niveau du quizz : pas de « Niveau suivant » — le résultat épuré ne
  // propose que « Voir tous les quizz » (et le quizz vient de passer TERMINÉ).
  assert.ok(funNode.textContent.includes('🏁'), 'le quizz passe TERMINÉ après ses trois niveaux');
  assert.ok(!funNode.textContent.includes('Niveau suivant'), 'pas de « Niveau suivant » après le dernier niveau');
  assert.ok(
    [...funNode.querySelectorAll('.quiz-result-actions > *')].every((el) => el.classList.contains('quiz-cta')),
    'le résultat du dernier niveau n’offre que la sortie vers la grille',
  );
  await act(async () => funRoot.unmount());

  // La touche 5 et la fin de partie ne peuvent plus passer par le bouton
  // « Rejouer » (résultat épuré, quizz TERMINÉ) : l'expert d'un AUTRE quizz,
  // ouvert par une progression semée à la main, porte ces tests en conditions
  // réelles — cinq propositions, cinq touches, trois vies.
  seedLang('fr');
  const livesSlug = 'consoles-retro';
  const livesQuiz = quizBySlug(livesSlug);
  globalThis.window.localStorage.setItem(LEVELS_KEY, JSON.stringify({ [livesSlug]: { easy: true, medium: true } }));
  const livesNode = document.createElement('div');
  document.body.append(livesNode);
  const livesRoot = createRoot(livesNode);
  await act(async () => livesRoot.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[`/quizz/${livesSlug}`]}>
            <Routes>
              <Route path="/quizz" element={<QuizzesPage />} />
              <Route path="/quizz/:slug" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));
  await click(livesNode.querySelector('[data-level="hard"] .quiz-level-play'));
  assert.ok(livesNode.querySelector('.quiz-player--hard'), 'l’expert semé s’ouvre directement');

  // La touche 5 répond — cinq propositions, cinq touches (et le piège de la
  // cinquième coûte une vie, comme toute erreur en expert).
  const livesExpertQuestions = quizLevelQuestions(livesQuiz, 'hard');
  const expertKeyPrompt = livesNode.querySelector('.quiz-question')?.textContent || '';
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '5', bubbles: true }));
  });
  assert.ok(livesNode.querySelector('.quiz-verdict'), 'la touche 5 répond en niveau expert');
  await waitQuestionChange(livesNode, expertKeyPrompt);

  // Trois erreurs de suite : chaque erreur coûte une vie, la dernière arrête la
  // partie — les questions non jouées comptent comme ratées.
  const answerWrongExpert = async () => {
    const prompt = livesNode.querySelector('.quiz-question')?.textContent || '';
    const question = livesExpertQuestions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    const rightText = quizLabel(question.choices[question.answer], 'fr');
    await click([...livesNode.querySelectorAll('.quiz-choice')]
      .find((el) => el.querySelector('.quiz-choice-label')?.textContent !== rightText));
    await waitQuestionChange(livesNode, prompt);
  };
  for (let step = 0; step < 3 && !livesNode.querySelector('.quiz-result'); step += 1) {
    await answerWrongExpert();
    assert.ok(
      livesNode.querySelector('.quiz-result') || livesNode.querySelectorAll('.quiz-heart.is-lost').length >= 1,
      'chaque erreur coûte une vie',
    );
  }
  assert.ok(livesNode.querySelector('.quiz-result'), 'les vies épuisées arrêtent la partie');
  assert.ok(livesNode.textContent.includes('PLUS DE VIES'), 'l’écran annonce la fin de partie');
  assert.ok(/[01]\/8 bonnes réponses/.test(livesNode.textContent), 'les questions non jouées comptent comme ratées');
  assert.equal(livesNode.querySelectorAll('.quiz-stat').length, 6, 'le détail expert compte les vies restantes');
  assert.equal(livesNode.querySelectorAll('.quiz-fix').length, livesExpertQuestions.length, 'les corrections couvrent tout le niveau');
  assert.ok(
    livesNode.textContent.includes('Voir tous les quizz') && !livesNode.textContent.includes('Niveau suivant'),
    'fin de partie sur le dernier niveau : seulement « Voir tous les quizz »',
  );
  await act(async () => livesRoot.unmount());

  /* ------------- 12. Quizz TERMINÉ : grisé et verrouillé partout ----------- */
  // Les trois niveaux d'un quizz faits (Facile + Confirmé + Expert) : il passe
  // « TERMINÉ » — niveaux de gris, drapeau sur la miniature, LIEN RETIRÉ sur la
  // grille comme sur la bannière du jour, et le lecteur remplace son sélecteur
  // de niveaux par le récapitulatif. Plus rien n'est cliquable.
  seedLang('fr');
  const doneLevels = { 'culture-gaming': { easy: true, medium: true } };
  assert.equal(isQuizFinished({}, 'culture-gaming'), false, 'aucun niveau terminé : pas « terminé »');
  assert.equal(isQuizFinished({ 'culture-gaming': { easy: true } }, 'culture-gaming'), false, 'un niveau sur trois : pas « terminé »');
  assert.equal(isQuizFinished(doneLevels, 'culture-gaming'), false, 'deux niveaux sur trois : pas « terminé »');
  assert.equal(isQuizFinished({ 'culture-gaming': { easy: true, medium: true, hard: true } }, 'culture-gaming'), true, 'les trois niveaux : « terminé »');
  assert.equal(isQuizFinished({ 'culture-gaming': { easy: true, medium: true, hard: true } }, 'rpg-cultes'), false, 'l’état « terminé » ne vaut que pour le quizz joué');

  // Un rendu par racine : `MemoryRouter` fige son entrée au montage, donc
  // changer de route passe par une nouvelle racine (comme ailleurs ici).
  let lockNode = null;
  let lockRoot = null;
  const renderLocked = async (entries) => {
    if (lockRoot) await act(async () => lockRoot.unmount());
    lockNode = document.createElement('div');
    document.body.append(lockNode);
    lockRoot = createRoot(lockNode);
    await act(async () => lockRoot.render(
      <LanguageProvider>
        <AuthProvider>
          <AchievementProvider>
            <MemoryRouter initialEntries={entries}>
              <Routes>
                <Route path="/quizz" element={<QuizzesPage />} />
                <Route path="/quizz/:slug" element={<QuizPage />} />
              </Routes>
            </MemoryRouter>
          </AchievementProvider>
        </AuthProvider>
      </LanguageProvider>,
    ));
    return lockNode;
  };

  // Un seul quizz terminé : sa carte est grisée et verrouillée, les autres
  // restent des liens jouables.
  QUIZ_LEVELS.forEach((level) => markLevelCompleted('culture-gaming', level));
  let grid = await renderLocked(['/quizz']);
  const lockedCards = grid.querySelectorAll('.quiz-card.is-finished');
  assert.equal(lockedCards.length, 1, 'un seul quizz terminé sur la grille');
  const lockedCard = lockedCards[0];
  assert.equal(lockedCard.tagName, 'DIV', 'la carte terminée n’est plus un lien');
  assert.equal(lockedCard.getAttribute('href'), null, 'la carte terminée n’a aucune destination');
  assert.ok(lockedCard.getAttribute('aria-label').includes(translations.fr.quiz.finished), 'l’étiquette accessible annonce le quizz terminé');
  assert.equal(grid.querySelectorAll('a.quiz-card').length, quizzes.length - 1, 'les autres quizz restent cliquables');
  const lockedFlag = lockedCard.querySelector('.quiz-finished-flag');
  assert.ok(lockedFlag, 'le drapeau « terminé » couvre la miniature');
  assert.ok(lockedFlag.textContent.includes(translations.fr.quiz.finished), 'le drapeau dit TERMINÉ');
  assert.equal(
    lockedCard.querySelector('.quiz-chip--levels').textContent.trim(),
    `✓ ${translations.fr.quiz.finished}`,
    'la pastille de progression devient le tampon « terminé »',
  );
  assert.ok(lockedCard.querySelector('.quiz-chip--levels.is-complete'), 'la pastille terminée porte l’état complet');
  assert.ok(!lockedCard.querySelector('.quiz-card-meta').textContent.includes('↗'), 'plus de flèche « ouvrir » sur la carte terminée');

  // Tous les quizz terminés : la bannière du jour est verrouillée elle aussi
  // (le test ne dépend pas du quizz choisi par le calendrier).
  quizzes.forEach((entry) => QUIZ_LEVELS.forEach((level) => markLevelCompleted(entry.slug, level)));
  grid = await renderLocked(['/quizz']);
  assert.equal(grid.querySelectorAll('.quiz-card.is-finished').length, quizzes.length, 'toute la grille passe en « terminé »');
  assert.equal(grid.querySelectorAll('a.quiz-card').length, 0, 'plus aucune carte cliquable');
  const lockedDaily = grid.querySelector('.quiz-daily');
  assert.ok(lockedDaily, 'la bannière du jour reste affichée');
  assert.equal(lockedDaily.tagName, 'DIV', 'le quizz du jour terminé n’est plus un lien');
  assert.ok(lockedDaily.classList.contains('is-finished'), 'la bannière porte l’état « terminé »');
  assert.ok(lockedDaily.querySelector('.quiz-finished-flag'), 'le drapeau couvre la miniature du jour');
  assert.ok(lockedDaily.querySelector('.quiz-finished-note'), 'la bannière rappelle que les trois niveaux sont faits');
  assert.ok(!lockedDaily.textContent.includes('⏳'), 'plus de compte à rebours sur la bannière terminée');
  assert.equal(
    grid.querySelector('.quiz-daily-hint').textContent,
    translations.fr.quiz.dailyDoneHint,
    'l’indice du jour annonce la fin des trois niveaux',
  );

  // Le lecteur : plus de sélecteur de niveaux ni de bouton pour lancer une
  // partie — le récapitulatif (trois niveaux cochés, réglage du son, sortie
  // vers la grille) prend toute la place.
  const lockedReader = await renderLocked([`/quizz/${slug}`]);
  const finishedPanel = lockedReader.querySelector('.quiz-player-finished');
  assert.ok(finishedPanel, 'le lecteur ouvre l’écran « terminé »');
  assert.equal(lockedReader.querySelector('.quiz-levels-title'), null, 'le sélecteur de niveaux a disparu');
  assert.equal(lockedReader.querySelectorAll('.quiz-level-play').length, 0, 'aucun bouton ne lance un niveau');
  assert.equal(lockedReader.querySelectorAll('.quiz-level.is-done').length, QUIZ_LEVELS.length, 'les trois niveaux sont cochés');
  assert.ok(finishedPanel.textContent.includes(translations.fr.quiz.finishedHint), 'l’écran explique pourquoi le quizz n’est plus proposé');
  assert.ok(finishedPanel.querySelector('.quiz-sound-toggle'), 'le réglage du son reste accessible sur l’écran terminé');
  assert.equal(
    finishedPanel.querySelector('.quiz-result-actions .quiz-cta--primary').getAttribute('href'),
    '/quizz',
    'la sortie de l’écran terminé mène à la grille des quizz',
  );
  await act(async () => lockRoot.unmount());
  lockRoot = null;

  for (const lang of ['fr', 'en', 'ar']) {
    seedLang(lang);
    const langNode = document.createElement('div');
    document.body.append(langNode);
    const langRoot = createRoot(langNode);
    await act(async () => langRoot.render(
      <LanguageProvider>
        <AuthProvider>
          <AchievementProvider>
            <MemoryRouter initialEntries={[`/quizz/${slug}`]}>
              <Routes>
                <Route path="/quizz" element={<QuizzesPage />} />
                <Route path="/quizz/:slug" element={<QuizPage />} />
              </Routes>
            </MemoryRouter>
          </AchievementProvider>
        </AuthProvider>
      </LanguageProvider>,
    ));
    const toggle = langNode.querySelector('.quiz-sound-toggle');
    assert.ok(toggle, `[${lang}] bouton son sur l’écran d’introduction`);
    assert.equal(toggle.getAttribute('aria-label'), translations[lang].quiz.soundMute, `[${lang}] libellé du bouton son traduit`);
    assert.equal(toggle.getAttribute('aria-pressed'), 'true', `[${lang}] son actif par défaut`);
    await act(async () => langRoot.unmount());

    const survivalLangNode = document.createElement('div');
    document.body.append(survivalLangNode);
    const survivalLangRoot = createRoot(survivalLangNode);
    await act(async () => survivalLangRoot.render(
      <LanguageProvider>
        <AuthProvider>
          <AchievementProvider>
            <MemoryRouter initialEntries={['/quizz/survival']}>
              <Routes>
                <Route path="/quizz/:slug" element={<QuizPage />} />
              </Routes>
            </MemoryRouter>
          </AchievementProvider>
        </AuthProvider>
      </LanguageProvider>,
    ));
    assert.equal(survivalLangNode.querySelector('.quiz-header h1')?.textContent, translations[lang].quiz.survival.title, `[${lang}] titre Survival traduit`);
    assert.ok(survivalLangNode.textContent.includes(translations[lang].quiz.survival.timeoutRule), `[${lang}] règle de timeout Survival traduite`);
    assert.equal(survivalLangNode.querySelector('.quiz-sound-toggle')?.getAttribute('aria-label'), translations[lang].quiz.survival.mute, `[${lang}] bouton son Survival traduit`);
    await act(async () => survivalLangRoot.unmount());
  }

  console.log('QUIZZ : trois niveaux de huit questions par quizz (aucun identifiant partagé) et multiplicateurs ×1/×1,5/×2 (points bornés 200/300/400 par question, convertis en XP joueur), déblocage en cascade (Facile → Confirmé → Expert), règles par niveau (20 s / 15 s / 10 s, cinq propositions et trois vies en expert, jokers 50/50 + gel du chrono hors expert, pièges experts jamais bons ni doublés, answered d’une partie arrêtée), parties 8/8 des niveaux Facile puis Confirmé + succès par niveau + confettis, résultat épuré (seuls « Niveau suivant → » vers le palier au-dessus et « Voir tous les quizz », rien après le dernier niveau), replay d’un niveau terminé via la grille = 0 point et rien d’écrit, défi démo, grille FR/EN/AR sans pastille de difficulté (progression n/3), records séparés par niveau + compte à rebours, classement par niveau (points d’abord, score/total en secondaire) + rang global au profil, partie tout faux, minuteur par niveau, verdict (gel, vert/rouge, révélations, bandeau, points), clavier 1–5 (+ D et F pour les jokers), combo + fanfare, sons (tick-tack qui accélère, verdicts, jokers — le 50/50 descend, le gel monte —, coupure), refonte du lecteur (CTA compacts, pastilles de progression, 50/50, gel du chrono, détail de partie) et niveau expert en conditions réelles (cinq propositions, une vie perdue par erreur, fin de partie à la troisième, « Plus de vies », base ×2 par bonne réponse, touche 5), et quizz TERMINÉ une fois ses trois niveaux faits (`isQuizFinished` : carte grisée sans lien ni flèche, drapeau ✓ TERMINÉ sur la miniature, bannière du jour verrouillée sans compte à rebours, écran « terminé » du lecteur à la place du sélecteur de niveaux).');
  console.log(`SURVIVAL : pool global de ${expectedPoolSize} questions, cycles mélangés sans doublon, trois vies et timeout pénalisé, record local, redémarrage complet, catégories et traductions FR/EN/AR.`);
}
