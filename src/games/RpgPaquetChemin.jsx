/**
 * Le vrai paquet du Souk, en miniature — `src/games/RpgPaquetChemin.jsx`
 * -----------------------------------------------------------------------
 * « Le Chemin » ne peint plus un sachet générique : il reprend la silhouette
 * exacte du sachet que la cérémonie du Souk ouvre (`RpgBoosterOuverture`,
 * classes `rpg-souk__sachet-*`), avec l'illustration de la vitrine du rayon.
 * Les cinq cartes restent face cachée : le dos de carte dépasse derrière le
 * sachet, aucune carte tirée n'est montrée à l'avance.
 *
 * Le composant est purement décoratif (`aria-hidden` posé par l'appelant) :
 * il ne clique pas, n'écrit rien et ne charge qu'une peinture déjà connue du
 * jeu. La feuille `rpg-souk.css` est importée par `RpgPisteGains.jsx`, avant
 * `rpg-piste-gains.css` pour que la miniature puisse réduire les textes.
 */

import { cardArt } from './rpgCardArt.js';
import { RAYONS, TAUX } from './rpgBoosters.js';

/** La même rune gravée que sur le sachet ouvert par le Souk. */
function RuneSablier() {
  return (
    <svg className="rpg-piste__rune" viewBox="0 0 48 64" aria-hidden="true" focusable="false">
      <path d="M8 5h32M8 59h32M12 6v8c0 8 8 12 12 18-4 6-12 10-12 18v8M36 6v8c0 8-8 12-12 18 4 6 12 10 12 18v8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m16 17 8 12 8-12ZM15 53l9-12 9 12Z" fill="currentColor" opacity=".8" />
      <path d="M24 33v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function RpgPaquetChemin({ dos, className = '' }) {
  const rayon = RAYONS[0] ?? { nom: 'Souk', vitrine: 'ifrit-des-ergs' };
  return (
    <span className={`rpg-piste__paquet-reel${className ? ` ${className}` : ''}`} data-piste-vrai-paquet="" aria-hidden="true">
      <span className="rpg-piste__carte" style={{ backgroundImage: `url("${dos}")` }} />
      {/* Deux enveloppes, comme dans la cérémonie : l'ancre positionne, le
          sachet tourne. Les trois <i> restent le corps, le flanc et la
          languette — le harnais les compte. */}
      <span className="rpg-piste__sachet-ancre rpg-souk__sachet-ancre">
        <span className="rpg-piste__sachet rpg-souk__sachet">
          <i className="rpg-piste__sachet-face rpg-souk__sachet-corps">
            <img src={cardArt(rayon.vitrine)} alt="" loading="lazy" />
            <span className="rpg-souk__sachet-marque">LE SOUK</span>
            <span className="rpg-souk__sachet-rune"><RuneSablier /></span>
            <span className="rpg-souk__sachet-legende">{TAUX.cartes} CARTES · UN DESTIN</span>
          </i>
          <i className="rpg-piste__sachet-cote" />
          <i className="rpg-piste__sachet-top rpg-souk__sachet-languette">
            <span>LET’S PLAY · LE SOUK</span>
          </i>
        </span>
      </span>
    </span>
  );
}
