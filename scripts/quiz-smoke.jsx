/**
 * Entrée SSR utilisée par scripts/quiz-check.mjs — `npm run check:quiz`.
 *
 * Deux niveaux de contrôle, comme les autres vérifications du dépôt :
 *
 *   1. le moteur des quizz (mélange déterministe du quizz du jour, barème,
 *      série de jours) se comporte comme annoncé ;
 *   2. une partie complète est réellement jouée dans le navigateur simulé
 *      (jsdom) avec la vraie pile de l'application — LanguageProvider +
 *      AuthProvider + AchievementProvider — : huit bonnes réponses donnent
 *      un sans-faute, les corrections s'affichent, et la progression des
 *      succès est écrite dans le stockage local.
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
import QuizzesPage from '../src/quizzes/QuizzesPage';
import QuizPage from '../src/quizzes/QuizPage';
import { quizzes, quizBySlug, quizLabel } from '../src/quizzesData';
import { bestDayRun, dailyQuizFor, gradeQuiz, prepareQuiz } from '../src/quizzes/engine';
import { writeLocalBest } from '../src/quizzes/quizApi';
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

  // Classement sans backend : message d'explication + meilleur score local.
  assert.ok(node.textContent.includes('CLASSEMENT'), 'section classement présente');
  assert.ok(node.textContent.includes('Connecte-toi avec un compte joueur'), 'repli hors-ligne expliqué');
  assert.ok(node.textContent.includes('Meilleur score sur cet appareil'), 'meilleur score local affiché');
  assert.ok(node.textContent.includes('8/8'), 'meilleur score local à 8/8');

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
    await act(async () => gridRoot.unmount());
  }

  /* ------------------ 5. Record + compte à rebours sur la grille ------------ */
  // Le localStorage garde la langue FR et le record écrit par la partie de
  // l'étape 2 n'existe plus (vidé par seedLang) : on le repose comme le ferait
  // une partie, puis la grille doit montrer le badge et le décompte.
  globalThis.window.localStorage.setItem('letsplay-lang', 'fr');
  writeLocalBest('culture-gaming', 8, 8);
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
    [...bestNode.querySelectorAll('.quiz-card-best')].some((el) => el.textContent.includes('8/8')),
    'record 8/8 affiché sur la carte du quizz joué',
  );
  await act(async () => bestRoot.unmount());

  /* ------------------------- 6. Révision des erreurs ------------------------ */
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
  }
  assert.ok(revNode.textContent.includes('0/8 bonnes réponses'), 'premier tour tout faux : 0/8');

  // « Rejouer mes erreurs » : les huit questions ratées, en tour de révision.
  await click([...revNode.querySelectorAll('button')].find((el) => el.textContent.includes('Rejouer mes erreurs')));
  assert.ok(revNode.textContent.includes('TOUR DE RÉVISION'), 'tour de révision annoncé');
  for (let step = 0; step < quiz.questions.length; step += 1) {
    const prompt = revNode.querySelector('.quiz-question')?.textContent || '';
    const question = quiz.questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    const rightText = quizLabel(question.choices[question.answer], 'fr');
    await click([...revNode.querySelectorAll('.quiz-choice')].find((el) => el.textContent === rightText));
  }
  assert.ok(revNode.textContent.includes('8/8 bonnes réponses'), 'révision réussie : 8/8');

  // La révision est de l'entraînement : ni seconde partie, ni sans-faute crédité.
  const revStored = JSON.parse(globalThis.window.localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  assert.equal(revStored?.counters?.quizzes_completed, 1, 'la révision ne compte pas une seconde partie');
  assert.ok(!(revStored?.sets?.perfect_quizzes || []).includes(slug), 'le 8/8 de révision ne crédite pas « Sans faute »');

  await act(async () => revRoot.unmount());

  console.log('QUIZZ : moteur, partie 8/8 + succès, défi démo, grille FR/EN/AR, record + compte à rebours, révision des erreurs sans double comptage.');
}
