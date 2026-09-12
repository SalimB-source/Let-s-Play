import React from 'react';
import { Link } from 'react-router-dom';
import { videos } from '../data';
import { gameTests, scoreTier, scoreLabel } from '../reviewsData';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Reviews(){
  const { t, lang } = useLanguage();
  const c = t.reviews.article;
  const gaming = videos.filter(v=>v.tag==='Gaming');

  return (
    <>
      <section className="reviews-hero" id="top">
        <div className="reviews-hero-bg" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}chaft-soldier.png)` }} role="img" aria-label="Chaft soldier key art" />
        <div className="reviews-hero-overlay" aria-hidden="true" />
        <div className="reviews-hero-content">
          <div className="section-label"><span><b>{t.reviews.label1.split(' / ')[0]}</b> / {t.reviews.label1.split(' / ')[1]}</span><span>{t.reviews.label2}</span></div>
          <p className="eyebrow"><span className="live-dot" /> {t.reviews.eyebrow}</p>
          <h1>{t.reviews.h1a}<br/><em>{t.reviews.h1b}</em></h1>
          <p className="page-hero-text">{t.reviews.text}</p>
        </div>
      </section>

      <section className="latest-tests wrap">
        <div className="section-label"><span><b>01</b> / {c.gridLabel}</span><span>{c.gridRange}</span></div>
        <div className="latest-tests-head"><div><p className="eyebrow"><span className="live-dot" /> {c.gridEyebrow}</p><h2>{c.gridTitleA}<br/><em>{c.gridTitleB}</em></h2></div></div>
        <div className="latest-tests-grid">
          {gameTests.map((test) => (
            <Link className="latest-test-card" to={test.route} key={test.slug}>
              <div className="latest-test-image">
                <img src={test.image} alt={test.alt} loading="lazy" />
                <span className={`latest-test-score score-badge ${scoreTier(test.score)}`}>
                  <b>{scoreLabel(test.score, lang)}</b><i>/10</i>
                </span>
              </div>
              <div className="latest-test-meta"><span>{test.date}</span><span>{test.platforms.split(' · ')[0]}{test.platforms.includes('·') ? ' +' : ''}</span></div>
              <h3>{test.cardTitle}</h3>
              <p>{test.excerpt}</p>
              <span className="read-link">{c.readTest} <Arrow/></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="latest wrap">
        <div className="section-label"><span><b>{t.reviews.archiveLabel1.split(' / ')[0]}</b> / {t.reviews.archiveLabel1.split(' / ')[1]}</span><span>{t.reviews.archiveLabel2}</span></div>
        <h2 className="page-h2">{t.reviews.moreA}<br/><em>{t.reviews.moreB}</em></h2>
        <div className="video-grid" style={{marginTop:32}}>
          {gaming.map(video=>(
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{t.categories[video.category] || video.category} · {video.duration}</span><span>{t.filters[video.tag] || video.tag}</span></div>
              <h3>{(t.videos[video.title] && t.videos[video.title].title) || video.title}</h3>
              <p className="video-desc">{(t.videos[video.title] && t.videos[video.title].desc) || video.desc}</p>
            </a>
          ))}
        </div>
        <Link className="arrow-link" to="/dossiers">{t.reviews.exploreDossiers} <Arrow/></Link>
      </section>
    </>
  );
}
