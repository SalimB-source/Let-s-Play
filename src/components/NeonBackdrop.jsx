import React from 'react';

/**
 * Quelques icônes néon « gaming » posées sur le fond du site.
 *
 * Intention : des rappels, pas un décor qui remplit l'écran — 7 icônes
 * seulement, calées près des bords (gouttières), jamais au centre de
 * lecture. La couche est :
 *   — fixe (les icônes restent en place pendant le scroll, comme les
 *     scanlines CRT de `body::after`) ;
 *   — non interactive (`pointer-events:none`) ;
 *   — décorative (`aria-hidden`) ;
 *   — peinte sous le contenu (`z-index:-1` dans le CSS) : le texte et les
 *     cartes opaques passent naturellement au-dessus.
 * Couleurs, positions, halo et animations : section « NEON-BACKDROP » de
 * `src/styles.css` (+ surcharge thème clair dans `src/theme.css`).
 */
const ICONS = [
  {
    cls: 'ni-gamepad',
    node: (
      <>
        {/* croix directionnelle + boutons (style gamepad) */}
        <path d="M6 11h4" />
        <path d="M8 9v4" />
        <path d="M15 12h.01" />
        <path d="M18 10h.01" />
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
      </>
    ),
  },
  {
    cls: 'ni-dpad',
    node: (
      <path d="M9.5 3.5h5a1 1 0 0 1 1 1V9H20.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H15.5v4.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V15H3.5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H8.5V4.5a1 1 0 0 1 1-1z" />
    ),
  },
  {
    cls: 'ni-heart',
    node: (
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    ),
  },
  {
    cls: 'ni-trophy',
    node: (
      <>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </>
    ),
  },
  {
    cls: 'ni-sparkle',
    node: (
      <path d="M12 2.5c1 6 3.5 8.5 9.5 9.5-6 1-8.5 3.5-9.5 9.5-1-6-3.5-8.5-9.5-9.5 6-1 8.5-3.5 9.5-9.5Z" />
    ),
  },
  {
    cls: 'ni-zap',
    node: <path d="M13 2 4 14h7l-1 8 10-12h-7V2Z" />,
  },
  {
    cls: 'ni-joystick',
    node: (
      <>
        <ellipse cx="12" cy="18.8" rx="7.6" ry="2.9" />
        <path d="M12 16.4V7" />
        <circle cx="12" cy="4.7" r="2.5" />
      </>
    ),
  },
];

export default function NeonBackdrop() {
  return (
    <div className="neon-backdrop" aria-hidden="true">
      {ICONS.map((icon) => (
        <span key={icon.cls} className={`ni ${icon.cls}`}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            {icon.node}
          </svg>
        </span>
      ))}
    </div>
  );
}
