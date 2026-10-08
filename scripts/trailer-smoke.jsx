/**
 * Entrée SSR utilisée par scripts/trailer-check.mjs.
 *
 * Rend chaque article des actus cinéma (`src/pages/CurrentNews.jsx`, route
 * `/news/cinema/:slug`) puis le hub cinéma (`/news/cinema`), et renvoie ce que
 * les pages affichent **vraiment** : lecteur intégré, sélecteur de miniatures,
 * lien YouTube, mentions d'illustration et d'absence de bande-annonce, pastilles
 * des cartes. Le contrôle porte donc sur le rendu livré, pas sur une
 * reconstruction du calcul — même mécanique que scripts/thumbnail-smoke.jsx.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import BlizzardNews from '../src/pages/BlizzardNews';
import CinemaNews from '../src/pages/CinemaNews';
import GamingNews from '../src/pages/GamingNews';
import TechNews from '../src/pages/TechNews';
import { youTubeThumbUrl } from '../src/lib/videoThumbnails';

// L'hôte des miniatures n'est pas écrit en dur ici : il est relu depuis la
// fabrique du site, seule source d'URL de miniature admise (`npm run
// check:thumbs` interdit de la recopier ailleurs).
const THUMB_HOST = new URL(youTubeThumbUrl('abc123defgh')).host;
import CurrentNews from '../src/pages/CurrentNews';

const e = React.createElement;

function render(pathName, Page, pattern, props) {
  // Le site est publié en français : la langue se passe au provider.
  return renderToString(
    e(LanguageProvider, { lang: 'fr' },
      e(AuthProvider, null,
        e(MemoryRouter, { initialEntries: [pathName] },
          e(Routes, null,
            e(Route, { path: pattern || pathName, element: e(Page, props || null) }))))));
}

// React échappe les attributs (`&` → `&amp;`) : une URL d'embed rendue se
// compare donc à la fabrique une fois les entités rétablies.
function attr(tag, name) {
  const found = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return found ? found[1].replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, '’').replace(/&quot;/g, '"') : null;
}

/**
 * Le texte d'un élément, débarrassé du balisage et des entités React.
 *
 * La fermeture est retrouvée en comptant les balises du même nom : les libellés
 * du bloc contiennent des éléments imbriqués (`<span class="live-dot" />` dans
 * la pastille, `<b>` dans l'en-tête de section), qu'un simple « jusqu'au premier
 * `</` » couperait en deux.
 */
function textOf(html, className) {
  const open = new RegExp(`<([a-z0-9]+)\\b[^>]*class="${className}"[^>]*>`).exec(html);
  if (!open) return null;
  const tag = open[1];
  const from = open.index + open[0].length;
  const walker = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  walker.lastIndex = from;
  let depth = 1;
  let end = html.length;
  let step;
  while ((step = walker.exec(html))) {
    if (step[1]) {
      depth -= 1;
      if (depth === 0) { end = step.index; break; }
    } else if (!step[0].endsWith('/>')) {
      depth += 1;
    }
  }
  return html.slice(from, end)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

/**
 * Rendu du bloc vidéo d’une actu cinéma, gaming ou tech.
 *
 * Les actus cinéma vivent dans `src/pages/CurrentNews.jsx` (clé préfixée
 * `cinema/`, route `/news/cinema/:slug`) ; la carte « série animée Diablo » est
 * servie par le gabarit Blizzard (`src/pages/BlizzardNews.jsx`, route
 * `/news/:slug`) — les deux rendent le même bloc.
 *
 * @param {string} key clé d'article (ex. `cinema/werwulf-trailer-eggers`)
 */
export function renderArticle(key) {
  const prefix = key.startsWith('cinema/') ? 'cinema/' : key.startsWith('tech/') ? 'tech/' : '';
  const slug = key.slice(prefix.length);
  const blizzard = ['starcraft-fps', 'diablo-v', 'diablo-switch-2', 'diablo-netflix'].includes(key);
  const html = render(
    `/news/${prefix}${slug}`,
    blizzard ? BlizzardNews : CurrentNews,
    `/news/${prefix}:slug`,
    { slug: key }
  );
  const found = /<figure class="article-trailer[\s\S]*?<\/figure>/.exec(html);
  const block = found ? found[0] : '';
  const tags = (re) => [...block.matchAll(re)].map((match) => match[0]);

  return {
    key,
    // L'article affiche-t-il un bloc bande-annonce (vidéo ou mention) ?
    rendered: Boolean(found),
    pending: Boolean(/article-trailer--pending/.test(block)),
    heading: textOf(block, 'section-label'),
    players: tags(/<iframe\b[^>]*>/g).map((tag) => attr(tag, 'src')),
    titles: tags(/<iframe\b[^>]*>/g).map((tag) => attr(tag, 'title')),
    watchLinks: tags(/<a\b[^>]*>/g)
      .map((tag) => attr(tag, 'href'))
      .filter((href) => href && href.startsWith('https://www.youtube.com/watch')),
    thumbs: tags(/<img\b[^>]*>/g)
      .map((tag) => attr(tag, 'src'))
      .filter((src) => src && src.includes(THUMB_HOST)),
    choices: tags(/<button\b[^>]*class="article-trailer-choice[^"]*"[^>]*>/g).length,
    badge: textOf(block, 'article-trailer-badge'),
    title: textOf(block, 'article-trailer-title'),
    channel: textOf(block, 'article-trailer-channel'),
    note: textOf(block, 'article-trailer-note'),
    pendingText: textOf(block, 'article-trailer-pending'),
    credit: textOf(block, 'article-trailer-credit'),
  };
}

/**
 * Cartes d’un hub : `{ to, flag }`, dans l’ordre d’affichage (l’actu à la
 * une d'abord, puis la grille). `flag` est le libellé de la pastille
 * « BANDE-ANNONCE » posée sur la vignette, ou null quand la carte n'en a pas.
 */
export function renderHub(category = 'cinema') {
  const Page = { cinema: CinemaNews, gaming: GamingNews, tech: TechNews }[category];
  if (!Page) throw new Error(`Univers inconnu : ${category}`);
  const html = render(`/news/${category}`, Page, `/news/${category}`);
  // La une est désormais une bannière <article> (vidéo + lien texte) au-dessus
  // de la grille : on la compte comme première carte du flux.
  const featured = [...html.matchAll(/<article\b[^>]*class="[^"]*news-featured-story[^"]*"[^>]*>/g)]
    .map((match) => {
      const end = html.indexOf('</article>', match.index);
      const block = html.slice(match.index, end < 0 ? html.length : end);
      const link = /<a\b[^>]*class="[^"]*daily-news-copy[^"]*"[^>]*>/.exec(block);
      return link ? { tag: link[0], index: match.index } : null;
    })
    .filter(Boolean);
  const articles = [...html.matchAll(/<a\b[^>]*class="[^"]*news-carousel-card[^"]*"[^>]*>/g)]
    .map((match) => ({ tag: match[0], index: match.index }));
  const cards = [...featured, ...articles].sort((a, b) => a.index - b.index);

  return cards.map((card, i) => {
    const slice = html.slice(card.index, i + 1 < cards.length ? cards[i + 1].index : html.length);
    const pill = /<span\b[^>]*class="news-trailer-flag"[^>]*>[\s\S]*?<\/span>/.exec(slice);
    return {
      to: attr(card.tag, 'href'),
      flag: pill ? textOf(pill[0], 'news-trailer-flag') : null,
      // L'annonce au survol dit de quelle vidéo officielle il s'agit.
      flagTitle: pill ? attr(pill[0], 'title') : null,
    };
  });
}
