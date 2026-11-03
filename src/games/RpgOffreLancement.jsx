import React from 'react';
import { OFFRE_LANCEMENT } from './rpgOffreLancement.js';
import './rpg-offre-lancement.css';

/** Vitrine de lancement : aucun achat n'est proposé tant que le paiement n'existe pas. */
export default function RpgOffreLancement({ variante = 'souk', illustration }) {
  const slide = variante === 'slide';
  return (
    <div className={`rpg-offre-lancement rpg-offre-lancement--${variante}`} data-offre-lancement>
      {illustration && <img className="rpg-offre-lancement__art" src={illustration} alt="" aria-hidden="true" />}
      {slide && (
        <div className="rpg-offre-lancement__eventail" aria-hidden="true">
          <div className="rpg-offre-lancement__halo" />
          <div className="rpg-offre-lancement__flottant">
            {Array.from({ length: OFFRE_LANCEMENT.boosters }, (_, i) => (
              <div className="rpg-offre-lancement__booster" key={i} style={{ '--rotation': `${(i - 4.5) * 9}deg`, '--ordre': i }}>
                {illustration && <img src={illustration} alt="" />}
                <span className="rpg-offre-lancement__booster-titre">LE SOUK</span>
                <span className="rpg-offre-lancement__booster-sceau">⌛</span>
                <span className="rpg-offre-lancement__booster-bas">LE SABLIER · BAB EL</span>
              </div>
            ))}
          </div>
          <span className="rpg-offre-lancement__badge">× 10</span>
        </div>
      )}
      <div className="rpg-offre-lancement__contenu">
        <span className="rpg-offre-lancement__eyebrow">Offre de lancement <b>−50 %</b></span>
        <strong className="rpg-offre-lancement__titre">{OFFRE_LANCEMENT.boosters} boosters</strong>
        <div className="rpg-offre-lancement__prix"><strong>{OFFRE_LANCEMENT.prix}</strong><span>au lieu de <s>{OFFRE_LANCEMENT.prixInitial}</s></span></div>
        <span className="rpg-offre-lancement__date">Jusqu’au {OFFRE_LANCEMENT.fin} inclus · heure d’Alger</span>
        <span className="rpg-offre-lancement__statut">Paiement bientôt disponible</span>
        {slide && <button className="rpg-offre-lancement__bouton" type="button" disabled tabIndex={-1}>Bientôt disponible <span aria-hidden="true">→</span></button>}
      </div>
    </div>
  );
}
