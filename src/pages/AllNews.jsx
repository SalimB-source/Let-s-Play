import { dailyNewsListing as news20261105 } from '../news/daily/2026-11-05';
import { dailyNewsListing as news20261104 } from '../news/daily/2026-11-04';
import { dailyNewsListing as news20261103 } from '../news/daily/2026-11-03';
import { dailyNewsListing as edition20261101 } from '../news/daily/2026-11-01';
import { dailyNewsListing as news20261102 } from '../news/daily/2026-11-02';
import React, { useMemo } from 'react';
import '../news-view-toggle.css';
import '../news-carousel.css';
import '../news-article.css';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useLocalizedListings } from '../news/localized/useLocalizedArticle.js';
import { searchIndex } from '../search/searchIndex';
import { autoSearchEntries, autoNewsListing } from '../lib/autoNews';
import { dailyNewsListing as cultureTechNews20261029 } from '../news/daily/2026-10-29-cinema-tech';
import { dailyNewsListing as gamingNews20261029 } from '../news/daily/2026-10-29-gaming';
import { dailyNewsListing } from '../news/daily/2026-10-18';
import { dailyNewsListing as dailyNewsListing20261011 } from '../news/daily/2026-10-11';
import { dailyNewsListing as dailyNewsListing20261014 } from '../news/daily/2026-10-14';
import { dailyNewsListing as dailyNewsListing20261015 } from '../news/daily/2026-10-15';
import { dailyNewsListing as dailyNewsListing20261016 } from '../news/daily/2026-10-16';
import { dailyNewsListing as dailyNewsListing20261017 } from '../news/daily/2026-10-17';
import { Arrow } from '../components/Arrow';
import NewsCard from '../components/NewsCard';

// Catalogues existants de la rédaction et du robot, sans doublons de routes.
export const allNewsArticles = [...new Map(
  [...searchIndex, ...autoSearchEntries].filter((item) => item.type === 'news').map((item) => [item.route, item]),
).values()];

// Réutiliser les données éditoriales lorsqu’elles sont disponibles : mêmes
// titres, badges, dates/sources, miniatures et sentiments que les cartes Actus.
const newsListingByRoute = new Map(
  [...news20261105, ...news20261104, ...news20261103, ...news20261102, ...edition20261101, ...autoNewsListing, ...dailyNewsListing20261011, ...dailyNewsListing20261014, ...dailyNewsListing20261015, ...dailyNewsListing20261016, ...dailyNewsListing20261017, ...dailyNewsListing, ...gamingNews20261029, ...cultureTechNews20261029].map((story) => [story.to, story]),
);

const COPY = {
  fr: { back: 'Retour aux actus', label: 'ACTUALITÉS · ARCHIVES', title: 'TOUS LES', accent: 'ARTICLES.', count: 'articles', read: 'Lire l’article', gaming: 'Gaming', cinema: 'Cinéma & séries', tech: 'Tech' },
  en: { back: 'Back to news', label: 'NEWS · ARCHIVE', title: 'ALL THE', accent: 'ARTICLES.', count: 'articles', read: 'Read article', gaming: 'Gaming', cinema: 'Cinema & series', tech: 'Tech' },
  ar: { back: 'العودة إلى الأخبار', label: 'الأخبار · الأرشيف', title: 'جميع', accent: 'المقالات.', count: 'مقالات', read: 'اقرأ المقال', gaming: 'الألعاب', cinema: 'السينما والمسلسلات', tech: 'التقنية' },
};

export default function AllNews() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.fr;
  // Archive : mêmes cartes que le hub (données éditoriales quand elles
  // existent), puis titre et chapô dans la langue de lecture quand la
  // traduction est disponible. `useMemo` garde la liste stable entre deux
  // rendus — la grille ne se reconstruit pas à chaque frappe.
  const listing = useMemo(() => allNewsArticles.map((article) => ({
    to: article.route,
    image: article.image,
    alt: article.title,
    title: article.title,
    excerpt: article.description,
    ...newsListingByRoute.get(article.route),
  })), []);
  const localizedArticles = useLocalizedListings(listing, lang);

  return (
    <div className="search-page news-archive wrap">
      <section className="search-hero">
        <div className="section-label">
          <span>{copy.label}</span>
          <span>{allNewsArticles.length} {copy.count}</span>
        </div>
        <h1>{copy.title}<br /><em>{copy.accent}</em></h1>
        <Link className="arrow-link" to="/news">{copy.back} <Arrow /></Link>
      </section>

      <div className="news-carousel is-grid" data-reveal>
        {localizedArticles.map((story, index) => {
          const route = allNewsArticles[index].route;
          const category = route.startsWith('/news/cinema/') ? copy.cinema : route.startsWith('/news/tech/') ? copy.tech : copy.gaming;
          return <NewsCard key={route} story={{ ...story, badge: story.badge || category, kicker: story.kicker || category }} readLabel={copy.read} />;
        })}
      </div>
    </div>
  );
}
