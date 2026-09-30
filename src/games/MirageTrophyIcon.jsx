import React from 'react';

/**
 * Petit trophée en pixels dorés — le même profil que le trophée 3D de la
 * remise de coupe (coupe évasée, deux anses, pied, diamant cyan). Dessiné en
 * SVG plutôt qu’en emoji : il s’affiche à l’identique partout, même sans
 * police d’emoji. Décoratif : le texte voisin porte le sens.
 */
export default function MirageTrophyIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="#c98a1b" d="M1 2h2v1H2v3h1v1H1zM15 2h-2v1h1v3h-1v1h2z" />
      <path fill="#ffc93c" d="M3 2h10v5h-1v1h-1v1h-1v1H6V9H5V8H4V7H3z" />
      <path fill="#ffe48a" d="M3 1h10v1H3zM6 11h4v1H6z" />
      <path fill="#ffc93c" d="M7 10h2v1H7z" />
      <path fill="#c98a1b" d="M4 12h8v1.5H4zM3 13.5h10V15H3z" />
      <path fill="#45e4ff" d="M8 3l1.5 1.5L8 6 6.5 4.5z" />
    </svg>
  );
}
