import React from 'react';
import { Link } from 'react-router-dom';
import { videos, baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

const latestTests = [
  { title: "Test Marvel's Wolverine — Une jolie paire de griffes en manque d'affûtage", score: '7 / 10', date: '12.09.2026', platforms: 'PS5', image: 'https://static.actugaming.net/media/2026/09/marvels-wolverine-key-art-center-e1788279216389-446x250.jpg', href: 'https://www.actugaming.net/test-marvels-wolverine-review-821408/', excerpt: 'Insomniac Games signe une aventure spectaculaire, mais qui manque encore d’affûtage.' },
  { title: 'Test Orbitals — Hazelight Studios a-t-il du souci à se faire ?', score: '8,5 / 10', date: '09.09.2026', platforms: 'SWITCH 2', image: 'https://static.actugaming.net/media/2026/09/Orbitals-444x250.jpg', href: 'https://www.actugaming.net/test-orbitals-review-823213/', excerpt: 'Une expérience coopérative qui revisite avec finesse les habitudes du jeu à deux.' },
  { title: 'Test Star Wars Zero Company — Un très bon jeu tactique dans l’univers de la Guerre des Étoiles', score: '7,5 / 10', date: '01.09.2026', platforms: 'PC · PS5 · XBOX SERIES', image: 'https://static.actugaming.net/media/2025/04/Star-Wars-Zero-Company_-444x250.jpg', href: 'https://www.actugaming.net/test-star-wars-zero-company-un-tres-bon-jeu-tactique-dans-lunivers-de-la-guerre-des-etoiles-821024/', excerpt: 'La galaxie passe au tour par tour tactique avec une proposition solide et accessible.' },
  { title: 'Test Onimusha: Way of the Sword — Un retour prudent mais à la pointe de l’épée', score: '8 / 10', date: '31.08.2026', platforms: 'PC · PS5 · XBOX · SWITCH 2', image: 'https://static.actugaming.net/media/2026/08/onimusha-way-of-the-sword-key-art-444x250.webp', href: 'https://www.actugaming.net/test-onimusha-way-of-the-sword-review-818222/', excerpt: 'Capcom réussit le retour de sa saga samouraï avec des combats précis et généreux.' },
  { title: "Test The Blood of Dawnwalker — L'action-RPG en monde ouvert réussit son pari", score: '8 / 10', date: '31.08.2026', platforms: 'PC · PS5 · XBOX SERIES', image: 'https://static.actugaming.net/media/2026/01/the-blood-of-dawnwalker-1-444x250.jpg', href: 'https://www.actugaming.net/test-the-blood-of-dawnwalker-821035/', excerpt: 'Un monde ouvert ambitieux qui assume son héritage et esquive de peu les faux pas.' },
  { title: 'Test Boomerang X — Chef-d’œuvre d’un studio mort avant la gloire', score: '8,5 / 10', date: '28.08.2026', platforms: 'PC · SWITCH', image: 'https://static.actugaming.net/media/2026/07/BOOMERANG-X-444x250.jpg', href: 'https://www.actugaming.net/test-boomerang-x-chef-doeuvre-dun-studio-mort-avant-la-gloire-812967/', excerpt: 'Un FPS nerveux et inventif, porté par une identité mécanique qui ne ressemble à aucune autre.' },
  { title: 'Test Resonance: A Plague Tale Legacy — Un changement qui surprendra à coup sûr', score: '7,5 / 10', date: '26.08.2026', platforms: 'PC · PS5 · XBOX SERIES', image: 'https://static.actugaming.net/media/2026/08/Resonance_-A-Plague-Tale-Legacy_20260820194307_-444x250.jpg', href: 'https://www.actugaming.net/test-resonance-a-plague-tale-legacy-819939/', excerpt: 'La nouvelle direction de la licence surprend, avec un résultat qui ne laisse pas indifférent.' },
  { title: 'Test Duskfade — Un solide jeu d’action-plateforme 3D des années 2000', score: '8 / 10', date: '21.08.2026', platforms: 'PC · PS5 · XBOX · SWITCH 2', image: 'https://static.actugaming.net/media/2025/04/duskfade-key-art-no-logo-444x250.jpg', href: 'https://www.actugaming.net/test-duskfade-review-817934/', excerpt: 'Un hommage attachant aux jeux d’action et de plateformes de la génération 2000.' },
];

export default function Reviews(){
  const { t } = useLanguage();
  const gaming = videos.filter(v=>v.tag==='Gaming');

  return (
    <>
      <section className="reviews-hero" id="top">
        <div className="reviews-hero-bg" style={{ backgroundImage: `url(${base}chaft-soldier.png)` }} role="img" aria-label="Chaft soldier key art" />
        <div className="reviews-hero-overlay" aria-hidden="true" />
        <div className="reviews-hero-content">
          <div className="section-label"><span><b>{t.reviews.label1.split(' / ')[0]}</b> / {t.reviews.label1.split(' / ')[1]}</span><span>{t.reviews.label2}</span></div>
          <p className="eyebrow"><span className="live-dot" /> {t.reviews.eyebrow}</p>
          <h1>{t.reviews.h1a}<br/><em>{t.reviews.h1b}</em></h1>
          <p className="page-hero-text">{t.reviews.text}</p>
        </div>
      </section>

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

      <section className="latest-tests wrap">
        <div className="section-label"><span><b>02</b> / DERNIERS TESTS</span><span>ACTUGAMING · SEPTEMBRE 2026</span></div>
        <div className="latest-tests-head"><div><p className="eyebrow"><span className="live-dot" /> SÉLECTION DE LA RÉDACTION</p><h2>LES TESTS<br/><em>LES PLUS RÉCENTS.</em></h2></div><a className="arrow-link" href="https://www.actugaming.net/tests/?tab=game" target="_blank" rel="noreferrer">VOIR TOUS LES TESTS <Arrow/></a></div>
        <div className="latest-tests-grid">
          {latestTests.map((test) => <a className="latest-test-card" href={test.href} target="_blank" rel="noreferrer" key={test.href}>
            <div className="latest-test-image"><img src={test.image} alt={test.title} /><span className="latest-test-score">{test.score}</span></div>
            <div className="latest-test-meta"><span>{test.date}</span><span>{test.platforms}</span></div>
            <h3>{test.title}</h3>
            <p>{test.excerpt}</p>
            <span className="read-link">LIRE LE TEST <Arrow/></span>
          </a>)}
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
