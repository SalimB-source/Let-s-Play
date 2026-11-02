import React from 'react';
import { OFFRE_LANCEMENT } from './rpgOffreLancement.js';
import './rpg-offre-lancement.css';

/** Vitrine de lancement : aucun achat n'est proposé tant que le paiement n'existe pas. */
export default function RpgOffreLancement({ variante = 'souk', illustration }) {
  return (
    <div className={`rpg-offre-lancement rpg-offre-lancement--${variante}`} data-offre-lancement>
      {illustration && <img className="rpg-offre-lancement__art" src={illustration} alt="" aria-hidden="true" />}
      <div className="rpg-offre-lancement__contenu">
        <span className="rpg-offre-lancement__eyebrow">Offre de lancement · −50 %</span>
        <strong className="rpg-offre-lancement__titre">{OFFRE_LANCEMENT.boosters} boosters</strong>
        <div className="rpg-offre-lancement__prix"><strong>{OFFRE_LANCEMENT.prix}</strong><span>au lieu de <s>{OFFRE_LANCEMENT.prixInitial}</s></span></div>
        <span className="rpg-offre-lancement__date">Jusqu’au {OFFRE_LANCEMENT.fin} inclus · heure d’Alger</span>
        <span className="rpg-offre-lancement__statut">Paiement bientôt disponible</span>
      </div>
    </div>
  );
}
