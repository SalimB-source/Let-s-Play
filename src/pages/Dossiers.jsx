import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Dossiers(){
  const { t } = useLanguage();
  return (
    <div className="dossiers-page">
      <section className="dossier-feature-card wrap">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>LA XBOX 360,<br/><em>UNE GÉNÉRATION.</em></h2>
          <p>Retour sur la console qui a installé la haute définition, Xbox Live et une nouvelle culture du jeu connecté, malgré le célèbre Red Ring of Death.</p>
          <Link className="arrow-link" to="/dossiers/20-ans-xbox-360">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/20-ans-xbox-360" aria-label="Lire le dossier sur les 20 ans de la Xbox 360">
          <img src="https://i.ytimg.com/vi/8NqnTzVh5O0/hqdefault.jpg" alt="20 ans de Xbox 360" />
          <span>21:00 · HISTOIRE DU GAMING</span>
        </Link>
      </section>

      <section className="dossier-feature-card wrap">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>LE CHOC<br/><em>DES GÉNÉRATIONS.</em></h2>
          <p>Avec Chaft et El Joueur, retour sur les consoles, les jeux et les communautés qui ont façonné la manière de jouer, de l’arcade à Discord.</p>
          <Link className="arrow-link" to="/dossiers/choc-generations-gaming">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/choc-generations-gaming" aria-label="Lire le dossier Le Choc des Générations">
          <img src="https://i.ytimg.com/vi/t1Re8ki_gsw/hqdefault.jpg" alt="Le Choc des Générations" />
          <span>26:59 · CULTURE GAMING</span>
        </Link>
      </section>

      <section className="dossier-feature-card wrap">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>LA PLAYSTATION 1,<br/><em>UNE RÉVOLUTION.</em></h2>
          <p>Retour sur la console qui a fait passer le jeu vidéo aux CD, à la 3D et à une nouvelle culture du souvenir, trente et un ans après son lancement.</p>
          <Link className="arrow-link" to="/dossiers/heritage-playstation-1">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/heritage-playstation-1" aria-label="Lire le dossier sur l’héritage de la PlayStation 1">
          <img src="https://i.ytimg.com/vi/oOyW_rjiZ5w/hqdefault.jpg" alt="L’héritage de la PlayStation 1" />
          <span>19:39 · HISTOIRE DU GAMING</span>
        </Link>
      </section>

      <section className="dossier-feature-card wrap">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>LES JEUX<br/><em>DE L’ANNÉE.</em></h2>
          <p>Les Let’s Play Awards 2025 passent en revue les jeux qui ont marqué l’année, de la prouesse technique à la surprise indépendante, jusqu’au choix du GOTY.</p>
          <Link className="arrow-link" to="/dossiers/let-play-awards-2025">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/let-play-awards-2025" aria-label="Lire le dossier Let’s Play Awards 2025">
          <img src="https://i.ytimg.com/vi/0ThNyFItASM/hqdefault.jpg" alt="Let’s Play Awards 2025" />
          <span>27:14 · AWARDS GAMING</span>
        </Link>
      </section>

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

      <section className="dossier-feature-card wrap dossier-feature-card-secondary">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Nouveau dossier</p>
          <h2>LA CULTURE<br/><em>SE RÉUNIT.</em></h2>
          <p>Games &amp; Comic Con Dzair 2026 : cosplay, invités, découvertes et communauté au même endroit.</p>
          <Link className="arrow-link" to="/dossiers/games-comic-con-dzair">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/games-comic-con-dzair" aria-label="Lire le dossier Games et Comic Con Dzair 2026">
          <img src="https://i.ytimg.com/vi/HzigJZOxz2o/hqdefault.jpg" alt="Games & Comic Con Dzair 2026" />
          <span>15:17 · CULTURE GAMING</span>
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

      <section className="dossier-feature-card wrap dossier-feature-card-secondary">
        <div className="dossier-feature-card-copy">
          <p className="eyebrow"><span className="live-dot" /> Dossier précédent</p>
          <h2>POURQUOI<br/><em>LES SOULS ?</em></h2>
          <p>Un épisode devient une lecture longue : difficulté, narration, dopamine de la victoire et communauté.</p>
          <Link className="arrow-link" to="/dossiers/pourquoi-les-souls">Lire le dossier <Arrow/></Link>
        </div>
        <Link className="dossier-feature-card-media hud-frame" to="/dossiers/pourquoi-les-souls" aria-label="Lire le dossier Pourquoi les Souls">
          <img src="https://i.ytimg.com/vi/OH51fSHznwg/hqdefault.jpg" alt="Pourquoi les Souls ?" />
          <span>24:21 · ANALYSE GAMING</span>
        </Link>
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
    </div>
  );
}
