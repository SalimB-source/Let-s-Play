import React from 'react';

/**
 * Marque partenaire.
 *
 * Par défaut, un monogramme aux couleurs de la marque est affiché avec son nom :
 * pas de logo approximatif, et un rendu cohérent avec le HUD du site.
 * Pour brancher un logo officiel, il suffit de renseigner `partner.logo`
 * (fichier placé dans public/) — l'image remplace alors le monogramme.
 */
export default function PartnerMark({ partner, size = 'md' }) {
  return (
    <span className={`partner-mark partner-mark-${partner.tone} partner-mark-${size}`}>
      {partner.logo ? (
        <img className="partner-mark-logo" src={`${import.meta.env.BASE_URL}${partner.logo}`} alt={partner.name} loading="lazy" />
      ) : (
        <span className="partner-mark-badge" aria-hidden="true">{partner.mark}</span>
      )}
      <span className="partner-mark-text">
        <b>{partner.name}</b>
        {partner.nameNative ? (
          <i dir={/[\u0600-\u06FF]/.test(partner.nameNative) ? 'rtl' : 'ltr'} lang={/[\u0600-\u06FF]/.test(partner.nameNative) ? 'ar' : undefined}>
            {partner.nameNative}
          </i>
        ) : null}
      </span>
    </span>
  );
}
