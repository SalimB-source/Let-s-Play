import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { videos, filters, baseUrl as base } from '../data';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function News(){
  const [filter,setFilter]=useState('All');
  const visible = filter==='All'? videos : videos.filter(v=>v.tag===filter);

  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>PAGE</b> / NEWS</span><span>THE LATEST ROUND</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Fresh drops</p>
            <h1>NEWS,<br/><em>NO FILLER.</em></h1>
            <p className="page-hero-text">Every episode, every announcement, every story worth playing. Filter by Gaming, Tech, Culture — all in one place. This is the multi-page hub for Let’s Play.</p>
            <div className="page-hero-actions">
              <div className="filter-row">{filters.map(item=><button key={item} className={filter===item?'filter active':'filter'} onClick={()=>setFilter(item)}>{item}</button>)}</div>
            </div>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{backgroundImage:`url(${base}hero-dragon.jpg)`}} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>{videos.length}+</strong><small>EPISODES</small>
              <span>Updated weekly • Multi-page edition</span>
            </div>
          </div>
        </div>
      </section>

      <section className="latest wrap">
        <div className="video-grid">
          {visible.map(video=>(
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{video.meta}</span><span>{video.tag}</span></div>
              <h3>{video.title}</h3>
              <p className="video-desc">{video.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> Keep scrolling</p>
          <h2>WANT REVIEWS?<br/><em>GO DEEP.</em></h2>
        </div>
        <Link className="button button-yellow" to="/reviews">Go to reviews <Arrow/></Link>
      </section>
    </>
  );
}
