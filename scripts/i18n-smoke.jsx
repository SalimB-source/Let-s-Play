/**
 * SSR entry used by scripts/i18n-smoke.mjs.
 *
 * Renders every route in every language and reports any page that throws.
 * This is the guard against the class of bug that blanked the News page: a
 * translation key added to one language only (see commit ff6d390).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Layout from '../src/components/Layout';
import Home from '../src/pages/Home';
import News from '../src/pages/News';
import Physint from '../src/pages/Physint';
import MetroidRavenous from '../src/pages/MetroidRavenous';
import WarDogs from '../src/pages/WarDogs';
import ZeldaOcarina from '../src/pages/ZeldaOcarina';
import Onimusha from '../src/pages/Onimusha';
import OnimushaMillion from '../src/pages/OnimushaMillion';
import Reviews from '../src/pages/Reviews';
import TestArticle from '../src/pages/TestArticle';
import Dossiers from '../src/pages/Dossiers';
import NotFound from '../src/pages/NotFound';
import { AuthProvider } from '../src/auth/AuthContext';
import { translations } from '../src/i18n/translations';
import { gameTests } from '../src/reviewsData';

export { translations };

export const ROUTES = [
  ['/', Home],
  ['/news', News],
  ['/news/physint', Physint],
  ['/news/metroid-ravenous', MetroidRavenous],
  ['/news/wardogs', WarDogs],
  ['/news/zelda-ocarina', ZeldaOcarina],
  ['/reviews/onimusha', Onimusha],
  ['/news/onimusha-million', OnimushaMillion],
  ['/reviews', Reviews],
  ...gameTests.filter((test) => !test.legacy).map((test) => [test.route, TestArticle]),
  ['/dossiers', Dossiers],
  ['/unknown-page', NotFound],
];

export const LANGS = Object.keys(translations);

export function renderAll(lang) {
  // LanguageProvider reads the active language from localStorage during render.
  globalThis.window = { localStorage: { getItem: () => lang, setItem() {} } };

  return ROUTES.map(([path, Page]) => {
    try {
      const html = renderToString(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(
            AuthProvider,
            null,
            React.createElement(
              MemoryRouter,
              { initialEntries: [path] },
              React.createElement(
                Layout,
                null,
                React.createElement(
                  Routes,
                  null,
                  React.createElement(Route, { path, element: React.createElement(Page) })
                )
              )
            )
          )
        )
      );
      return { lang, path, ok: true, length: html.length };
    } catch (error) {
      return { lang, path, ok: false, error: error.message };
    }
  });
}
