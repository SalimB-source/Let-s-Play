import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import { youTubeEmbedUrl } from '../lib/videoPlayback';
import { leadTrailer, trailerBadgeLabel } from '../articleTrailers';
// L'actu gaming du jour est celle qui ouvre /news/gaming : la bannière du hub
// la reprend telle quelle, sans seconde copie à tenir à jour.
import { gamingTopStory } from './GamingNews';

// Visuel de repli de la bannière (actu sans vidéo officielle) : même règle que
// les cartes du hub gaming — URL absolue telle quelle, fichier local préfixé.
const imageUrl = (image) => (/^https?:\/\//i.test(image) ? image : `${base}${image}`);

// Sélection des actualités du jour (07.10.2026) avec leurs miniatures locales dédiées.
const todayStories = [
  {
    to: '/news/gta-6-cloud-pc-dementi-xbox',
    image: 'gta-6-cloud-pc-dementi-news.jpg',
    fallbackImage: 'gta-6-cloud-pc-dementi-news.svg',
    alt: 'GTA VI — plan officiel de Vice City sous les néons, Rockstar Games relayé par Gamekult',
    badge: 'XBOX · GTA 6',
    kicker: '07.10.2026 · GAMEKULT',
    title: 'GTA 6 SUR PC : LE DÉMENTI TOMBE.',
    excerpt: 'Pendant quatre heures cette nuit, l’espoir d’un GTA VI jouable sur PC via Xbox Cloud Gaming a enflammé les réseaux. Matthew Ball, Chief Strategy Officer de Xbox, a coupé court aux rumeurs : le jeu ne sera pas streamé sur PC et reste strictement sur consoles au lancement.',
    sentiment: 'mixed',
  },
  {
    to: '/news/cinema/spider-man-4-destin-daniel-cretton',
    image: 'spider-man-4-cretton-news.jpg',
    fallbackImage: 'spider-man-4-cretton-news.svg',
    alt: 'Tom Holland dans le rôle de Peter Parker / Spider-Man — photo officielle Sony Pictures / Marvel Studios',
    badge: 'MARVEL · SONY PICTURES',
    kicker: '07.10.2026 · VARIETY',
    title: 'SPIDER-MAN 4 : LE CAP EST FIXÉ.',
    excerpt: 'Destin Daniel Cretton réalisera Spider-Man 4 avec Tom Holland et Zendaya. Sony Pictures et Marvel Studios arrêtent un tournage pour l’été et visent une sortie mondiale en salles en juillet 2027, intercalée entre les prochains Avengers.',
    sentiment: 'positive',
  },
  {
    to: '/news/tech/ai-act-europe-premiers-controles',
    image: 'ai-act-europe-regulation-news.jpg',
    fallbackImage: 'ai-act-europe-controles-news.svg',
    alt: 'Régulation européenne de l’intelligence artificielle — illustration éditoriale originale Let’s Play',
    badge: 'EUROPE · RÉGULATION IA',
    kicker: '07.10.2026 · REUTERS',
    title: 'L’AI ACT : L’EUROPE S’ACTIVE.',
    excerpt: 'Le Bureau européen de l’IA adresse ses premières demandes de conformité aux concepteurs de modèles frontières dépassant 10^25 FLOPs. Les laboratoires ont 30 jours pour documenter leurs systèmes, sous peine d’amendes allant jusqu’à 7 % du chiffre d’affaires mondial.',
    sentiment: 'mixed',
  },
];

// Page intermédiaire : choix entre actus GAMING, actus CINÉMA / SÉRIES et
// actus TECH. Les trois grandes cartes redirigent vers les hubs dédiés ; sous
// les cartes, une bannière reprend l'actu gaming du jour au gabarit de la une
// de l'accueil (vidéo officielle jouable sur place + texte).
export default function News() {
  const { lang } = useLanguage();

  // Bannière « actu gaming du jour » : la première vidéo officielle déclarée
  // pour l'article (src/articleTrailers.js) se lit dans la carte ; à défaut,
  // le visuel de l'actu prend la place du lecteur.
  const todayStory = gamingTopStory;
  const todayVideo = todayStory ? leadTrailer(todayStory.to) : null;
  // À droite du libellé de section : ce que montre le cadre — la vidéo
  // officielle et sa chaîne (« BANDE-ANNONCE OFFICIELLE · ROCKSTAR GAMES »),
  // ou la pastille de l'actu quand c'est son visuel qui est affiché.
  const todayMedia = todayVideo
    ? `${trailerBadgeLabel(todayVideo.kind)} · ${todayVideo.channel.toUpperCase()}`
    : todayStory?.badge;
  const todayCopy = {
    en: { label: 'GAMING NEWS OF THE DAY', eyebrow: 'Gaming news of the day', today: 'News of the day', read: 'Read the story', seeAll: 'All gaming news' },
    fr: { label: 'ACTU GAMING DU JOUR', eyebrow: 'Actu gaming du jour', today: 'Actu du jour', read: 'Lire l’article', seeAll: 'Toutes les actus gaming' },
    ar: { label: 'خبر الألعاب اليوم', eyebrow: 'خبر الألعاب اليوم', today: 'خبر اليوم', read: 'اقرأ المقال', seeAll: 'كل أخبار الألعاب' },
  }[lang] || { label: 'ACTU GAMING DU JOUR', eyebrow: 'Actu gaming du jour', today: 'Actu du jour', read: 'Lire l’article', seeAll: 'Toutes les actus gaming' };

  const todaySectionCopy = {
    en: {
      label: 'TODAY’S HEADLINES',
      date: '07.10.2026',
      eyebrow: 'Fresh from today',
      headingA: 'TODAY’S',
      headingB: 'HEADLINES.',
      read: 'Read article',
    },
    fr: {
      label: 'ACTUALITÉS DU JOUR',
      date: '07.10.2026',
      eyebrow: 'Au cœur de l’actualité',
      headingA: 'LES ACTUS',
      headingB: 'D’AUJOURD’HUI.',
      read: 'Lire l’article',
    },
    ar: {
      label: 'أخبار اليوم',
      date: '07.10.2026',
      eyebrow: 'في قلب الحدث',
      headingA: 'أبرز',
      headingB: 'أخبار اليوم.',
      read: 'اقرأ المقال',
    },
  }[lang] || {
    label: 'ACTUALITÉS DU JOUR',
    date: '07.10.2026',
    eyebrow: 'Au cœur de l’actualité',
    headingA: 'LES ACTUS',
    headingB: 'D’AUJOURD’HUI.',
    read: 'Lire l’article',
  };

  const copy = {
    en: {
      eyebrow: 'Choose your world',
      h1a: 'NEWS',
      h1b: 'HUB.',
      intro: 'Pick a lane — every story, every trailer, every drop, in its own zone.',
      updated: 'Updated daily · 07.10.2026',
      gaming: {
        num: '01',
        kicker: 'GAMING ZONE',
        title: 'GAMING',
        titleAccent: 'NEWS.',
        desc: 'Every announcement, every drop, every trailer and every story that moves the game forward — PC, PlayStation, Xbox, Nintendo and beyond.',
        btn: 'ENTER GAMING NEWS',
        badge: '🎮 GAMING',
        meta: 'PC · PS5 · XBOX · SWITCH 2',
      },
      cinema: {
        num: '02',
        kicker: 'CINEMA & SERIES',
        title: 'CINÉMA &',
        titleAccent: 'SÉRIES.',
        desc: 'Blockbusters, franchises, trailers, casting news and streaming drops — the film & series side of pop culture, curated the Let\'s Play way.',
        btn: 'ENTER CINEMA NEWS',
        badge: '🎬 CINÉMA / SÉRIES',
        meta: 'FILMS · SÉRIES · STREAMING',
      },
      tech: {
        num: '03',
        kicker: 'TECH ZONE',
        title: 'TECH',
        titleAccent: 'NEWS.',
        desc: 'AI, hardware, smartphones, space and cybersecurity — the tech stories that actually move the industry, explained the Let\'s Play way.',
        btn: 'ENTER TECH NEWS',
        badge: '💻 TECH',
        meta: 'AI · HARDWARE · SPACE',
      },
    },
    fr: {
      eyebrow: 'Choisis ton univers',
      h1a: 'ACTUS,',
      h1b: 'À TOI DE JOUER.',
      intro: 'Choisis ta voie — chaque actu, chaque trailer, chaque sortie, regroupé dans son propre univers.',
      updated: 'Mis à jour quotidiennement · 07.10.2026',
      gaming: {
        num: '01',
        kicker: 'ZONE GAMING',
        title: 'ACTUS',
        titleAccent: 'GAMING.',
        desc: 'Chaque annonce, chaque sortie, chaque trailer et chaque histoire qui fait avancer le jeu vidéo — PC, PlayStation, Xbox, Nintendo et plus.',
        btn: 'ENTRER DANS LES ACTUS GAMING',
        badge: '🎮 GAMING',
        meta: 'PC · PS5 · XBOX · SWITCH 2',
      },
      cinema: {
        num: '02',
        kicker: 'CINÉMA & SÉRIES',
        title: 'ACTUS',
        titleAccent: 'CINÉMA.',
        desc: 'Blockbusters, franchises, bandes-annonces, casting et sorties streaming — le côté ciné et séries de la pop culture, à la sauce Let\'s Play.',
        btn: 'ENTRER DANS LES ACTUS CINÉMA',
        badge: '🎬 CINÉMA / SÉRIES',
        meta: 'FILMS · SÉRIES · STREAMING',
      },
      tech: {
        num: '03',
        kicker: 'ZONE TECH',
        title: 'ACTUS',
        titleAccent: 'TECH.',
        desc: 'IA, matériel, smartphones, espace et cybersécurité — les actus tech qui font vraiment bouger l\'industrie, expliquées à la sauce Let\'s Play.',
        btn: 'ENTRER DANS LES ACTUS TECH',
        badge: '💻 TECH',
        meta: 'IA · MATÉRIEL · ESPACE',
      },
    },
    ar: {
      eyebrow: 'اختر عالمك',
      h1a: 'الأخبار',
      h1b: 'بين يديك.',
      intro: 'اختر مسارك — كل خبر، كل إعلان تشويقي، كل إصدار، في مكانه الخاص.',
      updated: 'تحديث يومي · 07.10.2026',
      gaming: {
        num: '01',
        kicker: 'منطقة الألعاب',
        title: 'أخبار',
        titleAccent: 'الألعاب.',
        desc: 'كل إعلان، كل إصدار، كل عرض دعائي وكل قصة تحرّك عالم ألعاب الفيديو.',
        btn: 'دخول أخبار الألعاب',
        badge: '🎮 ألعاب',
        meta: 'PC · PS5 · XBOX · SWITCH 2',
      },
      cinema: {
        num: '02',
        kicker: 'سينما ومسلسلات',
        title: 'أخبار',
        titleAccent: 'السينما.',
        desc: 'أفلام كبيرة، سلاسل، إعلانات، أخبار الممثلين ومنصات البث.',
        btn: 'دخول أخبار السينما',
        badge: '🎬 سينما / مسلسلات',
        meta: 'أفلام · مسلسلات · بث',
      },
      tech: {
        num: '03',
        kicker: 'منطقة التقنية',
        title: 'أخبار',
        titleAccent: 'التقنية.',
        desc: 'الذكاء الاصطناعي، العتاد، الهواتف، الفضاء والأمن السيبراني — أخبار التقنية التي تحرّك الصناعة فعلاً.',
        btn: 'دخول أخبار التقنية',
        badge: '💻 تقنية',
        meta: 'ذكاء اصطناعي · عتاد · فضاء',
      },
    },
  }[lang] || {
    eyebrow: 'Choisis ton univers',
    h1a: 'ACTUS,',
    h1b: 'À TOI DE JOUER.',
    intro: 'Choisis ta voie.',
    updated: 'Mis à jour quotidiennement · 07.10.2026',
    gaming: { num: '01', kicker: 'ZONE GAMING', title: 'ACTUS', titleAccent: 'GAMING.', desc: 'Les actus gaming.', btn: 'ENTRER', badge: '🎮 GAMING', meta: 'PC · PS5 · XBOX · SWITCH 2' },
    cinema: { num: '02', kicker: 'CINÉMA & SÉRIES', title: 'ACTUS', titleAccent: 'CINÉMA.', desc: 'Les actus cinéma.', btn: 'ENTRER', badge: '🎬 CINÉMA', meta: 'FILMS · SÉRIES' },
    tech: { num: '03', kicker: 'ZONE TECH', title: 'ACTUS', titleAccent: 'TECH.', desc: 'Les actus tech.', btn: 'ENTRER', badge: '💻 TECH', meta: 'IA · MATÉRIEL · ESPACE' },
  };

  return (
    <section className="news-hub-section">
      <div className="news-hub-head wrap">
        <div className="section-label"><span>02 / NEWS HUB</span><span>{copy.updated}</span></div>
        <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p>
        {/* Gros titre retiré du visuel : le h1 ne reste que pour les lecteurs
            d'écran et le référencement (invisible à l'affichage). */}
        <h1 className="sr-only">{copy.h1a} {copy.h1b}</h1>
        <p className="news-hub-intro">{copy.intro}</p>
      </div>

      <div className="news-hub-grid wrap">
        {/* Carte GAMING */}
        <Link to="/news/gaming" className="news-hub-card news-hub-card--gaming">
          <div className="news-hub-card-image">
            <img src={`${base}category-gaming-thumb.jpg`} alt="Actus Gaming — manette néon sur fond cyberpunk" />
            <div className="news-hub-card-overlay" />
            <span className="news-feature-badge">{copy.gaming.badge}</span>
            <span className="news-hub-card-num">{copy.gaming.num}</span>
          </div>
          <div className="news-hub-card-copy">
            <span className="news-kicker">{copy.gaming.kicker}</span>
            <h2>{copy.gaming.title} <em>{copy.gaming.titleAccent}</em></h2>
            <p>{copy.gaming.desc}</p>
            <div className="news-hub-card-meta">
              <span>{copy.gaming.meta}</span>
              <span className="read-link">{copy.gaming.btn} <Arrow /></span>
            </div>
          </div>
        </Link>

        {/* Carte CINÉMA / SÉRIES */}
        <Link to="/news/cinema" className="news-hub-card news-hub-card--cinema">
          <div className="news-hub-card-image">
            <img src={`${base}category-cinema-thumb.jpg`} alt="Actus Cinéma & Séries — clap et bobine de film sous un projecteur" />
            <div className="news-hub-card-overlay" />
            <span className="news-feature-badge">{copy.cinema.badge}</span>
            <span className="news-hub-card-num">{copy.cinema.num}</span>
          </div>
          <div className="news-hub-card-copy">
            <span className="news-kicker">{copy.cinema.kicker}</span>
            <h2>{copy.cinema.title} <em>{copy.cinema.titleAccent}</em></h2>
            <p>{copy.cinema.desc}</p>
            <div className="news-hub-card-meta">
              <span>{copy.cinema.meta}</span>
              <span className="read-link">{copy.cinema.btn} <Arrow /></span>
            </div>
          </div>
        </Link>

        {/* Carte TECH */}
        <Link to="/news/tech" className="news-hub-card news-hub-card--tech">
          <div className="news-hub-card-image">
            <img src={`${base}category-tech-thumb.jpg`} alt="Actus Tech — puce et interface holographique sous les néons, main robotisée" />
            <div className="news-hub-card-overlay" />
            <span className="news-feature-badge">{copy.tech.badge}</span>
            <span className="news-hub-card-num">{copy.tech.num}</span>
          </div>
          <div className="news-hub-card-copy">
            <span className="news-kicker">{copy.tech.kicker}</span>
            <h2>{copy.tech.title} <em>{copy.tech.titleAccent}</em></h2>
            <p>{copy.tech.desc}</p>
            <div className="news-hub-card-meta">
              <span>{copy.tech.meta}</span>
              <span className="read-link">{copy.tech.btn} <Arrow /></span>
            </div>
          </div>
        </Link>
      </div>

      {/* LES ACTUS DU JOUR (07.10.2026) : 3 cartes avec miniatures dédiées pour Gaming, Cinéma et Tech */}
      <section className="featured-dossiers featured-dossiers--news wrap" id="actus-du-jour" style={{ marginTop: '56px' }}>
        <div className="section-label">
          <span>{todaySectionCopy.label}</span>
          <span>{todaySectionCopy.date}</span>
        </div>
        <div className="featured-dossiers-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {todaySectionCopy.eyebrow}</p>
            <h2>{todaySectionCopy.headingA}<br /><em>{todaySectionCopy.headingB}</em></h2>
          </div>
        </div>

        <div className="news-carousel is-grid">
          {todayStories.map((story) => (
            <div className="news-grid-cell" key={story.to}>
              <Link
                className="news-carousel-card"
                to={story.to}
              >
                <div className="news-carousel-image">
                  <img
                    src={imageUrl(story.image)}
                    alt={story.alt}
                    loading="lazy"
                    onError={(event) => {
                      if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
                        event.currentTarget.dataset.fallback = 'true';
                        event.currentTarget.src = imageUrl(story.fallbackImage);
                      }
                    }}
                  />
                  <span className="news-feature-badge">{story.badge}</span>
                  <span className="news-feature-arrow">↗</span>
                  <span
                    className={`news-sentiment ${story.sentiment}`}
                    title={story.badge}
                    aria-label={story.badge}
                  >
                    {story.sentiment === 'positive' ? '😊' : '😐'}
                  </span>
                </div>
                <div className="news-carousel-copy">
                  <span className="news-kicker">{story.kicker}</span>
                  <h2>{story.title}</h2>
                  <p>{story.excerpt}</p>
                  <span className="read-link">{todaySectionCopy.read} <Arrow /></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ACTU GAMING DU JOUR — même carte que la une de l'accueil (Home.jsx) :
          lecteur YouTube du site à gauche, texte cliquable à droite. Les
          classes `featured-dossiers--news` / `home-news-card` sont celles de
          l'accueil (daily-news.css) ; `news-hub-today` n'ajuste que
          l'espacement et le visuel de repli (news-carousel.css). */}
      {todayStory && (
        <section className="featured-dossiers featured-dossiers--news news-hub-today wrap" id="actu-gaming-du-jour">
          <div className="section-label"><span>{todayCopy.label}</span><span>{todayMedia}</span></div>
          <div className="featured-dossiers-head">
            <p className="eyebrow"><span className="live-dot" /> {todayCopy.eyebrow}</p>
            <Link className="arrow-link" to="/news/gaming">{todayCopy.seeAll} <Arrow /></Link>
          </div>
          <article className="daily-news-card home-news-card">
            <div className="daily-news-image home-news-video">
              {todayVideo ? (
                <iframe
                  src={youTubeEmbedUrl(todayVideo.id)}
                  title={`${todayVideo.title} — ${todayVideo.channel}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <img
                  src={imageUrl(todayStory.image)}
                  alt={todayStory.alt}
                  loading="lazy"
                  onError={(event) => {
                    if (todayStory.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
                      event.currentTarget.dataset.fallback = 'true';
                      event.currentTarget.src = imageUrl(todayStory.fallbackImage);
                    }
                  }}
                />
              )}
              <span className="news-feature-badge">{todayStory.badge}</span>
            </div>
            <Link
              className="daily-news-copy"
              to={todayStory.to}
              aria-label={`${todayCopy.read} : ${todayStory.title}`}
            >
              <p className="eyebrow"><span className="live-dot" /> {todayCopy.today}</p>
              <span className="news-kicker">{todayStory.kicker}</span>
              <h3>{todayStory.title}</h3>
              <p>{todayStory.excerpt}</p>
              <span className="read-link">{todayCopy.read} <Arrow /></span>
            </Link>
          </article>
        </section>
      )}

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> NEXT LEVEL UNLOCKED</p>
          <h2>THREE WORLDS,<br /><em>ONE PRESS START.</em></h2>
        </div>
        <Link className="button button-yellow" to="/">RETOUR À L'ACCUEIL <Arrow /></Link>
      </section>
    </section>
  );
}
