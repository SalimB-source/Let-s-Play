import React, { useState, useId } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './SpoilerAlert.css';

const copy = {
  fr: {
    badge: 'SPOILER ALERT',
    title: 'Contenu sensible — détails de l’intrigue',
    hint: 'Cet encadré contient des révélations sur l’histoire. Cliquez pour révéler.',
    reveal: 'Révéler le spoiler',
    hide: 'Masquer le spoiler',
    revealed: 'Spoiler révélé — vous pouvez le masquer à nouveau.',
  },
  en: {
    badge: 'SPOILER ALERT',
    title: 'Sensitive content — plot details inside',
    hint: 'This block contains story revelations. Click to reveal.',
    reveal: 'Reveal spoiler',
    hide: 'Hide spoiler',
    revealed: 'Spoiler revealed — you can hide it again.',
  },
  ar: {
    badge: 'تنبيه حرق',
    title: 'محتوى حساس — تفاصيل القصة',
    hint: 'هذا القسم يحتوي على كشف لأحداث القصة. اضغط للكشف.',
    reveal: 'كشف الحرق',
    hide: 'إخفاء الحرق',
    revealed: 'تم كشف الحرق — يمكنك إخفاؤه مجدداً.',
  },
};

export default function SpoilerAlert({ children, label, title, defaultOpen = false }) {
  const { lang } = useLanguage();
  const t = copy[lang] || copy.fr;
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const contentId = `spoiler-${id}`;

  return (
    <div className={`spoiler-alert ${open ? 'is-open' : 'is-closed'}`} data-spoiler>
      <div className="spoiler-alert-head">
        <span className="spoiler-alert-badge">
          <span className="spoiler-alert-dot" aria-hidden="true" />
          {t.badge}
        </span>
        <strong className="spoiler-alert-title">{title || label || t.title}</strong>
        <p className="spoiler-alert-hint">{t.hint}</p>
      </div>

      <button
        type="button"
        className="spoiler-alert-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="spoiler-alert-toggle-icon" aria-hidden="true">
          {open ? '✕' : '👁'}
        </span>
        <span>{open ? t.hide : t.reveal}</span>
        <span className="spoiler-alert-toggle-arrow" aria-hidden="true">
          {open ? '↘' : '↗'}
        </span>
      </button>

      <div
        id={contentId}
        className="spoiler-alert-body"
        hidden={!open}
        aria-hidden={!open}
      >
        <div className="spoiler-alert-body-inner">
          {open && <p className="spoiler-alert-live">{t.revealed}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// Version inline pour un mot/phrase dans un paragraphe
export function InlineSpoiler({ children, label }) {
  const { lang } = useLanguage();
  const t = copy[lang] || copy.fr;
  const [open, setOpen] = useState(false);
  return (
    <span className={`inline-spoiler ${open ? 'is-open' : ''}`}>
      {!open ? (
        <button
          type="button"
          className="inline-spoiler-btn"
          onClick={() => setOpen(true)}
          title={t.hint}
        >
          <span aria-hidden="true">⚠︎</span> {label || t.badge}
        </button>
      ) : (
        <span className="inline-spoiler-content">
          {children}
          <button type="button" className="inline-spoiler-hide" onClick={() => setOpen(false)} aria-label={t.hide}>
            ✕
          </button>
        </span>
      )}
    </span>
  );
}
