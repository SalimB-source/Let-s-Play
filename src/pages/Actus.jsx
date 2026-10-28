import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

const copyByLanguage = {
  fr: {
    eyebrow: 'LE MAGAZINE LET’S PLAY',
    title: 'ACTUS',
    intro: 'Toute la pop culture en un seul endroit : les dernières infos, nos tests, des dossiers pour aller plus loin et les talents du jeu vidéo algérien.',
    cards: [
      { title: 'News', category: 'À LA UNE', description: 'Les dernières actualités gaming, cinéma, séries et tech.', href: '/news', image: 'category-gaming-thumb.jpg', alt: 'Univers du jeu vidéo', tone: 'news' },
      { title: 'Tests', category: 'ON A JOUÉ', description: 'Nos avis, analyses et verdicts sur les jeux du moment.', href: '/reviews', image: 'reviews/onimusha.jpg', alt: 'Visuel du jeu Onimusha', tone: 'tests' },
      { title: 'Dossiers', category: 'GRAND FORMAT', description: 'Des enquêtes et des récits pour explorer la culture gaming.', href: '/dossiers', image: 'category-cinema-thumb.jpg', alt: 'Culture cinéma et pop culture', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'SCÈNE ALGÉRIENNE', description: 'À la rencontre des studios et créateurs de jeux en Algérie.', href: '/dz-dev', image: 'hicosoft-studio-lets-play.jpg', alt: 'Studio algérien de jeux vidéo', tone: 'dzdev' },
    ],
  },
  en: {
    eyebrow: 'THE LET’S PLAY MAGAZINE',
    title: 'EDITORIAL',
    intro: 'All of pop culture in one place: the latest news, our reviews, in-depth features, and the people shaping Algeria’s game scene.',
    cards: [
      { title: 'News', category: 'LATEST', description: 'The latest in gaming, film, series, and technology.', href: '/news', image: 'category-gaming-thumb.jpg', alt: 'Video game worlds', tone: 'news' },
      { title: 'Reviews', category: 'WE PLAYED', description: 'Our reviews, analysis, and verdicts on new games.', href: '/reviews', image: 'reviews/onimusha.jpg', alt: 'Onimusha game artwork', tone: 'tests' },
      { title: 'Features', category: 'IN DEPTH', description: 'Stories and investigations exploring gaming culture.', href: '/dossiers', image: 'category-cinema-thumb.jpg', alt: 'Film and pop culture', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'ALGERIAN SCENE', description: 'Meet the studios and game creators building in Algeria.', href: '/dz-dev', image: 'hicosoft-studio-lets-play.jpg', alt: 'An Algerian game studio', tone: 'dzdev' },
    ],
  },
  ar: {
    eyebrow: 'مجلة ليتس بلاي',
    title: 'أخبار ومقالات',
    intro: 'كل ثقافة الألعاب في مكان واحد: آخر الأخبار، مراجعاتنا، ملفات معمّقة، ومبدعو ألعاب الفيديو في الجزائر.',
    cards: [
      { title: 'أخبار', category: 'الأحدث', description: 'آخر أخبار الألعاب والسينما والمسلسلات والتقنية.', href: '/news', image: 'category-gaming-thumb.jpg', alt: 'عوالم ألعاب الفيديو', tone: 'news' },
      { title: 'مراجعات', category: 'جرّبناها', description: 'آراؤنا وتحليلاتنا حول أحدث الألعاب.', href: '/reviews', image: 'reviews/onimusha.jpg', alt: 'صورة لعبة Onimusha', tone: 'tests' },
      { title: 'ملفات', category: 'قراءة معمّقة', description: 'قصص وتحقيقات تستكشف ثقافة الألعاب.', href: '/dossiers', image: 'category-cinema-thumb.jpg', alt: 'السينما والثقافة الشعبية', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'المشهد الجزائري', description: 'تعرّف إلى استوديوهات ومطوري الألعاب في الجزائر.', href: '/dz-dev', image: 'hicosoft-studio-lets-play.jpg', alt: 'استوديو ألعاب جزائري', tone: 'dzdev' },
    ],
  },
};

export default function Actus() {
  const { lang } = useLanguage();
  const copy = copyByLanguage[lang] || copyByLanguage.fr;

  return (
    <main className="actus-page">
      <section className="actus-section" aria-labelledby="actus-title">
        <div className="actus-inner">
          <header className="actus-heading">
            <span className="actus-eyebrow">{copy.eyebrow}</span>
            <h1 id="actus-title">{copy.title}<span>.</span></h1>
            <p>{copy.intro}</p>
          </header>
          <div className="actus-grid">
            {copy.cards.map((card, index) => (
              <Link className={`actus-card actus-card--${card.tone}`} to={card.href} key={card.href}>
                <div className="actus-card-image">
                  <img src={`${base}${card.image}`} alt={card.alt} loading={index > 1 ? 'lazy' : 'eager'} />
                  <span className="actus-card-number" aria-hidden="true">0{index + 1}</span>
                  <span className="actus-card-image-shade" aria-hidden="true" />
                </div>
                <div className="actus-card-copy">
                  <span className="actus-card-category">{card.category}</span>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                  <span className="actus-card-action" aria-hidden="true"><span>↗</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
