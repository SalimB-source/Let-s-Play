import React from 'react';

/**
 * Icône « plein écran » : quatre coins qui s'écartent (ouvrir) ou se rapprochent
 * (quitter). Dessinée en SVG plutôt qu'avec le glyphe ⛶, que beaucoup de polices
 * n'ont pas (carré vide sur Windows et sur Android selon la police système).
 * Elle prend la couleur du texte et reste décorative : le bouton porte son
 * propre `aria-label`.
 *
 * Partagée par les jeux d'arcade (Mirage Rush, Vice City Rush) ; sa taille est
 * réglée par le CSS de chaque jeu (`game-fullscreen-icon`).
 */
const OPEN = 'M2 6V2h4 M10 2h4v4 M14 10v4h-4 M6 14H2v-4';
const CLOSE = 'M6 2v4H2 M14 6h-4V2 M10 14v-4h4 M2 10h4v4';

export default function FullscreenIcon({ exit = false, className = 'game-fullscreen-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={exit ? CLOSE : OPEN} />
    </svg>
  );
}
