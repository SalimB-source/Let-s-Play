import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreTier, scoreLabel } from '../reviewsData';
import { useLanguage } from '../i18n/LanguageContext';
import VideoModal from '../components/VideoModal';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

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

// Short review YouTube — le test en 90 s de Black Flag Resynced,
// intégré avec son idée retranscrite en points et la note donnée
// dans la vidéo (8.5/10).
// https://www.youtube.com/shorts/WpurJcfnHHs
const shortReviewVideo = {
  id: 'WpurJcfnHHs',
  href: 'https://www.youtube.com/shorts/WpurJcfnHHs',
  title: 'Assassin’s Creed Black Flag Resynced — Let’s Play',
  score: 8.5,
};

// Palier de la note → libellé affiché à côté du score.
const shortTierLabel = (tier, labels) => (
  tier === 'is-hit' ? labels.tierHit : tier === 'is-good' ? labels.tierGood : labels.tierMid
);

export default function Reviews(){
  const { t, lang } = useLanguage();
  const c = t.reviews.article;
  const d = t.reviews.dossiers;
  const sr = t.reviews.shortReview;
  const tcl = tclFeature[lang] || tclFeature.fr;
  // Les points du test se partagent autour du Short, centré : première
  // moitié à gauche (avec meta + chapeau), seconde moitié à droite,
  // close par la note.
  const shortMid = Math.ceil(sr.points.length / 2);
  const shortPointsStart = sr.points.slice(0, shortMid);
  const shortPointsEnd = sr.points.slice(shortMid);
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
      {/* La grille « DERNIERS TESTS » (gameTests) est masquée pour
          l'instant : le short review ouvre la page. */}

      {/* Short review d'abord : le test en 90 s, transcrit, avec la note. */}
      <section className="short-review-section wrap" id="short-review">
        <div className="section-label"><span>{sr.label1}</span><span>{sr.label2}</span></div>
        <div className="short-review-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {sr.eyebrow}</p>
            <h2>{sr.h2a}<br/><em>{sr.h2b}</em></h2>
          </div>
        </div>
        <div className="short-review-grid">
          <div className="short-review-copy short-review-copy--start">
            <span className="short-review-meta">{sr.meta}</span>
            <p className="short-review-kicker">{sr.kicker}</p>
            <ul className="short-review-points">
              {shortPointsStart.map((point) => (
                <li key={point.lead}><strong>{point.lead}</strong> {point.body}</li>
              ))}
            </ul>
          </div>
          <div className="short-review-player hud-frame">
            <iframe src={youTubeEmbedUrl(shortReviewVideo.id)} title={shortReviewVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <div className="short-review-copy short-review-copy--end">
            <ul className="short-review-points">
              {shortPointsEnd.map((point) => (
                <li key={point.lead}><strong>{point.lead}</strong> {point.body}</li>
              ))}
            </ul>
            <a className="arrow-link" href={shortReviewVideo.href} target="_blank" rel="noreferrer">{sr.watch} <Arrow/></a>
            <div className={`short-review-score tier-${scoreTier(shortReviewVideo.score)}`}>
              <div className="short-review-score-top">
                <span className="short-review-score-kicker">{sr.scoreKicker}</span>
                <span className="short-review-score-tier">{shortTierLabel(scoreTier(shortReviewVideo.score), sr)}</span>
              </div>
              <div className="short-review-score-main">
                <span className="short-review-score-value">{scoreLabel(shortReviewVideo.score, lang)}</span>
                <span className="short-review-score-max">/10</span>
              </div>
              <div className="short-review-score-bar"><i style={{ width: `${shortReviewVideo.score * 10}%` }} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="featured-dossiers wrap" id="dossiers-tests">
        <div className="section-label"><span>{d.label1}</span><span>{d.label2}</span></div>
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
                <iframe src={youTubeEmbedUrl(dossier.video)} title={dossier.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
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
        <div className="section-label"><span>{t.reviews.reels.label1}</span><span>{t.reviews.reels.label2}</span></div>
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
              <iframe src={youTubeEmbedUrl(reel.id)} title={`${reel.label} — Let’s Play`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
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
