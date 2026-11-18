import { rpgAmbiancePlateau } from './rpgAmbianceVisuelle.js';
import './rpg-ambiance-visuelle.css';

const PARTICULES = [
  [4, 17, 0], [12, 64, -3], [21, 32, -7], [30, 79, -4],
  [70, 23, -8], [79, 71, -2], [88, 39, -6], [96, 82, -5],
];

/** Un calque décoratif limité aux bords, sans mesures, canvas ni interaction. */
export function RpgAmbiancePlateau({ plateau, cote = 'entier' }) {
  const ambiance = rpgAmbiancePlateau(plateau);
  return <span className={`rpg-ambiance rpg-ambiance--${ambiance} rpg-ambiance--${cote}`} data-ambiance-plateau={plateau} aria-hidden="true">
    {PARTICULES.map(([x, y, delai], index) => <i key={index} style={{ '--x': `${x}%`, '--y': `${y}%`, '--delai': `${delai}s` }} />)}
  </span>;
}

export function RpgDangerVie({ cote }) {
  return <span className={`rpg-danger-vie rpg-danger-vie--${cote}`} data-danger-vie={cote} aria-hidden="true" />;
}
