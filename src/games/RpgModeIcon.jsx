/**
 * Les grandes icônes des modes de la page Jouer — `src/games/RpgModeIcon.jsx`
 *
 * Un dessin par porte, en `currentColor` : l'icône prend l'encre de la carte
 * qui l'accueille (bleu du récit, laiton du duel en ligne, braise de « Jouer »,
 * sable de la « Conquête »). Le tutoriel reprend le même dessin en petit, dans
 * le lien texte sous les quatre cartes. Le trait est pensé pour une grille de
 * 64 px : il reste lisible à 42 px dans une carte carrée comme à 64 px sur un
 * grand écran. Décorative : le libellé de la carte dit déjà le mode.
 */
const DESSINS = {
  // Le livre ouvert et la plume : la campagne de Bab El s'écrit.
  histoire: (
    <>
      <path d="M12 17c6-4 13-4 20 0v31c-7-4-14-4-20 0V17Z" />
      <path d="M32 17c7-4 14-4 20 0v31c-6-4-13-4-20 0V17Z" />
      <path d="M32 17v31M18 25h8M18 31h6M38 25h8M38 31h6" />
      <path d="m45 9 8-6-2 11-6-5Z" />
      <path d="M18 41h8M38 41h8" />
    </>
  ),
  // Deux lames croisées sous une étoile : le défi entre deux joueurs.
  'en-ligne': (
    <>
      <path d="M16 9 50 43M48 9 14 43" />
      <path d="M10 15l8 8M46 41l8 8M54 15l-8 8M18 41l-8 8" />
      <path d="M32 22l2.6 5.4L40 30l-5.4 2.6L32 38l-2.6-5.4L24 30l5.4-2.6L32 22Z" />
      <path d="M20 50h24" />
    </>
  ),
  // Deux cartes qui se chevauchent, l'éclair du duel immédiat au milieu.
  jouer: (
    <>
      <rect x="13" y="14" width="25" height="35" rx="3" transform="rotate(-8 25.5 31.5)" />
      <rect x="26" y="15" width="25" height="35" rx="3" transform="rotate(8 38.5 32.5)" />
      <path d="m34 20-9 15h7l-2 12 11-17h-7l2-10Z" fill="currentColor" stroke="none" opacity=".9" />
    </>
  ),
  // La toque et son gland : les leçons guidées.
  tutoriel: (
    <>
      <path d="M8 27 32 14l24 13-24 13-24-13Z" />
      <path d="M16 32v10c0 5 7 9 16 9s16-4 16-9V32" />
      <path d="M56 27v17" />
      <path d="M53 47h6l-3 5-3-5Z" fill="currentColor" stroke="none" opacity=".85" />
      <path d="M26 23h12" />
    </>
  ),
  // La tour crénelée et son sablier gravé : la Conquête des Tours de Bab El.
  conquete: (
    <>
      <path d="M14 56h36" />
      <path d="M18 56V16h7v-6h5v6h4v-6h5v6h7v40" />
      <path d="M18 24h28" />
      <path d="M25 31h14l-7 9-7-9Z" />
      <path d="M25 50h14l-7-9-7 9Z" />
      <path d="M29 56v-3a3 3 0 0 1 6 0v3" />
      <circle cx="32" cy="40.5" r="1.3" fill="currentColor" stroke="none" opacity=".9" />
    </>
  ),
  // Le sablier de la marque : le bouton qui ramène à l'accueil Jouer.
  accueil: (
    <>
      <path d="M18 9h28M18 55h28" />
      <path d="M22 9v8c0 6 10 9 10 15s-10 9-10 15v8M42 9v8c0 6-10 9-10 15s10 9 10 15v8" />
      <path d="M26 20h12l-6 7-6-7Z" fill="currentColor" stroke="none" opacity=".22" />
      <path d="M26 44h12l-6-7-6 7Z" fill="currentColor" stroke="none" opacity=".22" />
    </>
  ),
  // L'éventail de trois cartes et son losange : l'onglet Deck.
  deck: (
    <>
      <rect x="10" y="15" width="23" height="33" rx="3.5" transform="rotate(-11 21.5 31.5)" />
      <rect x="31" y="15" width="23" height="33" rx="3.5" transform="rotate(11 42.5 31.5)" />
      <rect x="19" y="11" width="26" height="38" rx="4" fill="currentColor" fillOpacity=".18" />
      <rect x="19" y="11" width="26" height="38" rx="4" />
      <path d="M32 22.5 38 30l-6 7.5-6-7.5 6-7.5Z" fill="currentColor" stroke="none" opacity=".9" />
    </>
  ),
  // Le classeur de quatre planches enluminées : l'onglet Catalogue.
  catalogue: (
    <>
      <rect x="11" y="10" width="18" height="20" rx="3.2" fill="currentColor" fillOpacity=".2" />
      <rect x="11" y="10" width="18" height="20" rx="3.2" />
      <rect x="35" y="10" width="18" height="20" rx="3.2" />
      <path d="M39 17h10M39 23h7" />
      <rect x="11" y="34" width="18" height="20" rx="3.2" />
      <path d="M15 41h10M15 47h7" />
      <rect x="35" y="34" width="18" height="20" rx="3.2" fill="currentColor" fillOpacity=".2" />
      <rect x="35" y="34" width="18" height="20" rx="3.2" />
    </>
  ),
  // La roue dentée d'astrolabe : l'onglet Paramètres.
  parametres: (
    <>
      <path d="M28.5 9h7l1.3 5.2a18.2 18.2 0 0 1 4.4 1.8l4.6-2.8 4.9 4.9-2.8 4.6a18.2 18.2 0 0 1 1.8 4.4L55 28.5v7l-5.3 1.4a18.2 18.2 0 0 1-1.8 4.4l2.8 4.6-4.9 4.9-4.6-2.8a18.2 18.2 0 0 1-4.4 1.8L35.5 55h-7l-1.3-5.2a18.2 18.2 0 0 1-4.4-1.8l-4.6 2.8-4.9-4.9 2.8-4.6a18.2 18.2 0 0 1-1.8-4.4L9 35.5v-7l5.3-1.4a18.2 18.2 0 0 1 1.8-4.4l-2.8-4.6 4.9-4.9 4.6 2.8a18.2 18.2 0 0 1 4.4-1.8L28.5 9Z" />
      <circle cx="32" cy="32" r="9.5" fill="currentColor" fillOpacity=".2" />
      <circle cx="32" cy="32" r="9.5" />
      <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  // L'astre et les chevrons d'ascension : l'onglet dédié à la progression d'XP.
  progression: (
    <>
      <path d="M32 8l3.5 7.5L43 19l-7.5 3.5L32 30l-3.5-7.5L21 19l7.5-3.5L32 8Z" fill="currentColor" fillOpacity=".26" />
      <path d="M32 8l3.5 7.5L43 19l-7.5 3.5L32 30l-3.5-7.5L21 19l7.5-3.5L32 8Z" />
      <path d="M16 41 32 31l16 10" />
      <path d="M12 51 32 39l20 12" />
      <path d="M23 55h18" />
    </>
  ),
};

export default function RpgModeIcon({ nom, className = '' }) {
  const dessin = DESSINS[nom] ?? DESSINS.accueil;
  return (
    <svg
      className={`rpg-mode-icone${className ? ` ${className}` : ''}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {dessin}
    </svg>
  );
}
