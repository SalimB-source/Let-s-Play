/**
 * Les **emblèmes d'élément** — la vraie icône d'une couleur du Sablier.
 *
 * Un seul dessin par couleur, partagé par tous les écrans : le boîtier de deck,
 * la jauge de mana du duel, le filtre du catalogue, les pastilles du salon, et
 * maintenant le coffret de bienvenue. C'est la même silhouette partout — le
 * sablier du Sable, la flamme de la Braise, la goutte de l'Eau, le flocon de la
 * Neige, le crâne des Ténèbres — pour qu'une couleur se reconnaisse sans être
 * lue.
 *
 * `fill: currentColor` : la couleur du dessin vient du contexte, pas du
 * fichier. Le module ne porte aucune feuille de style, afin qu'on puisse
 * l'importer partout (y compris dans une démo isolée) sans traîner le CSS des
 * boîtiers.
 */

const EMBLEMS = {
  sable: <><path d="M6 2.6h12v2.1H6zM6 19.3h12v2.1H6z" /><path d="M7.7 4.7h8.6c0 3.5-2.5 5-3.3 7.3.8 2.3 3.3 3.8 3.3 7.3H7.7c0-3.5 2.5-5 3.3-7.3-.8-2.3-3.3-3.8-3.3-7.3z" /></>,
  braise: <path d="M12.6 1.6c.2 2.7 1.6 3.9 3 5.5 1.7 1.9 3.2 3.9 3.2 6.7a6.8 6.8 0 0 1-13.6 0c0-2.6 1.3-4.3 2.6-5.7.2 1.6.9 2.5 1.9 2.9C9.3 7.8 10.1 4.2 12.6 1.6z" />,
  eau: <path d="M12 2.6c3.5 4.3 6 7.4 6 10.9a6 6 0 0 1-12 0c0-3.5 2.5-6.6 6-10.9z" />,
  // Neige : le flocon à six branches de l'icône ❄️ imprimée sur les cartes.
  // Le choix du mana d'un deck hybride, la jauge, le filtre et les boîtiers
  // parlent donc tous la même langue ; les pointes en V restent lisibles
  // jusqu'à 11 px, la taille des emplacements de la jauge.
  neige: (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      {[0, 60, 120].map((angle) => (
        <path key={`axe-${angle}`} d="M12 2.15V21.85" strokeWidth="2.2" transform={`rotate(${angle} 12 12)`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path key={`pointe-${angle}`} d="M10.3 3.95 12 5.65l1.7-1.7" strokeWidth="2" transform={`rotate(${angle} 12 12)`} />
      ))}
    </g>
  ),
  // Ténèbres : la tête de mort — crâne, orbites, cavité nasale et mâchoire.
  tenebres: (
    <path
      fillRule="evenodd"
      d="M12 2.2C7.1 2.2 3.6 5.4 3.6 9.9c0 2.5 1.3 4.5 3.2 5.6l.4 4.1c.1.85.7 1.5 1.4 1.5h.8v-2.75a.75.75 0 0 1 1.5 0V21.1h2.2v-2.75a.75.75 0 0 1 1.5 0V21.1h.8c.7 0 1.3-.65 1.4-1.5l.4-4.1c1.9-1.1 3.2-3.1 3.2-5.6 0-4.5-3.5-7.7-8.4-7.7zM8.6 8a2.2 2.3 0 1 0 0 4.6 2.2 2.3 0 1 0 0-4.6zm6.8 0a2.2 2.3 0 1 0 0 4.6 2.2 2.3 0 1 0 0-4.6zM12 12.7l-1.6 3h3.2L12 12.7z"
    />
  ),
};

export function ElementEmblem({ element }) {
  return <svg className={`rpg-emblem rpg-emblem--${element}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{EMBLEMS[element] ?? EMBLEMS.sable}</svg>;
}
