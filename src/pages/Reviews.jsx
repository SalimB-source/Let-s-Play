import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { gameTests, scoreTier, scoreLabel } from '../reviewsData';
import { useLanguage } from '../i18n/LanguageContext';
import VideoModal from '../components/VideoModal';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

// Dossier « écran » de la page Tests — partenariat TCL, copy propre à la page.
const tclFeature = {
  fr: { meta: 'PARTENAIRE ÉCRAN · TCL', eyebrow: 'AVEC TCL', titleA: 'AYA NGAMEW,', titleB: 'SUR GRAND ÉCRAN.', text: 'Let’s Play teste l’expérience Aya Ngamew avec le téléviseur TCL C6K QD-Mini LED. Une session consacrée au jeu, à l’image et à ce que la technologie change réellement manette en main.', watch: 'REGARDER LA VIDÉO', title: 'Let’s Play Aya Ngamew Experience with TCL C6K QD-MiniLED' },
  en: { meta: 'DISPLAY PARTNER · TCL', eyebrow: 'WITH TCL', titleA: 'AYA NGAMEW,', titleB: 'ON THE BIG SCREEN.', text: 'Let’s Play explores the Aya Ngamew experience with the TCL C6K QD-Mini LED TV — a session about the game, the picture and what display technology changes in actual play.', watch: 'WATCH THE VIDEO', title: 'Let’s Play Aya Ngamew Experience with TCL C6K QD-MiniLED' },
  ar: { meta: 'شريك الشاشة · TCL', eyebrow: 'مع TCL', titleA: 'AYA NGAMEW،', titleB: 'على الشاشة الكبيرة.', text: 'تستكشف Let’s Play تجربة Aya Ngamew مع تلفزيون TCL C6K QD-Mini LED، في جلسة عن اللعبة والصورة وما تضيفه تقنية العرض أثناء اللعب.', watch: 'شاهد الفيديو', title: 'Let’s Play Aya Ngamew Experience with TCL C6K QD-MiniLED' },
};

// Reels YouTube Shorts — page /reviews : 4 cartes 9:16
// https://www.youtube.com/shorts/a09GGX9YN6U
// https://www.youtube.com/shorts/Qlg19ADG-DE
// https://www.youtube.com/shorts/s4pqYSfL8oU
// https://www.youtube.com/shorts/ZA_LYwNCpp0
const reels = [
  { id: 'a09GGX9YN6U', label: 'REEL 01' },
  { id: 'Qlg19ADG-DE', label: 'REEL 02' },
  { id: 's4pqYSfL8oU', label: 'REEL 03' },
  { id: 'ZA_LYwNCpp0', label: 'REEL 04' },
];

export default function Reviews(){
  const { t, lang } = useLanguage();
  const c = t.reviews.article;
  const d = t.reviews.dossiers;
  const tcl = tclFeature[lang] || tclFeature.fr;
  const [player, setPlayer] = useState(null);
  const openVideo = (e, test) => {
    e.preventDefault();
    e.stopPropagation();
    setPlayer(test);
  };

  // Les deux dossiers à la une de la page Tests, réunis dans une seule section
  // placée sous la grille des tests. Le dossier TCL garde sa copy locale, le
  // dossier Black Flag réutilise les textes déjà traduits de `t.dossiers`.
  const featuredDossiers = [
    {
      id: 'tcl-c6k',
      video: '-kgkZrP5LrI',
      href: 'https://youtu.be/-kgkZrP5LrI',
      meta: tcl.meta,
      eyebrow: tcl.eyebrow,
      titleA: tcl.titleA,
      titleB: tcl.titleB,
      text: tcl.text,
      watch: tcl.watch,
      title: tcl.title,
    },
    {
      id: 'black-flag',
      video: '0e5yXxfchLA',
      href: 'https://youtu.be/0e5yXxfchLA',
      meta: t.dossiers.featuredLabel2,
      eyebrow: t.dossiers.featuredEyebrow,
      titleA: t.dossiers.featuredH2a,
      titleB: t.dossiers.featuredH2b,
      text: t.dossiers.featuredText,
      watch: t.dossiers.watchYoutube,
      title: 'Black Flag Review',
    },
  ];

  return (
    <>
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

      <section className="featured-dossiers wrap" id="dossiers-tests">
        <div className="section-label"><span><b>02</b> / {d.label1}</span><span>{d.label2}</span></div>
        <div className="featured-dossiers-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {d.eyebrow}</p>
            <h2>{d.h2a}<br/><em>{d.h2b}</em></h2>
          </div>
          <Link className="arrow-link" to="/dossiers">{d.seeAll} <Arrow/></Link>
        </div>
        <div className="featured-dossiers-grid">
          {featuredDossiers.map((dossier) => (
            <article className="featured-dossier" id={dossier.id} key={dossier.id}>
              <div className="featured-dossier-player hud-frame">
                <iframe src={`https://www.youtube.com/embed/${dossier.video}?rel=0&modestbranding=1`} title={dossier.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
              <div className="featured-dossier-copy">
                <span className="featured-dossier-meta">{dossier.meta}</span>
                <p className="eyebrow"><span className="live-dot" /> {dossier.eyebrow}</p>
                <h3>{dossier.titleA}<br/><em>{dossier.titleB}</em></h3>
                <p>{dossier.text}</p>
                <a className="arrow-link" href={dossier.href} target="_blank" rel="noreferrer">{dossier.watch} <Arrow/></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reels-section wrap" id="reels-tests">
        <div className="section-label"><span><b>03</b> / {t.reviews.reels.label1}</span><span>{t.reviews.reels.label2}</span></div>
        <div className="reels-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.reviews.reels.eyebrow}</p>
            <h2>{t.reviews.reels.h2a}<br /><em>{t.reviews.reels.h2b}</em></h2>
          </div>
          <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel/shorts" target="_blank" rel="noreferrer">{t.reviews.reels.seeAll} <Arrow /></a>
        </div>
        <div className="reels-grid">
          {reels.map((reel) => (
            <div className="reel-card hud-frame" key={reel.id}>
              <iframe src={`https://www.youtube.com/embed/${reel.id}?rel=0&modestbranding=1`} title={`${reel.label} — Let’s Play`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              <a className="reel-label" href={`https://www.youtube.com/shorts/${reel.id}`} target="_blank" rel="noreferrer">{reel.label} <Arrow /></a>
            </div>
          ))}
        </div>
      </section>

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
