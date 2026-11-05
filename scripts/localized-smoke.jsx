// Point d'entrée du contrôle `check:localized` : réexporte la couche de
// traduction d'articles telle qu'elle est empaquetée par le site, plus un
// rendu réel de la page article (pour vérifier ce que le visiteur VOIT).
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import CurrentNews from '../src/pages/CurrentNews';
import { loadArticleListings, loadArticleBody } from '../src/news/localized/load.js';
import Home from '../src/pages/Home';
import News from '../src/pages/News';
import AllNews from '../src/pages/AllNews';
import GamingNews from '../src/pages/GamingNews';
import CinemaNews from '../src/pages/CinemaNews';
import TechNews from '../src/pages/TechNews';

export { TRANSLATED_LANGS, loadArticleListings, loadArticleBody } from '../src/news/localized/load.js';
export { countLocalized, localizeListing, localizeStory, searchTextFor } from '../src/news/localized/index.js';
export { searchContent } from '../src/search/searchIndex.js';

/**
 * Rendu SSR de la page article. Les traductions sont chargées juste avant :
 * le rendu navigateur les demande dans un `useEffect`, que Node n'exécute pas.
 */
export async function renderArticle(lang, key) {
  await loadArticleListings(lang);
  await loadArticleBody(`/news/${key}`, lang);
  const prefix = key.startsWith('cinema/') ? 'cinema/' : key.startsWith('tech/') ? 'tech/' : '';
  return renderToString(
    <LanguageProvider lang={lang}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/news/${key}`]}>
          <Routes>
            <Route
              path={prefix ? `/news/${prefix}:slug` : '/news/:slug'}
              element={<CurrentNews {...(prefix ? { slugPrefix: prefix } : {})} />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}

// ------------------------------------------------------------------- pages
// Pages liste et hub : mêmes règles que l'article — lire en anglais ou en arabe
// ne doit laisser aucun mot-outil français dans le chrome de la page. Les
// cartes d'articles NON traduits gardent leur titre français (c'est assumé, le
// bandeau « Version française » le dit) : le contrôle les laisse de côté.
const PAGES = {
  '/': Home,
  '/news': News,
  '/news/articles': AllNews,
  '/news/gaming': GamingNews,
  '/news/cinema': CinemaNews,
  '/news/tech': TechNews,
};
export const PAGE_ROUTES = Object.keys(PAGES);

/** Rendu SSR d'une page liste, traductions chargées comme en navigation. */
export async function renderPage(lang, route) {
  await loadArticleListings(lang);
  const Page = PAGES[route];
  return renderToString(
    <LanguageProvider lang={lang}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes><Route path={route} element={<Page />} /></Routes>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}
