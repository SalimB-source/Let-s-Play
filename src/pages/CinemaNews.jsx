import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import { getArticleViews, normalizeArticleId, formatViews } from '../lib/articleViews';
import { getArticleSentiment, sentimentMeta } from '../lib/articleSentiment';

// Page des actus CINÉMA & SÉRIES — même présentation que la page gaming mais
// pour les films, séries, streaming et pop culture audiovisuelle.
export default function CinemaNews() {
  const { lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [viewsMap, setViewsMap] = useState({});

  const copy = {
    en: {
      section: 'CINEMA & SERIES NEWS',
      updated: 'Updated 26.09.2026',
      today: 'FEATURED STORY',
      read: 'READ THE STORY',
      seeAll: 'See all news',
      showLess: 'Show fewer news',
      ctaEyebrow: 'MORE STORIES, LESS NOISE',
      ctaH2a: 'WANT MORE',
      ctaH2b: 'POP CULTURE?',
      ctaBtn: 'Back to hub',
      back: 'Back to hub',
    },
    fr: {
      section: 'ACTUS CINÉMA & SÉRIES',
      updated: 'Mis à jour le 26.09.2026',
      today: 'À LA UNE',
      read: 'LIRE L’ARTICLE',
      seeAll: 'Voir toutes les actus',
      showLess: 'Réduire les actus',
      ctaEyebrow: 'PLUS D’HISTOIRES, MOINS DE BRUIT',
      ctaH2a: 'ENVIE DE',
      ctaH2b: 'POP CULTURE ?',
      ctaBtn: 'Retour au hub',
      back: 'Retour au hub',
    },
    ar: {
      section: 'أخبار السينما والمسلسلات',
      updated: 'آخر تحديث 26.09.2026',
      today: 'الخبر الرئيسي',
      read: 'اقرأ المقال',
      seeAll: 'عرض كل الأخبار',
      showLess: 'عرض أقل',
      ctaEyebrow: 'مزيد من القصص',
      ctaH2a: 'المزيد',
      ctaH2b: 'من الثقافة الشعبية',
      ctaBtn: 'العودة',
      back: 'العودة إلى hub',
    },
  }[lang] || {
    section: 'ACTUS CINÉMA & SÉRIES',
    updated: 'Mis à jour le 26.09.2026',
    today: 'À LA UNE',
    read: 'LIRE L’ARTICLE',
    seeAll: 'Voir toutes les actus',
    showLess: 'Réduire les actus',
    ctaEyebrow: 'PLUS D’HISTOIRES, MOINS DE BRUIT',
    ctaH2a: 'ENVIE DE',
    ctaH2b: 'POP CULTURE ?',
    ctaBtn: 'Retour au hub',
    back: 'Retour au hub',
  };

  // TODO : brancher un vrai flux cinéma (API TMDB / robots d'actus) comme pour
  // le gaming. Pour l'instant, quelques actus de rédaction qui ouvrent la page
  // en beauté.
  const articles = useMemo(() => [
    { to: '/news/cinema/jojo-steel-ball-run-episode-2', image: 'cinema-jojo-steel-ball-run.jpg', alt: 'Deux cavaliers au galop dans le désert de l’Arizona, une Steel Ball tourbillonnante au premier plan — visuel éditorial Let’s Play', badge: 'JOJO · STEEL BALL RUN', kicker: '26.09.2026 · NETFLIX', title: 'STEEL BALL RUN REPREND LA COURSE.', excerpt: 'Six mois après le spécial de 47 minutes, l’épisode 2 est en ligne depuis le 25 septembre : onze épisodes hebdomadaires, chaque vendredi sur Netflix, jusqu’au 4 décembre.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/dune-messiah-trailer', image: 'cinema-dune-messiah.jpg', alt: 'Dune: Messiah — Paul Atréides dans le désert d’Arrakis, visuel cinématographique', badge: 'DUNE · MESSIAH', kicker: '26.09.2026 · WARNER BROS', title: 'LE TRAILER DE DUNE: MESSIAH ARRIVE.', excerpt: 'Denis Villeneuve a confirmé que la première bande-annonce de Dune: Messiah sera diffusée en fin d’année, pour une sortie prévue en 2027.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/diablo-netflix', image: 'diablo-netflix-news.webp', alt: 'Série animée Diablo sur Netflix', badge: 'DIABLO · NETFLIX', kicker: '12.09.2026 · NETFLIX', title: 'DIABLO ÉTEND SON UNIVERS EN SÉRIE.', excerpt: 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie d’autres adaptations de ses licences vers le petit écran.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/last-of-us-saison-3', image: 'last-of-us-mod-news.jpg', alt: 'The Last of Us — série HBO', badge: 'THE LAST OF US · HBO', kicker: '22.09.2026 · HBO', title: 'LA SAISON 3 DE THE LAST OF US CONFIRMÉE.', excerpt: 'HBO a officiellement commandé une troisième saison de The Last of Us, qui adaptera la seconde partie du deuxième jeu avec de nouveaux arcs narratifs.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/marvel-doctor-doom', image: 'halo-activision-news.jpg', alt: 'Doctor Doom — Marvel Studios', badge: 'MARVEL · DOOM', kicker: '20.09.2026 · MARVEL STUDIOS', title: 'DOCTOR DOOM PREND LES RÊNES DU MCU.', excerpt: 'Robert Downey Jr. sera Doctor Doom dans Avengers: Doomsday et plusieurs prochains films Marvel, redéfinissant la prochaine saga du MCU.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/stranger-things-saison-5', image: 'cinema-stranger-things.jpg', alt: 'Stranger Things saison 5 — affiche teaser Netflix', badge: 'STRANGER THINGS · S5', kicker: '18.09.2026 · NETFLIX', title: 'STRANGER THINGS 5 : DATE ET TRAILER.', excerpt: 'Netflix dévoile la date de sortie et le premier trailer de la saison finale de Stranger Things, attendue pour mars 2027 sur la plateforme.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/joker-folie-a-deux', image: 'cinema-joker.jpg', alt: 'Joker: Folie à Deux — Joaquin Phoenix et Lady Gaga', badge: 'JOKER · FOLIE À DEUX', kicker: '15.09.2026 · WARNER BROS', title: 'JOKER 2 DIVISE : CE QU’ON A RETENU.', excerpt: 'La comédie musicale avec Joaquin Phoenix et Lady Gaga divise critique et public. Retour sur un pari audacieux qui n’a pas convaincu tout le monde.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/house-of-dragon-saison-3', image: 'cinema-hotd.jpg', alt: 'House of the Dragon saison 3 — HBO', badge: 'HOUSE OF THE DRAGON · S3', kicker: '12.09.2026 · HBO', title: 'HOUSE OF THE DRAGON : LE TOURNAGE COMMENCE.', excerpt: 'La troisième saison de House of the Dragon entre en tournage. HBO promet une guerre civile plus intense et de nouveaux dragons au casting.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/blade-reboot', image: 'cinema-blade.jpg', alt: 'Blade reboot Marvel — Mahershala Ali', badge: 'BLADE · MARVEL', kicker: '10.09.2026 · MARVEL STUDIOS', title: 'LE REBOOT DE BLADE RETROUVE UN RÉALISATEUR.', excerpt: 'Après plusieurs mois d’incertitude, le film Blade avec Mahershala Ali aurait enfin trouvé un nouveau réalisateur. Le tournage pourrait reprendre en 2027.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/arcane-saison-2', image: 'cinema-arcane.jpg', alt: 'Arcane saison 2 — Netflix / Riot Games', badge: 'ARCANE · SAISON 2', kicker: '08.09.2026 · NETFLIX', title: 'ARCANE S2 : LA CONCLUSION APPROCHE.', excerpt: 'À quelques semaines de la sortie, Riot et Netflix dévoilent les nouvelles affiches d’Arcane saison 2, et confirment que ce sera la dernière.', read: copy.read, sentiment: 'positive' },
  ], [copy.read]);

  useEffect(() => {
    const ids = articles.map((a) => normalizeArticleId(a.to));
    let cancelled = false;
    getArticleViews(ids).then((map) => { if (!cancelled) setViewsMap(map); });
    return () => { cancelled = true; };
  }, [articles]);

  const visibleArticles = showAll ? articles : articles.slice(0, 12);
  const [topStory, ...gridArticles] = visibleArticles;

  const renderBadges = (article) => {
    const sentimentId = getArticleSentiment(article);
    const meta = sentimentMeta(sentimentId);
    const views = viewsMap[normalizeArticleId(article.to)] ?? null;
    return (
      <>
        <span className="news-feature-badge">{article.badge}</span>
        <span className="news-feature-arrow">↗</span>
        <span className={`news-sentiment ${meta.color}`} title={meta.label} aria-label={meta.label}>{meta.emoji}</span>
        {views != null && (
          <span className="news-views" aria-label={`${views} vues`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3.2" /></svg>
            {formatViews(views)}
          </span>
        )}
      </>
    );
  };

  return (
    <>
      {/* Lien retour vers le hub */}
      <div className="news-hub-back wrap">
        <Link className="arrow-link" to="/news">{copy.back} <Arrow /></Link>
      </div>

      <section className="news-carousel-section wrap">
        <div className="section-label"><span>{copy.section}</span><span>{copy.updated}</span></div>
        <div className="news-carousel is-grid">
          {topStory && (
            <div className="news-grid-cell news-grid-cell--today">
              <Link className="daily-news-card news-today" to={topStory.to}>
                <div className="daily-news-image">
                  <img src={`${base}${topStory.image}`} alt={topStory.alt} />
                  {renderBadges(topStory)}
                </div>
                <div className="daily-news-copy">
                  <p className="eyebrow"><span className="live-dot" /> {copy.today}</p>
                  <span className="news-kicker">{topStory.kicker}</span>
                  <h2>{topStory.title}</h2>
                  <p>{topStory.excerpt}</p>
                  <span className="read-link">{topStory.read} <Arrow /></span>
                </div>
              </Link>
            </div>
          )}
          {gridArticles.map((article) => (
            <div className="news-grid-cell" key={article.to}>
              <Link className="news-carousel-card" to={article.to}>
                <div className="news-carousel-image">
                  <img src={`${base}${article.image}`} alt={article.alt} />
                  {renderBadges(article)}
                </div>
                <div className="news-carousel-copy">
                  <span className="news-kicker">{article.kicker}</span>
                  <h2>{article.title}</h2>
                  <p>{article.excerpt}</p>
                  <span className="read-link">{article.read} <Arrow /></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {articles.length > 12 && (
          <div className="news-all-actions">
            <button type="button" className="button button-yellow" onClick={() => setShowAll((c) => !c)}>
              {showAll ? copy.showLess : copy.seeAll} <Arrow />
            </button>
          </div>
        )}
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {copy.ctaEyebrow}</p>
          <h2>{copy.ctaH2a} <em>{copy.ctaH2b}</em></h2>
        </div>
        <Link className="button button-yellow" to="/news">{copy.ctaBtn} <Arrow /></Link>
      </section>
    </>
  );
}
