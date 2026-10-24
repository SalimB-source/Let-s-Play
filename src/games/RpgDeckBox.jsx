import { cardArt } from './rpgCardArt.js';
import { cardById } from './rpgCards.js';
import { deckColors } from './rpgDeckFilter.js';
import './rpg-deckbox.css';

/**
 * Le coffret de deck en 3D — `src/games/RpgDeckBox.jsx`
 * ----------------------------------------------------
 * Le même objet sert à trois endroits : l'étagère de l'onglet Deck, l'en-tête
 * du deck ouvert, et le choix du deck dans le salon du duel en ligne. Il vit
 * donc dans son propre module, avec ses emblèmes et son inclinaison au
 * curseur, plutôt que d'être redessiné à chaque écran.
 *
 * Décor pur : le clic est porté par le bouton voisin (voir `GameModeMenu` et
 * `SelecteurDeck`), et le nom du deck y figure en clair — tout ce qui est
 * dessiné ici est `aria-hidden`.
 */

/** La couleur d'un deck en un mot : « hybride » dès qu'il mêle deux couleurs. */
export function deckColorModifier(deck) {
  const colors = deckColors(deck);
  return colors.length > 1 ? 'hybride' : colors[0] ?? 'neutre';
}

const EMBLEMS = {
  sable: <><path d="M6 2.6h12v2.1H6zM6 19.3h12v2.1H6z" /><path d="M7.7 4.7h8.6c0 3.5-2.5 5-3.3 7.3.8 2.3 3.3 3.8 3.3 7.3H7.7c0-3.5 2.5-5 3.3-7.3-.8-2.3-3.3-3.8-3.3-7.3z" /></>,
  braise: <path d="M12.6 1.6c.2 2.7 1.6 3.9 3 5.5 1.7 1.9 3.2 3.9 3.2 6.7a6.8 6.8 0 0 1-13.6 0c0-2.6 1.3-4.3 2.6-5.7.2 1.6.9 2.5 1.9 2.9C9.3 7.8 10.1 4.2 12.6 1.6z" />,
  eau: <path d="M12 2.6c3.5 4.3 6 7.4 6 10.9a6 6 0 0 1-12 0c0-3.5 2.5-6.6 6-10.9z" />,
  // Neige : le flocon à six branches de l'icône ❄️ imprimée sur les cartes.
  // Le choix du mana d'un deck hybride, la jauge, le filtre et les boîtiers
  // parlent donc tous la même langue ; les pointes en V restent lisibles
  // jusqu'à 11 px, la taille des emplacements de la jauge.
  neige: (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      {[0, 60, 120].map((angle) => (
        <path key={`axe-${angle}`} d="M12 2.15V21.85" strokeWidth="2.2" transform={`rotate(${angle} 12 12)`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path key={`pointe-${angle}`} d="M10.3 3.95 12 5.65l1.7-1.7" strokeWidth="2" transform={`rotate(${angle} 12 12)`} />
      ))}
    </g>
  ),
  // Ténèbres : la tête de mort — crâne, orbites, cavité nasale et mâchoire.
  tenebres: (
    <path
      fillRule="evenodd"
      d="M12 2.2C7.1 2.2 3.6 5.4 3.6 9.9c0 2.5 1.3 4.5 3.2 5.6l.4 4.1c.1.85.7 1.5 1.4 1.5h.8v-2.75a.75.75 0 0 1 1.5 0V21.1h2.2v-2.75a.75.75 0 0 1 1.5 0V21.1h.8c.7 0 1.3-.65 1.4-1.5l.4-4.1c1.9-1.1 3.2-3.1 3.2-5.6 0-4.5-3.5-7.7-8.4-7.7zM8.6 8a2.2 2.3 0 1 0 0 4.6 2.2 2.3 0 1 0 0-4.6zm6.8 0a2.2 2.3 0 1 0 0 4.6 2.2 2.3 0 1 0 0-4.6zM12 12.7l-1.6 3h3.2L12 12.7z"
    />
  ),
};

export function ElementEmblem({ element }) {
  return <svg className={`rpg-emblem rpg-emblem--${element}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{EMBLEMS[element] ?? EMBLEMS.sable}</svg>;
}

/** Illustration imprimée sur le boîtier : `boxArt` du deck, sinon sa première carte non-terrain. */
export function deckBoxArtUrl(deck) {
  const fallbackId = deck?.cardIds.find((id) => cardById(id)?.kind !== 'terrain') ?? deck?.cardIds[0];
  const artId = deck?.boxArt ?? fallbackId;
  return artId ? cardArt(artId) : '';
}

/** `size` : « shelf » (étagère, grand), « mini » (colonne de gauche) ou « showcase » (en-tête du deck ouvert). */
export function DeckBox({ deck, index = 0, size = 'shelf' }) {
  const modifier = deckColorModifier(deck);
  const emblems = deckColors(deck);
  const medals = emblems.map((couleur) => <span className="rpg-deckbox__medal" key={couleur}><ElementEmblem element={couleur} /></span>);
  return (
    <span className={`rpg-deckbox rpg-deckbox--${size} rpg-deckbox--${modifier}`} style={{ '--i': index }} aria-hidden="true">
      <span className="rpg-deckbox__shadow" />
      <span className="rpg-deckbox__sway">
        <span className="rpg-deckbox__body">
          <span className="rpg-deckbox__face rpg-deckbox__face--back"><span className="rpg-deckbox__crest"><ElementEmblem element={emblems[0]} /></span></span>
          <span className="rpg-deckbox__face rpg-deckbox__face--bottom" />
          <span className="rpg-deckbox__face rpg-deckbox__face--right"><span className="rpg-deckbox__medals">{medals}</span></span>
          <span className="rpg-deckbox__face rpg-deckbox__face--top" />
          <span className="rpg-deckbox__face rpg-deckbox__face--left">
            <span className="rpg-deckbox__medals">{medals}</span>
            <span className="rpg-deckbox__title">{deck.name}</span>
            <span className="rpg-deckbox__count">{deck.cardIds.length}</span>
          </span>
          <span className="rpg-deckbox__face rpg-deckbox__face--front">
            <span className="rpg-deckbox__art" style={{ backgroundImage: `url("${deckBoxArtUrl(deck)}")` }} />
            <span className="rpg-deckbox__lid"><span className="rpg-deckbox__medals">{medals}</span></span>
            <span className="rpg-deckbox__latch" />
            <span className="rpg-deckbox__plate">{deck.name}</span>
            <span className="rpg-deckbox__gloss" />
          </span>
        </span>
      </span>
    </span>
  );
}

/** Le boîtier se tourne vers le curseur (souris seulement : au doigt, on laisse la page défiler). */
export function inclinerBoitier(event) {
  if (event.pointerType !== 'mouse') return;
  const boitier = event.currentTarget.querySelector('.rpg-deckbox');
  if (!boitier) return;
  const zone = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - zone.left) / (zone.width || 1) - 0.5;
  const y = (event.clientY - zone.top) / (zone.height || 1) - 0.5;
  boitier.style.setProperty('--ry', `${(16 + x * 52).toFixed(1)}deg`);
  boitier.style.setProperty('--rx', `${(-9 - y * 18).toFixed(1)}deg`);
}

export function redresserBoitier(event) {
  const boitier = event.currentTarget.querySelector('.rpg-deckbox');
  boitier?.style.removeProperty('--ry');
  boitier?.style.removeProperty('--rx');
}
