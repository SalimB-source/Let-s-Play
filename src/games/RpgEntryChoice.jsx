import { lazy, Suspense, useEffect, useState } from 'react';
import './rpg-entry-choice.css';

/**
 * Écran d'entrée du Sablier de Bab El — src/games/RpgEntryChoice.jsx
 * ------------------------------------------------------------------
 * Première chose montrée sur `/jeu/sablier-de-bab-el` : le choix entre
 *
 *   1. **Télécharger la version PC** — l'installeur Windows publié par la coque
 *      `desktop/` (GitHub Release sur le tag `desktop`). Le jeu tourne alors
 *      installé sur le PC, rendu par la carte graphique, jouable hors ligne ;
 *   2. **Jouer dans le navigateur** — le duel web habituel, immédiat.
 *
 * Le duel lui-même reste un chunk paresseux : tant que le joueur n'a pas
 * choisi le navigateur, les ~740 Ko de `RpgDuelPage` ne sont pas téléchargés —
 * l'écran d'entrée, lui, pèse quelques Ko et s'affiche tout de suite.
 *
 * L'écran s'efface de lui-même quand il n'a rien à proposer :
 *   - dans la coque PC (`window.letsPlayDesktop`) : le jeu EST déjà la version
 *     installée, remettre un mur devant serait absurde ;
 *   - dans l'APK Android (`window.LetsPlayAndroid`) et sur téléphone
 *     (`pointer: coarse`) : l'installeur vise Windows, on ne barre pas la route
 *     du joueur mobile ;
 *   - si le joueur a coché « retenir ce choix » sur cet appareil.
 */

const RpgDuelPage = lazy(() => import('./RpgDuelPage'));

/** Clé `localStorage` du choix retenu (`jeu` = navigateur). */
export const ENTREE_CHOIX_CLE = 'letsplay_sablier_entree_v1';

/** Release permanente de la coque PC : le tag `desktop` est recréé à chaque
 * build de `main`, les noms d'assets fixes (`…-setup.exe`) ne changent jamais. */
export const SABLIER_RELEASE_URL = 'https://github.com/SalimB-source/Let-s-Play/releases/tag/desktop';
export const SABLIER_SETUP_URL = 'https://github.com/SalimB-source/Let-s-Play/releases/download/desktop/le-sablier-de-bab-el-setup.exe';
/** API publique (CORS ouvert) : version et poids de l'installeur, affichés sous
 * le bouton quand la Release existe ; silencieux sinon. */
const SABLIER_RELEASE_API = 'https://api.github.com/repos/SalimB-source/Let-s-Play/releases/tags/desktop';

/** Vrai quand l'écran d'entrée n'a rien à proposer : coque PC, APK, téléphone. */
export function ecranInutile(win = typeof window === 'undefined' ? undefined : window) {
  if (!win) return false;                       // rendu sans DOM : on montre l'écran
  if (win.letsPlayDesktop) return true;         // déjà dans la version installée
  if (win.LetsPlayAndroid) return true;         // APK : le jeu web est l'app
  try {
    if (win.matchMedia?.('(pointer: coarse), (max-width: 820px)').matches) return true;
  } catch { /* matchMedia absent : on garde l'écran */ }
  try {
    return win.localStorage?.getItem(ENTREE_CHOIX_CLE) === 'jeu';
  } catch {
    return false;
  }
}

/** Logo Windows dessiné, pas une police d'icônes. */
function LogoWindows() {
  return (
    <svg className="rpg-entry-choice__logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 5.6 10.6 4.5v7.1H3V5.6Zm0 12.8 7.6 1.1v-7.1H3v6Zm8.6 1.2L21 21V12.4h-9.4v7.2Zm0-15.2v7.2H21V3l-9.4 1.4Z" fill="currentColor" />
    </svg>
  );
}

function LogoNavigateur() {
  return (
    <svg className="rpg-entry-choice__logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.4a15.6 15.6 0 0 0-1.2-5.4A8 8 0 0 1 19.9 11ZM12 4c.9 1.2 1.9 3.6 2.2 7H9.8C10.1 7.6 11.1 5.2 12 4ZM4.1 13h3.4c.1 2 .5 3.8 1.2 5.4A8 8 0 0 1 4.1 13Zm3.4-2H4.1a8 8 0 0 1 4.6-5.4A15.6 15.6 0 0 0 7.5 11Zm2.3 2h4.4c-.3 3.4-1.3 5.8-2.2 7-.9-1.2-1.9-3.6-2.2-7Zm5.5 5.4c.7-1.6 1.1-3.4 1.2-5.4h3.4a8 8 0 0 1-4.6 5.4Z" fill="currentColor" />
    </svg>
  );
}

export default function RpgEntryChoice({ variantesPlateaux = false } = {}) {
  const [montreEcran, setMontreEcran] = useState(() => !ecranInutile());
  const [retenir, setRetenir] = useState(false);
  const [meta, setMeta] = useState(null);
  const [estWindows, setEstWindows] = useState(true);

  useEffect(() => {
    setEstWindows(/Windows/i.test(navigator.userAgent || ''));
  }, []);

  // Version et poids de l'installeur, quand la Release existe déjà.
  useEffect(() => {
    let vivant = true;
    fetch(SABLIER_RELEASE_API, { headers: { accept: 'application/vnd.github+json' } })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((release) => {
        if (!vivant || !release) return;
        const asset = (release.assets || []).find((a) => /-setup\.exe$/.test(a.name || ''));
        setMeta({
          version: release.name || release.tag_name || '',
          mo: asset ? Math.max(1, Math.round(asset.size / 1048576)) : null,
        });
      })
      .catch(() => { /* pas de Release encore publiée : rien sous le bouton */ });
    return () => { vivant = false; };
  }, []);

  if (!montreEcran) {
    return (
      <Suspense fallback={<div className="rpg-entry-choice__chargement" role="status">Chargement du duel…</div>}>
        <RpgDuelPage variantesPlateaux={variantesPlateaux} />
      </Suspense>
    );
  }

  const jouerAuNavigateur = () => {
    if (retenir) {
      try { window.localStorage.setItem(ENTREE_CHOIX_CLE, 'jeu'); } catch { /* navigation privée */ }
    }
    setMontreEcran(false);
  };

  return (
    <div className="rpg-entry-choice">
      <div className="rpg-entry-choice__carte">
        <p className="rpg-entry-choice__surtitre">Let’s Play · arcade</p>
        <h1 className="rpg-entry-choice__titre">Le Sablier de Bab El</h1>
        <p className="rpg-entry-choice__accroche">
          Le RPG de cartes tour par tour de la maison. Choisissez comment y entrer :
          installé sur votre PC, ou tout de suite dans ce navigateur.
        </p>

        <div className="rpg-entry-choice__choix">
          <a
            className="rpg-entry-choice__option rpg-entry-choice__option--pc"
            href={SABLIER_SETUP_URL}
            rel="noopener"
          >
            <LogoWindows />
            <span className="rpg-entry-choice__option-titre">Télécharger pour Windows</span>
            <span className="rpg-entry-choice__option-texte">
              La version installable : le jeu sur votre PC, table 3D rendue par votre
              carte graphique, jouable sans connexion.
            </span>
            <span className="rpg-entry-choice__option-meta">
              {meta
                ? `${meta.version}${meta.mo ? ` · ${meta.mo} Mo` : ''} · Windows 10/11`
                : 'Windows 10/11 · installeur officiel'}
            </span>
          </a>

          <button type="button" className="rpg-entry-choice__option" onClick={jouerAuNavigateur}>
            <LogoNavigateur />
            <span className="rpg-entry-choice__option-titre">Jouer dans le navigateur</span>
            <span className="rpg-entry-choice__option-texte">
              Immédiat, sans rien installer. Decks, collection et progression sont
              enregistrés sur cet appareil.
            </span>
            <span className="rpg-entry-choice__option-meta">Duel, mode histoire, souk et tours</span>
          </button>
        </div>

        <label className="rpg-entry-choice__retenir">
          <input
            type="checkbox"
            checked={retenir}
            onChange={(evenement) => setRetenir(evenement.target.checked)}
          />
          <span>Retenir « navigateur » sur cet appareil et entrer directement la prochaine fois</span>
        </label>

        <p className="rpg-entry-choice__pied">
          {!estWindows && (
            <span className="rpg-entry-choice__note">
              La version installable vise Windows 10/11 — sur macOS et Linux, le navigateur
              est la bonne porte.{' '}
            </span>
          )}
          <a href={SABLIER_RELEASE_URL} rel="noopener">Toutes les versions</a>
          {' · '}
          <a href="https://github.com/SalimB-source/Let-s-Play/tree/main/desktop" rel="noopener">
            Comment fonctionne la version PC
          </a>
        </p>
      </div>
    </div>
  );
}
