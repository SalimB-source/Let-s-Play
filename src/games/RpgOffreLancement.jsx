import React from 'react';
import { OFFRE_LANCEMENT } from './rpgOffreLancement.js';
import './rpg-offre-lancement.css';

/** Vitrine de lancement : le CTA mène au Souk, jamais à un achat indisponible. */
export default function RpgOffreLancement({ variante = 'souk', illustration, onOuvrirSouk, actif = false }) {
  const slide = variante === 'slide';
  return (
    <div className={`rpg-offre-lancement rpg-offre-lancement--${variante}`} data-offre-lancement>
      {slide ? (
        <img
          className="rpg-offre-lancement__art"
          src={`${import.meta.env.BASE_URL}sablier-promo/offre-lancement-salem.webp`}
          alt=""
          aria-hidden="true"
        />
      ) : illustration && <img className="rpg-offre-lancement__art" src={illustration} alt="" aria-hidden="true" />}
      <div className="rpg-offre-lancement__contenu">
        <span className="rpg-offre-lancement__eyebrow">Offre de lancement <b>−50 %</b></span>
        <strong className="rpg-offre-lancement__titre">{OFFRE_LANCEMENT.boosters} boosters</strong>
        <div className="rpg-offre-lancement__prix"><strong>{OFFRE_LANCEMENT.prix}</strong><span>au lieu de <s>{OFFRE_LANCEMENT.prixInitial}</s></span></div>
        <span className="rpg-offre-lancement__date">Jusqu’au {OFFRE_LANCEMENT.fin} inclus · heure d’Alger</span>
        <span className="rpg-offre-lancement__statut">Paiement bientôt disponible</span>
        {slide && (
          <button className="rpg-offre-lancement__bouton" type="button" onClick={onOuvrirSouk} tabIndex={actif ? 0 : -1}>
            Découvrir le Souk <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
