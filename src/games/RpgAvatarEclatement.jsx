import './rpg-avatar-eclatement.css';
import { ECLATS_AVATAR } from './rpgAvatarEclats.js';

/** Éclatement en mille morceaux de l'avatar du camp PERDANT, à la fin du duel.
 *
 * Le composant est purement décoratif (`aria-hidden`, `pointer-events: none`) :
 * il n'intercepte ni le clic sur la plaque ni les flèches de ciblage. Il n'est
 * monté QUE quand `vainqueur` est posé et que les animations ne sont pas
 * réduites ; le gagnant, lui, reste intact.
 *
 * `image` est l'URL du WebP détouré déjà utilisé par la plaque : aucune image
 * nouvelle, aucun PNG transparent. Chaque `<i>` porte une tranche de ce
 * portrait sur un fond doré OPAQUE, découpée par `background-position`, et sa
 * propre trajectoire (variables CSS calculées dans `rpgAvatarEclats.js`).
 */
export default function RpgAvatarEclatement({ image, camp = 'joueur' }) {
  if (!image) return null;
  return (
    <span
      className="rpg-avatar-eclatement"
      data-camp={camp}
      aria-hidden="true"
      style={{ '--rpg-eclat-image': `url("${image}")` }}
    >
      {ECLATS_AVATAR.map((eclat) => (
        <i
          key={eclat.id}
          className={`rpg-avatar-eclatement__eclat rpg-avatar-eclatement__eclat--${eclat.forme}`}
          style={eclat.style}
        />
      ))}
      <span className="rpg-avatar-eclatement__flash" />
    </span>
  );
}
