import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Dossiers(){
  const { t } = useLanguage();
  return (
    <>
      <section className="dossier-feature-card wrap">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>GOYA,<br/><em>LE PROCHAIN MONDE.</em></h2>
          <p>Dans les coulisses de HicoSoft Studio : outils, projet GOYA, défis locaux et ambition pour la scène indépendante algérienne.</p>
          <Link className="arrow-link" to="/dossiers/goya-hicosoft">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/goya-hicosoft" aria-label="Lire le dossier GOYA et HicoSoft Studio">
          <img src="https://i.ytimg.com/vi/aTs0zhm6Leg/hqdefault.jpg" alt="HicoSoft Studio et projet GOYA" />
          <span>17:12 · INDUSTRIE INDÉ</span>
        </Link>
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
