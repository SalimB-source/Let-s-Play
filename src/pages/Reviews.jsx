import React from 'react';
import { Link } from 'react-router-dom';
import { videos, baseUrl as base } from '../data';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Reviews(){
  const gaming = videos.filter(v=>v.tag==='Gaming');

  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>PAGE</b> / REVIEWS</span><span>NO HYPE, JUST PLAY</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Critical hits</p>
            <h1>REVIEWS<br/><em>THAT MATTER.</em></h1>
            <p className="page-hero-text">We play it, break it, and tell you if it’s worth your time and money. No PR fluff — just the community’s verdict. Separate page, same energy.</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{backgroundImage:`url(${base}instagram-post-2.jpg)`}} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>100%</strong><small>HONEST</small>
              <span>Gaming • Tech • Cinema</span>
            </div>
          </div>
        </div>
      </section>

      <section className="featured wrap">
        <div className="section-label"><span><b>01</b> / NOW PLAYING</span><span>FEATURED REVIEW</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> Featured review</p>
            <h2>BLACK FLAG,<br/><em>FULL SAIL.</em></h2>
            <p>Assassin’s Creed Black Flag Resynced — our deep dive, performance test, and whether nostalgia holds up in 2026.</p>
            <a className="arrow-link" href="https://youtu.be/0e5yXxfchLA" target="_blank" rel="noreferrer">Watch on YouTube <Arrow/></a>
          </div>
          <div className="featured-player hud-frame">
            <iframe src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1" title="Black Flag Review" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
        </div>
      </section>

      <section className="latest wrap">
        <div className="section-label"><span><b>02</b> / ARCHIVE</span><span>GAMING REVIEWS</span></div>
        <h2 className="page-h2">MORE<br/><em>REVIEWS.</em></h2>
        <div className="video-grid" style={{marginTop:32}}>
          {gaming.map(video=>(
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{video.meta}</span><span>{video.tag}</span></div>
              <h3>{video.title}</h3>
              <p className="video-desc">{video.desc}</p>
            </a>
          ))}
        </div>
        <Link className="arrow-link" to="/dossiers">Explore dossiers <Arrow/></Link>
      </section>
    </>
  );
}
