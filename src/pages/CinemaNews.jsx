import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
import '../cinema-news.css';
import { getArticleViews, normalizeArticleId, formatViews } from '../lib/articleViews';
import { getArticleSentiment, sentimentMeta } from '../lib/articleSentiment';
// Une actu dont la bande-annonce officielle est intégrée à l'article affiche
// une pastille « BANDE-ANNONCE » sur sa vignette (src/articleTrailers.js).
import { trailerFlagLabel, trailerFlagTitle } from '../articleTrailers';

// Images promotionnelles officielles lorsqu'elles sont disponibles. Le biopic
// Fred Astaire n'ayant pas encore de visuel Sony, sa carte utilise une photo de
// presse Getty publiée par Variety.
const imageUrl = (image) => /^https?:\/\//i.test(image) ? image : `${base}${image}`;

// Page des actus CINÉMA & SÉRIES — même présentation que la page gaming mais
// pour les films, séries, streaming et pop culture audiovisuelle.
export default function CinemaNews() {
  const { lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [viewsMap, setViewsMap] = useState({});

  const copy = {
    en: {
      section: 'CINEMA & SERIES NEWS',
      updated: 'Updated 29.09.2026',
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
      updated: 'Mis à jour le 29.09.2026',
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
      updated: 'آخر تحديث 29.09.2026',
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
    updated: 'Mis à jour le 29.09.2026',
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
  // Actus cinéma du jour (29.09.2026) : les plus récentes ouvrent la page —
  // box-office mondial d’Endgame, sortie numérique de Coyote vs. Acme et fin
  // de la trilogie Mononoke sur Netflix.
  const articles = useMemo(() => [
    { to: '/news/cinema/endgame-encore-record-avatar', image: youTubeThumbUrl('L2NAh3CIdig'), fallbackImage: 'box-office-endgame-avatar-news.svg', imageCredit: 'BANDE-ANNONCE OFFICIELLE · MARVEL STUDIOS', alt: 'Visuel officiel Marvel Studios pour Avengers: Endgame Encore, tiré de sa bande-annonce', badge: 'CINÉMA · BOX-OFFICE', kicker: '29.09.2026 · ONE MANN’S MOVIES', title: 'ENDGAME FRÔLE LE TRÔNE D’AVATAR.', excerpt: 'Le week-end mondial de la ressortie atteint 86 M$ (26 M$ en Amérique du Nord, 60 M$ à l’international) et porte le total à environ 2,885 milliard. À 39 millions du record d’Avatar, avec un démarrage record au Royaume-Uni (4,12 M£).', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/coyote-vs-acme-numerique', image: youTubeThumbUrl('Bpg3tJ4f3v0'), fallbackImage: 'coyote-vs-acme-numerique-news.svg', imageCredit: 'BANDE-ANNONCE OFFICIELLE · KETCHUP ENTERTAINMENT', alt: 'Wile E. Coyote et l’avocat Kevin Avery dans la bande-annonce officielle de Coyote vs. Acme', badge: 'LOONEY TUNES · KETCHUP', kicker: '29.09.2026 · KETCHUP ENTERTAINMENT', title: 'COYOTE VS. ACME PASSE EN LIGNE.', excerpt: 'Le film sauvé de la déduction fiscale de Warner Bros. est disponible dès aujourd’hui en numérique (24,99 $) sur Prime Video, Apple TV et Fandango at Home. 96 % de la critique, plus de 100 M$ au box-office mondial.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/mononoke-chapter-3-netflix', image: youTubeThumbUrl('R6PUcxSZ7YM'), fallbackImage: 'mononoke-chapter-3-news.svg', imageCredit: 'BANDE-ANNONCE OFFICIELLE · NETFLIX ANIME', alt: 'Le Marchand de médicaments devant l’Ōoku dans la bande-annonce officielle de Mononoke The Movie: Chapter III', badge: 'MONONOKE · NETFLIX', kicker: '29.09.2026 · NETFLIX', title: 'MONONOKE CLÔTURE SA TRILOGIE.', excerpt: 'Chapter III – The Curse of the Serpent arrive ce soir sur Netflix dans le monde entier. Le Marchand de médicaments affronte une malédiction née dans les rangs supérieurs de l’Ōoku, pour le dernier film de la trilogie.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/box-office-us-endgame-encore-26-millions', image: youTubeThumbUrl('L2NAh3CIdig'), fallbackImage: 'box-office-endgame-encore-news.svg', imageCredit: 'BANDE-ANNONCE OFFICIELLE · MARVEL STUDIOS', alt: 'Visuel officiel Marvel Studios pour Avengers: Endgame Encore, tiré de sa bande-annonce', badge: 'CINÉMA · BOX-OFFICE', kicker: '28.09.2026 · DEADLINE', title: 'ENDGAME GARDE LA TÊTE : 26 M$.', excerpt: 'Bilan consolidé du week-end américain : la ressortie d’Avengers: Endgame termine première avec 26 M$, devant Resident Evil (23,3 M$, plus de 100 M$ en dix jours). Meilleur 39e week-end depuis 2015 avec 122,3 M$.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/the-last-of-us-saison-3-john-goodman-laura-bailey', image: 'https://variety.com/wp-content/uploads/2026/09/LastofUs.Split_.1.jpg?w=1000&h=667&crop=1', fallbackImage: 'last-of-us-saison-3-casting-news.svg', imageCredit: 'PHOTOS DE PRESSE · GETTY IMAGES / HBO / VARIETY', alt: 'Photos de presse de Laura Bailey, John Goodman et Ian Alexander, nouveaux visages de la saison 3 de The Last of Us', badge: 'THE LAST OF US · HBO', kicker: '28.09.2026 · VARIETY', title: 'GOODMAN REJOINT THE LAST OF US.', excerpt: 'Pour The Last of Us Day, HBO annonce John Goodman, Ian Alexander et Laura Bailey — la voix d’Abby dans le jeu — au casting de la saison 3, attendue en 2027 avec Craig Mazin seul showrunner.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/godzilla-minus-zero-premiere-nyff', image: 'https://variety.com/wp-content/uploads/2026/09/GettyImages-2297305809.jpg?w=1000&h=667&crop=1', fallbackImage: 'godzilla-minus-zero-news.svg', imageCredit: 'PHOTO DE PRESSE · GETTY IMAGES / VARIETY', alt: 'Minami Hamabe, Ryunosuke Kamiki et Takashi Yamazaki sur le tapis rouge de Godzilla Minus Zero au New York Film Festival', badge: 'GODZILLA · NYFF', kicker: '28.09.2026 · VARIETY', title: 'GODZILLA RUGIT À NEW YORK.', excerpt: 'Première mondiale applaudie au New York Film Festival pour la suite de Godzilla Minus One, premier film de la saga classé R. Sortie le 3 novembre au Japon, le 4 en France et le 6 aux États-Unis.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/box-office-us-endgame-resident-evil', image: youTubeThumbUrl('L2NAh3CIdig'), fallbackImage: 'box-office-endgame-resident-evil-news.svg', imageCredit: 'BANDE-ANNONCE OFFICIELLE · MARVEL STUDIOS', alt: 'Visuel officiel Marvel Studios pour Avengers: Endgame Encore, tiré de sa bande-annonce', badge: 'CINÉMA · BOX-OFFICE', kicker: '27.09.2026 · DEADLINE', title: 'ENDGAME REPREND LA TÊTE.', excerpt: 'La ressortie d’Avengers: Endgame vise 24 à 26 millions de dollars sur le week-end américain, devant le reboot Resident Evil de Zach Cregger. Les chiffres définitifs arrivent lundi.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/werwulf-trailer-eggers', image: 'https://images.contentstack.io/v3/assets/blt223a4a92692ca457/bltc56e9a2c23500694/6a3d520c6391ef7c261677e4/werwulf_4marquee_image.png?branch=production&width=1600', fallbackImage: 'werwulf-trailer-news.svg', imageCredit: 'VISUEL OFFICIEL · FOCUS FEATURES', alt: 'Visuel officiel de Werwulf publié par Focus Features', badge: 'CINÉMA · ROBERT EGGERS', kicker: '27.09.2026 · FOCUS FEATURES', title: 'WERWULF MONTRE SES CROCS.', excerpt: 'La deuxième bande-annonce du film de Robert Eggers est arrivée le 26 septembre, jour de pleine lune. L’horreur médiévale en vieil anglais sort le 25 décembre 2026.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/fred-astaire-biopic-tom-holland', image: 'https://variety.com/wp-content/uploads/2026/09/margaret-tom-sabrina.jpg?w=1200&h=800&crop=1', fallbackImage: 'fred-astaire-biopic-news.svg', imageCredit: 'PHOTO DE PRESSE · GETTY IMAGES / VARIETY', alt: 'Photos de presse de Tom Holland, Margaret Qualley et Sabrina Carpenter publiées par Variety, crédit Getty Images', badge: 'CINÉMA · SONY PICTURES', kicker: '27.09.2026 · SONY PICTURES', title: 'ASTAIRE TROUVE SES DANSEUSES.', excerpt: 'Margaret Qualley (Adele Astaire) et Sabrina Carpenter (Ginger Rogers) rejoignent Tom Holland dans le biopic Sony réalisé par Paul King. Sans date de sortie pour l’instant.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/jojo-steel-ball-run-episode-2', image: 'cinema-jojo-steel-ball-run.jpg', alt: 'Key visual officiel de STEEL BALL RUN JoJo’s Bizarre Adventure : Johnny Joestar, Gyro Zeppeli et les chevaux dorés de la course, sur fond violet à pois', badge: 'JOJO · STEEL BALL RUN', kicker: '26.09.2026 · NETFLIX', title: 'STEEL BALL RUN REPART.', excerpt: 'Six mois après le spécial de 47 minutes, l’épisode 2 est en ligne depuis le 25 septembre : onze épisodes hebdomadaires, chaque vendredi sur Netflix, jusqu’au 4 décembre.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/dune-messiah-trailer', image: 'cinema-dune-messiah.jpg', alt: 'Dune — Paul Atréides et Chani devant le soleil d’Arrakis, affiche officielle Legendary / Warner Bros', badge: 'DUNE · MESSIAH', kicker: '26.09.2026 · WARNER BROS', title: 'DUNE: MESSIAH A SON TRAILER.', excerpt: 'Denis Villeneuve a confirmé que la première bande-annonce de Dune: Messiah sera diffusée en fin d’année, pour une sortie prévue en 2027.', read: copy.read, sentiment: 'positive' },
    { to: '/news/diablo-netflix', image: 'diablo-netflix-news.webp', alt: 'Série animée Diablo sur Netflix', badge: 'DIABLO · NETFLIX', kicker: '12.09.2026 · NETFLIX', title: 'DIABLO EN SÉRIE ANIMÉE.', excerpt: 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie d’autres adaptations de ses licences vers le petit écran.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/last-of-us-saison-3', image: 'cinema-last-of-us.jpg', alt: 'The Last of Us — Ellie (Bella Ramsey) dans la série HBO, visuel officiel HBO', badge: 'THE LAST OF US · HBO', kicker: '22.09.2026 · HBO', title: 'THE LAST OF US SAISON 3 CONFIRMÉE.', excerpt: 'HBO a officiellement commandé une troisième saison de The Last of Us, qui adaptera la seconde partie du deuxième jeu avec de nouveaux arcs narratifs.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/marvel-doctor-doom', image: 'cinema-doctor-doom.jpg', alt: 'Doctor Doom — le visage de Robert Downey Jr. à moitié caché par le masque de métal, visuel promotionnel Marvel Studios', badge: 'MARVEL · DOOM', kicker: '20.09.2026 · MARVEL STUDIOS', title: 'DOOM PREND LES RÊNES DU MCU.', excerpt: 'Robert Downey Jr. sera Doctor Doom dans Avengers: Doomsday et plusieurs prochains films Marvel, redéfinissant la prochaine saga du MCU.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/stranger-things-saison-5', image: 'cinema-stranger-things.jpg', alt: 'Stranger Things saison 5 — affiche teaser Netflix', badge: 'STRANGER THINGS · S5', kicker: '18.09.2026 · NETFLIX', title: 'STRANGER THINGS 5 A SA DATE.', excerpt: 'Netflix dévoile la date de sortie et le premier trailer de la saison finale de Stranger Things, attendue pour mars 2027 sur la plateforme.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/joker-folie-a-deux', image: 'cinema-joker.jpg', alt: 'Joker: Folie à Deux — Joaquin Phoenix et Lady Gaga, affiche officielle Warner Bros', badge: 'JOKER · FOLIE À DEUX', kicker: '15.09.2026 · WARNER BROS', title: 'JOKER 2 DIVISE TOUJOURS.', excerpt: 'La comédie musicale avec Joaquin Phoenix et Lady Gaga divise critique et public. Retour sur un pari audacieux qui n’a pas convaincu tout le monde.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/house-of-dragon-saison-3', image: 'cinema-hotd.jpg', alt: 'House of the Dragon — Rhaenyra Targaryen, affiche officielle HBO « Fire and Blood »', badge: 'HOUSE OF THE DRAGON · S3', kicker: '12.09.2026 · HBO', title: 'HOUSE OF THE DRAGON TOURNE.', excerpt: 'La troisième saison de House of the Dragon entre en tournage. HBO promet une guerre civile plus intense et de nouveaux dragons au casting.', read: copy.read, sentiment: 'positive' },
    { to: '/news/cinema/blade-reboot', image: 'cinema-blade.jpg', alt: 'Blade — affiche officielle du film de 1998 avec Wesley Snipes, franchise reprise par Marvel Studios', badge: 'BLADE · MARVEL', kicker: '10.09.2026 · MARVEL STUDIOS', title: 'BLADE A ENFIN SON RÉALISATEUR.', excerpt: 'Après plusieurs mois d’incertitude, le film Blade avec Mahershala Ali aurait enfin trouvé un nouveau réalisateur. Le tournage pourrait reprendre en 2027.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/cinema/arcane-saison-2', image: 'cinema-arcane.jpg', alt: 'Arcane saison 2 — Jinx et Vi, affiche officielle Netflix / Riot Games', badge: 'ARCANE · SAISON 2', kicker: '08.09.2026 · NETFLIX', title: 'ARCANE S2 DERNIÈRE LIGNE DROITE.', excerpt: 'À quelques semaines de la sortie, Riot et Netflix dévoilent les nouvelles affiches d’Arcane saison 2, et confirment que ce sera la dernière.', read: copy.read, sentiment: 'positive' },
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
    const trailerFlag = trailerFlagLabel(article.to);
    return (
      <>
        <span className="news-feature-badge">{article.badge}</span>
        {trailerFlag ? (
          <span className="news-trailer-flag" title={trailerFlagTitle(article.to)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            {trailerFlag}
          </span>
        ) : null}
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

  const renderStoryImage = (story, loading = 'lazy') => (
    <img
      src={imageUrl(story.image)}
      alt={story.alt}
      loading={loading}
      onError={(event) => {
        if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
          event.currentTarget.dataset.fallback = 'true';
          event.currentTarget.src = imageUrl(story.fallbackImage);
        }
      }}
    />
  );

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
                  {renderStoryImage(topStory, 'eager')}
                  {renderBadges(topStory)}
                </div>
                <div className="daily-news-copy">
                  <p className="eyebrow"><span className="live-dot" /> {copy.today}</p>
                  {topStory.imageCredit && <span className="cinema-image-credit">{topStory.imageCredit}</span>}
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
                  {renderStoryImage(article)}
                  {renderBadges(article)}
                </div>
                <div className="news-carousel-copy">
                  {article.imageCredit && <span className="cinema-image-credit">{article.imageCredit}</span>}
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
