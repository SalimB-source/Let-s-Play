import { terrainManaColors } from './rpgCards.js';
import './rpg-card-rules.css';

const MANA_ICONS = {
  braise: { glyph: '🔥', label: 'Braise' },
  eau: { glyph: '💧', label: 'Eau' },
  sable: { glyph: '⏳', label: 'Sable' },
  neige: { glyph: '❄️', label: 'Neige' },
};

/**
 * Les terrains impriment leurs couleurs de mana sous forme d'icônes, y compris
 * les deux choix d'un hybride. Le texte du catalogue reste lisible pour la
 * recherche et les libellés accessibles ; les autres cartes sont inchangées.
 */
export default function RpgCardRules({ carte, text = carte?.text }) {
  if (!text || text === '—') return 'Aucune capacité.';
  if (carte?.kind !== 'terrain') return text;

  const colors = terrainManaColors(carte);
  return String(text).split(/(\b(?:braise|eau|sable|neige)\b)/giu).map((part, index) => {
    const color = part.toLowerCase();
    if (!colors.includes(color)) return part;
    const { glyph, label } = MANA_ICONS[color];
    return (
      <span
        key={index}
        className={`rpg-card-rules__mana rpg-card-rules__mana--${color}`}
        role="img"
        aria-label={label}
        title={`Mana ${label}`}
      >
        {glyph}
      </span>
    );
  });
}
