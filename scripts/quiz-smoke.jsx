/**
 * Entrée SSR utilisée par scripts/quiz-check.mjs — `npm run check:quiz`.
 *
 * Deux niveaux de contrôle, comme les autres vérifications du dépôt :
 *
 *   1. le moteur des quizz (mélange déterministe du quizz du jour, barème,
 *      série de jours, barème « fun » des points) se comporte comme annoncé ;
 *   2. une partie complète est réellement jouée dans le navigateur simulé
 *      (jsdom) avec la vraie pile de l'application — LanguageProvider +
 *      AuthProvider + AchievementProvider — : huit bonnes réponses donnent
 *      un sans-faute (confettis inclus), le verdict de chaque réponse (gel,
 *      vert/rouge, points), les corrections s'affichent, et la progression
 *      des succès est écrite dans le stockage local.
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
import { baseUrl, quizThumbUrl, quizzes, quizBySlug, quizLabel } from '../src/quizzesData';
import { QUESTION_TIME, VERDICT_MS, bestDayRun, dailyQuizFor, gradeQuiz, prepareQuiz, quizPoints } from '../src/quizzes/engine';
import { formatBest, readLocalBest, writeLocalBest } from '../src/quizzes/quizApi';
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
    const prepared = prepareQuiz(quiz, 42);
    const again = prepareQuiz(quiz, 42);
    assert.deepEqual(
      prepared.questions.map((question) => question.choices.map((choice) => choice.label.fr)),
      again.questions.map((question) => question.choices.map((choice) => choice.label.fr)),
      `${quiz.slug} : même graine, même mélange`,
    );
    for (const question of prepared.questions) {
      assert.equal(question.choices.filter((choice) => choice.correct).length, 1, `${quiz.slug} : une seule bonne réponse par question`);
    }
    // Toutes bonnes réponses quel que soit le mélange : 100 %.
    const perfectAnswers = {};
    for (const question of prepared.questions) {
      perfectAnswers[question.id] = question.choices.find((choice) => choice.correct).id;
    }
    assert.equal(gradeQuiz(prepared, perfectAnswers).perfect, true, `${quiz.slug} : sans-faute détecté`);
    assert.equal(gradeQuiz(prepared, {}).correct, 0, `${quiz.slug} : aucune réponse, aucun point`);
  }

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

  // Joue une partie parfaite : bouton Commencer puis, à chaque question
  // (ordre mélangé par le moteur), la bonne réponse reconnue à son libellé FR.
  const playPerfect = async (container, game) => {
    await click([...container.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));
    for (let step = 0; step < game.questions.length; step += 1) {
      const prompt = container.querySelector('.quiz-question')?.textContent || '';
      const question = game.questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
      assert.ok(question, `la question affichée existe dans les données (${prompt.slice(0, 40)}…)`);
      const rightText = quizLabel(question.choices[question.answer], 'fr');
      await click([...container.querySelectorAll('.quiz-choice')].find((el) => el.textContent === rightText));
      await waitQuestionChange(container, prompt);
    }
  };

  // Écran d'intro : titre du quizz + bouton Commencer.
  assert.ok(node.textContent.includes(quizLabel(quiz.labels, 'fr').title));
  await playPerfect(node, quiz);

  // Résultat : sans-faute 8/8, palier légende, huit corrections.
  assert.ok(node.querySelector('.quiz-result'), 'écran de résultat affiché');
  assert.ok(node.textContent.includes('8/8 bonnes réponses'), 'score 8/8 affiché');
  assert.ok(node.textContent.includes('SANS FAUTE'), 'sans-faute annoncé');
  assert.ok(node.textContent.includes('LÉGENDE'), 'palier légende');
  assert.equal(node.querySelectorAll('.quiz-fix').length, quiz.questions.length);
  assert.equal(node.querySelectorAll('.quiz-fix.is-right').length, quiz.questions.length);

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
  assert.ok((stored.sets?.quizzes_played || []).includes(slug), 'quizz distinct crédité');
  assert.ok((stored.sets?.perfect_quizzes || []).includes(slug), 'sans-faute crédité');
  assert.equal(stored.counters?.quizzes_completed, 1, 'compteur de parties à 1');
  assert.ok((stored.unlocked || {})['first-quiz'], 'succès « Premier quizz » débloqué');
  assert.ok((stored.unlocked || {})['perfect-score'], 'succès « Sans faute » débloqué');

  // Classement sans backend : message d'explication + meilleure partie locale
  // (points + bonnes réponses, les points faisant le classement).
  assert.ok(node.textContent.includes('CLASSEMENT'), 'section classement présente');
  assert.ok(node.textContent.includes('Connecte-toi avec un compte joueur'), 'repli hors-ligne expliqué');
  assert.ok(node.textContent.includes('Meilleur score sur cet appareil'), 'meilleur score local affiché');
  assert.ok(node.textContent.includes('8/8'), 'meilleur score local à 8/8');
  assert.ok(/8\/8 · \d+ PTS/.test(node.textContent), 'meilleur score local : points + bonnes réponses');

  // Écran de résultat épuré : « Niveau suivant » (flèche vers la droite, vers
  // le quizz d'après dans la grille) et « Voir tous les quizz » — plus aucun
  // autre bouton (Rejouer, Rejouer mes erreurs, dossier lié).
  const resultLinks = [...node.querySelectorAll('.quiz-result-actions a')];
  assert.equal(resultLinks.length, 2, 'seulement deux boutons sur l’écran de résultat');
  const nextLevelLink = resultLinks.find((el) => el.getAttribute('href') === '/quizz/consoles-retro');
  assert.ok(nextLevelLink, '« Niveau suivant » mène au quizz d’après dans la grille (consoles-retro)');
  assert.ok(
    nextLevelLink.textContent.includes('Niveau suivant') && nextLevelLink.textContent.includes('→'),
    '« Niveau suivant » avec sa flèche vers la droite',
  );
  assert.ok(
    resultLinks.some((el) => el.getAttribute('href') === '/quizz' && el.textContent.includes('Voir tous les quizz')),
    'bouton « Voir tous les quizz »',
  );
  assert.equal(node.querySelectorAll('.quiz-result-actions button').length, 0, 'aucun autre bouton d’action');
  assert.ok(!node.textContent.includes('Rejouer'), 'ni « Rejouer » ni « Rejouer mes erreurs »');
  assert.ok(!node.textContent.includes('Lire le dossier lié'), 'le lien vers le dossier lié est retiré du résultat');

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

  // Session démo : partie parfaite puis défi envoyé au premier ami listé.
  await playPerfect(demoNode, quiz);
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
    assert.equal(gridNode.querySelectorAll('.quiz-card').length, quizzes.length, `[${lang}] huit cartes de quizz`);
    assert.ok(gridNode.querySelector('.quiz-daily'), `[${lang}] bannière quizz du jour`);

    // Chaque carte affiche sa miniature maison (aucune requête YouTube), et
    // la bannière du jour affiche celle du quizz mis en avant.
    const cardThumbs = [...gridNode.querySelectorAll('.quiz-card-media img')].map((img) => img.getAttribute('src'));
    assert.equal(cardThumbs.length, quizzes.length, `[${lang}] une miniature par carte`);
    assert.equal(new Set(cardThumbs).size, quizzes.length, `[${lang}] huit miniatures distinctes`);
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
  writeLocalBest('culture-gaming', 8, 8, 1250);
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
  await act(async () => bestRoot.unmount());

  /* ---------------- 6. Classement par points + rang global profil ----------- */
  // Record de l'appareil : la meilleure partie est celle qui marque le plus
  // de points (à égalité, le plus de bonnes réponses l'emporte) — la règle du
  // classement, pas le nombre de bonnes réponses.
  writeLocalBest('culture-gaming', 8, 8, 900);
  writeLocalBest('culture-gaming', 6, 8, 1300);
  let deviceBest = readLocalBest('culture-gaming');
  assert.deepEqual(
    { score: deviceBest.score, points: deviceBest.points },
    { score: 6, points: 1300 },
    'le record suit les points, pas les bonnes réponses (6/8 à 1300 pts bat 8/8 à 900)',
  );
  writeLocalBest('culture-gaming', 7, 8, 1300);
  deviceBest = readLocalBest('culture-gaming');
  assert.equal(deviceBest.score, 7, 'à points égaux, le plus de bonnes réponses dépasse le record');
  writeLocalBest('culture-gaming', 8, 8, 1299);
  deviceBest = readLocalBest('culture-gaming');
  assert.equal(deviceBest.points, 1300, 'moins de points ne remplace pas le record');
  assert.equal(formatBest(deviceBest), '7/8 · 1300 PTS', 'le libellé du record affiche points + bonnes réponses');
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

  // Premier tour tout faux : à chaque question, un choix qui n'est pas le bon.
  await click([...revNode.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));
  for (let step = 0; step < quiz.questions.length; step += 1) {
    const prompt = revNode.querySelector('.quiz-question')?.textContent || '';
    const question = quiz.questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
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

  // Le résultat reste épuré même sans bonne réponse : « Niveau suivant » et
  // « Voir tous les quizz » — le tour de révision a disparu avec son bouton.
  const revLinks = [...revNode.querySelectorAll('.quiz-result-actions a')];
  assert.equal(revLinks.length, 2, '[tout faux] seulement deux boutons sur l’écran de résultat');
  assert.ok(
    revLinks.some((el) => el.getAttribute('href') === '/quizz/consoles-retro'),
    '[tout faux] « Niveau suivant » proposé même sans bonne réponse',
  );

  // Une seule partie créditée, aucun sans-faute.
  const revStored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(revStored?.counters?.quizzes_completed, 1, 'une seule partie comptée');
  assert.ok(!(revStored?.sets?.perfect_quizzes || []).includes(slug), 'aucun sans-faute crédité');

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

  await click([...timerNode.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));
  assert.ok(timerNode.querySelector('.quiz-timer'), 'le minuteur est affiché pendant la partie');
  // Une question à la fois : chaque `act` laisse le décomte expirer (300 ms),
  // le verdict sonner, puis le gel (VERDICT_MS) faire avancer la question.
  for (let step = 0; step < quiz.questions.length; step += 1) {
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
  await click([...soundNode.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));
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
    const question = quiz.questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
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
  QUESTION_TIME.seconds = 0.4;
  await answerOnce(soundNode, false);
  const wrongNotes = audio.notes.filter((note) => note.type === 'sawtooth');
  assert.equal(wrongNotes.length, 2, 'mauvaise réponse : deux notes');
  assert.ok(wrongNotes[0].frequency > wrongNotes[1].frequency, 'mauvaise réponse : la descente descend');
  assert.ok(soundNode.textContent.includes('✗ 1'), 'compteur de mauvaises réponses à 1');
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

  // Raccourcis clavier : « Niveau suivant » navigue au quizz d'après (retour
  // à son écran d'introduction), « Commencer » lance une partie neuve, et la
  // touche 1 valide le premier choix affiché. Une seconde touche pendant le
  // gel est ignorée — une seule question avance.
  const soundNext = [...soundNode.querySelectorAll('a')].find((el) => el.getAttribute('href') === '/quizz/consoles-retro');
  await click(soundNext);
  assert.ok(soundNode.querySelector('.quiz-player-intro'), 'le quizz suivant affiche son écran d’introduction');
  await click([...soundNode.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));
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

  console.log('QUIZZ : moteur (+ points bornés qui font le classement), partie 8/8 + succès + confettis, défi démo, grille FR/EN/AR, record par points + compte à rebours, classement par points (points d’abord, score/total en secondaire) + rang global au profil, résultat épuré (niveau suivant vers la grille + voir tous les quizz), partie tout faux, minuteur 15 s, verdict (gel, vert/rouge, révélations, bandeau, points), clavier 1–4, combo + fanfare, sons (tick-tack qui accélère, verdicts, coupure).');
}
