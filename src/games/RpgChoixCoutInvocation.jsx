import { useState } from 'react';
import { RpgBadgeActivation } from './RpgCadreCarte.jsx';
import { cardById } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { MOBA_EMBUSCADES_IMPRIMEES, rpgCandidatsCoutInvocationSpeciale } from './rpgMobaEmbuscadesImprimees.js';
import './rpg-choix-cout-invocation.css';

/** Aucun coût n'est payé tant que le joueur n'a pas confirmé sa carte.
 *
 * `onChoisirNormal` (facultatif) ajoute l'échappatoire : l'Invocation spéciale
 * n'est qu'une **offre**. Son prix imprimé — défausser un Sabre maudit pour
 * Tojiro — ne doit pas empêcher d'invoquer la créature à la manière ordinaire,
 * en payant ses sacrifices. Le bouton n'apparaît que si cette voie est ouverte. */
export default function RpgChoixCoutInvocation({ duel, cote, carteId, onChoisir, onAnnuler, onChoisirNormal = null }) {
  const [choix, setChoix] = useState(null);
  const cout = MOBA_EMBUSCADES_IMPRIMEES[carteId]?.cout;
  const candidats = rpgCandidatsCoutInvocationSpeciale(duel, cote, carteId);
  const exil = cout?.destination === 'exil';
  const action = exil ? 'exiler de votre cimetière' : 'défausser de votre main';
  const choixValide = choix !== null && candidats.includes(choix);
  const gererClavier = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); onAnnuler(); return; }
    if (event.key !== 'Tab') return;
    const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    const premier = boutons[0]; const dernier = boutons[boutons.length - 1];
    if (!premier) return;
    const actif = event.currentTarget.ownerDocument.activeElement;
    if (event.shiftKey && actif === premier) { event.preventDefault(); dernier.focus(); }
    else if (!event.shiftKey && actif === dernier) { event.preventDefault(); premier.focus(); }
  };
  return <div className="rpg-choix-cout" role="dialog" aria-modal="true" aria-labelledby="rpg-choix-cout-titre" aria-describedby="rpg-choix-cout-texte" onKeyDown={gererClavier}>
    <div className="rpg-choix-cout__panel">
      <header className="rpg-choix-cout__header">
        <p className="rpg-choix-cout__eyebrow"><span aria-hidden="true">✦</span> Invocation spéciale</p>
        <h2 id="rpg-choix-cout-titre">Choisissez une carte</h2>
        <p id="rpg-choix-cout-texte" className="rpg-choix-cout__description">Pour invoquer <strong>{cardById(carteId)?.name ?? 'cette créature'}</strong>, choisissez une carte à {action}.</p>
      </header>
      <div className="rpg-choix-cout__legende" aria-hidden="true">
        <span>{exil ? 'Depuis le cimetière' : 'Depuis votre main'}</span>
        <span>{candidats.length} {candidats.length > 1 ? 'choix possibles' : 'choix possible'}</span>
      </div>
      <div className="rpg-choix-cout__liste" role="group" aria-label="Cartes admissibles">
        {candidats.length === 0 && <p className="rpg-choix-cout__vide">Aucune carte admissible pour ce coût.</p>}
        {candidats.map((id, index) => {
          const carte = cardById(id);
          const selectionnee = choixValide && choix === id;
          return <button autoFocus={index === 0} key={id} type="button" className={`rpg-choix-cout__carte${selectionnee ? ' is-selected' : ''}`} aria-pressed={selectionnee} onClick={() => setChoix(id)}>
            <span className="rpg-choix-cout__portrait" aria-hidden="true">
              <img src={cardArt(id)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /><RpgBadgeActivation carte={carte} />
            </span>
            <span className="rpg-choix-cout__carte-texte">
              <strong>{carte?.name ?? id}</strong>
              <span>{carte?.typeLine ?? ''}</span>
            </span>
            <span className="rpg-choix-cout__indicateur" aria-hidden="true">{selectionnee ? '✓' : ''}</span>
          </button>;
        })}
      </div>
      <footer className="rpg-choix-cout__footer">
        <p className="rpg-choix-cout__note"><span aria-hidden="true">◇</span> Aucune carte n’est déplacée avant validation.</p>
        <div className="rpg-choix-cout__actions">
          {onChoisirNormal && <button type="button" className="rpg-choix-cout__normale" onClick={onChoisirNormal}>
            Invoquer normalement<span className="rpg-choix-cout__normale-detail"> — payer ses sacrifices, sans défausser</span>
          </button>}
          <button type="button" className="rpg-choix-cout__confirmer" disabled={!choixValide} onClick={() => onChoisir(choix)}>Confirmer</button>
          <button type="button" className="rpg-choix-cout__annuler" autoFocus={!candidats.length} onClick={onAnnuler}>Annuler</button>
        </div>
      </footer>
    </div>
  </div>;
}
