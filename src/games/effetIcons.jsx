/**
 * Les icônes d'effets en React — le pendant vivant d'`effetIcons.js`.
 *
 * Le sprite (21 symboles validés) s'injecte **une fois** par surface avec
 * `<EffetsSprite />` ; ensuite chaque icône n'est qu'un `<use>` sans coût.
 * Deux grammaires, comme sur la preview validée :
 * - les **pastilles** (`<PastillesCarte />`) : les mots-clés passifs d'une
 *   fiche, icône + libellé, sous la ligne de type ;
 * - les **badges** (`<IconesCarte />`) : l'icône seule, posée sur les faces
 *   de cartes (table, main, catalogue) où il n'y a pas la place du mot ;
 * - l'**interlignage** : une icône devant chaque ligne de règle (voir
 *   `RpgCardRules.jsx`, qui s'appuie sur `iconePourLigne`).
 *
 * Accessibilité : les icônes doublent l'information, elles ne la remplacent
 * jamais — le libellé reste porté par le `title` du badge et le texte de
 * règle reste écrit à côté.
 */
import { EFFETS_SPRITE, EFFET_ICONE, pastillesPourCarte, iconePourLigne } from './effetIcons.js';
import './effet-icons.css';

/** Le sprite des 21 symboles, à monter une fois par écran (menu, duel, guide). */
export function EffetsSprite() {
  // Le contenu est une constante du module — aucun texte venu de l'extérieur.
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: EFFETS_SPRITE }}
    />
  );
}

/** Une icône du sprite : `<EffetIcone cle="butin" />` ou `cle="i-butin"`. */
export function EffetIcone({ cle, size = 14, className = '' }) {
  if (!cle) return null;
  const id = cle.startsWith('i-') ? cle : (EFFET_ICONE[cle] ?? 'i-degats');
  return (
    <svg
      className={`rpg-effet-icone${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <use href={`#${id}`} />
    </svg>
  );
}

/** Le libellé complet d'une pastille : « Furie 3 », « Protection Braise »… */
export const pastilleTexte = (pastille) => (
  pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label
);

/**
 * Les pastilles d'une fiche : icône + libellé, dans l'ordre de lecture.
 * À poser sous la ligne de type (fiche, aperçu, catalogue, guide).
 */
export function PastillesCarte({ carte, className = '' }) {
  const pastilles = pastillesPourCarte(carte);
  if (!pastilles.length) return null;
  return (
    <span className={`rpg-pastilles${className ? ` ${className}` : ''}`} role="list" aria-label="Mots-clés et effets">
      {pastilles.map((pastille) => (
        <span key={pastille.cle} className="rpg-pastille" role="listitem" title={pastilleTexte(pastille)}>
          <EffetIcone cle={pastille.cle} size={13} />
          {pastilleTexte(pastille)}
        </span>
      ))}
    </span>
  );
}

/**
 * Les badges d'une face de carte : l'icône seule, en pastille ronde.
 * `entite` (sur la table) ajoute ses états vivants — infiltration accordée,
 * esquive courante, bouclier en place — aux mots-clés imprimés de la fiche.
 */
export function IconesCarte({ carte, entite = null, className = '' }) {
  const pastilles = pastillesPourCarte(carte);
  const ajouter = (cle, label, valeur = null) => {
    if (!cle || pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur });
  };
  if (entite) {
    if (entite.infiltration) ajouter('infiltration', 'Infiltration');
    if (entite.envol && !carte?.envol) ajouter('envol', 'Envol');
    if (entite.coupRapide && !carte?.coupRapide) ajouter('coupRapide', 'Coup rapide');
    if (entite.rapidite && !carte?.rapidite) ajouter('rapidite', 'Rapidité');
    if (entite.esquive) ajouter('esquive', 'Esquive', Number(entite.esquive) || null);
    if (entite.bouclier) ajouter('bouclier', 'Bouclier', Number(entite.bouclier) || null);
    if (entite.protection?.toursRestants > 0 || entite.protection?.permanente) {
      ajouter('protection', 'Protection');
    }
    if (entite.tenaciteDisponible) ajouter('tenacite', 'Tenacité');
  }
  if (!pastilles.length) return null;
  return (
    <span
      className={`rpg-card-icones${className ? ` ${className}` : ''}`}
      aria-label={`Effets : ${pastilles.map(pastilleTexte).join(', ')}`}
    >
      {pastilles.map((pastille) => (
        <span key={pastille.cle} className="rpg-card-icone" title={pastilleTexte(pastille)}>
          <EffetIcone cle={pastille.cle} size={12} />
          {pastille.valeur != null && <small>{pastille.valeur}</small>}
        </span>
      ))}
    </span>
  );
}

/** L'icône qui précède une ligne de règle (ou rien, si la ligne n'en porte pas). */
export function IconeLigneRegle({ carte, ligne }) {
  const cle = iconePourLigne(carte, ligne);
  if (!cle) return null;
  return <EffetIcone cle={cle} size={14} className="rpg-effet-icone--ligne" />;
}
