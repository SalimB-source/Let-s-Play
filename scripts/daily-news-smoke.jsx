// Rendu réel des éditions quotidiennes, via les routes publiques du site.
// L'édition du jour (18.10.2026) est importée nue — comme dans les pages du
// site — et les éditions précédentes le sont sous alias : le script de contrôle
// (scripts/daily-news-check.mjs) rejoue chaque édition, de l'ouverture du hub
// Actus jusqu'à la carte de tête de l'accueil, en passant par les archives.
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
import { dailyStories as cultureTechStories20261029 } from '../src/news/daily/2026-10-29-cinema-tech';
import { dailyStories as gamingStories20261029 } from '../src/news/daily/2026-10-29-gaming';
import { dailyStories } from '../src/news/daily/2026-10-18';
import { dailyStories as dailyStories20261011 } from '../src/news/daily/2026-10-11';
import { dailyStories as dailyStories20261014 } from '../src/news/daily/2026-10-14';
import { dailyStories as dailyStories20261015 } from '../src/news/daily/2026-10-15';
import { dailyStories as dailyStories20261016 } from '../src/news/daily/2026-10-16';
import { dailyStories as dailyStories20261017 } from '../src/news/daily/2026-10-17';
import { searchContent, searchIndex } from '../src/search/searchIndex';
import { autoSearchEntries } from '../src/lib/autoNews';

export { React, ArticleTrailer, searchContent, searchIndex, autoSearchEntries };

// Toutes les clés d'article des éditions quotidiennes, du plus récent au plus
// ancien — l'ordre de l'archive et des hubs en dépend.
export const editionKeys = {
  '2026-10-29': [...Object.keys(gamingStories20261029), ...Object.keys(cultureTechStories20261029)],
  '2026-10-18': Object.keys(dailyStories),
  '2026-10-17': Object.keys(dailyStories20261017),
  '2026-10-16': Object.keys(dailyStories20261016),
  '2026-10-15': Object.keys(dailyStories20261015),
  '2026-10-14': Object.keys(dailyStories20261014),
  '2026-10-11': Object.keys(dailyStories20261011),
};

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
  ...Object.values(editionKeys).flat().map((key) => {
    const prefix = key.startsWith('cinema/') ? 'cinema/' : key.startsWith('tech/') ? 'tech/' : '';
    return [`/news/${key}`, CurrentNews, `/news/${prefix}:slug`, { slug: key, ...(prefix ? { slugPrefix: prefix } : {}) }];
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
