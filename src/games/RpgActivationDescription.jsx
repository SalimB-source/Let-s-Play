import { texteActivation } from './rpgActivationTexte.js';
import RpgEclairActivation from './RpgEclairActivation.jsx';
import './rpg-activation-description.css';

/** La règle activée est distincte des effets imprimés et garde son texte complet. */
export function RpgActivationDescription({ carte, epuisee = false, className = '' }) {
  const texte = texteActivation(carte);
  if (!texte) return null;
  const reponse = carte.activation.effet?.type === 'contresort';
  return (
    <span className={`rpg-activation-description${reponse ? ' rpg-activation-description--reponse' : ''}${epuisee ? ' is-epuisee' : ''}${className ? ` ${className}` : ''}`} data-effet-active={reponse ? 'reponse' : 'activation'}>
      <span className="rpg-activation-description__icone" aria-hidden="true">{reponse ? '🌀' : <RpgEclairActivation />}</span>
      <span className="rpg-activation-description__contenu">
        <span className="rpg-activation-description__titre">{reponse ? 'Effet-réponse' : 'Effet activé'}</span>
        <span>{texte}</span>
        {epuisee && <small className="rpg-activation-description__etat">Déjà utilisé pendant cette présence</small>}
      </span>
    </span>
  );
}

/** Encadre aussi les précisions de portée propres à Conquête. */
export function RpgActivationNote({ note, className = '' }) {
  if (!note) return null;
  return <span className={`rpg-activation-description rpg-activation-description--note${className ? ` ${className}` : ''}`}><span className="rpg-activation-description__icone" aria-hidden="true"><RpgEclairActivation /></span><span>{note}</span></span>;
}
