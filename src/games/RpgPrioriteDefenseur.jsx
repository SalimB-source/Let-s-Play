import './rpg-priorite-defenseur.css';

/** Indication décorative : le bouton de la carte conserve tous ses gestes. */
export function RpgPrioriteDefenseur({ statut }) {
  if (!statut) return null;
  return <span className={`rpg-priorite-defenseur rpg-priorite-defenseur--${statut}`} aria-hidden="true">
    <span>{statut === 'prioritaire' ? '🛡 PRIORITAIRE' : 'Protégée'}</span>
  </span>;
}

export function descriptionPrioriteDefenseur(statut) {
  return statut === 'prioritaire' ? 'Défenseur prioritaire pour cette attaque.'
    : statut === 'protegee' ? 'Cette créature ne peut pas être attaquée tant que le Défenseur est prioritaire.' : undefined;
}
