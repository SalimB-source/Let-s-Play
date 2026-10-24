import './rpg-card-copy-badge.css';

/**
 * Pastille de stock d'une carte. Le nombre est calculé par la collection :
 * ce composant ne fait que le rendre accessible, visuellement comme vocalement.
 *
 * Avec une `limite`, la pastille devient une fraction — « 1/2 » se lit « un
 * exemplaire sur les deux que le deck autorise » et ne laisse plus croire qu'il
 * manque quelque chose à une carte qui est en réalité complète, ni qu'une carte
 * à un exemplaire est déjà épuisée.
 */
export default function RpgCardCopyBadge({ nombre = 0, limite = null, className = '' }) {
  const exemplaires = Math.max(0, Math.floor(Number(nombre) || 0));
  const plafond = Number.isFinite(Number(limite)) && Number(limite) > 0 ? Math.floor(Number(limite)) : null;
  const mot = exemplaires > 1 ? 'exemplaires' : 'exemplaire';
  const libelle = plafond
    ? `${exemplaires} ${mot} sur ${plafond} dans votre collection · ${plafond} autorisés dans un deck`
    : `${exemplaires} ${mot} dans votre collection`;
  return (
    <span
      className={`rpg-card-copy-badge${exemplaires === 0 ? ' is-empty' : ''}${plafond && exemplaires >= plafond ? ' is-plein' : ''}${className ? ` ${className}` : ''}`}
      data-card-copies={exemplaires}
      {...(plafond ? { 'data-card-copies-max': plafond } : {})}
      role="img"
      aria-label={libelle}
      title={libelle}
    >
      <span aria-hidden="true">{plafond ? `${exemplaires}/${plafond}` : `×${exemplaires}`}</span>
    </span>
  );
}
