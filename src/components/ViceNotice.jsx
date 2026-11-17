import React from 'react';
import { useTheme, useViceNotice } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { viceCopy } from '../theme/viceTheme';

/**
 * Avis de l'habillage temporaire « Vice City ».
 *
 * Rendu une seule fois, à la fin de `Layout`, uniquement quand le thème `vice`
 * est actif. Il dit trois choses, dans cet ordre :
 *   1. c'est un habillage TEMPORAIRE (couleurs de GTA 6 jusqu'au lancement) ;
 *   2. il n'est pas officiel — Let's Play n'est affilié ni à Rockstar ni à
 *      Take-Two (mention obligatoire pour un habillage inspiration) ;
 *   3. comment en sortir : bouton « Revenir à l'habillage normal », ou la croix
 *      qui range l'avis sans éteindre l'habillage.
 *
 * Il vit DANS le flux, pas en surcouche fixe : rien ne recouvre le contenu, et
 * il ne se bat pas avec le lanceur social ni avec les contrôles du Sablier.
 */
export default function ViceNotice() {
  const { isVice, setTheme } = useTheme();
  const { hidden, hide } = useViceNotice();
  const { lang } = useLanguage();

  if (!isVice || hidden) return null;

  const copy = viceCopy[lang] || viceCopy.fr;

  return (
    <aside className="vice-notice" aria-label={copy.chip}>
      <div className="vice-notice-inner">
        <span className="vice-notice-eyebrow"><i aria-hidden="true" />{copy.chip}</span>
        <p className="vice-notice-copy">
          <b>{copy.title}</b> {copy.body}
          <small className="vice-notice-legal">{copy.legal}</small>
        </p>
        <div className="vice-notice-actions">
          <button type="button" className="vice-notice-exit" onClick={() => setTheme('dark')}>
            {copy.exit}
          </button>
          <button
            type="button"
            className="vice-notice-close"
            onClick={hide}
            aria-label={copy.close}
            title={copy.close}
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
