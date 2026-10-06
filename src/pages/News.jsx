import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';

// Page intermédiaire : choix entre actus GAMING, actus CINÉMA / SÉRIES et
// actus TECH. Les trois grandes cartes redirigent vers les hubs dédiés.
export default function News() {
  const { lang } = useLanguage();

  const copy = {
    en: {
      eyebrow: 'Choose your world',
      h1a: 'NEWS',
      h1b: 'HUB.',
      intro: 'Pick a lane — every story, every trailer, every drop, in its own zone.',
      updated: 'Updated daily · 06.10.2026',
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
      updated: 'Mis à jour quotidiennement · 06.10.2026',
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
      updated: 'تحديث يومي · 06.10.2026',
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
    updated: 'Mis à jour quotidiennement · 06.10.2026',
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
