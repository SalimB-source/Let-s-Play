/**
 * SSR entry used by scripts/headlines-check.mjs.
 *
 * Renders every route of the site (pages manuelles, articles générés par le
 * robot actus, tests, dossiers, quizz, 404…) et renvoie le HTML complet, pour
 * que le script de contrôle puisse mesurer chaque titre réellement rendu.
 *
 * Même mécanique que scripts/i18n-smoke.jsx : le script .mjs compile ce fichier
 * avec `vite build --ssr`, puis appelle renderAll().
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Layout from '../src/components/Layout';
import Home from '../src/pages/Home';
import News from '../src/pages/News';
import Calendar from '../src/pages/Calendar';
import Physint from '../src/pages/Physint';
import MetroidRavenous from '../src/pages/MetroidRavenous';
import WarDogs from '../src/pages/WarDogs';
import ZeldaOcarina from '../src/pages/ZeldaOcarina';
import Onimusha from '../src/pages/Onimusha';
import OnimushaMillion from '../src/pages/OnimushaMillion';
import Gta6DualSense from '../src/pages/Gta6DualSense';
import Zelda40th from '../src/pages/Zelda40th';
import MonsterHunterWilds from '../src/pages/MonsterHunterWilds';
import BlizzardNews from '../src/pages/BlizzardNews';
import CurrentNews from '../src/pages/CurrentNews';
import Reviews from '../src/pages/Reviews';
import TestArticle from '../src/pages/TestArticle';
import Dossiers from '../src/pages/Dossiers';
import DossierSouls from '../src/pages/DossierSouls';
import DossierGoya from '../src/pages/DossierGoya';
import DossierComicCon from '../src/pages/DossierComicCon';
import DossierAwards from '../src/pages/DossierAwards';
import DossierPlayStation1 from '../src/pages/DossierPlayStation1';
import DossierGenerations from '../src/pages/DossierGenerations';
import DossierXbox360 from '../src/pages/DossierXbox360';
import DossierPlayStation2 from '../src/pages/DossierPlayStation2';
import Search from '../src/pages/Search';
import QuizzesPage from '../src/quizzes/QuizzesPage';
import QuizPage from '../src/quizzes/QuizPage';
import NotFound from '../src/pages/NotFound';
import Auth from '../src/pages/Auth';
import { gameTests } from '../src/reviewsData';
import { autoStories } from '../src/news/autoIndex';

const e = React.createElement;

// Slug des quizz (le h1 d'une partie est le titre du quiz, pas une constante).
const QUIZ_SLUGS = [
  'culture-gaming', 'consoles-retro', 'souls-fromsoftware', 'rpg-legends',
  'esport-competition', 'studios-legends', 'tech-hardware', 'cinema-pop-culture',
  'films-cultes', 'super-heros-cinema', 'series-cultes', 'ps4-generation',
  'nintendo-64', 'megadrive', 'pc-legends', 'fps-legends', 'horror-gaming',
  'fighting-legends', 'racing-legends', 'indie-gems', 'nintendo-legends',
  'open-world-legends', 'sci-fi-gaming', 'battle-royale', 'mmo-legends', 'survival',
];

// Les articles du robot actus et les actus « traduites » lisent leur slug dans
// l'URL : il faut donc une route paramétrée pour que useParams() réponde.
export const ROUTES = [
  ['/', Home],
  ['/news', News],
  ['/calendrier', Calendar],
  ['/news/physint', Physint],
  ['/news/metroid-ravenous', MetroidRavenous],
  ['/news/wardogs', WarDogs],
  ['/news/zelda-ocarina', ZeldaOcarina],
  ['/reviews/onimusha', Onimusha],
  ['/news/onimusha-million', OnimushaMillion],
  ['/news/gta6-dualsense', Gta6DualSense],
  ['/news/zelda-40th', Zelda40th],
  ['/news/monster-hunter-wilds', MonsterHunterWilds],
  ...['starcraft-fps', 'diablo-v', 'diablo-switch-2', 'diablo-netflix']
    .map((slug) => [`/news/${slug}`, BlizzardNews, '/news/:slug', { slug }]),
  ...[
    'persona-6-switch-2', 'last-of-us-ii-mod', 'cyberpunk-2077-battlenet',
    'rayman-legends-retold', 'fire-emblem-fortunes-weave', 'wolverine-exclu-ps5',
    'kingdom-hearts-4-coco', 'tokyo-game-show-2026-annulation',
    'eshop-switch-2-20-septembre', 'netmarble-tgs-2026',
    'control-resonant-24-septembre', 'sorties-24-septembre',
    'sony-licence-jeux-numeriques', 'ea-sports-fc-27-carriere-dynamique',
  ].map((slug) => [`/news/${slug}`, CurrentNews, '/news/:slug', { slug }]),
  ...Object.keys(autoStories).map((slug) => [`/news/${slug}`, CurrentNews, '/news/:slug', { slug }]),
  ['/reviews', Reviews],
  ...gameTests.filter((test) => !test.legacy).map((test) => [test.route, TestArticle, '/reviews/:slug']),
  ['/dossiers', Dossiers],
  ['/dossiers/pourquoi-les-souls', DossierSouls],
  ['/dossiers/goya-hicosoft', DossierGoya],
  ['/dossiers/games-comic-con-dzair', DossierComicCon],
  ['/dossiers/let-play-awards-2025', DossierAwards],
  ['/dossiers/heritage-playstation-1', DossierPlayStation1],
  ['/dossiers/choc-generations-gaming', DossierGenerations],
  ['/dossiers/20-ans-xbox-360', DossierXbox360],
  ['/dossiers/25-ans-playstation-2', DossierPlayStation2],
  ['/search', Search],
  ['/quizz', QuizzesPage],
  ...QUIZ_SLUGS.map((slug) => [`/quizz/${slug}`, QuizPage, '/quizz/:slug']),
  ['/auth', Auth],
  ['/unknown-page', NotFound],
];

export function renderAll() {
  const out = [];
  for (const [pathName, Page, pattern, props] of ROUTES) {
    try {
      const html = renderToString(
        e(LanguageProvider, { lang: 'fr' },
          e(AuthProvider, null,
            e(MemoryRouter, { initialEntries: [pathName] },
              e(Layout, null,
                e(Routes, null,
                  e(Route, { path: pattern || pathName, element: e(Page, props || null) }))))))
      );
      out.push({ path: pathName, ok: true, html });
    } catch (error) {
      out.push({ path: pathName, ok: false, error: error.message });
    }
  }
  return out;
}
