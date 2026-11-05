/**
 * Entrée SSR du catalogue d'articles — utilisée par
 * `scripts/news-bot/translate-all.mjs` (`npm run news:translate`).
 *
 * Pourquoi passer par Vite : le catalogue de la rédaction vit dans
 * `src/pages/CurrentNews.jsx` (JSX + feuilles de style importées), que Node ne
 * sait pas charger tel quel. Le build SSR le transforme en module ordinaire ;
 * les articles du robot (`src/news/autoIndex.js`) et les éditions quotidiennes
 * (`src/news/daily/*.js`) sont du JS pur et pourraient être importés
 * directement — ils passent par le même chemin pour n'avoir qu'un catalogue.
 */
import { stories as manualStories } from '../../src/pages/CurrentNews.jsx';
import { autoStories } from '../../src/news/autoIndex.js';
import { dailyStories as stories20261104 } from '../../src/news/daily/2026-11-04.js';
import { dailyStories as stories20261103 } from '../../src/news/daily/2026-11-03.js';
import { dailyStories as stories20261102 } from '../../src/news/daily/2026-11-02.js';
import { dailyStories as edition20261101 } from '../../src/news/daily/2026-11-01.js';
import { dailyStories as stories20261029Gaming } from '../../src/news/daily/2026-10-29-gaming.js';
import { dailyStories as stories20261029Cinema } from '../../src/news/daily/2026-10-29-cinema-tech.js';
import { dailyStories as stories20261018 } from '../../src/news/daily/2026-10-18.js';
import { dailyStories as stories20261017 } from '../../src/news/daily/2026-10-17.js';
import { dailyStories as stories20261016 } from '../../src/news/daily/2026-10-16.js';
import { dailyStories as stories20261015 } from '../../src/news/daily/2026-10-15.js';
import { dailyStories as stories20261014 } from '../../src/news/daily/2026-10-14.js';
import { dailyStories as stories20261011 } from '../../src/news/daily/2026-10-11.js';

// Même fusion que `CurrentNews` : le robot d'abord, la rédaction ensuite (elle
// peut réécrire une actu du robot), puis les éditions quotidiennes.
const catalog = {
  ...autoStories,
  ...stories20261104,
  ...stories20261103,
  ...stories20261102,
  ...edition20261101,
  ...stories20261029Cinema,
  ...stories20261029Gaming,
  ...stories20261018,
  ...stories20261017,
  ...stories20261016,
  ...stories20261015,
  ...stories20261014,
  ...stories20261011,
  ...manualStories,
};

function sortKey(story) {
  const [day, month, year] = String(story.date || '01.01.1970').split('.').map(Number);
  return (year || 1970) * 10000 + (month || 1) * 100 + (day || 1);
}

/** Articles du plus récent au plus ancien, avec leur route. */
export const articles = Object.entries(catalog)
  .filter(([, story]) => story && story.title && story.dek)
  .map(([key, story]) => ({ key, route: `/news/${key}`, story }))
  .sort((a, b) => sortKey(b.story) - sortKey(a.story));
