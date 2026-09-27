import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { Arrow } from '../components/ReleasesCalendar';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
import { useLanguage } from '../i18n/LanguageContext';
import '../cinema-news.css';

// Images officielles quand les ayants droit en ont publié une. Pour le
// biopic Fred Astaire, Sony n'ayant pas encore dévoilé de visuel de film,
// la photo de presse publiée par Variety est utilisée à la place.
const stories = [
  {
    sourceUrl: 'https://deadline.com/2026/09/box-office-avengers-endgame-primetime-heart-of-the-beast-1237111302/',
    image: youTubeThumbUrl('L2NAh3CIdig'),
    fallbackImage: 'box-office-endgame-resident-evil-news.svg',
    imageAlt: 'Visuel officiel Marvel Studios pour Avengers: Endgame Encore, tiré de sa bande-annonce',
    imageCredit: 'BANDE-ANNONCE OFFICIELLE · MARVEL STUDIOS',
    badge: 'CINÉMA · BOX-OFFICE',
    kicker: '27.09.2026 · DEADLINE',
    title: 'ENDGAME REPREND LA TÊTE DU BOX-OFFICE.',
    excerpt: 'La ressortie d’Avengers: Endgame vise 24 à 26 millions de dollars sur le week-end américain, devant le reboot Resident Evil de Zach Cregger. Les chiffres définitifs arrivent lundi.',
  },
  {
    sourceUrl: 'https://www.focusfeatures.com/werwulf',
    image: 'https://images.contentstack.io/v3/assets/blt223a4a92692ca457/bltc56e9a2c23500694/6a3d520c6391ef7c261677e4/werwulf_4marquee_image.png?branch=production&width=1600',
    fallbackImage: 'werwulf-trailer-news.svg',
    imageAlt: 'Visuel officiel de Werwulf publié par Focus Features',
    imageCredit: 'VISUEL OFFICIEL · FOCUS FEATURES',
    badge: 'CINÉMA · ROBERT EGGERS',
    kicker: '27.09.2026 · FOCUS FEATURES',
    title: 'WERWULF MONTRE SES CROCS.',
    excerpt: 'La deuxième bande-annonce du film de Robert Eggers est arrivée le 26 septembre, jour de pleine lune. L’horreur médiévale en vieil anglais sort le 25 décembre 2026.',
  },
  {
    sourceUrl: 'https://variety.com/2026/film/news/margaret-qualley-sabrina-carpenter-tom-holland-fred-astaire-biopic-1236850613/',
    image: 'https://variety.com/wp-content/uploads/2026/09/margaret-tom-sabrina.jpg?w=1200&h=800&crop=1',
    fallbackImage: 'fred-astaire-biopic-news.svg',
    imageAlt: 'Photos de presse de Tom Holland, Margaret Qualley et Sabrina Carpenter publiées par Variety, crédit Getty Images',
    imageCredit: 'PHOTO DE PRESSE · GETTY IMAGES / VARIETY',
    badge: 'CINÉMA · SONY PICTURES',
    kicker: '27.09.2026 · SONY PICTURES',
    title: 'LE BIOPIC ASTAIRE TROUVE SES DANSEUSES.',
    excerpt: 'Margaret Qualley (Adele Astaire) et Sabrina Carpenter (Ginger Rogers) rejoignent Tom Holland dans le biopic Sony réalisé par Paul King. Sans date de sortie pour l’instant.',
  },
  {
    sourceUrl: 'https://www.gamesradar.com/entertainment/anime-shows/jojos-bizarre-adventure-steel-ball-run-2nd-stage-3rd-stage-release-date-time-netflix/',
    image: 'cinema-jojo-steel-ball-run.jpg',
    imageAlt: 'Visuel officiel de JoJo’s Bizarre Adventure: Steel Ball Run',
    imageCredit: 'VISUEL OFFICIEL · NETFLIX',
    badge: 'JOJO · STEEL BALL RUN',
    kicker: '26.09.2026 · NETFLIX',
    title: 'STEEL BALL RUN REPREND LA COURSE.',
    excerpt: 'L’épisode 2 est en ligne depuis le 25 septembre : onze épisodes hebdomadaires, chaque vendredi sur Netflix, jusqu’au 4 décembre.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Dune:_Part_Three',
    image: 'cinema-dune-messiah.jpg',
    imageAlt: 'Paul Atréides et Chani dans le visuel promotionnel de Dune: Messiah',
    imageCredit: 'VISUEL PROMOTIONNEL · LEGENDARY / WARNER BROS.',
    badge: 'DUNE · MESSIAH',
    kicker: '26.09.2026 · WARNER BROS',
    title: 'DUNE: MESSIAH A SON TRAILER.',
    excerpt: 'Denis Villeneuve a confirmé que la première bande-annonce de Dune: Messiah sera diffusée en fin d’année, pour une sortie prévue en 2027.',
  },
  {
    sourceUrl: 'https://news.blizzard.com/en-gb/article/24301453/everything-announced-at-blizzcon-2026-opening-ceremony',
    image: 'diablo-netflix-news.webp',
    imageAlt: 'Illustration de l’annonce Blizzard consacrée à la série animée Diablo sur Netflix',
    imageCredit: 'VISUEL BLIZZCON · BLIZZARD ENTERTAINMENT',
    badge: 'DIABLO · NETFLIX',
    kicker: '12.09.2026 · BLIZZARD',
    title: 'DIABLO EN SÉRIE ANIMÉE.',
    excerpt: 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie d’autres adaptations de ses licences vers le petit écran.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Last_of_Us_season_3',
    image: 'cinema-last-of-us.jpg',
    imageAlt: 'Ellie dans la série The Last of Us, visuel HBO',
    imageCredit: 'VISUEL OFFICIEL · HBO',
    badge: 'THE LAST OF US · HBO',
    kicker: '22.09.2026 · HBO',
    title: 'THE LAST OF US SAISON 3 CONFIRMÉE.',
    excerpt: 'HBO a officiellement commandé une troisième saison de The Last of Us, qui adaptera la seconde partie du deuxième jeu avec de nouveaux arcs narratifs.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Avengers:_Doomsday',
    image: 'cinema-doctor-doom.jpg',
    imageAlt: 'Doctor Doom dans un visuel promotionnel Marvel Studios',
    imageCredit: 'VISUEL PROMOTIONNEL · MARVEL STUDIOS',
    badge: 'MARVEL · DOOM',
    kicker: '20.09.2026 · MARVEL STUDIOS',
    title: 'DOOM PREND LES RÊNES DU MCU.',
    excerpt: 'Robert Downey Jr. sera Doctor Doom dans Avengers: Doomsday et plusieurs prochains films Marvel, redéfinissant la prochaine saga du MCU.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Stranger_Things_season_5',
    image: 'cinema-stranger-things.jpg',
    imageAlt: 'Affiche teaser officielle de Stranger Things saison 5, Netflix',
    imageCredit: 'AFFICHE OFFICIELLE · NETFLIX',
    badge: 'STRANGER THINGS · S5',
    kicker: '18.09.2026 · NETFLIX',
    title: 'STRANGER THINGS 5 A SA DATE.',
    excerpt: 'Netflix dévoile la date de sortie et le premier trailer de la saison finale de Stranger Things, attendue pour mars 2027 sur la plateforme.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Joker:_Folie_%C3%A0_Deux',
    image: 'cinema-joker.jpg',
    imageAlt: 'Joaquin Phoenix et Lady Gaga sur l’affiche officielle de Joker: Folie à Deux',
    imageCredit: 'AFFICHE OFFICIELLE · WARNER BROS.',
    badge: 'JOKER · FOLIE À DEUX',
    kicker: '15.09.2026 · WARNER BROS',
    title: 'JOKER 2 DIVISE TOUJOURS.',
    excerpt: 'La comédie musicale avec Joaquin Phoenix et Lady Gaga divise critique et public. Retour sur un pari audacieux qui n’a pas convaincu tout le monde.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/House_of_the_Dragon_season_3',
    image: 'cinema-hotd.jpg',
    imageAlt: 'Rhaenyra Targaryen dans le visuel officiel House of the Dragon: Fire and Blood, HBO',
    imageCredit: 'VISUEL OFFICIEL · HBO',
    badge: 'HOUSE OF THE DRAGON · S3',
    kicker: '12.09.2026 · HBO',
    title: 'HOUSE OF THE DRAGON TOURNE.',
    excerpt: 'La troisième saison de House of the Dragon entre en tournage. HBO promet une guerre civile plus intense et de nouveaux dragons au casting.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Blade_(upcoming_film)',
    image: 'cinema-blade.jpg',
    imageAlt: 'Affiche officielle du film Blade de 1998 avec Wesley Snipes, franchise reprise par Marvel Studios',
    imageCredit: 'AFFICHE · NEW LINE CINEMA / MARVEL STUDIOS',
    badge: 'BLADE · MARVEL',
    kicker: '10.09.2026 · MARVEL STUDIOS',
    title: 'BLADE A ENFIN SON RÉALISATEUR.',
    excerpt: 'Après plusieurs mois d’incertitude, le film Blade avec Mahershala Ali aurait enfin trouvé un nouveau réalisateur. Le tournage pourrait reprendre en 2027.',
  },
  {
    sourceUrl: 'https://en.wikipedia.org/wiki/Arcane_(TV_series)',
    image: 'cinema-arcane.jpg',
    imageAlt: 'Jinx et Vi sur l’affiche officielle d’Arcane, Netflix et Riot Games',
    imageCredit: 'AFFICHE OFFICIELLE · NETFLIX / RIOT GAMES',
    badge: 'ARCANE · SAISON 2',
    kicker: '08.09.2026 · NETFLIX',
    title: 'ARCANE S2 DERNIÈRE LIGNE DROITE.',
    excerpt: 'Netflix et Riot dévoilent de nouvelles affiches et confirment que la deuxième saison conclura l’histoire de Vi et Jinx.',
  },
];

const imageUrl = (image) => /^https?:\/\//i.test(image) ? image : `${base}${image}`;

const pageCopy = {
  fr: { back: 'Retour au hub', section: 'ACTUS CINÉMA & SÉRIES', updated: 'Mis à jour le 27.09.2026', eyebrow: 'DERNIÈRES ACTUS', title: 'LE CINÉMA', accent: 'À LA UNE.', intro: 'Les dernières nouvelles du grand écran, sourcées et illustrées par les visuels de leurs ayants droit quand ils sont disponibles.', read: 'Lire la source', cta: 'PLUS D’HISTOIRES, MOINS DE BRUIT', ctaTitle: 'ENVIE DE', ctaAccent: 'POP CULTURE ?' },
  en: { back: 'Back to hub', section: 'CINEMA & SERIES NEWS', updated: 'Updated 27.09.2026', eyebrow: 'LATEST NEWS', title: 'CINEMA', accent: 'IN FOCUS.', intro: 'The latest big-screen news, sourced and illustrated with rights-holder artwork wherever it is available.', read: 'Read the source', cta: 'MORE STORIES, LESS NOISE', ctaTitle: 'WANT MORE', ctaAccent: 'POP CULTURE?' },
  ar: { back: 'العودة إلى الأخبار', section: 'أخبار السينما والمسلسلات', updated: 'آخر تحديث 27.09.2026', eyebrow: 'آخر الأخبار', title: 'السينما', accent: 'في الواجهة.', intro: 'أحدث أخبار الشاشة الكبيرة، مع مصادر موثوقة وصور أصحاب الحقوق عند توفرها.', read: 'اقرأ المصدر', cta: 'قصص أكثر، ضجيج أقل', ctaTitle: 'هل تريد المزيد من', ctaAccent: 'الثقافة الشعبية؟' },
};

export default function CinemaNews() {
  const { lang } = useLanguage();
  const copy = pageCopy[lang] || pageCopy.fr;
  return (
    <>
      <div className="news-hub-back wrap">
        <Link className="arrow-link" to="/news">{copy.back} <Arrow /></Link>
      </div>
      <section className="news-carousel-section wrap cinema-news-page">
        <div className="section-label">
          <span>{copy.section}</span>
          <span>{copy.updated}</span>
        </div>
        <div className="cinema-news-intro">
          <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p>
          <h1>{copy.title}<br /><em>{copy.accent}</em></h1>
          <p>{copy.intro}</p>
        </div>
        <div className="news-carousel is-grid cinema-news-grid">
          {stories.map((story, index) => (
            <a className={`news-carousel-card${index === 0 ? ' cinema-news-featured' : ''}`} href={story.sourceUrl} target="_blank" rel="noreferrer" key={story.sourceUrl}>
              <div className="news-carousel-image">
                <img src={imageUrl(story.image)} alt={story.imageAlt} loading={index ? 'lazy' : 'eager'} onError={(event) => {
                  if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
                    event.currentTarget.dataset.fallback = 'true';
                    event.currentTarget.src = imageUrl(story.fallbackImage);
                  }
                }} />
                <span className="news-feature-badge">{story.badge}</span>
                <span className="news-feature-arrow" aria-hidden="true">↗</span>
              </div>
              <div className="news-carousel-copy">
                <span className="cinema-image-credit">{story.imageCredit}</span>
                <span className="news-kicker">{story.kicker}</span>
                <h2>{story.title}</h2>
                <p>{story.excerpt}</p>
                <span className="read-link">{copy.read} <Arrow /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="cta wrap cinema-news-cta">
        <div><p className="eyebrow"><span className="live-dot" /> {copy.cta}</p><h2>{copy.ctaTitle} <em>{copy.ctaAccent}</em></h2></div>
        <Link className="button button-yellow" to="/news">{copy.back} <Arrow /></Link>
      </section>
    </>
  );
}
