/**
 * Entrée SSR utilisée par scripts/quiz-check.mjs — `npm run check:quiz`.
 *
 * Deux niveaux de contrôle, comme les autres vérifications du dépôt :
 *
 *   1. le moteur des quizz (mélange déterministe du quizz du jour, barème,
 *      série de jours, barème « fun » des points MULTIPLIÉ par le niveau)
 *      se comporte comme annoncé, et les huit quizz portent chacun leurs TROIS
 *      banques de questions (une par niveau) ;
 *   2. une partie complète est réellement jouée dans le navigateur simulé
 *      (jsdom) avec la vraie pile de l'application — LanguageProvider +
 *      AuthProvider + AchievementProvider — : huit bonnes réponses donnent
 *      un sans-faute (confettis inclus), le verdict de chaque réponse (gel,
 *      vert/rouge, points), les corrections s'affichent, et la progression
 *      des succès est écrite dans le stockage local ;
 *   3. le déblocage en cascade tient (Facile → Confirmé → Expert), les points
 *      du run deviennent de l'XP joueur, et la règle « un niveau rapporte une
 *      fois » aussi : rejouer un niveau déjà terminé ne rapporte plus rien
 *      (ni points, ni record de l'appareil, ni tentative serveur).
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
import { QUESTION_TIME, VERDICT_MS, DIFFICULTY_MULTIPLIER, bestDayRun, dailyQuizFor, gradeQuiz, pointsMultiplier, prepareQuiz, quizPoints, quizPointsFor } from '../src/quizzes/engine';
import { quizRunKey, quizLevelCompleted, totalXp } from '../src/achievements/engine';
import { formatBest, readLocalBest, readLocalBestRun, writeLocalBest } from '../src/quizzes/quizApi';
import {
  LEVELS_KEY,
  isLevelCompleted,
  isLevelUnlocked,
  markLevelCompleted,
  nextLevel,
} from '../src/quizzes/quizProgress';
import {
  playQuizAnswerSound,
  playQuizComboSound,
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

  const click = async (el) => { assert.ok(el, 'élément cliquable présent'); await act(async () => el.click()); };
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

  // Partie Confirmé : le palier s'enchaîne, et l'Expert s'ouvre à son tour.
  await click([...node.querySelectorAll('button')].find((el) => el.textContent.includes('Jouer ce niveau')));
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

  // REJOUER le niveau Confirmé (bouton « Rejouer » du résultat) : la partie se
  // relance sans passer par l'intro et ne rapporte PLUS RIEN — le verdict n'a
  // pas de points, le HUD reste à 0, le résultat affiche 0 PTS et rien n'est
  // réécrit (ni progression, ni record, ni XP).
  const beforeReplay = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  const xpBeforeReplay = totalXp(beforeReplay);
  const bestBefore = readLocalBestRun(slug, 'medium');
  await click([...node.querySelectorAll('button')].find((el) => el.textContent.includes('Rejouer')));
  assert.ok(node.querySelector('.quiz-question'), '« Rejouer » relance une partie du même niveau');
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
    assert.equal(gridNode.querySelectorAll('.quiz-card').length, quizzes.length, `[${lang}] douze cartes de quizz`);
    assert.ok(gridNode.querySelector('.quiz-daily'), `[${lang}] bannière quizz du jour`);
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

    // Chaque carte affiche sa miniature maison (aucune requête YouTube), et
    // la bannière du jour affiche celle du quizz mis en avant.
    const cardThumbs = [...gridNode.querySelectorAll('.quiz-card-media img')].map((img) => img.getAttribute('src'));
    assert.equal(cardThumbs.length, quizzes.length, `[${lang}] une miniature par carte`);
    assert.equal(new Set(cardThumbs).size, quizzes.length, `[${lang}] douze miniatures distinctes`);
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

  /* ------------------------- 7. Révision des erreurs ------------------------ */
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

  // Premier tour tout faux : à chaque question, un choix qui n'est pas le bon.
  const reviewQuestions = quizLevelQuestions(quiz, 'easy');
  await click(revNode.querySelector('[data-level="easy"] .quiz-level-play'));
  for (let step = 0; step < reviewQuestions.length; step += 1) {
    const prompt = revNode.querySelector('.quiz-question')?.textContent || '';
    const question = reviewQuestions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
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

  // « Rejouer mes erreurs » : les huit questions ratées, en tour de révision.
  await click([...revNode.querySelectorAll('button')].find((el) => el.textContent.includes('Rejouer mes erreurs')));
  assert.ok(revNode.textContent.includes('TOUR DE RÉVISION'), 'tour de révision annoncé');
  for (let step = 0; step < reviewQuestions.length; step += 1) {
    const prompt = revNode.querySelector('.quiz-question')?.textContent || '';
    const question = reviewQuestions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    const rightText = quizLabel(question.choices[question.answer], 'fr');
    await click([...revNode.querySelectorAll('.quiz-choice')].find((el) => el.textContent === rightText));
    await waitQuestionChange(revNode, prompt);
  }
  assert.ok(revNode.textContent.includes('8/8 bonnes réponses'), 'révision réussie : 8/8');

  // La révision est de l'entraînement : ni seconde partie, ni sans-faute crédité.
  const revStored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(revStored?.counters?.quizzes_completed, 1, 'la révision ne compte pas une seconde partie');
  assert.ok(!(revStored?.sets?.perfect_quizzes || []).includes(slug), 'le 8/8 de révision ne crédite pas « Sans faute »');
  const revLevels = JSON.parse(globalThis.window.localStorage.getItem(LEVELS_KEY) || '{}');
  assert.deepEqual(Object.keys(revLevels[slug] || {}), ['easy'], 'la révision ne débloque pas le niveau Confirmé');

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
  // Une question à la fois : chaque `act` laisse le décomte expirer (300 ms),
  // le verdict sonner, puis le gel (VERDICT_MS) faire avancer la question.
  for (let step = 0; step < quizLevelQuestions(quiz, 'easy').length; step += 1) {
    await act(async () => { await sleep(VERDICT_MS + 400); });
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

  // Raccourcis clavier : « Rejouer » lance une partie neuve, et la touche 1
  // valide le premier choix affiché. Une seconde touche pendant le gel est
  // ignorée — une seule question avance.
  await click([...soundNode.querySelectorAll('button')].find((el) => el.textContent.trim() === 'Rejouer'));
  assert.ok(soundNode.querySelector('.quiz-question'), 'la partie neuve est lancée');
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
  }

  console.log('QUIZZ : trois niveaux de huit questions par quizz (aucun identifiant partagé) et multiplicateurs ×1/×1,5/×2 (points bornés 200/300/400 par question, convertis en XP joueur), déblocage en cascade (Facile → Confirmé → Expert), parties 8/8 des niveaux Facile puis Confirmé + succès par niveau + confettis, replay d’un niveau terminé = 0 point et rien d’écrit, défi démo, grille FR/EN/AR sans pastille de difficulté (progression n/3), records séparés par niveau + compte à rebours, classement par niveau (points d’abord, score/total en secondaire) + rang global au profil, révision sans double comptage, minuteur 15 s, verdict (gel, vert/rouge, révélations, bandeau, points), clavier 1–4, combo + fanfare, sons (tick-tack qui accélère, verdicts, coupure).');
}
