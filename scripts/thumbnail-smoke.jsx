/**
 * Entrée SSR utilisée par scripts/thumbnail-check.mjs.
 *
 * Rend l'accueil et la page Dossiers, puis remonte les URL de miniatures que
 * les pages demandent réellement. C'est ce qui relie la vérification au code
 * livré : les URL viennent du rendu de `src/pages/Home.jsx` et
 * `src/pages/Dossiers.jsx` (donc de `src/components/VideoThumb.jsx`), pas d'une
 * reconstruction du calcul.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Home from '../src/pages/Home';
import Dossiers from '../src/pages/Dossiers';
import QuizzesPage from '../src/quizzes/QuizzesPage';
import { quizzes } from '../src/quizzesData';

export const quizSlugs = quizzes.map(({ slug }) => slug);

function render(Page, path) {
  // LanguageProvider lit la langue active dans localStorage pendant le rendu.
  globalThis.window = { localStorage: { getItem: () => 'fr', setItem() {} } };
  return renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Page))
      )
    )
  );
}

function attr(tag, name) {
  const found = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return found ? found[1] : null;
}

function images(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
}

/** Vignettes des « épisodes à la une » de l'accueil : { src, alt }. */
export function homeThumbs() {
  return images(render(Home, '/'))
    .filter((tag) => (attr(tag, 'class') || '').includes('featured-dossier-thumb'))
    .map((tag) => ({ src: attr(tag, 'src'), alt: attr(tag, 'alt') }));
}

/** Toutes les vignettes YouTube rendues par la page Dossiers. */
export function dossierThumbs() {
  return images(render(Dossiers, '/dossiers')).map((tag) => attr(tag, 'src'));
}

/**
 * Miniatures de la page `/quizz` : `{ src, alt }` par image, dans l'ordre du
 * rendu — d'abord la bannière du quizz du jour, puis une carte par quizz de la
 * grille. Une carte de quizz a sa propre illustration
 * (`public/quizzes/<slug>.jpg`) : c'est cette URL-là qui doit être demandée, la
 * miniature YouTube de l'épisode ne servant que de repli.
 */
export function quizThumbs() {
  return images(render(QuizzesPage, '/quizz')).map((tag) => ({
    src: attr(tag, 'src'),
    alt: attr(tag, 'alt'),
  }));
}
