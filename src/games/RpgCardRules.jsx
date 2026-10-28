import { terrainManaColors } from './rpgCards.js';
import { iconePourLigne } from './effetIcons.js';
import { IconeLigneRegle } from './effetIcons.jsx';
import { decouperLien } from './rpgLienTexte.js';
import './rpg-card-rules.css';

const MANA_ICONS = {
  braise: { glyph: '🔥', label: 'Braise' },
  eau: { glyph: '💧', label: 'Eau' },
  sable: { glyph: '⏳', label: 'Sable' },
  neige: { glyph: '❄️', label: 'Neige' },
  tenebres: { glyph: '💀', label: 'Ténèbres' },
};

/**
 * Le texte de règle d'une carte, prêt à lire :
 * - les terrains impriment leurs couleurs de mana sous forme d'icônes, y
 *   compris les deux choix d'un hybride (le texte du catalogue reste lisible
 *   pour la recherche et les libellés accessibles) ;
 * - chaque autre ligne est **précédée de l'icône de son effet** — le
 *   pictogramme annonce la règle avant les mots (voir `effetIcons.js`).
 *   L'icône double l'information, elle ne la remplace pas : le texte reste
 *   entier à côté ;
 * - la phrase d'un **Lien** fait exception : pas d'icône, un gris tant que le
 *   renfort n'est pas réel, l'or et le gras dès que `lienActif` est vrai.
 *   `lienActif` est calculé par l'écran de duel — l'ancre en jeu **et** la
 *   carte jouable —, la fiche du catalogue le laisse à `false`.
 */
export default function RpgCardRules({ carte, text = carte?.text, effetsEpuises = [], lienActif = false }) {
  if (!text || text === '—') return 'Aucune capacité.';
  if (carte?.kind !== 'terrain') {
    const ligneRegle = (ligne) => {
      const cle = iconePourLigne(carte, ligne);
      if (!cle) return ligne;
      const epuise = new Set(effetsEpuises ?? []).has(cle);
      const contenu = (
        <>
          <IconeLigneRegle carte={carte} ligne={ligne} epuise={epuise} />
          {ligne}
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
    };

    return decouperLien(text).map((morceau, index) => (
      morceau.lien ? (
        <span
          key={`lien-${index}`}
          className={`rpg-card-rules__lien${lienActif ? ' is-actif' : ''}`}
          data-lien-actif={lienActif ? 'true' : undefined}
        >
          <IconeLigneRegle carte={carte} ligne={morceau.texte} />
          {morceau.texte}
        </span>
      ) : (
        <span key={`regle-${index}`}>{ligneRegle(morceau.texte)}</span>
      )
    ));
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
