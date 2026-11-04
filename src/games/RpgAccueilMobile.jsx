/**
 * L'accueil mobile du Sablier — src/games/RpgAccueilMobile.jsx
 * ===========================================================
 * La grammaire d'un jeu mobile d'arène, transposée au Sablier **en paysage**
 * (l'orientation de jeu sur téléphone) :
 *
 *   - un bandeau haut : médaillon de niveau, pseudo, barre d'XP, bourse ◈ et
 *     l'accès au Souk — tout ce qui dit « qui je suis, ce que j'ai » ;
 *   - une **arène** au centre : la tour de Conquête en 3D, avec son nom et ses
 *     étages déblayés. Les trois modes se choisissent par des pastilles, et
 *     l'arène change avec eux ;
 *   - un gros bouton **JOUER**, doré, en relief : le seul geste qui compte ;
 *   - la rangée des **coffres de quêtes** en bas (`RpgCoffresQuetes.jsx`).
 *
 * L'accueil du bureau garde sa vitrine et ses trois bannières : ce composant
 * n'est monté que sur appareil tactile (`viewport.mobile`), donc aucune règle
 * du grand écran n'est déplacée.
 *
 * Aucune arithmétique de quête ni de crédits ici : le composant lit les vues
 * partagées (`resumeConquete`, `vueDesCoffres`) et relaie les gestes.
 */
import { useMemo, useState } from 'react';

import { cardArt } from './rpgCardArt.js';
import { creditsLisible } from './rpgCredits.js';
import { lireDerniereTour, resumeConquete } from './rpgConqueteAccueil.js';
import { RPG_STORY_TOURS } from './rpgStoryTours.js';
import RpgCoffresQuetes from './RpgCoffresQuetes.jsx';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import RpgMarketIcon from './RpgMarketIcon.jsx';
import RpgStoryTowerPreview from './RpgStoryTowerPreview.jsx';
import './rpg-accueil-mobile.css';

/**
 * Les trois modes, en pastilles : l'arène et le bouton suivent le choix.
 * Les pictogrammes sont **gravés en vectoriel**, jamais des emoji : la police
 * emoji du mobile n'est pas fiable d'un appareil à l'autre (même règle que
 * `RpgBoosterOuverture`).
 */
const MODES = Object.freeze([
  {
    id: 'conquete', nom: 'Conquête',
    icone: (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4 15V6l4-3 4 3v9Z" fill="currentColor" opacity=".9" />
        <path d="M6.4 15v-3.4h3.2V15Z" fill="#0d0b12" />
        <path d="M8 1.2 9 3H7Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'histoire', nom: 'Histoire',
    icone: (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M3.2 2.6h9.6v10.8H3.2Z" fill="currentColor" opacity=".9" />
        <path d="M5.4 5.4h5.2M5.4 8h5.2M5.4 10.6h3.4" stroke="#0d0b12" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'ligne', nom: 'En ligne',
    icone: (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M2.6 13.4 12 4M13.4 13.4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11 2.6h2.4V5M2.6 11v2.4H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
]);

export default function RpgAccueilMobile({
  quetes, credits = 0, barreXp = null, nomCompte = null,
  progressionHistoire = null, portefeuille = null,
  onContinueRecit, onChangeScreen, onOuvrirQuete, onOuvrirCycle, onOuvrirSemaine,
  onPlaySfx,
}) {
  const [mode, setMode] = useState('conquete');

  // L'arène de la Conquête : la tour que le joueur gravit en ce moment, sinon la
  // dernière jouée, sinon la première. C'est la même lecture que la galerie.
  const arene = useMemo(() => {
    const bilan = resumeConquete(progressionHistoire, portefeuille);
    const enCours = bilan.tours.find((entree) => entree.ouverte && !entree.terminee);
    const derniere = lireDerniereTour();
    const memoiree = bilan.tours.find((entree) => entree.tour.id === derniere);
    const choisie = enCours ?? memoiree ?? bilan.tours[0] ?? null;
    const rang = choisie ? RPG_STORY_TOURS.findIndex((tour) => tour.id === choisie.tour.id) + 1 : 1;
    return { ...choisie, rang, bilan };
  }, [progressionHistoire, portefeuille]);

  const niveau = Math.max(1, Math.floor(Number(barreXp?.niveau) || 1));
  const pourcentXp = Math.max(0, Math.min(100, Math.floor(Number(barreXp?.percent) || 0)));
  const pseudo = nomCompte || 'Duelliste';

  const jouer = () => {
    onPlaySfx?.('select');
    if (mode === 'histoire') { onContinueRecit?.(); return; }
    if (mode === 'ligne') {
      // Le duel en ligne vit sur sa propre route : c'est un vrai lien, comme
      // la bannière du bureau, pour que le partage et le retour fonctionnent.
      window.location.assign(`${import.meta.env.BASE_URL}jeu/sablier-de-bab-el/defi`);
      return;
    }
    onChangeScreen?.('tours');
  };

  const choisirMode = (id) => { onPlaySfx?.('menu'); setMode(id); };

  return (
    <main className="rpg-accueil-mobile" aria-label="Accueil du Sablier" data-accueil-mobile={mode}>
      {/* ── Le bandeau du joueur ─────────────────────────────────────────── */}
      <header className="rpg-accueil-mobile__bandeau">
        <div className="rpg-accueil-mobile__joueur">
          <span className="rpg-accueil-mobile__niveau" data-accueil-niveau={niveau} aria-label={`Niveau ${niveau}`}>
            {niveau}
          </span>
          <span className="rpg-accueil-mobile__identite">
            <b className="rpg-accueil-mobile__pseudo">{pseudo}</b>
            <span
              className="rpg-accueil-mobile__xp"
              role="progressbar"
              aria-label={`Expérience du niveau ${niveau}`}
              aria-valuenow={pourcentXp}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="rpg-accueil-mobile__xp-remplie" style={{ width: `${pourcentXp}%` }} />
              <em className="rpg-accueil-mobile__xp-texte">
                {barreXp?.maximal ? 'MAX' : `${barreXp?.into ?? 0}/${barreXp?.need ?? 0}`}
              </em>
            </span>
          </span>
        </div>

        <button
          type="button"
          className="rpg-accueil-mobile__bourse"
          data-accueil-souk
          title="Aller au Souk dépenser vos crédits"
          onClick={() => { onPlaySfx?.('menu'); onChangeScreen?.('souk'); }}
        >
          <RpgCreditIcon anime />
          <b data-accueil-credits={credits}>{creditsLisible(credits)}</b>
          <span className="rpg-accueil-mobile__bourse-plus" aria-hidden="true">+</span>
          <span className="sr-only">crédits — ouvrir le Souk</span>
        </button>

        <button
          type="button"
          className="rpg-accueil-mobile__souk"
          title="Le Souk"
          onClick={() => { onPlaySfx?.('menu'); onChangeScreen?.('souk'); }}
        >
          <RpgMarketIcon />
          <span className="sr-only">Ouvrir le Souk</span>
        </button>
      </header>

      {/* ── L'arène et le bouton de jeu ──────────────────────────────────── */}
      <div className="rpg-accueil-mobile__scene">
        <div className="rpg-accueil-mobile__modes" role="tablist" aria-label="Modes de jeu">
          {MODES.map((entree) => (
            <button
              key={entree.id}
              type="button"
              role="tab"
              aria-selected={mode === entree.id}
              className={`rpg-accueil-mobile__mode${mode === entree.id ? ' is-actif' : ''}`}
              data-accueil-mode={entree.id}
              onClick={() => choisirMode(entree.id)}
            >
              <span className="rpg-accueil-mobile__mode-icone" aria-hidden="true">{entree.icone}</span>
              {entree.nom}
            </button>
          ))}
        </div>

        <div className="rpg-accueil-mobile__arene" data-accueil-arene={mode}>
          {mode === 'conquete' && arene?.tour ? (
            <>
              <RpgStoryTowerPreview
                tour={arene.tour}
                className="rpg-accueil-mobile__maquette"
                detruite={Boolean(arene.terminee)}
              />
              <span className="rpg-accueil-mobile__plaque">
                <b>ARÈNE {arene.rang}</b>
                <em>{arene.tour.nom}</em>
                <small data-accueil-etages>
                  {arene.resume?.vaincus ?? 0} / {arene.resume?.total ?? 0} étages déblayés
                </small>
              </span>
            </>
          ) : (
            <>
              <img
                className="rpg-accueil-mobile__keyart"
                src={cardArt(mode === 'histoire' ? 'salem' : 'bouchra-guerriere-des-cretes')}
                alt=""
                aria-hidden="true"
              />
              <span className="rpg-accueil-mobile__plaque">
                <b>{mode === 'histoire' ? 'CAMPAGNE' : 'DUEL'}</b>
                <em>{mode === 'histoire' ? 'La Dernière Liste' : 'Duel en ligne'}</em>
                <small>{mode === 'histoire' ? 'L’aventure solo, étage par étage' : 'Défiez un autre joueur'}</small>
              </span>
            </>
          )}
        </div>

        <button type="button" className="rpg-accueil-mobile__jouer" data-accueil-jouer={mode} onClick={jouer}>
          {mode === 'conquete' ? 'Conquérir' : mode === 'histoire' ? 'Aventure' : 'Combattre'}
        </button>
      </div>

      {/* ── Les coffres : les quêtes du jour, à ouvrir d'un tap ──────────── */}
      <RpgCoffresQuetes
        quetes={quetes}
        onOuvrirQuete={onOuvrirQuete}
        onOuvrirCycle={onOuvrirCycle}
        onOuvrirSemaine={onOuvrirSemaine}
        onPlaySfx={onPlaySfx}
      />
    </main>
  );
}
