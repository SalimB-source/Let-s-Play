import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Dossiers(){
  const { t } = useLanguage();
  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>{t.dossiers.label1.split(' / ')[0]}</b> / {t.dossiers.label1.split(' / ')[1]}</span><span>{t.dossiers.label2}</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.dossiers.eyebrow}</p>
            <h1>{t.dossiers.h1a}<br/><em>{t.dossiers.h1b}</em></h1>
            <p className="page-hero-text">{t.dossiers.text}</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{backgroundImage:`url(${base}hero-lets-play.png)`}} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>{t.dossiers.depth}</strong><small>{t.dossiers.depthLabel}</small>
              <span>{t.dossiers.guidesCulture}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="featured wrap" id="black-flag">
        <div className="section-label"><span><b>{t.dossiers.featuredLabel1.split(' / ')[0]}</b> / {t.dossiers.featuredLabel1.split(' / ')[1]}</span><span>{t.dossiers.featuredLabel2}</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> {t.dossiers.featuredEyebrow}</p>
            <h2>{t.dossiers.featuredH2a}<br/><em>{t.dossiers.featuredH2b}</em></h2>
            <p>{t.dossiers.featuredText}</p>
            <a className="arrow-link" href="https://youtu.be/0e5yXxfchLA" target="_blank" rel="noreferrer">{t.dossiers.watchYoutube} <Arrow/></a>
          </div>
          <div className="featured-player hud-frame">
            <iframe src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1" title="Black Flag Review" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
        </div>
      </section>

      <section className="formats wrap">
        <div className="section-label"><span><b>{t.dossiers.formatsLabel1.split(' / ')[0]}</b> / {t.dossiers.formatsLabel1.split(' / ')[1]}</span><span>{t.dossiers.formatsLabel2}</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>{t.home.formats.gamingTitle}</h3><p>{t.dossiers.gamingText}</p><Link to="/reviews">{t.home.formats.explore} <Arrow/></Link></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>{t.home.formats.moviesTitle}</h3><p>{t.dossiers.moviesText}</p><Link to="/news">{t.home.formats.explore} <Arrow/></Link></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>{t.home.formats.communityTitle}</h3><p>{t.dossiers.communityText}</p><Link to="/">{t.dossiers.backHome} <Arrow/></Link></article>
        </div>
      </section>

      <section className="show wrap">
        <div className="section-label"><span><b>{t.dossiers.showLabel1.split(' / ')[0]}</b> / {t.dossiers.showLabel1.split(' / ')[1]}</span><span>{t.dossiers.showLabel2}</span></div>
        <div className="manifesto-grid">
          <h2 className="manifesto-h2">{t.dossiers.weDontA}<br/><span>{t.dossiers.weDontB}</span></h2>
          <div>
            <p className="lead">{t.dossiers.leadDoc}</p>
            <p>{t.dossiers.bodyDoc}</p>
            <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:18}}>
              <Link className="button button-yellow" to="/">{t.dossiers.home} <Arrow/></Link>
              <Link className="button button-ghost" to="/news">{t.dossiers.newsBtn} <Arrow/></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {t.dossiers.nextLevel}</p>
          <h2>{t.dossiers.exploreA}<br/><em>{t.dossiers.exploreB}</em></h2>
        </div>
        <Link className="button button-yellow" to="/">{t.dossiers.backToHome} <Arrow/></Link>
      </section>
    </>
  );
}
