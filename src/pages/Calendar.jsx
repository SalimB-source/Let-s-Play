import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { calendarMonths, gameReleases, monthHeadline, monthLabel } from '../releasesData';
import {
  Arrow,
  fill,
  clockOffset,
  MonthTimeline,
  ReleaseCountdown,
  ReleaseGrid,
  FALLBACK_CALENDAR,
  FALLBACK_CALENDAR_PAGE,
} from '../components/ReleasesCalendar';

const CLOCK_OFFSET = clockOffset();

/**
 * Page « calendrier complet » (/calendrier) : la liste des sorties déplacée
 * hors de la page Actus, étendue à tous les mois qui ont au moins une sortie
 * datée. Chaque mois reprend la frise et les cartes de la section calendrier ;
 * le compte à rebours « le plus attendu » reste posé en tête de page.
 */
export default function Calendar(){
  const { t, lang } = useLanguage();
  const copy = { ...FALLBACK_CALENDAR_PAGE, ...(t.news.calendarPage || {}) };
  const calCopy = { ...FALLBACK_CALENDAR, ...(t.news.calendar || {}) };
  const today = new Date(Date.now() + CLOCK_OFFSET);
  const months = calendarMonths(today);
  const first = months[0];
  const last = months[months.length - 1];
  const range = first && last
    ? `${monthLabel(first.year, first.month, lang)} → ${monthLabel(last.year, last.month, lang)}`
    : '';

  return (
    <>
      <section className="calendar-page wrap">
        <div className="section-label"><span>{copy.label}</span><span>{range}</span></div>
        <div className="monthly-releases-head">
          <div><p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p><h2>{copy.h2a}<br/><em>{copy.h2b}</em></h2></div>
          <Link className="arrow-link" to="/news">{copy.back} <Arrow/></Link>
        </div>
        <p className="calendar-intro">{fill(copy.intro, { games: gameReleases.length, months: months.length })}</p>
        <ReleaseCountdown lang={lang} copy={t.news.countdown} offset={CLOCK_OFFSET} />
        <nav className="calendar-month-nav" aria-label={copy.monthsAria}>
          {months.map((entry) => (
            <a href={`#${entry.key}`} key={entry.key} className={entry.isCurrent ? 'is-current' : ''}>
              {monthLabel(entry.year, entry.month, lang)} <b>{entry.releases.length}</b>
            </a>
          ))}
        </nav>
        {months.map((entry, index) => (
          <section className="calendar-month" id={entry.key} key={entry.key} aria-label={fill(copy.monthAria, { month: monthLabel(entry.year, entry.month, lang) })}>
            <div className="calendar-month-head">
              <h3><span>{String(index + 1).padStart(2, '0')}</span>{monthHeadline(entry.year, entry.month, lang)} <em>{entry.year}</em>{entry.isCurrent ? <b className="calendar-month-now">{calCopy.today}</b> : null}</h3>
            </div>
            <MonthTimeline month={entry} monthName={monthLabel(entry.year, entry.month, lang)} releases={entry.releases} today={today} lang={lang} copy={calCopy} />
            <ReleaseGrid releases={entry.releases} today={today} lang={lang} copy={calCopy} empty={copy.empty} />
          </section>
        ))}
        <div className="calendar-foot">
          <span>{copy.updated}</span>
          <Link className="button button-yellow" to="/news">{copy.back} <Arrow/></Link>
        </div>
      </section>
    </>
  );
}
