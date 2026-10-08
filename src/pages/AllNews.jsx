import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { searchIndex } from '../search/searchIndex';
import { autoSearchEntries, autoNewsListing } from '../lib/autoNews';
import { dailyNewsListing } from '../news/daily/2026-10-08';
import { Arrow } from '../components/Arrow';
import NewsCard from '../components/NewsCard';

// Catalogues existants de la rédaction et du robot, sans doublons de routes.
export const allNewsArticles = [...new Map(
  [...searchIndex, ...autoSearchEntries].filter((item) => item.type === 'news').map((item) => [item.route, item]),
).values()];

// Réutiliser les données éditoriales lorsqu’elles sont disponibles : mêmes
// titres, badges, dates/sources, miniatures et sentiments que les cartes Actus.
const newsListingByRoute = new Map(
  [...autoNewsListing, ...dailyNewsListing].map((story) => [story.to, story]),
);

const COPY = {
  fr: { back: 'Retour aux actus', label: 'ACTUALITÉS · ARCHIVES', title: 'TOUS LES', accent: 'ARTICLES.', count: 'articles', read: 'Lire l’article', gaming: 'Gaming', cinema: 'Cinéma & séries', tech: 'Tech' },
  en: { back: 'Back to news', label: 'NEWS · ARCHIVE', title: 'ALL THE', accent: 'ARTICLES.', count: 'articles', read: 'Read article', gaming: 'Gaming', cinema: 'Cinema & series', tech: 'Tech' },
  ar: { back: 'العودة إلى الأخبار', label: 'الأخبار · الأرشيف', title: 'جميع', accent: 'المقالات.', count: 'مقالات', read: 'اقرأ المقال', gaming: 'الألعاب', cinema: 'السينما والمسلسلات', tech: 'التقنية' },
};

export default function AllNews() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.fr;

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

      <div className="news-carousel is-grid">
        {allNewsArticles.map((article) => {
          const category = article.route.startsWith('/news/cinema/') ? copy.cinema : article.route.startsWith('/news/tech/') ? copy.tech : copy.gaming;
          const story = {
            to: article.route,
            image: article.image,
            alt: article.title,
            title: article.title,
            excerpt: article.description,
            badge: category,
            kicker: category,
            ...newsListingByRoute.get(article.route),
          };
          return <NewsCard key={article.route} story={story} readLabel={copy.read} />;
        })}
      </div>
    </div>
  );
}
