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
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const artwork = {
    news: <><path d="M5 4.5h14v16H5z" /><path d="M8 8h8M8 11.5h8M8 15h4M16 15h1" /><path d="M3 7v12a2 2 0 0 0 2 2" /></>,
    tests: <><path d="M7.5 8h9a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.5a2 2 0 0 1-3.3.9l-2.2-2h-4.4l-2.2 2a2 2 0 0 1-3.3-.9l-1.1-3.5A4.5 4.5 0 0 1 7.5 8Z" /><path d="M8 11v4M6 13h4" /><circle cx="16" cy="12" r=".8" /><circle cx="18" cy="14.5" r=".8" /></>,
    dossiers: <><path d="M12 7.5c-2.2-2-5.2-2.5-8-1.5v12c2.8-1 5.8-.5 8 1.5 2.2-2 5.2-2.5 8-1.5V6c-2.8-1-5.8-.5-8 1.5Z" /><path d="M12 7.5v12M7 9.5c1.2 0 2.2.3 3 .8M17 9.5c-1.2 0-2.2.3-3 .8M7 13c1.2 0 2.2.3 3 .8M17 13c-1.2 0-2.2.3-3 .8" /></>,
    dzdev: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}>{artwork[kind]}</svg>;
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
                  <span className="actus-card-orbit" aria-hidden="true" />
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
