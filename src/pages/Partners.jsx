import React from 'react';
import { Link } from 'react-router-dom';
import { partnerUrls } from '../partnersData';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const events = [
  {
    slug: '/events/algerie-telecom',
    eyebrow: 'Partenariat 01',
    titleA: 'LET’S PLAY',
    titleB: '× ALGÉRIE TÉLÉCOM.',
    text: 'Un an de collaboration : production, diffusion et rendez-vous avec la communauté gaming algérienne.',
    meta: '12 MOIS · PARTENAIRE DE DIFFUSION',
    image: 'partners/algerie-telecom.png',
    imageFit: 'contain',
  },
  {
    slug: '/events/ooredoo',
    eyebrow: 'Partenariat 02',
    titleA: 'LET’S PLAY',
    titleB: '× OOREDOO.',
    text: 'Six mois d’activation autour de l’émission, avec un tournoi à la clé pour la communauté.',
    meta: '6 MOIS · ANNONCEUR · TOURNOI',
    image: 'partners/ooredoo.png',
    imageFit: 'contain',
  },
  {
    slug: '/events/7ouma-arena',
    eyebrow: 'Partenariat 03',
    titleA: '7OUMA',
    titleB: 'ARENA.',
    text: 'L’émission et le tournoi montés par l’équipe Let’s Play, EGOR Gaming et Djezzy.',
    meta: 'ÉMISSION · TOURNOI · EGOR × DJEZZY',
    image: 'partners/7ouma-arena.png',
    imageFit: 'contain',
  },
];

const copy = {
  fr: {
    label: 'PAGE / EVENTS',
    meta: 'PARTENARIATS · ÉMISSIONS · TOURNOIS',
    eyebrow: 'Les rendez-vous',
    titleA: 'NOS EVENTS,',
    titleB: 'EN ARTICLES.',
    intro: 'Chaque collaboration a sa page. On commence par les trois partenariats qui ont marqué Let’s Play — d’autres suivront.',
    more: 'D’autres partenariats seront ajoutés ici au fil des collaborations.',
    read: 'Lire l’article',
  },
  en: {
    label: 'PAGE / EVENTS',
    meta: 'PARTNERSHIPS · SHOWS · TOURNAMENTS',
    eyebrow: 'The appointments',
    titleA: 'OUR EVENTS,',
    titleB: 'AS ARTICLES.',
    intro: 'Each collaboration has its own page. We start with the three partnerships that defined Let’s Play — more will follow.',
    more: 'More partnerships will be added here as collaborations continue.',
    read: 'Read the article',
  },
  ar: {
    label: 'صفحة / الفعاليات',
    meta: 'شراكات · برامج · بطولات',
    eyebrow: 'المواعيد',
    titleA: 'فعالياتنا،',
    titleB: 'كمقالات.',
    intro: 'لكل تعاون صفحته. نبدأ بثلاث شراكات صنعت Let’s Play — وسنضيف غيرها لاحقًا.',
    more: 'ستُضاف شراكات أخرى هنا مع استمرار التعاون.',
    read: 'اقرأ المقال',
  },
};

const base = import.meta.env.BASE_URL;

export default function Partners() {
  const { lang } = useLanguage();
  const page = copy[lang] || copy.fr;

  return (
    <div className="dossiers-page">
      <section className="page-hero wrap">
        <div className="section-label">
          <span><b>{page.label.split(' / ')[0]}</b> / {page.label.split(' / ')[1]}</span>
          <span>{page.meta}</span>
        </div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {page.eyebrow}</p>
            <h1>{page.titleA}<br /><em>{page.titleB}</em></h1>
            <p className="page-hero-text">{page.intro}</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{ backgroundImage: `url(${partnerUrls.heroVisual})` }} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>03</strong>
              <small>{page.meta}</small>
            </div>
          </div>
        </div>
      </section>

      {events.map((event, index) => (
        <section className={`dossier-feature-card wrap${index ? ' dossier-feature-card-secondary' : ''}`} key={event.slug}>
          <div className="dossier-feature-card-copy">
            <p className="eyebrow"><span className="live-dot" /> {event.eyebrow}</p>
            <h2>{event.titleA}<br /><em>{event.titleB}</em></h2>
            <p>{event.text}</p>
            <Link className="arrow-link" to={event.slug}>{page.read} <Arrow /></Link>
          </div>
          <Link
            className="dossier-feature-card-media hud-frame"
            to={event.slug}
            aria-label={page.read}
            style={{ background: '#fff', display: 'grid', placeItems: 'center' }}
          >
            <img
              src={`${base}${event.image}`}
              alt=""
              style={{ objectFit: event.imageFit, padding: '18%', filter: 'none' }}
            />
            <span>{event.meta}</span>
          </Link>
        </section>
      ))}

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> Events</p>
          <h2>{page.more}</h2>
        </div>
      </section>
    </div>
  );
}
