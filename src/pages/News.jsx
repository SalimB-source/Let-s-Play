import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function News(){
  const { t } = useLanguage();
  const million = t.news.million || t.news.featured;
  const carouselRef = useRef(null);
  const [view, setView] = useState('carousel');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date('2026-09-15T00:00:00');
    const updateCountdown = () => {
      const remaining = Math.max(0, target.getTime() - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      setCountdown({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const scrollCards = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth * 0.82, behavior: 'smooth' });
  };

  const articles = [
    { to: '/news/monster-hunter-wilds', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Monster Hunter Wilds sur Nintendo Switch 2', badge: 'MONSTER HUNTER · SWITCH 2', kicker: '09.09.2026 · CAPCOM', title: 'WILDS ARRIVE SUR SWITCH 2.', excerpt: 'Monster Hunter Wilds dévoile ses premières images sur Switch 2 et fixe sa sortie au 4 décembre 2026.', read: 'LIRE L’ARTICLE' },
    { to: '/news/zelda-40th', image: 'zelda-40th-switch2.jpg', alt: 'The Legend of Zelda Ocarina of Time sur Nintendo Switch 2', badge: 'ZELDA · 40 ANS', kicker: '08.09.2026 · NINTENDO', title: 'ZELDA FÊTE SES 40 ANS.', excerpt: 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo pour accompagner le retour d’Ocarina of Time.', read: 'LIRE L’ARTICLE' },
    { to: '/news/physint', image: 'physint-news.jpg', alt: t.news.featured.alt, badge: t.news.featured.badge, kicker: t.news.featured.kicker, title: t.news.featured.title, excerpt: t.news.featured.excerpt, read: t.news.featured.read },
    { to: '/news/metroid-ravenous', image: 'metroid-ravenous-news.png', alt: t.news.metroid.coverAlt, badge: t.news.metroid.eyebrow, kicker: `${t.news.metroid.date} · ${t.news.platforms}`, title: `${t.news.metroid.title} ${t.news.metroid.titleAccent}`, excerpt: t.news.metroid.dek, read: t.news.metroid.back },
    { to: '/news/wardogs', image: 'wardogs-news.jpg', alt: t.news.wardogs.coverAlt, badge: t.news.wardogs.eyebrow, kicker: `${t.news.wardogs.date} · ${t.news.consolePlatforms}`, title: `${t.news.wardogs.title} ${t.news.wardogs.titleAccent}`, excerpt: t.news.wardogs.dek, read: t.news.wardogs.back },
    { to: '/news/zelda-ocarina', image: 'zelda-ocarina-news.jpg', alt: t.news.zelda.coverAlt, badge: t.news.zelda.eyebrow, kicker: `${t.news.zelda.date} · ${t.news.platforms}`, title: `${t.news.zelda.title} ${t.news.zelda.titleAccent}`, excerpt: t.news.zelda.dek, read: t.news.zelda.back },
    { to: '/news/onimusha-million', image: 'onimusha-million-news.jpg', alt: million.coverAlt || million.alt, badge: million.eyebrow || million.badge, kicker: `${million.date || million.kicker} · CAPCOM`, title: `${million.title} ${million.titleAccent || ''}`, excerpt: million.dek || million.excerpt, read: million.back || million.read },
  ];

  const septemberReleases = [
    ['01 SEP', 'Crimson Moon', 'PC · PS5 · XBOX SERIES'], ['02 SEP', 'Moonlighter 2: The Endless Vault', 'PC · PS5 · XBOX SERIES · SWITCH 2'], ['03 SEP', 'The Blood of Dawnwalker', 'PC · PS5 · XBOX SERIES'], ['04 SEP', 'Onimusha: Way of the Sword', 'PC · PS5 · XBOX SERIES · SWITCH 2'], ['10 SEP', 'Wardogs', 'PC'], ['15 SEP', 'Marvel’s Wolverine', 'PS5'], ['17 SEP', 'Fire Emblem: Fortune’s Weave', 'SWITCH 2'], ['18 SEP', 'LEGO Batman: Legacy of the Dark Knight', 'SWITCH 2'], ['24 SEP', 'Control Resonant', 'PC · PS5 · XBOX SERIES'], ['24 SEP', 'Silent Hill Townfall', 'PC · PS5'], ['25 SEP', 'EA Sports FC 27', 'PC · PS5 · XBOX · SWITCH'], ['29 SEP', 'The Witcher 3: Wild Hunt – Remastered', 'PC · PS5 · XBOX SERIES · SWITCH 2'],
  ];

  return (
    <>
      <section className="news-carousel-section wrap">
        <div className="section-label"><span><b>01</b> / {t.news.featuredLabel}</span><span>{t.news.updatedLabel}</span></div>
        <div className="news-carousel-head">
          <div><p className="eyebrow"><span className="live-dot" /> {t.news.eyebrow}</p><h1>{t.news.h1a}<br/><em>{t.news.h1b}</em></h1></div>
          <div className="news-view-tools">
            <div className="news-view-toggle" role="group" aria-label="News display mode">
              <button type="button" className={view === 'carousel' ? 'active' : ''} onClick={() => setView('carousel')} aria-pressed={view === 'carousel'}>Carousel</button>
              <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'}>Grid</button>
            </div>
            {view === 'carousel' && <div className="news-carousel-controls" aria-label="News carousel controls"><button type="button" onClick={() => scrollCards(-1)} aria-label="Previous articles">←</button><button type="button" onClick={() => scrollCards(1)} aria-label="Next articles">→</button></div>}
          </div>
        </div>
        <div className={`news-carousel${view === 'grid' ? ' is-grid' : ''}`} ref={carouselRef}>
          {articles.map((article) => <Link className="news-carousel-card" to={article.to} key={article.to}>
            <div className="news-carousel-image"><img src={`${base}${article.image}`} alt={article.alt} /><span className="news-feature-badge">{article.badge}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{article.kicker}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="read-link">{article.read} <Arrow/></span></div>
          </Link>)}
        </div>
      </section>
      <section className="daily-news wrap">
        <div className="section-label"><span><b>02</b> / NEWS PRINCIPALE</span><span>10.09.2026 · HARDWARE</span></div>
        <div className="daily-news-card">
          <div className="daily-news-image"><iframe src="https://www.youtube.com/embed/SKiTOBHyzmo?autoplay=1&mute=1&playsinline=1&rel=0" title="Présentation de la manette officielle GTA 6 DualSense" allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
          <Link className="daily-news-copy" to="/news/gta6-dualsense"><p className="eyebrow"><span className="live-dot" /> NEWS PRINCIPALE DU JOUR</p><h2>LA DUALSENSE<br/><em>DE GTA 6.</em></h2><p>La manette officielle inspirée de Vice City ouvre ses précommandes. Un objet collector qui pourrait ne pas rester longtemps disponible.</p><span className="read-link">LIRE L’ARTICLE <Arrow/></span></Link>
        </div>
      </section>
      <section className="monthly-releases wrap">
        <div className="section-label"><span><b>03</b> / SORTIES DU MOIS</span><span>SEPTEMBRE 2026</span></div>
        <div className="monthly-releases-head"><div><p className="eyebrow"><span className="live-dot" /> CALENDRIER GAMING</p><h2>SEPTEMBRE<br/><em>À JOUER.</em></h2></div><a className="arrow-link" href="https://www.actugaming.net/calendrier-sorties-jeux-video-septembre-2026-821860/" target="_blank" rel="noreferrer">VOIR LE CALENDRIER COMPLET <Arrow/></a></div>
        <div className="release-countdown"><div className="release-countdown-image"><img src={`${base}wolverine-countdown.jpg`} alt="Marvel’s Wolverine" /></div><div className="release-countdown-copy"><p className="eyebrow"><span className="live-dot" /> LE PLUS ATTENDU</p><h3>MARVEL’S <em>WOLVERINE</em></h3><p>Disponible le 15 septembre sur PS5.</p></div><div className="countdown-units" aria-label="Compte à rebours avant la sortie de Marvel's Wolverine">{[['JOURS', countdown.days], ['HEURES', countdown.hours], ['MIN', countdown.minutes], ['SEC', countdown.seconds]].map(([label, value]) => <div className="countdown-unit" key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}</div></div>
        <div className="release-grid">{septemberReleases.map(([date, title, platforms]) => <div className="release-card" key={`${date}-${title}`}><span className="release-date">{date}</span><h3>{title}</h3><span className="release-platforms">{platforms}</span></div>)}</div>
      </section>
      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
