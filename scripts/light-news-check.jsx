/**
 * SSR entry used by scripts/light-news-check.mjs.
 *
 * Renders the Actus hub and its two feeds (/news, /news/gaming, /news/cinema)
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
import GamingNews from '../src/pages/GamingNews';
import CinemaNews from '../src/pages/CinemaNews';

const e = React.createElement;

export const PAGES = [
  ['/news', News],
  ['/news/gaming', GamingNews],
  ['/news/cinema', CinemaNews],
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
