// Rendu réel de l’édition du 08.10.2026, via les routes publiques du site.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Home from '../src/pages/Home';
import News from '../src/pages/News';
import AllNews from '../src/pages/AllNews';
import GamingNews from '../src/pages/GamingNews';
import CinemaNews from '../src/pages/CinemaNews';
import TechNews from '../src/pages/TechNews';
import CurrentNews from '../src/pages/CurrentNews';
import ArticleTrailer from '../src/components/ArticleTrailer';
import { dailyStories } from '../src/news/daily/2026-10-08';
import { searchContent, searchIndex } from '../src/search/searchIndex';
import { autoSearchEntries } from '../src/lib/autoNews';

export { React, ArticleTrailer, searchContent, searchIndex, autoSearchEntries };

export function NewsArchiveFlow() {
  return (
    <LanguageProvider lang="fr">
      <MemoryRouter initialEntries={['/news']}>
        <Routes>
          <Route path="/news" element={<News />} />
          <Route path="/news/articles" element={<AllNews />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
}

const pages = [
  ['/', Home],
  ['/news', News],
  ['/news/articles', AllNews],
  ['/news/gaming', GamingNews],
  ['/news/cinema', CinemaNews],
  ['/news/tech', TechNews],
  ...Object.keys(dailyStories).map((key) => {
    const prefix = key.startsWith('cinema/') ? 'cinema/' : key.startsWith('tech/') ? 'tech/' : '';
    return [`/news/${key}`, CurrentNews, `/news/${prefix}:slug`, prefix ? { slugPrefix: prefix } : {}];
  }),
];

export function renderPages(lang = 'fr') {
  return pages.map(([route, Page, pattern = route, props = {}]) => ({
    route,
    html: renderToString(
      <LanguageProvider lang={lang}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes><Route path={pattern} element={<Page {...props} />} /></Routes>
          </MemoryRouter>
        </AuthProvider>
      </LanguageProvider>,
    ),
  }));
}
