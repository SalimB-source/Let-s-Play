import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { septemberReleases, releaseDate, releaseDayLabel, daysInReleaseMonth, isPastRelease, isReleaseToday, findRelease, RELEASE_YEAR, RELEASE_MONTH } from '../releasesData';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

const wolverineRelease = findRelease('marvels-wolverine');

export default function News(){
  const { t, lang } = useLanguage();
  const featuredCopy = {
    en: {
      cards: [
        ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT GOES FPS.', 'Blizzard confirms an open-world shooter set at ground level in the StarCraft universe. It is not coming before 2030.'],
        ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V IS COMING.', 'The next chapter arrives in spring 2029, in a Sanctuary left in ruins and without its heroes.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'SANCTUARY GOES PORTABLE.', 'The Age of Hatred Collection brings the base game and its two major expansions to Switch 2 on September 15, 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO EXPANDS ITS WORLD.', 'An animated Diablo series is in development for Netflix, with more Blizzard adaptations under consideration.'],
      ], read: 'READ THE STORY', carousel: 'Carousel', grid: 'Grid', mode: 'News display mode', label: 'FEATURED NEWS', updated: 'Updated 12.09.2026', section: 'FEATURED NEWS'
    },
    fr: {
      cards: [
        ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT PASSE AU FPS.', 'Blizzard officialise un shooter en monde ouvert situé au ras du champ de bataille. Le projet ne sortira pas avant 2030.'],
        ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V SE PRÉPARE.', 'Le prochain épisode arrivera au printemps 2029 dans un Sanctuaire en ruines, privé de ses héros.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'LE SANCTUAIRE ARRIVE SUR SWITCH 2.', 'La collection Age of Hatred réunira le jeu de base et ses deux extensions majeures dès le 15 septembre 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO ÉTEND SON UNIVERS.', 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie aussi d’autres adaptations.'],
      ], read: 'LIRE L’ARTICLE', carousel: 'Carrousel', grid: 'Grille', mode: 'Mode d’affichage des actualités', label: 'ACTUS À LA UNE', updated: 'Mis à jour le 12.09.2026', section: 'ACTUS À LA UNE'
    },
    ar: {
      cards: [
        ['STARCRAFT · تصويب', '12.09.2026 · بليزارد', 'STARCRAFT تتحول إلى تصويب.', 'تعلن بليزارد عن لعبة تصويب في عالم مفتوح داخل عالم StarCraft، ولن تصدر قبل عام 2030.'],
        ['DIABLO V · بليزكون', '12.09.2026 · بليزارد', 'DIABLO V قادمة.', 'سيصل الفصل التالي في ربيع 2029 داخل ملاذ مدمّر اختفى منه الأبطال.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · بليزارد', 'الملاذ يصل إلى Switch 2.', 'تضم مجموعة Age of Hatred اللعبة الأساسية وتوسعتين رئيسيتين ابتداءً من 15 سبتمبر 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · بليزارد', 'DIABLO توسّع عالمها.', 'يجري إعداد مسلسل رسوم متحركة عن Diablo لصالح Netflix، مع دراسة تحويل عوالم أخرى.'],
      ], read: 'اقرأ المقال', carousel: 'شريط', grid: 'شبكة', mode: 'طريقة عرض الأخبار', label: 'أبرز الأخبار', updated: 'آخر تحديث 12.09.2026', section: 'أبرز الأخبار'
    }
  }[lang] || null;
  const featured = featuredCopy || null;
  const million = t.news.million || t.news.featured;
  const carouselRef = useRef(null);
  const [view, setView] = useState('grid');
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
    { to: '/news/cyberpunk-2077-battlenet', image: 'cyberpunk-2077-battlenet-news.png', alt: 'Cyberpunk 2077 Ultimate Edition sur Battle.net', badge: 'CYBERPUNK 2077 · BATTLE.NET', kicker: '14.09.2026 · CD PROJEKT RED', title: 'CYBERPUNK 2077 CHANGE DE QUARTIER.', excerpt: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année, dans le prolongement du partenariat entre CD Projekt RED et Blizzard.', read: 'LIRE L’ARTICLE' },
    { to: '/news/persona-6-switch-2', image: 'persona-6-news.png', alt: 'Persona 6 sur Nintendo Switch 2', badge: 'PERSONA 6 · SWITCH 2', kicker: '14.09.2026 · SEGA', title: 'PERSONA 6 ARRIVE EN PHYSIQUE.', excerpt: 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2. La date reste inconnue, mais la console rejoint les plateformes confirmées.', read: 'LIRE L’ARTICLE' },
    { to: '/news/last-of-us-ii-mod', image: 'last-of-us-mod-news.png', alt: 'Le mod multijoueur de The Last of Us Part II sur PC', badge: 'THE LAST OF US II · PC', kicker: '14.09.2026 · PLAYSTATION', title: 'LE MOD MULTIJOUEUR NE SORTIRA PAS.', excerpt: 'Sony a demandé l’arrêt d’un projet de fans qui voulait ajouter une composante multijoueur à la version PC de The Last of Us Part II.', read: 'LIRE L’ARTICLE' },
    ...featured.cards.map(([badge, kicker, title, excerpt], index) => ({ to: ['/news/starcraft-fps', '/news/diablo-v', '/news/diablo-switch-2', '/news/diablo-netflix'][index], image: ['starcraft-fps-news.jpeg', 'diablo-v-news.png', 'diablo-switch2-news.jpg', 'diablo-netflix-news.webp'][index], alt: title, badge, kicker, title, excerpt, read: featured.read })),
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
        <div className="section-label"><span><b>02</b> / {featured.section}</span><span>{featured.updated}</span></div>
        <div className="news-carousel-head">
          <div><p className="eyebrow"><span className="live-dot" /> {t.news.eyebrow}</p><h1>{t.news.h1a}<br/><em>{t.news.h1b}</em></h1></div>
          <div className="news-view-tools">
            <div className="news-view-toggle" role="group" aria-label={featured.mode}>
              <button type="button" className={view === 'carousel' ? 'active' : ''} onClick={() => setView('carousel')} aria-pressed={view === 'carousel'}>{featured.carousel}</button>
              <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'}>{featured.grid}</button>
            </div>
            {view === 'carousel' && <div className="news-carousel-controls" aria-label={featured.carousel}><button type="button" onClick={() => scrollCards(-1)} aria-label={lang === 'fr' ? 'Articles précédents' : lang === 'ar' ? 'المقالات السابقة' : 'Previous articles'}>←</button><button type="button" onClick={() => scrollCards(1)} aria-label={lang === 'fr' ? 'Articles suivants' : lang === 'ar' ? 'المقالات التالية' : 'Next articles'}>→</button></div>}
          </div>
        </div>
        <div className={`news-carousel${view === 'grid' ? ' is-grid' : ''}`} ref={carouselRef}>
          {articles.map((article) => <Link className="news-carousel-card" to={article.to} key={article.to}>
            <div className="news-carousel-image"><img src={`${base}${article.image}`} alt={article.alt} /><span className="news-feature-badge">{article.badge}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{article.kicker}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="read-link">{article.read} <Arrow/></span></div>
          </Link>)}
        </div>
      </section>
      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
