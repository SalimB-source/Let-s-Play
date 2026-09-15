import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { activeMonth, gameReleases, releaseDay, releaseDayLabel, isPastRelease, isReleaseToday, monthHeadline, monthLabel, countdownParts, upcomingReleases, todaysReleases, releaseDateLabel } from '../releasesData';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

/**
 * `?at=2026-09-15` (ou `?at=2026-09-15T23:59:30`) décale l'horloge de toute la
 * section : pratique pour montrer — ou tester — le basculement automatique du
 * compte à rebours le jour d'une sortie, sans attendre la vraie date.
 * Le décalage est figé à l'ouverture de la page : l'horloge simulée continue
 * ensuite de tourner à la vitesse réelle.
 */
function clockOffset(){
  if (typeof window === 'undefined') return 0;
  let raw = null;
  try {
    raw = new URLSearchParams(window.location.search).get('at');
  } catch (error) {
    return 0;
  }
  if (!raw) return 0;
  const parsed = Date.parse(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(parsed)) return 0;
  return parsed - Date.now();
}

const CLOCK_OFFSET = clockOffset();

/** « Marvel’s Wolverine » → ['Marvel’s', 'Wolverine'] : le dernier mot passe en accent jaune. */
function splitTitle(title){
  const clean = String(title || '').trim();
  const [head, ...rest] = clean.split(':');
  if (rest.length > 0) return [`${head}:`, rest.join(':').trim()];
  const words = clean.split(/\s+/);
  if (words.length < 2) return [clean, ''];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

/** Remplit un gabarit de traduction : fill('Sortie le {date}', { date }) */
function fill(template, vars){
  return Object.keys(vars).reduce((text, key) => text.split(`{${key}}`).join(vars[key]), String(template || ''));
}

// Filet de sécurité si un bloc `news.calendar` / `news.countdown` venait à manquer
// dans une langue (le dictionnaire fusionne déjà sur l'anglais, ceci couvre le pire cas).
const FALLBACK_CALENDAR = {
  label: 'RELEASES THIS MONTH',
  eyebrow: 'GAMING CALENDAR',
  play: 'TO PLAY.',
  full: 'SEE THE FULL CALENDAR',
  today: 'TODAY',
  alreadyOut: 'ALREADY OUT',
  upcoming: 'TO COME',
  outBadge: 'OUT',
  emptyMonth: 'No release scheduled in this calendar yet — the next dates will appear here.',
  timelineAria: '{month} timeline — {out} releases already out, {next} to come',
  timelineToday: ', today is the {day}th',
};

const FALLBACK_COUNTDOWN = {
  eyebrow: 'MOST AWAITED',
  outToday: 'OUT TODAY',
  units: { days: 'DAYS', hours: 'HOURS', minutes: 'MIN', seconds: 'SEC' },
  outLine: 'Out {date} on {platforms}.',
  justOut: '{title} is out today — the countdown has already moved on to {next}.',
  outFinal: '{title} is available today on {platforms}. The calendar is up to date — next dates to be announced.',
  emptyTitle: 'CALENDAR',
  emptyTitleAccent: 'CLEAR.',
  emptyLine: 'Every release on the calendar has landed. The next countdown starts as soon as the following dates are confirmed.',
  aria: 'Countdown until {title} releases',
  emptyAria: 'No release left to count down on this calendar',
};

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

  const scrollCards = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth * 0.82, behavior: 'smooth' });
  };

  const articles = [
    { to: '/news/rayman-legends-retold', image: 'rayman-legends-retold-news.jpg', alt: 'Rayman Legends Retold — miniature officielle du trailer Ubisoft', badge: 'RAYMAN LEGENDS RETOLD · REPORT', kicker: '15.09.2026 · UBISOFT', title: 'RAYMAN RETROUVE SON RENDEZ-VOUS.', excerpt: 'Le remaster est repoussé au 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est attendue le 22 septembre.', read: 'LIRE L’ARTICLE' },
    { to: '/news/cyberpunk-2077-battlenet', image: 'cyberpunk-2077-battlenet-news.webp', alt: 'Cyberpunk 2077 Ultimate Edition — visuel officiel CD PROJEKT RED', badge: 'CYBERPUNK 2077 · BATTLE.NET', kicker: '14.09.2026 · CD PROJEKT RED', title: 'CYBERPUNK 2077 CHANGE DE QUARTIER.', excerpt: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année, dans le prolongement du partenariat entre CD Projekt RED et Blizzard.', read: 'LIRE L’ARTICLE' },
    { to: '/news/persona-6-switch-2', image: 'persona-6-news.jpg', alt: 'Visuel officiel de l’univers Persona — site Atlus', badge: 'PERSONA 6 · SWITCH 2', kicker: '14.09.2026 · SEGA', title: 'PERSONA 6 ARRIVE EN PHYSIQUE.', excerpt: 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2. La date reste inconnue, mais la console rejoint les plateformes confirmées.', read: 'LIRE L’ARTICLE' },
    { to: '/news/last-of-us-ii-mod', image: 'last-of-us-mod-news.jpg', alt: 'The Last of Us Part II Remastered — visuel officiel PlayStation', badge: 'THE LAST OF US II · PC', kicker: '14.09.2026 · PLAYSTATION', title: 'LE MOD MULTIJOUEUR NE SORTIRA PAS.', excerpt: 'Sony a demandé l’arrêt d’un projet de fans qui voulait ajouter une composante multijoueur à la version PC de The Last of Us Part II.', read: 'LIRE L’ARTICLE' },
    ...featured.cards.map(([badge, kicker, title, excerpt], index) => ({ to: ['/news/starcraft-fps', '/news/diablo-v', '/news/diablo-switch-2', '/news/diablo-netflix'][index], image: ['starcraft-fps-news.jpeg', 'diablo-v-news.png', 'diablo-switch2-news.jpg', 'diablo-netflix-news.webp'][index], alt: title, badge, kicker, title, excerpt, read: featured.read })),
    { to: '/news/monster-hunter-wilds', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Monster Hunter Wilds sur Nintendo Switch 2', badge: 'MONSTER HUNTER · SWITCH 2', kicker: '09.09.2026 · CAPCOM', title: 'WILDS ARRIVE SUR SWITCH 2.', excerpt: 'Monster Hunter Wilds dévoile ses premières images sur Switch 2 et fixe sa sortie au 4 décembre 2026.', read: 'LIRE L’ARTICLE' },
    { to: '/news/zelda-40th', image: 'zelda-40th-switch2.jpg', alt: 'The Legend of Zelda Ocarina of Time sur Nintendo Switch 2', badge: 'ZELDA · 40 ANS', kicker: '08.09.2026 · NINTENDO', title: 'ZELDA FÊTE SES 40 ANS.', excerpt: 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo pour accompagner le retour d’Ocarina of Time.', read: 'LIRE L’ARTICLE' },
    { to: '/news/physint', image: 'physint-news.jpg', alt: t.news.featured.alt, badge: t.news.featured.badge, kicker: t.news.featured.kicker, title: t.news.featured.title, excerpt: t.news.featured.excerpt, read: t.news.featured.read },
    { to: '/news/metroid-ravenous', image: 'metroid-ravenous-news.png', alt: t.news.metroid.coverAlt, badge: t.news.metroid.eyebrow, kicker: `${t.news.metroid.date} · ${t.news.platforms}`, title: `${t.news.metroid.title} ${t.news.metroid.titleAccent}`, excerpt: t.news.metroid.dek, read: t.news.metroid.back },
    { to: '/news/wardogs', image: 'wardogs-news.jpg', alt: t.news.wardogs.coverAlt, badge: t.news.wardogs.eyebrow, kicker: `${t.news.wardogs.date} · ${t.news.consolePlatforms}`, title: `${t.news.wardogs.title} ${t.news.wardogs.titleAccent}`, excerpt: t.news.wardogs.dek, read: t.news.wardogs.back },
    { to: '/news/zelda-ocarina', image: 'zelda-ocarina-news.jpg', alt: t.news.zelda.coverAlt, badge: t.news.zelda.eyebrow, kicker: `${t.news.zelda.date} · ${t.news.platforms}`, title: `${t.news.zelda.title} ${t.news.zelda.titleAccent}`, excerpt: t.news.zelda.dek, read: t.news.zelda.back },
    { to: '/news/onimusha-million', image: 'onimusha-million-news.jpg', alt: million.coverAlt || million.alt, badge: million.eyebrow || million.badge, kicker: `${million.date || million.kicker} · CAPCOM`, title: `${million.title} ${million.titleAccent || ''}`, excerpt: million.dek || million.excerpt, read: million.back || million.read },
  ];

  const today = new Date(Date.now() + CLOCK_OFFSET);
  const calendarCopy = { ...FALLBACK_CALENDAR, ...(t.news.calendar || {}) };
  // Le mois affiché est calculé depuis le calendrier : le mois courant s'il a des
  // sorties, sinon le mois de la prochaine sortie annoncée.
  const month = activeMonth(today);
  const monthName = monthLabel(month.year, month.month, lang);
  const monthReleases = month.releases;
  const pastCount = monthReleases.filter((release) => isPastRelease(release, today) || isReleaseToday(release, today)).length;
  const upcomingCount = monthReleases.length - pastCount;
  const scaleTicks = [1, 5, 10, 15, 20, 25].filter((day) => day < month.days).concat(month.days);
  const timelineAria = fill(calendarCopy.timelineAria, { month: monthName, out: pastCount, next: upcomingCount })
    + (month.todayDay ? fill(calendarCopy.timelineToday, { day: month.todayDay }) : '');
  // Un point par jour de sortie (les doublons du même jour s'empilent).
  const timelineDays = [];
  for (let day = 1; day <= month.days; day += 1){
    const onDay = monthReleases.filter((release) => releaseDay(release) === day);
    if (onDay.length > 0) timelineDays.push({ day, releases: onDay, past: onDay.every((release) => isPastRelease(release, today)) });
  }

  return (
    <>
      <section className="monthly-releases wrap">
        <div className="section-label"><span><b>01</b> / {calendarCopy.label}</span><span>{monthName}</span></div>
        <div className="monthly-releases-head"><div><p className="eyebrow"><span className="live-dot" /> {calendarCopy.eyebrow}</p><h2>{monthHeadline(month.year, month.month, lang)}<br/><em>{calendarCopy.play}</em></h2></div><span className="arrow-link">{calendarCopy.full} <Arrow/></span></div>
        <div className="release-timeline" role="img" aria-label={timelineAria}>
          <div className="release-timeline-scale">{scaleTicks.map((day) => <span key={day}>{String(day).padStart(2, '0')}</span>)}</div>
          <div className="release-timeline-track">
            {timelineDays.map(({ day, releases, past }) => (
              <span
                key={day}
                className={`release-timeline-dot${past ? ' is-past' : ''}${releases.length > 1 ? ' is-double' : ''}`}
                style={{ left: `${((day - 0.5) / month.days) * 100}%` }}
                title={`${releaseDayLabel(releases[0], lang)} — ${releases.map((release) => release.title).join(' · ')}`}
              >{releases.length > 1 ? <b>{releases.length}</b> : null}</span>
            ))}
            {month.todayDay ? <span className="release-timeline-today" style={{ left: `${((month.todayDay - 0.5) / month.days) * 100}%` }}><em>{calendarCopy.today}</em></span> : null}
          </div>
          <div className="release-timeline-meta">
            <span className="release-timeline-counter"><b>{pastCount}</b> {calendarCopy.alreadyOut} · <b>{upcomingCount}</b> {calendarCopy.upcoming}</span>
          </div>
        </div>
        <ReleaseCountdown lang={lang} copy={t.news.countdown} />
        <div className="release-grid">{monthReleases.map((release) => {
          const past = isPastRelease(release, today);
          return (
            <div className={`release-card${past ? ' is-past' : ''}`} key={release.slug}>
              <div className="release-card-image"><img src={`${base}${release.image}`} alt={release.alt} loading="lazy" />{past ? <span className="release-past-badge">{calendarCopy.outBadge}</span> : null}</div>
              <div className="release-card-body"><span className="release-date">{releaseDayLabel(release, lang)}</span><h3>{release.title}</h3><span className="release-platforms">{release.platforms}</span></div>
            </div>
          );
        })}{monthReleases.length === 0 ? <p className="release-empty">{calendarCopy.emptyMonth}</p> : null}</div>
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

/**
 * Bloc « le plus attendu » de la page Actus.
 *
 * Le jeu affiché n'est pas codé en dur : il suit la file `awaitedRank` du
 * calendrier (src/releasesData.js). Dès que le compte à rebours atteint zéro,
 * la file se décale et le bloc passe automatiquement sur la sortie suivante —
 * sans redéploiement ni intervention. Le décompte se fait à la seconde près,
 * donc le basculement a lieu même si un visiteur laisse l'onglet ouvert.
 */
function ReleaseCountdown({ lang, copy }){
  const [now, setNow] = useState(() => new Date(Date.now() + CLOCK_OFFSET));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date(Date.now() + CLOCK_OFFSET)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = upcomingReleases(now)[0] || null;  // jeu en cours de décompte (premier de la file)
  const outToday = todaysReleases(now)[0] || null;  // jeu sorti le jour même, déjà disponible
  const shown = target || outToday;
  const parts = target ? countdownParts(target, now) : null;
  const slug = shown ? shown.slug : null;

  // Flash discret le jour où le bloc change de jeu.
  const previous = useRef(slug);
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    if (previous.current === slug) return undefined;
    const hadPrevious = previous.current !== null;
    previous.current = slug;
    if (!hadPrevious) return undefined;
    setSwitching(true);
    const timer = window.setTimeout(() => setSwitching(false), 2800);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const safe = { ...FALLBACK_COUNTDOWN, ...(copy || {}), units: { ...FALLBACK_COUNTDOWN.units, ...(copy?.units || {}) } };
  const units = [['days', safe.units.days], ['hours', safe.units.hours], ['minutes', safe.units.minutes], ['seconds', safe.units.seconds]];
  // Le mois est écoulé : on garde la dernière clé du calendrier en visuel, le bloc ne reste pas vide.
  const lastRelease = gameReleases[gameReleases.length - 1];
  const visual = `${base}${(shown?.countdownImage || shown?.image) || lastRelease.image}`;
  const titleParts = shown ? splitTitle(shown.title) : [safe.emptyTitle, safe.emptyTitleAccent];
  const dateFor = (release) => fill(safe.outLine, { date: releaseDateLabel(release, lang), platforms: release.platforms });
  const line = target ? dateFor(target) : (outToday ? fill(safe.outFinal, { title: outToday.title, platforms: outToday.platforms }) : safe.emptyLine);
  const note = target && outToday ? fill(safe.justOut, { title: outToday.title, next: target.title }) : null;
  const aria = target ? fill(safe.aria, { title: target.title }) : safe.emptyAria;

  return (
    <div className={`release-countdown${switching ? ' is-switching' : ''}${target ? '' : ' is-complete'}`}>
      <div className="release-countdown-image"><img src={visual} alt={shown?.alt || lastRelease.alt} /></div>
      <div className="release-countdown-copy">
        <p className="eyebrow">
          <span className="live-dot" /> {safe.eyebrow}
          {outToday ? <span className="release-countdown-out">{safe.outToday}{target ? ` · ${outToday.title}` : ''}</span> : null}
        </p>
        <h3>{titleParts[0]}{titleParts[1] ? <>{' '}<em>{titleParts[1]}</em></> : null}</h3>
        <p>{line}</p>
        {note ? <p className="release-countdown-note">{note}</p> : null}
      </div>
      <div className="countdown-units" role="timer" aria-label={aria}>
        {units.map(([key, label]) => (
          <div className={`countdown-unit${parts ? '' : ' is-idle'}`} key={key}>
            <strong>{parts ? String(parts[key]).padStart(2, '0') : '--'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
