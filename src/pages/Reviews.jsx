import React from 'react';
import { Link } from 'react-router-dom';
import { videos, baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Reviews(){
  const { t } = useLanguage();
  const gaming = videos.filter(v=>v.tag==='Gaming');

  return (
    <>
      <section className="featured wrap">
        <div className="section-label"><span><b>{t.reviews.featuredLabel1.split(' / ')[0]}</b> / {t.reviews.featuredLabel1.split(' / ')[1]}</span><span>{t.reviews.featuredLabel2}</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> {t.reviews.featuredEyebrow}</p>
            <h2>{t.reviews.h2a}<br/><em>{t.reviews.h2b}</em></h2>
            <p>{t.reviews.featuredText}</p>
            <a className="arrow-link" href="https://youtu.be/0e5yXxfchLA" target="_blank" rel="noreferrer">{t.reviews.watchYoutube} <Arrow/></a>
          </div>
          <div className="featured-player hud-frame">
            <iframe src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1" title="Black Flag Review" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
        </div>
      </section>

      <section className="review-feature wrap">
        <div className="section-label"><span><b>03</b> / {t.reviews.onimusha.label}</span><span>{t.reviews.onimusha.date}</span></div>
        <Link className="review-feature-card" to="/reviews/onimusha">
          <div className="review-feature-image"><img src={`${base}onimusha-review.jpg`} alt={t.reviews.onimusha.coverAlt} /><span className="news-feature-arrow">↗</span></div>
          <div className="review-feature-copy"><span className="news-kicker">{t.reviews.onimusha.eyebrow} · {t.reviews.onimusha.averageScore} · LET’S PLAY {t.reviews.onimusha.score}</span><h2>{t.reviews.onimusha.title} <em>{t.reviews.onimusha.titleAccent}</em></h2><p>{t.reviews.onimusha.dek}</p><span className="read-link">{t.reviews.onimusha.back} <Arrow/></span></div>
        </Link>
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
