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

export function Arrow(){ return <span aria-hidden="true">↗</span>; }

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
 * Carte d'une sortie. Avec visuel si l'entrée du calendrier en fournit un,
 * sinon une vignette « ticket » date + mois, pour que chaque sortie datée ait
 * sa carte même avant que le key art soit déposé dans public/releases/.
 * Une entrée peut pointer vers un article existant via `to`.
 */
export function ReleaseCard({ release, today, lang, copy }){
  const past = isPastRelease(release, today);
  const [dayLabel, ...monthLabel] = releaseDayLabel(release, lang).split(' ');
  const body = (
    <>
      {release.image ? (
        <div className="release-card-image">
          <img src={`${base}${release.image}`} alt={release.alt} loading="lazy" />
          {past ? <span className="release-past-badge">{copy.outBadge}</span> : null}
        </div>
      ) : (
        <div className={`release-card-image is-placeholder${past ? ' is-past' : ''}`} aria-hidden="true">
          <span className="release-placeholder-day">{dayLabel}</span>
          <span className="release-placeholder-month">{monthLabel.join(' ')}</span>
          <em>{copy.artwork}</em>
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
