/**
 * SSR entry used by scripts/light-news-check.mjs.
 *
 * Renders the Actus hub, its article archive and its three feeds
 * (/news, /news/articles, /news/gaming, /news/cinema, /news/tech)
 * as static HTML, for the light-theme audit to walk the real DOM with jsdom.
 *
 * Same mechanism as scripts/i18n-smoke.jsx : the .mjs compiles this file with
 * `vite build --ssr`, then calls renderPages().
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Layout from '../src/components/Layout';
import News from '../src/pages/News';
import AllNews from '../src/pages/AllNews';
import GamingNews from '../src/pages/GamingNews';
import CinemaNews from '../src/pages/CinemaNews';
import TechNews from '../src/pages/TechNews';

const e = React.createElement;

export const PAGES = [
  ['/news', News],
  ['/news/articles', AllNews],
  ['/news/gaming', GamingNews],
  ['/news/cinema', CinemaNews],
  ['/news/tech', TechNews],
];

export function renderPages(lang = 'fr') {
  return PAGES.map(([path, Page]) => ({
    path,
    html: renderToString(
      e(
        LanguageProvider,
        { lang },
        e(
          AuthProvider,
          null,
          e(
            MemoryRouter,
            { initialEntries: [path] },
            e(
              Layout,
              null,
              e(Routes, null, e(Route, { path, element: e(Page) })),
            ),
          ),
        ),
      ),
    ),
  }));
}
