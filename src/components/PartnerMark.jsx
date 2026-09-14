import React from 'react';

/**
 * Marque partenaire.
 *
 * Par défaut, un monogramme aux couleurs de la marque est affiché avec son nom :
 * pas de logo approximatif, et un rendu cohérent avec le HUD du site.
 * Pour brancher un logo officiel, il suffit de renseigner `partner.logo`
 * (fichier placé dans public/) — l'image remplace alors le monogramme.
 *
 * Avec `showText={false}`, seul le logo (ou le monogramme) est rendu : à utiliser
 * quand le nom du partenaire apparaît déjà dans le titre alentour, afin de ne
 * pas l'afficher deux fois et de laisser toute la place au visuel.
 */
export default function PartnerMark({ partner, size = 'md', showText = true }) {
  const badgeA11y = showText ? { 'aria-hidden': true } : { role: 'img', 'aria-label': partner.name };
  const isArabic = partner.nameNative ? /[\u0600-\u06FF]/.test(partner.nameNative) : false;

  return (
    <span className={`partner-mark partner-mark-${partner.tone} partner-mark-${size}`}>
      {partner.logo ? (
        <img className="partner-mark-logo" src={`${import.meta.env.BASE_URL}${partner.logo}`} alt={partner.name} loading="lazy" />
      ) : (
        <span className="partner-mark-badge" {...badgeA11y}>{partner.mark}</span>
      )}
      {showText ? (
        <span className="partner-mark-text">
          <b>{partner.name}</b>
          {partner.nameNative ? (
            <i dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : undefined}>
              {partner.nameNative}
            </i>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
