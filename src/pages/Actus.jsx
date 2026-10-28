import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const copyByLanguage = {
  fr: {
    eyebrow: 'LE MAGAZINE LET’S PLAY',
    title: 'ACTUS',
    intro: 'Toute la pop culture en un seul endroit : les dernières infos, nos tests, des dossiers pour aller plus loin et les talents du jeu vidéo algérien.',
    cards: [
      { title: 'News', category: 'À LA UNE', description: 'Les dernières actualités gaming, cinéma, séries et tech.', href: '/news', icon: 'news', tone: 'news' },
      { title: 'Tests', category: 'ON A JOUÉ', description: 'Nos avis, analyses et verdicts sur les jeux du moment.', href: '/reviews', icon: 'tests', tone: 'tests' },
      { title: 'Dossiers', category: 'GRAND FORMAT', description: 'Des enquêtes et des récits pour explorer la culture gaming.', href: '/dossiers', icon: 'dossiers', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'SCÈNE ALGÉRIENNE', description: 'À la rencontre des studios et créateurs de jeux en Algérie.', href: '/dz-dev', icon: 'dzdev', tone: 'dzdev' },
    ],
  },
  en: {
    eyebrow: 'THE LET’S PLAY MAGAZINE',
    title: 'EDITORIAL',
    intro: 'All of pop culture in one place: the latest news, our reviews, in-depth features, and the people shaping Algeria’s game scene.',
    cards: [
      { title: 'News', category: 'LATEST', description: 'The latest in gaming, film, series, and technology.', href: '/news', icon: 'news', tone: 'news' },
      { title: 'Reviews', category: 'WE PLAYED', description: 'Our reviews, analysis, and verdicts on new games.', href: '/reviews', icon: 'tests', tone: 'tests' },
      { title: 'Features', category: 'IN DEPTH', description: 'Stories and investigations exploring gaming culture.', href: '/dossiers', icon: 'dossiers', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'ALGERIAN SCENE', description: 'Meet the studios and game creators building in Algeria.', href: '/dz-dev', icon: 'dzdev', tone: 'dzdev' },
    ],
  },
  ar: {
    eyebrow: 'مجلة ليتس بلاي',
    title: 'أخبار ومقالات',
    intro: 'كل ثقافة الألعاب في مكان واحد: آخر الأخبار، مراجعاتنا، ملفات معمّقة، ومبدعو ألعاب الفيديو في الجزائر.',
    cards: [
      { title: 'أخبار', category: 'الأحدث', description: 'آخر أخبار الألعاب والسينما والمسلسلات والتقنية.', href: '/news', icon: 'news', tone: 'news' },
      { title: 'مراجعات', category: 'جرّبناها', description: 'آراؤنا وتحليلاتنا حول أحدث الألعاب.', href: '/reviews', icon: 'tests', tone: 'tests' },
      { title: 'ملفات', category: 'قراءة معمّقة', description: 'قصص وتحقيقات تستكشف ثقافة الألعاب.', href: '/dossiers', icon: 'dossiers', tone: 'dossiers' },
      { title: 'DZ Dev', category: 'المشهد الجزائري', description: 'تعرّف إلى استوديوهات ومطوري الألعاب في الجزائر.', href: '/dz-dev', icon: 'dzdev', tone: 'dzdev' },
    ],
  },
};

function CardIcon({ kind }) {
  const details = { fill: '#10142b' };
  const artwork = {
    news: <><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Z" /><path {...details} d="M6.5 7h4.5v5H6.5zM13 7h5v1.5h-5zM13 10h5v1.5h-5zM6.5 14h11.5v1.5H6.5zM6.5 17h11.5v1.5H6.5z" /></>,
    tests: <><path d="M7.1 7.5h9.8a5.1 5.1 0 0 1 4.9 6.6l-1.1 3.6a2.6 2.6 0 0 1-4.3 1.2L14 16.7h-4l-2.4 2.2a2.6 2.6 0 0 1-4.3-1.2l-1.1-3.6a5.1 5.1 0 0 1 4.9-6.6Z" /><path {...details} d="M7.2 10.4h1.8v2.1h2.1v1.8H9v2.1H7.2v-2.1H5.1v-1.8h2.1z" /><circle {...details} cx="16.2" cy="12" r="1.2" /><circle {...details} cx="18.3" cy="14.6" r="1.2" /></>,
    dossiers: <><path d="M12 7.1C9.3 4.9 5.3 4.4 2.5 5.8v13.7c3.3-1.3 6.9-.7 9.5 1.5 2.6-2.2 6.2-2.8 9.5-1.5V5.8c-2.8-1.4-6.8-.9-9.5 1.3Z" /><path {...details} d="M11 8.6C8.9 7.2 6.1 6.9 4.2 7.7v1.6c2-.8 4.8-.5 6.8.9zm2 0c2.1-1.4 4.9-1.7 6.8-.9v1.6c-2-.8-4.8-.5-6.8.9zM4.2 12c2-.8 4.8-.5 6.8.9v1.6c-2-1.4-4.8-1.7-6.8-.9zm15.6 0c-2-.8-4.8-.5-6.8.9v1.6c2-1.4 4.8-1.7 6.8-.9z" /></>,
    dzdev: <><path d="m8.5 4.7 1.8 1.8L5.8 12l4.5 5.5-1.8 1.8L2.5 12zm7 0-1.8 1.8 4.5 5.5-4.5 5.5 1.8 1.8 6-7.3zm-2.1-1.2 2.1.5-4 16.5-2.1-.5z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">{artwork[kind]}</svg>;
}

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
                <div className="actus-card-visual">
                  <span className="actus-card-number" aria-hidden="true">0{index + 1}</span>
                  <span className="actus-card-icon"><CardIcon kind={card.icon} /></span>
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
