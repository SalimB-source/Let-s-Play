import React from 'react';

/** Emblème propre à chaque coupe — le Désert et le Grand Tour ne partagent pas de trophée. */
export default function MirageCupTrophyEmblem({ design = 'desert', className = '' }) {
  if (design === 'worldtour') {
    return (
      <svg className={`mirage-cup-trophy-emblem is-worldtour ${className}`} viewBox="0 0 64 72" aria-hidden="true" focusable="false">
        {/* Globe cerclé d'une orbite pour la Coupe Grand Tour. */}
        <circle cx="32" cy="16" r="12" fill="#174f82" stroke="#d5fbff" strokeWidth="2.5" />
        <path d="M22 10c4 2 5 5 4 8-1 2-1 5 1 8m8-20c-2 4-2 7 0 10 2 3 2 6 0 10m-11-8h16" fill="none" stroke="#70e1ca" strokeWidth="2" strokeLinecap="square" />
        <path d="M11 17c7-11 35-18 43-1M53 17c-7 11-35 18-43 1" fill="none" stroke="#ffd76b" strokeWidth="1.8" />
        <path d="M28 2h8v3h-8zM30 0h4v3h-4z" fill="#fff0b6" />
        {/* Coupe élancée en platine, avec anses en aile. */}
        <path d="M18 32h28v5h-2v5h-4v4h-5v3h-8v-3h-5v-4h-4v-5h-2z" fill="#d8f4f5" />
        <path d="M13 32h5v5h4v5h-4v-3h-5zM51 32h-5v5h-4v5h4v-3h5z" fill="#89b9ca" />
        <path d="M22 34h20v2H22zM28 49h8v4h-8zM30 53h4v5h-4z" fill="#8bb8c7" />
        <path d="M23 58h18v4H23zM18 62h28v5H18z" fill="#d8f4f5" />
        <path d="M20 63h24v2H20z" fill="#70e1ca" />
        <path d="M32 33l3 4-3 4-3-4z" fill="#ffd76b" />
      </svg>
    );
  }

  // Calice large en or, turquoise et cuivre, orné d'un soleil sur les dunes.
  return (
    <svg className={`mirage-cup-trophy-emblem is-desert ${className}`} viewBox="0 0 64 72" aria-hidden="true" focusable="false">
      <path d="M11 13h6v4h5v7h-5v-5h-6zM53 13h-6v4h-5v7h5v-5h6z" fill="#a75918" />
      <path d="M16 10h32v14h-3v7h-4v5h-6v4h-10v-4h-6v-5h-4v-7h-3z" fill="#f5ad32" />
      <path d="M19 11h26v3H19zM20 24h24v4H20z" fill="#ffe6a0" />
      <path d="M30 17h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#e85f36" />
      <path d="M20 30h24v3H20z" fill="#d67b24" />
      <path d="M20 33h7v-3h10v3h7v3h-5l-5 3H30l-5-3h-5z" fill="#27cfc7" />
      <path d="M28 40h8v4h-8zM30 44h4v8h-4z" fill="#f5ad32" />
      <path d="M25 52h14v4H25zM19 56h26v6H19z" fill="#a75918" />
      <path d="M21 57h22v2H21z" fill="#ffe6a0" />
    </svg>
  );
}
