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
import QuizzesPage from '../src/quizzes/QuizzesPage';
import QuizPage from '../src/quizzes/QuizPage';
import { quizzes, quizBySlug, quizLabel } from '../src/quizzesData';
import { bestDayRun, dailyQuizFor, gradeQuiz, prepareQuiz } from '../src/quizzes/engine';

const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;

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

  // Écran d'intro : titre du quizz + bouton Commencer.
  assert.ok(node.textContent.includes(quizLabel(quiz.labels, 'fr').title));
  await click([...node.querySelectorAll('button')].find((el) => el.textContent.includes('Commencer')));

  // Huit questions : à chaque fois, cliquer la bonne réponse (libellé FR
  // original) lue dans les données — l'ordre des questions et des choix est
  // mélangé par le moteur, le texte affiché permet de la reconnaître.
  for (let step = 0; step < quiz.questions.length; step += 1) {
    const prompt = node.querySelector('.quiz-question')?.textContent || '';
    const question = quiz.questions.find((entry) => quizLabel(entry.q, 'fr') === prompt);
    assert.ok(question, `la question affichée existe dans les données (${prompt.slice(0, 40)}…)`);
    const rightText = quizLabel(question.choices[question.answer], 'fr');
    await click([...node.querySelectorAll('.quiz-choice')].find((el) => el.textContent === rightText));
  }

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

  await act(async () => root.unmount());

  /* ------------------------------------- 3. Page grille (trois langues) ---- */
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
    assert.equal(gridNode.querySelectorAll('.quiz-card').length, quizzes.length, `[${lang}] six cartes de quizz`);
    assert.ok(gridNode.querySelector('.quiz-daily'), `[${lang}] bannière quizz du jour`);
    await act(async () => gridRoot.unmount());
  }

  console.log('QUIZZ : moteur (jour, mélange, barème, série), partie complète 8/8 + succès crédités, grille en FR/EN/AR.');
}
