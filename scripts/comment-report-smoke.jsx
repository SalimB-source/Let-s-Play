// Point d'entrée de scripts/comment-report-check.mjs (compilé en SSR puis
// piloté dans JSDOM). Monte la section commentaires d'un article avec les
// fournisseurs de l'application : un visiteur, ou un compte connecté dont la
// session est lue dans le stockage local par le client Supabase. Les appels
// réseau sont interceptés par le script de vérification.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import Comments from '../src/components/Comments';

export { act };
export { translations } from '../src/i18n/translations';

export function createCommentsApp({ lang = 'fr', session = null } = {}) {
  return React.createElement(
    LanguageProvider,
    { lang },
    React.createElement(
      AuthProvider,
      { initialSession: session },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/actus/test-article'] },
        React.createElement(
          AchievementProvider,
          null,
          React.createElement(Comments, { articleId: 'test-article' }),
        ),
      ),
    ),
  );
}

// À appeler dans un `act`. Renvoie la racine React pour pouvoir la démonter.
export function mountComments(container, options) {
  const root = createRoot(container);
  root.render(createCommentsApp(options));
  return root;
}
