/**
 * La pièce des crédits ◈, frappée or.
 *
 * Le signe `◈` reste la façon de l'écrire — docs, commentaires, `aria-label` —
 * mais à l'écran c'est cette pièce qui s'affiche : un losange taillé à quatre
 * facettes, les arêtes du dessus prises dans la lumière, un centre gravé, et une
 * étincelle qui bat. Elle se dimensionne toute seule (`1em`) : elle prend la
 * taille du texte qui l'entoure, de la ligne de journal au solde de la bourse.
 *
 * `anime` l'allume : le halo respire et l'étincelle bat (coupé par
 * `prefers-reduced-motion`). C'est la pièce du grand solde, et le bouton
 * « Réclamer » est le seul endroit où l'or clignote comme une récompense.
 *
 * Elle est **décorative** (`aria-hidden`) : partout où elle sert, le montant est
 * déjà accompagné du mot « crédits » — dans un `aria-label`, un `title`, ou un
 * `.sr-only` juste à côté. Rien n'est lu deux fois.
 */
import { useId } from 'react';
import './rpg-credit.css';

export default function RpgCreditIcon({ anime = false, className = '' }) {
  // Deux pièces sur la même page ne doivent pas partager leurs dégradés : le
  // navigateur résoudrait le second `url(#…)` vers le premier dessiné.
  const cle = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const or = `rpg-credit-or-${cle}`;
  const eclat = `rpg-credit-eclat-${cle}`;
  return (
    <svg
      className={`rpg-credit${anime ? ' is-anime' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={or} x1="4" y1="2" x2="27" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset=".34" stopColor="#ffdc84" />
          <stop offset=".68" stopColor="#e9a92d" />
          <stop offset="1" stopColor="#9b6411" />
        </linearGradient>
        <radialGradient id={eclat} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fffdf3" stopOpacity=".9" />
          <stop offset="1" stopColor="#fffdf3" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Le corps : le losange, taillé d'un seul tenant. */}
      <polygon points="16,1.6 30.4,16 16,30.4 1.6,16" fill={`url(#${or})`} stroke="#6f440a" strokeWidth=".6" strokeOpacity=".9" />

      {/* Les quatre facettes : la lumière tombe du haut-gauche, le bas s'enfonce. */}
      <polygon points="16,1.6 16,16 1.6,16" fill="#fffdf4" fillOpacity=".3" />
      <polygon points="16,1.6 30.4,16 16,16" fill="#ffe7a0" fillOpacity=".16" />
      <polygon points="16,16 30.4,16 16,30.4" fill="#7f4f0a" fillOpacity=".22" />
      <polygon points="16,16 1.6,16 16,30.4" fill="#7f4f0a" fillOpacity=".36" />

      {/* Le biseau intérieur, et les deux arêtes qui prennent la lumière. */}
      <polygon points="16,4.8 27.2,16 16,27.2 4.8,16" fill="none" stroke="#fff4cc" strokeWidth=".7" strokeOpacity=".5" />
      <path d="M16 1.6 L30.4 16" stroke="#fffbe8" strokeWidth=".9" strokeOpacity=".8" strokeLinecap="round" />
      <path d="M16 1.6 L1.6 16" stroke="#fffbe8" strokeWidth=".9" strokeOpacity=".8" strokeLinecap="round" />

      {/* Le centre gravé : la marque de frappe, celle du Sablier. */}
      <polygon points="16,11.4 20.6,16 16,20.6 11.4,16" fill="#7b4d0b" fillOpacity=".3" stroke="#ffeec0" strokeWidth=".5" strokeOpacity=".38" />

      {/* L'étincelle : elle dort sur la facette du haut-gauche, et bat. */}
      <circle className="rpg-credit__halo" cx="10" cy="9" r="5.6" fill={`url(#${eclat})`} />
      <path
        className="rpg-credit__etincelle"
        d="M10 4.6 L11.1 7.9 L14.4 9 L11.1 10.1 L10 13.4 L8.9 10.1 L5.6 9 L8.9 7.9 Z"
        fill="#fffdf4"
        strokeOpacity="0"
      />
    </svg>
  );
}
