import { useRef, useState } from 'react';
import { creditsLisible } from './rpgCredits.js';
import { prixCarteCatalogue } from './rpgCatalogueAchat.js';

/** Vente de la première copie seulement, depuis la fiche du catalogue. */
export default function RpgCatalogueAchat({ carte, possede, credits, onAcheter, onPlaySfx }) {
  const [retour, setRetour] = useState(null);
  const achatTermine = useRef(false);
  const prix = prixCarteCatalogue(carte?.id);
  if (prix === null || !onAcheter || (possede && !retour)) return null;
  const manque = Math.max(0, prix - (Number(credits) || 0));
  const acheter = () => {
    if (achatTermine.current) return;
    const resultat = onAcheter(carte.id);
    try { onPlaySfx?.(resultat?.ok ? 'select' : 'erreur'); } catch { /* son facultatif */ }
    if (resultat?.ok) achatTermine.current = true;
    setRetour(resultat?.ok ? 'achetee' : resultat?.raison ?? 'refus');
  };
  return (
    <div className="rpg-catalogue-achat" onClick={(event) => event.stopPropagation()}>
      <div className="rpg-catalogue-achat__action">
        <button type="button" className="rpg-catalogue-achat__bouton" data-catalogue-acheter={carte.id}
          disabled={possede || retour === 'achetee' || manque > 0}
          aria-label={`Acheter ${carte.name} pour ${creditsLisible(prix)} crédits`}
          onClick={acheter}>
          {possede || retour === 'achetee' ? '✓ Carte acquise' : `Acheter la carte · ${creditsLisible(prix)} ◈`}
        </button>
        {!possede && retour !== 'achetee' && <small>{manque ? `Il manque ${creditsLisible(manque)} ◈` : `Votre bourse : ${creditsLisible(credits)} ◈`}</small>}
      </div>
      {retour && <p role="status" className={`rpg-catalogue-achat__retour${retour === 'achetee' ? ' is-ok' : ''}`}>
        {retour === 'achetee' ? 'Carte ajoutée à votre collection.'
          : retour === 'deja-possedee' ? 'Cette carte est déjà dans votre collection.'
            : retour === 'solde-insuffisant' ? 'Votre solde est insuffisant.' : 'Achat impossible pour cette carte.'}
      </p>}
    </div>
  );
}
