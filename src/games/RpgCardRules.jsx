import { Fragment } from 'react';
import { terrainManaColors } from './rpgCards.js';
import './rpg-card-rules.css';

const MANA_ICONS = {
  braise: { glyph: '🔥', label: 'Braise' },
  eau: { glyph: '💧', label: 'Eau' },
  sable: { glyph: '⏳', label: 'Sable' },
  neige: { glyph: '❄️', label: 'Neige' },
};

/**
 * Noms d'effets imprimés sur les cartes : « Tenacité », « Rapidité »,
 * « Furie 3 », « Coup rapide »… Ils passent en gras pour se repérer d'un
 * coup d'œil dans les règles. Les formes longues sont essayées en premier
 * (« Magie Rapide » avant « Rapidité ») et la valeur attachée au nom
 * (« Furie 3 », « Esquive 1 ») reste collée en gras. « Contre » n'en est
 * pas un : c'est un verbe (« Contre la carte annoncée »).
 */
const EFFET_NOMS = [
  'Magie Rapide', 'Coup rapide', 'Sorcellerie', 'Tenacité', 'Rapidité',
  'Résonance', 'Infiltration', 'Esquive', 'Furie', 'Envol', 'Rebond', 'Activé',
];
const EFFET_NOM_RE = new RegExp(
  `(?<![\\w\\u00C0-\\u024F])((?:${EFFET_NOMS.join('|')})(?:\\s+\\d)?)(?![\\w\\u00C0-\\u024F])`,
  'gu',
);

function rendreMana(texte, colors) {
  return String(texte).split(/(\b(?:braise|eau|sable|neige)\b)/giu).map((part, index) => {
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

/**
 * Rendu des règles d'une carte. Les noms d'effets sont en gras sur toutes les
 * cartes ; les terrains impriment en plus leurs couleurs de mana sous forme
 * d'icônes, y compris les deux choix d'un hybride. Le texte du catalogue reste
 * lisible pour la recherche et les libellés accessibles.
 */
export default function RpgCardRules({ carte, text = carte?.text }) {
  if (!text || text === '—') return 'Aucune capacité.';
  const colors = carte?.kind === 'terrain' ? terrainManaColors(carte) : [];
  return String(text).split(EFFET_NOM_RE).map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="rpg-card-rules__effet">{part}</strong>;
    }
    if (!part) return null;
    return <Fragment key={index}>{colors.length ? rendreMana(part, colors) : part}</Fragment>;
  });
}
