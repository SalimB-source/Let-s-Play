import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTest, scoreTier, scoreLabel } from '../reviewsData';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';
import NotFound from './NotFound';

function Arrow(){ return <span aria-hidden="true">↗</span>; }
function Check(){ return <span aria-hidden="true">✓</span>; }
function Cross(){ return <span aria-hidden="true">–</span>; }

const COVER_NAMES = {
  wolverine: 'WOLVERINE',
  orbitals: 'ORBITALS',
  'zero-company': 'ZERO COMPANY',
  onimusha: 'ONIMUSHA',
  dawnwalker: 'DAWNWALKER',
  'boomerang-x': 'BOOMERANG X',
  resonance: 'RESONANCE',
  duskfade: 'DUSKFADE',
  'metal-gear-solid-vol2': 'MGS VOL. 2',
  'marvel-tokon': 'MARVEL TŌKON',
};

export default function TestArticle(){
  const { slug } = useParams();
  const a = getTest(slug);
  const { t, lang } = useLanguage();
  if (!a) return <NotFound />;
  const c = t.reviews.article;
  const tier = scoreTier(a.score);

  return <>
    <section className="article-hero wrap">
      <div className="section-label">
        <span><b>TEST</b> / {a.genre}</span>
        <span>{a.dateLong} · {a.studio.split(' · ')[0]}</span>
      </div>
      <div className="article-heading">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {a.eyebrow}</p>
          <h1>{a.name}<br/><em>{a.accent}</em></h1>
          <p className="article-dek">{a.dek}</p>
          <div className="article-byline"><span>{c.byline}</span><span>{a.readTime || 7} {c.readLabel}</span><span className="article-platforms">{a.platforms}</span></div>
        </div>
        <div className="article-cover hud-frame">
          <img src={a.image} alt={a.alt} />
          <div><small>{a.coverKicker}</small><strong>{COVER_NAMES[a.slug] || a.name}</strong></div>
        </div>
      </div>
    </section>

    <main className="article-layout wrap">
      <article className="article-body">
        <div className={`review-score-card review-score-card-${tier}`}>
          <span>{c.scoreLabel}</span>
          <strong>{scoreLabel(a.score, lang)}<i>/10</i></strong>
          <em>{a.verdictTitle}</em>
        </div>
        <p className="article-lead">{a.lead}</p>

        {a.sections.map((section, index) => (
          <React.Fragment key={index}>
            {section.h2 && <h2>{section.h2}</h2>}
            {section.ps && section.ps.map((p, i) => <p key={i}>{p}</p>)}
            {section.pull && (
              <div className="article-pullquote">
                <span>“</span>
                <p>{section.pull.text}</p>
                <small>— {section.pull.by}</small>
              </div>
            )}
          </React.Fragment>
        ))}

        <div className="proscons">
          <div className="pc-col pc-pros">
            <h3><Check /> {c.pros}</h3>
            <ul>{a.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
          <div className="pc-col pc-cons">
            <h3><Cross /> {c.cons}</h3>
            <ul>{a.cons.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        </div>

        <p className="article-source">
          {c.source} <a href={a.sourceUrl} target="_blank" rel="noreferrer">{c.sourceText}</a> — {c.sourceNote}
        </p>
      </article>

      <aside className="article-aside">
        <div className="aside-card">
          <span className="aside-kicker">{c.quick}</span>
          <strong>{c.platformsLabel}</strong>
          <p>{a.platforms}</p>
          <strong>{c.genreLabel}</strong>
          <p>{a.genre}</p>
          <strong>{c.studioLabel}</strong>
          <p>{a.studio}</p>
          <strong>{c.durationLabel}</strong>
          <p>{a.duration}</p>
        </div>
        <div className="aside-card aside-card-accent">
          <span className="aside-kicker">{c.verdict} · {scoreLabel(a.score, lang)}/10</span>
          <strong>{a.verdictTitle}</strong>
          <p>{a.verdictText}</p>
          <Link className="arrow-link" to="/reviews">{c.back} <Arrow/></Link>
        </div>
      </aside>
    </main>

    <Comments />

    <section className="cta wrap">
      <div>
        <p className="eyebrow"><span className="live-dot" /> {c.ctaEyebrow}</p>
        <h2>{c.ctaA}<br/><em>{c.ctaB}</em></h2>
      </div>
      <Link className="button button-yellow" to="/reviews">{c.backButton} <Arrow/></Link>
    </section>
  </>;
}
