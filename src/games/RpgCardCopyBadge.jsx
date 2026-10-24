import './rpg-card-copy-badge.css';

/**
 * Pastille de stock d'une carte. Le nombre est calculé par la collection :
 * ce composant ne fait que le rendre accessible, visuellement comme vocalement.
 */
export default function RpgCardCopyBadge({ nombre = 0, className = '' }) {
  const exemplaires = Math.max(0, Math.floor(Number(nombre) || 0));
  const libelle = `${exemplaires} exemplaire${exemplaires > 1 ? 's' : ''} dans votre collection`;
  return (
    <span
      className={`rpg-card-copy-badge${exemplaires === 0 ? ' is-empty' : ''}${className ? ` ${className}` : ''}`}
      data-card-copies={exemplaires}
      role="img"
      aria-label={libelle}
      title={libelle}
    >
      <span aria-hidden="true">×{exemplaires}</span>
    </span>
  );
}
