import { cardRarityInfo } from './rpgCards.js';
import './rpg-brume-mythique.css';

/**
 * Une brume dorée translucide, posée sur l'illustration et sous ses repères.
 * La rareté est lue dans le catalogue, jamais déduite de l'élément, du type ou
 * du cadre : les mythiques hybrides et leurs illustrations alternatives en
 * profitent elles aussi. Les autres cartes ne créent aucun calque.
 */
export default function RpgBrumeMythique({ carte }) {
  if (cardRarityInfo(carte).key !== 'mythique') return null;

  // Décaler les nappes selon la carte évite qu'une grille entière respire à
  // l'unisson. Le décalage est stable entre les vues et ne nécessite aucun timer.
  const phase = [...String(carte?.id ?? '')].reduce((valeur, lettre) => (valeur * 31 + lettre.charCodeAt(0)) % 120, 0);
  return (
    <span
      className="rpg-brume-mythique"
      data-rpg-brume-mythique=""
      aria-hidden="true"
      style={{ '--rpg-brume-delai': `${-phase / 10}s` }}
    />
  );
}
