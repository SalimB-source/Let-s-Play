import React, { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Sélecteur de langue — FR / EN / AR.
 *
 * Remis dans la barre de navigation après la période « français seul ». Trois
 * différences avec l'ancien sélecteur, et deux raisons :
 *
 *   - il affiche la langue COURANTE en clair (« FR »), avec le nom complet dans
 *     l'infobulle : un visiteur arabophone arrivé ici par la langue de son
 *     appareil doit voir d'un coup d'œil dans quelle langue il lit ;
 *   - c'est un vrai menu ARIA (`role="menu"` / `menuitemradio`), pilotable au
 *     clavier (flèches, Échap, Tab) — l'ancien était un `listbox` de boutons
 *     sans navigation clavier ;
 *   - il ne déclenche aucun chargement au survol : les dictionnaires EN / AR
 *     n'arrivent qu'au clic (`dictionary.js`).
 *
 * Le choix est mémorisé (`letsplay-lang`) et prime ensuite sur la langue de
 * l'appareil.
 */
export default function LanguageSwitcher({ variant = 'nav' }) {
  const { lang, setLang, languages, t, pending } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();
  const current = languages.find((entry) => entry.code === lang) || languages[0];

  // Fermeture au clic extérieur — même mécanique que le menu de compte.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // À l'ouverture, le focus va sur la langue active : on sait où on est.
  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, languages.findIndex((entry) => entry.code === lang));
    itemRefs.current[index]?.focus();
  }, [open, lang, languages]);

  const close = ({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const choose = (code) => {
    setLang(code);
    close();
  };

  const onMenuKeyDown = (event, index) => {
    const last = languages.length - 1;
    const move = (next) => {
      event.preventDefault();
      itemRefs.current[(next + languages.length) % languages.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(last);
    else if (event.key === 'Escape' || event.key === 'Tab') close();
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(languages[index].code);
    }
  };

  const label = t?.nav?.langAria || 'Changer de langue';

  return (
    <div className={`lang-switch lang-switch-${variant}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="lang-switch-button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label} — ${current.name}`}
        title={`${label} — ${current.name}`}
      >
        <span className="lang-switch-globe" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="6.2" />
            <path d="M1.8 8h12.4M8 1.8c1.7 1.7 2.6 3.9 2.6 6.2S9.7 12.5 8 14.2C6.3 12.5 5.4 10.3 5.4 8S6.3 3.5 8 1.8Z" />
          </svg>
        </span>
        <span className="lang-switch-current">{current.label}</span>
        <svg className="lang-switch-caret" viewBox="0 0 12 8" width="9" height="6" aria-hidden="true">
          <path d="M1 1.6 6 6.4l5-4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? <span className="lang-switch-pending" aria-hidden="true" /> : null}
      </button>

      <div className="lang-switch-menu" id={menuId} role="menu" aria-label={label} hidden={!open}>
        {languages.map((entry, index) => {
          const active = entry.code === lang;
          return (
            <button
              key={entry.code}
              ref={(node) => { itemRefs.current[index] = node; }}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              lang={entry.code}
              dir={entry.dir}
              className={`lang-switch-option${active ? ' active' : ''}`}
              tabIndex={-1}
              onClick={() => choose(entry.code)}
              onKeyDown={(event) => onMenuKeyDown(event, index)}
            >
              <span className="lang-switch-code">{entry.label}</span>
              <span className="lang-switch-name">{entry.name}</span>
              {active ? (
                <svg className="lang-switch-check" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                  <path d="M1.6 6.4 4.5 9.3 10.4 2.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
