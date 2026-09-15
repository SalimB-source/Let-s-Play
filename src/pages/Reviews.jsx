import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewReels, instagramReelsUrl } from '../data';
import { gameTests, scoreTier, scoreLabel } from '../reviewsData';
import { useLanguage } from '../i18n/LanguageContext';
import VideoModal from '../components/VideoModal';
import ReelsCarousel from '../components/ReelsCarousel';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Reviews(){
  const { t, lang } = useLanguage();
  const c = t.reviews.article;
  const [player, setPlayer] = useState(null);
  const openVideo = (e, test) => {
    e.preventDefault();
    e.stopPropagation();
    setPlayer(test);
  };

  return (
    <>
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

      <section className="latest-tests wrap">
        <div className="section-label"><span><b>02</b> / {c.gridLabel}</span><span>{c.gridRange}</span></div>
        <div className="latest-tests-head"><div><p className="eyebrow"><span className="live-dot" /> {c.gridEyebrow}</p><h2>{c.gridTitleA}<br/><em>{c.gridTitleB}</em></h2></div></div>
        <div className="latest-tests-grid">
          {gameTests.map((test) => (
            <Link className="latest-test-card" to={test.route} key={test.slug}>
              <div className="latest-test-image">
                <img src={test.image} alt={test.alt} loading="lazy" />
                <span className={`latest-test-score score-badge ${scoreTier(test.score)}`}>
                  <b>{scoreLabel(test.score, lang)}</b><i>/10</i>
                </span>
                {test.video && (
                  <span
                    className="test-video-btn"
                    role="button"
                    tabIndex={0}
                    aria-label={`${c.watchVideo} — ${test.name}`}
                    onClick={(e) => openVideo(e, test)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openVideo(e, test); }}
                  >
                    <i aria-hidden="true">▶</i> {c.videoShort}
                  </span>
                )}
              </div>
              <div className="latest-test-meta"><span>{test.date}</span><span>{test.platforms.split(' · ')[0]}{test.platforms.includes('·') ? ' +' : ''}</span></div>
              <h3>{test.cardTitle}</h3>
              <p>{test.excerpt}</p>
              <span className="read-link">{c.readTest} <Arrow/></span>
            </Link>
          ))}
        </div>
      </section>

      <ReelsCarousel
        id="reels-tests"
        index="03"
        labels={t.reviews.reels}
        reels={reviewReels}
        seeAllHref={instagramReelsUrl}
      />

      {player && player.video && (
        <VideoModal
          video={player.video}
          title={player.name}
          kicker={c.videoKicker}
          watchLabel={c.watchOnYoutube}
          closeLabel={c.closeVideo}
          onClose={() => setPlayer(null)}
        />
      )}
    </>
  );
}
