import { cardById, cardFrameClass, cardMotifClass, cardFrameColor } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';

const GOUTTES_TOURBILLON = Object.freeze([
  { dx: -46, dy: -34, d: 0 },
  { dx: 42, dy: -52, d: 90 },
  { dx: -24, dy: -74, d: 170 },
  { dx: 30, dy: -96, d: 250 },
  { dx: 6, dy: -120, d: 330 },
]);

export function TourbillonEau({ effet, onTermine = null }) {
  const estExil = effet.variante === 'exil';
  return (
    <div
      className={`rpg-tourbillon-eau${estExil ? ' rpg-tourbillon-eau--exil' : ''}`}
      data-rpg-bounce-id={effet.entityId}
      data-rpg-bounce-fx={estExil ? 'exil' : 'eau'}
      aria-hidden="true"
      style={{
        left: effet.relatifAuSlot ? '0' : `${effet.left}px`,
        top: effet.relatifAuSlot ? '0' : `${effet.top}px`,
        width: effet.relatifAuSlot ? '100%' : `${effet.width}px`,
        height: effet.relatifAuSlot ? '100%' : `${effet.height}px`,
        '--rpg-fx-rotation': `${effet.angle ?? 0}rad`,
      }}
      // Comme l'adieu d'une carte détruite : on ignore les animations des
      // enfants, qui se terminent avant le calque.
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || event.pseudoElement) return;
        onTermine?.(effet.effectId);
      }}
    >
      {/* La carte elle-même, encore à sa place : le tourbillon l'enveloppe,
          la soulève et la dissout — vers la main ou hors de la partie. */}
      {effet.cardId && (
        <span
          className={`rpg-tourbillon-eau__carte ${cardFrameClass(cardById(effet.cardId))} ${cardMotifClass(cardById(effet.cardId))}`}
          style={{ '--rpg-frame-color': cardFrameColor(cardById(effet.cardId)) }}
        >
          <img src={cardArt(effet.cardId)} alt="" />
        </span>
      )}
      <i className="rpg-tourbillon-eau__nappe" />
      <i className="rpg-tourbillon-eau__spirale" />
      <i className="rpg-tourbillon-eau__anneau rpg-tourbillon-eau__anneau--un" />
      <i className="rpg-tourbillon-eau__anneau rpg-tourbillon-eau__anneau--deux" />
      {GOUTTES_TOURBILLON.map((goutte) => (
        <i
          key={goutte.d}
          className="rpg-tourbillon-eau__goutte"
          style={{ '--dx': `${goutte.dx}px`, '--dy': `${goutte.dy}px`, '--d': `${goutte.d}ms` }}
        />
      ))}
    </div>
  );
}
