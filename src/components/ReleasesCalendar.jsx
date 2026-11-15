import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import {
  gameReleases,
  releaseDay,
  releaseDayLabel,
  releaseDateLabel,
  isPastRelease,
  isReleaseToday,
  countdownParts,
  upcomingReleases,
  todaysReleases,
} from '../releasesData';

// La flèche des liens d'action vit maintenant dans son propre fichier (elle
// n'a besoin ni des données de sorties ni de ce composant) ; on la ré-exporte
// ici pour les pages qui l'ont toujours prise dans ce module.
export { Arrow } from './Arrow';

/** Remplit un gabarit de traduction : fill('Sortie le {date}', { date }) */
export function fill(template, vars){
  return Object.keys(vars).reduce((text, key) => text.split(`{${key}}`).join(vars[key]), String(template || ''));
}

/**
 * `?at=2026-09-15` (ou `?at=2026-09-15T23:59:30`) décale l'horloge de toute la
 * section : pratique pour montrer — ou tester — le basculement automatique du
 * compte à rebours le jour d'une sortie, sans attendre la vraie date.
 * Le décalage est figé à l'ouverture de la page : l'horloge simulée continue
 * ensuite de tourner à la vitesse réelle.
 */
export function clockOffset(){
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

// Filets de sécurité si un bloc `news.calendar` / `news.countdown` venait à
// manquer dans une langue (le dictionnaire fusionne déjà sur l'anglais, ceci
// couvre le pire cas).
export const FALLBACK_CALENDAR = {
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
  scope: '{games} dated releases across {months} months — the full list now lives on its own page.',
};

export const FALLBACK_COUNTDOWN = {
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

// Textes propres à la page « calendrier complet » (/calendrier).
export const FALLBACK_CALENDAR_PAGE = {
  label: 'FULL RELEASE CALENDAR',
  eyebrow: 'GAMING CALENDAR',
  h2a: 'EVERY RELEASE,',
  h2b: 'DATE BY DATE.',
  intro: '{games} dated releases, {months} months on the clock: the whole calendar in one place, month after month, from the nearest date to the furthest confirmed one. Released games stay greyed out, upcoming ones light up as their day gets closer.',
  monthsAria: 'Jump to a month of the calendar',
  monthAria: 'Releases of {month}',
  back: 'BACK TO NEWS',
  artwork: 'ARTWORK TO COME',
  empty: 'No dated release this month yet.',
  updated: 'Dates confirmed by publishers — last check 15.09.2026',
};

/** « Marvel’s Wolverine » → ['Marvel’s', 'Wolverine'] : le dernier mot passe en accent jaune. */
function splitTitle(title){
  const clean = String(title || '').trim();
  const [head, ...rest] = clean.split(':');
  if (rest.length > 0) return [`${head}:`, rest.join(':').trim()];
  const words = clean.split(/\s+/);
  if (words.length < 2) return [clean, ''];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

/**
 * Frise du mois : un point par jour de sortie, le repère « aujourd'hui » et le
 * compteur déjà sortis / à venir. Réutilisée par la page Actus (mois actif) et
 * par chaque mois de la page calendrier complet.
 */
export function MonthTimeline({ month, monthName, releases, today, lang, copy }){
  const pastCount = releases.filter((release) => isPastRelease(release, today) || isReleaseToday(release, today)).length;
  const upcomingCount = releases.length - pastCount;
  const scaleTicks = [1, 5, 10, 15, 20, 25].filter((day) => day < month.days).concat(month.days);
  const aria = fill(copy.timelineAria, { month: monthName, out: pastCount, next: upcomingCount })
    + (month.todayDay ? fill(copy.timelineToday, { day: month.todayDay }) : '');
  // Un point par jour de sortie (les doublons du même jour s'empilent).
  const timelineDays = [];
  for (let day = 1; day <= month.days; day += 1){
    const onDay = releases.filter((release) => releaseDay(release) === day);
    if (onDay.length > 0) timelineDays.push({ day, items: onDay, past: onDay.every((release) => isPastRelease(release, today)) });
  }

  return (
    <div className="release-timeline" role="img" aria-label={aria}>
      <div className="release-timeline-scale">{scaleTicks.map((day) => <span key={day}>{String(day).padStart(2, '0')}</span>)}</div>
      <div className="release-timeline-track">
        {timelineDays.map(({ day, items, past }) => (
          <span
            key={day}
            className={`release-timeline-dot${past ? ' is-past' : ''}${items.length > 1 ? ' is-double' : ''}`}
            style={{ left: `${((day - 0.5) / month.days) * 100}%` }}
            title={`${releaseDayLabel(items[0], lang)} — ${items.map((release) => release.title).join(' · ')}`}
          >{items.length > 1 ? <b>{items.length}</b> : null}</span>
        ))}
        {month.todayDay ? <span className="release-timeline-today" style={{ left: `${((month.todayDay - 0.5) / month.days) * 100}%` }}><em>{copy.today}</em></span> : null}
      </div>
      <div className="release-timeline-meta">
        <span className="release-timeline-counter"><b>{pastCount}</b> {copy.alreadyOut} · <b>{upcomingCount}</b> {copy.upcoming}</span>
      </div>
    </div>
  );
}

/**
 * Visuel éditorial généré à partir des métadonnées : les sorties sans key art
 * officiel ont quand même une vraie miniature, cohérente et unique par jeu.
 */
function ReleaseArtwork({ release, dayLabel, monthLabel, past }){
  const palette = [
    ['#152b55', '#0b1228', '#23d6e8'],
    ['#51234d', '#1b1332', '#ff719c'],
    ['#284b40', '#101d2d', '#b5ef70'],
    ['#54351d', '#1c1626', '#ffbd59'],
    ['#29356f', '#101329', '#a88cff'],
    ['#5a2831', '#1b1428', '#ff775e'],
  ];
  const seed = Array.from(release.slug || release.title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [start, end, accent] = palette[seed % palette.length];
  const id = `release-${String(release.slug).replace(/[^a-z0-9]/gi, '-')}`;
  const title = String(release.title || '').toUpperCase();
  const words = title.split(/\s+/);
  const middle = Math.ceil(words.length / 2);
  const lines = words.length > 3
    ? [words.slice(0, middle).join(' '), words.slice(middle).join(' ')]
    : [title];

  return (
    <div className={`release-card-image is-placeholder${past ? ' is-past' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={start}/><stop offset="1" stopColor={end}/></linearGradient>
          <radialGradient id={`${id}-glow`}><stop stopColor={accent} stopOpacity=".75"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
          <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#070916" stopOpacity="0"/><stop offset="1" stopColor="#070916" stopOpacity=".96"/></linearGradient>
        </defs>
        <rect width="800" height="450" fill={`url(#${id}-bg)`}/>
        <circle cx="615" cy="130" r="245" fill={`url(#${id}-glow)`}/>
        <path d="M450 0h350v450H315z" fill={accent} opacity=".1"/>
        <path d="M535 0h265v450H425z" fill="none" stroke={accent} strokeOpacity=".28" strokeWidth="2"/>
        <circle cx="616" cy="162" r="111" fill="none" stroke={accent} strokeOpacity=".38" strokeWidth="2"/>
        <circle cx="616" cy="162" r="78" fill="none" stroke="#fff" strokeOpacity=".17"/>
        <path d="M0 365 352 116l95 78L170 450H0z" fill="#fff" opacity=".055"/>
        <path d="M0 0h800v450H0z" fill={`url(#${id}-shade)`}/>
        <path d="M36 38h62M36 38v28M764 412h-62m62 0v-28" fill="none" stroke={accent} strokeWidth="3" opacity=".9"/>
        <text x="42" y="74" fill={accent} fontFamily="monospace" fontSize="14" fontWeight="700" letterSpacing="4">LET’S PLAY  /  RELEASE FILE</text>
        <text x="42" y="315" fill="#fff" fontFamily="Arial, sans-serif" fontSize={lines.length > 1 ? '38' : '44'} fontWeight="800" letterSpacing="1" textLength="700" lengthAdjust="spacingAndGlyphs">{lines[0]}</text>
        {lines[1] ? <text x="42" y="361" fill={accent} fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800" letterSpacing="1" textLength="700" lengthAdjust="spacingAndGlyphs">{lines[1]}</text> : null}
        <text x="44" y="407" fill="#dce8fa" fontFamily="monospace" fontSize="15" fontWeight="600" letterSpacing="3">{dayLabel} {monthLabel.join(' ')}  ·  {String(release.platforms || '').toUpperCase()}</text>
      </svg>
    </div>
  );
}

/**
 * Carte d'une sortie. Le key art officiel est privilégié ; s'il n'existe pas
 * (ou si son URL est cassée), une miniature éditoriale déterministe prend le
 * relais. Une entrée peut pointer vers un article existant via `to`.
 */
export function ReleaseCard({ release, today, lang, copy }){
  const past = isPastRelease(release, today);
  const [imageFailed, setImageFailed] = useState(false);
  const [dayLabel, ...monthLabel] = releaseDayLabel(release, lang).split(' ');
  const showArtwork = !release.image || imageFailed;
  const body = (
    <>
      {showArtwork ? (
        <ReleaseArtwork release={release} dayLabel={dayLabel} monthLabel={monthLabel} past={past} />
      ) : (
        <div className="release-card-image">
          <img src={`${base}${release.image}`} alt={release.alt} loading="lazy" onError={() => setImageFailed(true)} />
          {past ? <span className="release-past-badge">{copy.outBadge}</span> : null}
        </div>
      )}
      <div className="release-card-body">
        <span className="release-date">{releaseDayLabel(release, lang)}</span>
        <h3>{release.title}</h3>
        <span className="release-platforms">{release.platforms}</span>
      </div>
    </>
  );
  const className = `release-card${past ? ' is-past' : ''}`;
  return release.to
    ? <Link className={`${className} is-linked`} to={release.to} key={release.slug}>{body}</Link>
    : <div className={className} key={release.slug}>{body}</div>;
}

/** Grille des sorties d'un mois (page Actus : mois actif — page calendrier : chaque mois). */
export function ReleaseGrid({ releases, today, lang, copy, empty }){
  return (
    <div className="release-grid">
      {releases.map((release) => <ReleaseCard release={release} today={today} lang={lang} copy={copy} key={release.slug} />)}
      {releases.length === 0 ? <p className="release-empty">{empty || copy.emptyMonth}</p> : null}
    </div>
  );
}

/**
 * Bloc « le plus attendu » de la page Actus.
 *
 * Le jeu affiché n'est pas codé en dur : il suit la file `awaitedRank` du
 * calendrier (src/releasesData.js). Dès que le compte à rebours atteint zéro,
 * la file se décale et le bloc passe automatiquement sur la sortie suivante —
 * sans redéploiement ni intervention, et sans s'arrêter aux frontières de mois :
 * septembre terminé, c'est le premier jeu d'octobre qui prend le relais.
 * Le décompte se fait à la seconde près, donc le basculement a lieu même si un
 * visiteur laisse l'onglet ouvert.
 */
export function ReleaseCountdown({ lang, copy, offset = 0 }){
  const [now, setNow] = useState(() => new Date(Date.now() + offset));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date(Date.now() + offset)), 1000);
    return () => window.clearInterval(timer);
  }, [offset]);

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

/**
 * Bandeau fin « le plus attendu » de la page d'accueil, posé sous le héros —
 * version allégée du bloc compte à rebours : vignette, nom du jeu et date de
 * sortie, rien de plus. Il pioche dans la même file que ReleaseCountdown
 * (premier `awaitedRank` pas encore disponible) et bascule donc tout seul sur
 * la sortie suivante le jour du lancement ; un clic ouvre le calendrier
 * complet. Si le calendrier est épuisé, la bande s'efface plutôt que de
 * rester vide.
 */
export function AwaitedBand({ lang, copy, offset = 0 }){
  const [now, setNow] = useState(() => new Date(Date.now() + offset));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date(Date.now() + offset)), 1000);
    return () => window.clearInterval(timer);
  }, [offset]);

  const safe = { ...FALLBACK_COUNTDOWN, ...(copy || {}) };
  const target = upcomingReleases(now)[0] || null;  // prochaine sortie attendue
  const outToday = todaysReleases(now)[0] || null;  // file épuisée mais sortie du jour
  const shown = target || outToday;
  if (!shown) return null;

  const image = shown.countdownImage || shown.image;
  const [dayLabel, ...monthParts] = releaseDayLabel(shown, lang).split(' ');
  const chip = !target && outToday ? safe.outToday : null;

  return (
    <section className="awaited-band" aria-label={`${safe.eyebrow} — ${shown.title}`}>
      <Link className="awaited-band-inner wrap" to="/calendrier">
        <span className="awaited-band-thumb">
          {image
            ? <img src={`${base}${image}`} alt="" loading="lazy" />
            : <span className="awaited-band-ticket" aria-hidden="true"><b>{dayLabel}</b><i>{monthParts.join(' ')}</i></span>}
        </span>
        <span className="awaited-band-copy">
          <span className="awaited-band-eyebrow">
            <span className="live-dot" aria-hidden="true" /> {safe.eyebrow}
            {chip ? <em className="awaited-band-chip">{chip}</em> : null}
          </span>
          <strong className="awaited-band-title">{shown.title}</strong>
        </span>
        <span className="awaited-band-date">{releaseDateLabel(shown, lang)}</span>
        <span className="awaited-band-arrow" aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
