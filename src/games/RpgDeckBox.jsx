import { cardArt } from './rpgCardArt.js';
import { cardById } from './rpgCards.js';
import { deckColors } from './rpgDeckFilter.js';
import './rpg-deckbox.css';
import { ElementEmblem } from './rpgEmblemes.jsx';

// Les emblèmes vivent désormais dans leur propre module (`rpgEmblemes.jsx`) :
// le duel, le salon et le coffret les importent sans traîner le CSS des
// boîtiers. On les réexporte ici pour ne pas casser les appelants historiques.
export { ElementEmblem };

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
