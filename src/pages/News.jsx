import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { septemberReleases, releaseDate, releaseDayLabel, daysInReleaseMonth, isPastRelease, isReleaseToday, findRelease, RELEASE_YEAR, RELEASE_MONTH } from '../releasesData';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

const wolverineRelease = findRelease('marvels-wolverine');

export default function News(){
  const { t } = useLanguage();
  const million = t.news.million || t.news.featured;
  const carouselRef = useRef(null);
  const [view, setView] = useState('carousel');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = wolverineRelease ? releaseDate(wolverineRelease) : new Date(Date.now() + 86400000);
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

  const today = new Date();
  const isReleaseMonth = today.getFullYear() === RELEASE_YEAR && today.getMonth() === RELEASE_MONTH - 1;
  const todayDay = isReleaseMonth ? today.getDate() : null;
  const pastReleases = septemberReleases.filter((release) => isPastRelease(release, today));
  const todayReleases = septemberReleases.filter((release) => isReleaseToday(release, today));
  const pastCount = pastReleases.length + todayReleases.length;
  const upcomingCount = septemberReleases.length - pastCount;
  const monthDays = daysInReleaseMonth();
  // Un point par jour de sortie (les doublons du même jour s'empilent).
  const timelineDays = [];
  for (let day = 1; day <= monthDays; day += 1){
    const onDay = septemberReleases.filter((release) => release.day === day);
    if (onDay.length > 0) timelineDays.push({ day, releases: onDay, past: onDay.every((release) => isPastRelease(release, today)) });
  }

  return (
    <>
      <section className="monthly-releases wrap">
        <div className="section-label"><span><b>01</b> / SORTIES DU MOIS</span><span>SEPTEMBRE 2026</span></div>
        <div className="monthly-releases-head"><div><p className="eyebrow"><span className="live-dot" /> CALENDRIER GAMING</p><h2>SEPTEMBRE<br/><em>À JOUER.</em></h2></div><span className="arrow-link">VOIR LE CALENDRIER COMPLET <Arrow/></span></div>
        <div className="release-timeline" role="img" aria-label={`Frise de septembre 2026 — ${pastCount} sorties déjà parues, ${upcomingCount} à venir${todayDay ? `, nous sommes le ${todayDay}` : ''}`}>
          <div className="release-timeline-scale"><span>01</span><span>05</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span></div>
          <div className="release-timeline-track">
            {timelineDays.map(({ day, releases, past }) => (
              <span
                key={day}
                className={`release-timeline-dot${past ? ' is-past' : ''}${releases.length > 1 ? ' is-double' : ''}`}
                style={{ left: `${((day - 0.5) / monthDays) * 100}%` }}
                title={`${releaseDayLabel({ day })} — ${releases.map((release) => release.title).join(' · ')}`}
              >{releases.length > 1 ? <b>{releases.length}</b> : null}</span>
            ))}
            {todayDay ? <span className="release-timeline-today" style={{ left: `${((todayDay - 0.5) / monthDays) * 100}%` }}><em>AUJOURD’HUI</em></span> : null}
          </div>
          <div className="release-timeline-meta">
            <span className="release-timeline-counter"><b>{pastCount}</b> DÉJÀ SORTIS · <b>{upcomingCount}</b> À VENIR</span>
          </div>
        </div>
        <div className="release-countdown"><div className="release-countdown-image"><img src={`${base}wolverine-countdown.jpg`} alt="Marvel’s Wolverine" /></div><div className="release-countdown-copy"><p className="eyebrow"><span className="live-dot" /> LE PLUS ATTENDU</p><h3>MARVEL’S <em>WOLVERINE</em></h3><p>Disponible le {wolverineRelease ? `${wolverineRelease.day} septembre` : '15 septembre'} sur PS5.</p></div><div className="countdown-units" aria-label="Compte à rebours avant la sortie de Marvel's Wolverine">{[['JOURS', countdown.days], ['HEURES', countdown.hours], ['MIN', countdown.minutes], ['SEC', countdown.seconds]].map(([label, value]) => <div className="countdown-unit" key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}</div></div>
        <div className="release-grid">{septemberReleases.map((release) => {
          const past = isPastRelease(release, today);
          return (
            <div className={`release-card${past ? ' is-past' : ''}`} key={release.slug}>
              <div className="release-card-image"><img src={`${base}${release.image}`} alt={release.alt} loading="lazy" />{past ? <span className="release-past-badge">DÉJÀ SORTI</span> : null}</div>
              <div className="release-card-body"><span className="release-date">{releaseDayLabel(release)}</span><h3>{release.title}</h3><span className="release-platforms">{release.platforms}</span></div>
            </div>
          );
        })}</div>
      </section>
      <section className="news-carousel-section wrap">
        <div className="section-label"><span><b>02</b> / {t.news.featuredLabel}</span><span>{t.news.updatedLabel}</span></div>
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
        <div className="section-label"><span><b>03</b> / LA SÉLECTION D’HIER</span><span>12.09.2026 · BLIZZCON</span></div>
        <div className="daily-news-intro"><div><p className="eyebrow"><span className="live-dot" /> RÉÉCRIT POUR LET’S PLAY</p><h2>LES ANNONCES<br/><em>QUI FONT DU BRUIT.</em></h2></div><p>La BlizzCon 2026 a livré son lot de surprises. Voici les quatre infos à retenir de la veille, résumées par la rédaction.</p></div>
        <div className="daily-news-grid">
          <a className="daily-news-item daily-news-item--feature" href="https://news.instant-gaming.com/fr/articles/21872-starcraft-le-shooter-en-monde-ouvert-est-officialise-pour-2030" target="_blank" rel="noreferrer"><span className="daily-news-number">01</span><span className="daily-news-kicker">BLIZZARD · PC / XBOX</span><h3>STARCRAFT PASSE<br/><em>AU FPS.</em></h3><p>Blizzard officialise un shooter en monde ouvert situé au ras du champ de bataille. Le projet, piloté par Dan Hay, ne sortira pas avant 2030.</p><span className="read-link">VOIR LA SOURCE <Arrow/></span></a>
          <a className="daily-news-item" href="https://news.instant-gaming.com/fr/articles/21870-diablo-v-a-ete-annonce-pour-le-printemps-2029" target="_blank" rel="noreferrer"><span className="daily-news-number">02</span><span className="daily-news-kicker">DIABLO · BLIZZCON</span><h3>DIABLO V<br/><em>SE PRÉPARE.</em></h3><p>Le prochain épisode arrivera au printemps 2029 dans un Sanctuaire en ruines, privé de ses héros. Blizzard garde encore les détails sous clé.</p><span className="read-link">VOIR LA SOURCE <Arrow/></span></a>
          <a className="daily-news-item" href="https://news.instant-gaming.com/fr/articles/21871-diablo-iv-a-ete-confirme-sur-switch-2-pour-le-15-septembre" target="_blank" rel="noreferrer"><span className="daily-news-number">03</span><span className="daily-news-kicker">DIABLO IV · SWITCH 2</span><h3>LE SANCTUAIRE<br/><em>ARRIVE SUR SWITCH 2.</em></h3><p>La collection Age of Hatred réunira le jeu de base et ses deux extensions majeures dès le 15 septembre 2026.</p><span className="read-link">VOIR LA SOURCE <Arrow/></span></a>
          <a className="daily-news-item" href="https://news.instant-gaming.com/fr/articles/21873-diablo-une-serie-animee-verra-le-jour-sur-netflix" target="_blank" rel="noreferrer"><span className="daily-news-number">04</span><span className="daily-news-kicker">DIABLO · NETFLIX</span><h3>DIABLO ÉTEND<br/><em>SON UNIVERS.</em></h3><p>Une série animée Diablo est en préparation pour Netflix. Blizzard étudie aussi des adaptations autour d’Overwatch et Warcraft.</p><span className="read-link">VOIR LA SOURCE <Arrow/></span></a>
        </div>
      </section>
      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
