import { CARD_FRAME_COLORS, RPG_ELEMENTS, cardColors } from './rpgCards.js';
import svgCadre from './assets/cadre-le-sablier.svg?raw';
import './rpg-cadre-carte.css';

// La géométrie reste celle du SVG fourni. Les couleurs sont injectées dans
// une copie autonome du dessin, jamais dans un masque de l'illustration.
const cadresParCouleurs = new Map();
function fondCadre(carte) {
  const presentes = cardColors(carte);
  const couleurs = RPG_ELEMENTS.filter((element) => presentes.includes(element));
  if (!couleurs.length) return undefined; // Le SVG doré d'origine reste le repli.
  const cle = couleurs.join('|');
  if (!cadresParCouleurs.has(cle)) {
    let dessin = svgCadre;
    if (couleurs.length === 1) {
      dessin = dessin.replaceAll('#ffd60b', CARD_FRAME_COLORS[couleurs[0]].color);
    } else {
      // Bandes diagonales nettes et continues sur toute la carte, dans l'ordre
      // canonique des éléments, indépendamment de l'ordre déclaré sur la fiche.
      const stops = couleurs.map((element, index) => {
        const color = CARD_FRAME_COLORS[element].color;
        return `<stop offset="${100 * index / couleurs.length}%" stop-color="${color}"/><stop offset="${100 * (index + 1) / couleurs.length}%" stop-color="${color}"/>`;
      }).join('');
      dessin = dessin.replace('<defs>', `<defs><linearGradient id="cadre-elements" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="179.24" y2="256.06">${stops}</linearGradient>`)
        .replaceAll('#ffd60b', 'url(#cadre-elements)');
    }
    cadresParCouleurs.set(cle, `url("data:image/svg+xml,${encodeURIComponent(dessin)}")`);
  }
  return cadresParCouleurs.get(cle);
}

/** Toutes les cartes partagent le cadre Le Sablier, teinté selon leurs éléments. */
export default function RpgCadreCarte({ carte }) {
  if (!carte?.kind) return null;
  const backgroundImage = fondCadre(carte);
  return <span className="rpg-cadre-carte rpg-cadre-carte--sablier" style={backgroundImage ? { backgroundImage } : undefined} aria-hidden="true" />;
}
