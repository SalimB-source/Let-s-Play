/**
 * La signature visuelle des deux familles de sorts — Magie Rapide et
 * Sorcellerie — telle que la déclinent la main du duel, les aperçus, le
 * mulligan, le catalogue et l'atelier.
 *
 * Un sort ne se distinguait d'une créature ou d'un terrain qu'en lisant sa
 * ligne de type : le cadre d'une carte suit son **élément**, jamais sa
 * famille, et au doigt les faces de jeu perdent même ce cadre. Ces trois
 * composants posent le canal qui manquait, en trois pièces :
 *
 * - `SortSigil` — le dessin de la famille : l'éclair de la Magie Rapide (ça
 *   part en réponse, sans attendre), l'étincelle de la Sorcellerie (le sort
 *   qu'on prépare à son tour). Dessiné en SVG, il ne dépend d'aucune police.
 * - `SortSocle` — le bandeau du bas d'une grande face : chanfrein d'or pour
 *   l'une, arche d'améthyste pour l'autre, avec le sigle et le mot écrit.
 * - `SortSceau` — le même repère en rond, pour les vignettes où un bandeau ne
 *   tiendrait pas (grille du catalogue, grille de l'atelier, mulligan).
 *
 * Les trois ne rendent **rien** pour une créature, un héros, un terrain ou une
 * arme : c'est précisément ce silence qui rend un sort reconnaissable. Les
 * mesures et les couleurs vivent dans `rpg-battle.css` (bloc « Les familles de
 * sorts : le sceau, le socle, la ligne »), qui suit `--rpg-card-marker-size`
 * — le repère de couleur de la face — pour que le socle garde ses proportions
 * de la carte en main (22 px au doigt) à la fiche du catalogue (56 px).
 */

import { magieFamilleInfo } from './rpgCards.js';

/** Le sigle d'une famille : l'éclair, ou l'étincelle. */
export function SortSigil({ famille }) {
  return (
    <svg className="rpg-sort-sigil" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {famille === 'rapide'
        ? <path d="M13.4 1.8 4.6 14.1h5.2L9.4 22.2l9.2-12.3h-5.4l.2-8.1Z" />
        : <path d="M12 1.6 14.6 9.4 22.4 12 14.6 14.6 12 22.4 9.4 14.6 1.6 12 9.4 9.4Z" />}
    </svg>
  );
}

/** Le bandeau du bas d'une face de sort : sigle et famille écrits. */
export function SortSocle({ carte, variante = '' }) {
  const famille = magieFamilleInfo(carte);
  if (!famille) return null;
  return (
    <span
      className={`rpg-sort-socle rpg-sort-socle--${famille.key}${variante ? ` rpg-sort-socle--${variante}` : ''}`}
      aria-hidden="true"
    >
      <SortSigil famille={famille.key} />
      <b className="rpg-sort-socle__mot">{famille.label}</b>
    </span>
  );
}

/** Le repère rond de la famille, pour les vignettes et le mulligan. */
export function SortSceau({ carte, className = '' }) {
  const famille = magieFamilleInfo(carte);
  if (!famille) return null;
  return (
    <span
      className={`rpg-sort-sceau rpg-sort-sceau--${famille.key}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <SortSigil famille={famille.key} />
    </span>
  );
}

/**
 * La classe de teinte d'une ligne de type — aperçu, fiche, mulligan, liste de
 * deck. Elle ne dit que la couleur : les surfaces qui doivent aussi peindre un
 * fond (le bandeau du mulligan) posent leur propre classe à côté.
 */
export function classeLigneFamille(carte) {
  const famille = magieFamilleInfo(carte);
  return famille ? ` rpg-sort-ligne--${famille.key}` : '';
}
