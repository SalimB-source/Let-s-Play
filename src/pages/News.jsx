import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { videos, filters, baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function News(){
  const { t } = useLanguage();
  const [filter,setFilter]=useState('All');
  const visible = filter==='All'? videos : videos.filter(v=>v.tag===filter);

  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>{t.news.label1.split(' / ')[0]}</b> / {t.news.label1.split(' / ')[1]}</span><span>{t.news.label2}</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.news.eyebrow}</p>
            <h1>{t.news.h1a}<br/><em>{t.news.h1b}</em></h1>
            <p className="page-hero-text">{t.news.text}</p>
            <div className="page-hero-actions">
              <div className="filter-row">{filters.map(item=><button key={item} className={filter===item?'filter active':'filter'} onClick={()=>setFilter(item)}>{t.filters[item]}</button>)}</div>
            </div>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{backgroundImage:`url(${base}hero-dragon.jpg)`}} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>{videos.length}+</strong><small>{t.news.episodes}</small>
              <span>{t.news.updated}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="latest wrap">
        <div className="video-grid">
          {visible.map(video=>(
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{t.categories[video.category] || video.category} · {video.duration}</span><span>{t.filters[video.tag] || video.tag}</span></div>
              <h3>{(t.videos[video.title] && t.videos[video.title].title) || video.title}</h3>
              <p className="video-desc">{(t.videos[video.title] && t.videos[video.title].desc) || video.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p>
          <h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2>
        </div>
        <Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link>
      </section>
    </>
  );
}
