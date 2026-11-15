import { useState } from 'react';
import { cardById } from './rpgCards.js';
import { MOBA_EMBUSCADES_IMPRIMEES, rpgCandidatsCoutInvocationSpeciale } from './rpgMobaEmbuscadesImprimees.js';
import './rpg-choix-cout-invocation.css';

/** Aucun coût n'est payé tant que le joueur n'a pas confirmé sa carte. */
export default function RpgChoixCoutInvocation({ duel, cote, carteId, onChoisir, onAnnuler }) {
  const [choix, setChoix] = useState(null);
  const cout = MOBA_EMBUSCADES_IMPRIMEES[carteId]?.cout;
  const candidats = rpgCandidatsCoutInvocationSpeciale(duel, cote, carteId);
  const action = cout?.destination === 'exil' ? 'exiler de votre cimetière' : 'défausser de votre main';
  return <div className="rpg-choix-cout" role="dialog" aria-modal="true" aria-labelledby="rpg-choix-cout-titre" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onAnnuler(); } }}>
    <div className="rpg-choix-cout__panel">
      <p className="rpg-choix-cout__eyebrow">Invocation spéciale</p>
      <h2 id="rpg-choix-cout-titre">Choisissez une carte</h2>
      <p>Pour invoquer <strong>{cardById(carteId)?.name}</strong>, choisissez une carte à {action}.</p>
      <div className="rpg-choix-cout__liste" aria-label="Cartes admissibles">
        {candidats.map((id, index) => <button autoFocus={index === 0} key={id} type="button" className={`rpg-choix-cout__carte${choix === id ? ' is-selected' : ''}`} aria-pressed={choix === id} onClick={() => setChoix(id)}>
          <strong>{cardById(id)?.name ?? id}</strong><span>{cardById(id)?.typeLine ?? ''}</span>
        </button>)}
      </div>
      <div className="rpg-choix-cout__actions">
        <button type="button" disabled={!choix || !candidats.includes(choix)} onClick={() => onChoisir(choix)}>Confirmer</button>
        <button type="button" onClick={onAnnuler}>Annuler</button>
      </div>
      <p className="rpg-choix-cout__note">Aucune carte n’est déplacée avant la validation de l’invocation.</p>
    </div>
  </div>;
}
