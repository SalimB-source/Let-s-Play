import { terrainManaColors } from './rpgCards.js';
import { iconePourLigne } from './effetIcons.js';
import { IconeLigneRegle } from './effetIcons.jsx';
import './rpg-card-rules.css';

const MANA_ICONS = {
  braise: { glyph: '🔥', label: 'Braise' },
  eau: { glyph: '💧', label: 'Eau' },
  sable: { glyph: '⏳', label: 'Sable' },
  neige: { glyph: '❄️', label: 'Neige' },
  tenebres: { glyph: '⚖️', label: 'Ténèbres' },
};

/**
 * Le texte de règle d'une carte, prêt à lire :
 * - les terrains impriment leurs couleurs de mana sous forme d'icônes, y
 *   compris les deux choix d'un hybride (le texte du catalogue reste lisible
 *   pour la recherche et les libellés accessibles) ;
 * - chaque autre ligne est **précédée de l'icône de son effet** — le
 *   pictogramme annonce la règle avant les mots (voir `effetIcons.js`).
 *   L'icône double l'information, elle ne la remplace pas : le texte reste
 *   entier à côté.
 */
export default function RpgCardRules({ carte, text = carte?.text, effetsEpuises = [] }) {
  if (!text || text === '—') return 'Aucune capacité.';
  if (carte?.kind !== 'terrain') {
    const cle = iconePourLigne(carte, text);
    if (!cle) return text;
    const epuise = new Set(effetsEpuises ?? []).has(cle);
    const contenu = (
      <>
        <IconeLigneRegle carte={carte} ligne={text} epuise={epuise} />
        {text}
      </>
    );
    if (!epuise) return contenu;
    return (
      <span
        className="rpg-card-rules__ligne--epuisee"
        data-effet={cle}
        data-effet-epuise="true"
      >
        {contenu}
      </span>
    );
  }

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
