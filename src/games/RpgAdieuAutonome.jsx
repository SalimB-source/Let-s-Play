import { cardById } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { rpgElementParticule } from './rpgAmbianceVisuelle.js';
import './rpg-ambiance-visuelle.css';

const PARTICULES = [[12, 34, -24, 75], [30, 55, -12, 65], [48, 25, -4, 80], [65, 46, 12, 65], [84, 32, 24, 72], [22, 72, -18, 50], [57, 75, 9, 55], [81, 68, 20, 54]];

// Repli du plateau Conquête autonome, lorsque le rendu partagé n'est pas fourni.
export function RpgAdieuAutonome({ effet, onTermine }) {
  const carte = cardById(effet.cardId);
  return <span className="rpg-adieu-autonome" aria-hidden="true"
    onAnimationEnd={(event) => { if (event.target === event.currentTarget && !event.pseudoElement) onTermine?.(effet.effectId); }}>
    <img src={cardArt(effet.cardId)} alt="" />
    {PARTICULES.map(([x, y, dx, dy], index) => <i key={index} data-element={rpgElementParticule(carte, index)} style={{ '--gx': `${x}%`, '--gy': `${y}%`, '--dx': `${dx}px`, '--dy': `${dy}px`, '--d': `${index * 12}ms` }} />)}
  </span>;
}
