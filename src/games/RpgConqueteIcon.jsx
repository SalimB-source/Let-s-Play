/**
 * Icône « Conquête » du Sablier — `src/games/RpgConqueteIcon.jsx`
 *
 * Elle remplaçait l'ancien emoji sur l'onglet des Tours de Bab El : celui-ci
 * changeait de dessin (ou disparaissait) selon la police du téléphone, et ne
 * disait rien du Sablier. La Conquête est maintenant une carte de la page Jouer
 * et n'a plus d'onglet ; le composant et son SVG restent comme icône historique
 * réutilisable. Le dessin vit dans `public/icons/sablier/conquete.svg` : une
 * tour créée pour la Conquête, avec le sablier gravé dedans et un grain unique
 * au col. Le dossier `public/icons` est embarqué par la coque PC — l'icône
 * reste donc visible hors ligne.
 *
 * L'image est décorative : là où elle est reprise, le libellé « Conquête »
 * porte déjà le nom. Sa taille est réglée en `1em` par `rpg-battle.css`, comme
 * les autres icônes d'onglets.
 */
const DESSIN = `${import.meta.env.BASE_URL}icons/sablier/conquete.svg`;

export default function RpgConqueteIcon({ className = '' }) {
  return (
    <img
      className={`rpg-conquete-icon${className ? ` ${className}` : ''}`}
      src={DESSIN}
      alt=""
      aria-hidden="true"
      width="24"
      height="24"
      decoding="async"
      draggable={false}
      data-icone-conquete=""
    />
  );
}
