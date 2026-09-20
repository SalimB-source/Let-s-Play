import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements, toastCopy } from './AchievementContext';

const copy = {
  en: { unlocked: 'ACHIEVEMENT UNLOCKED', xp: 'XP', open: 'See all achievements', close: 'Close notification' },
  fr: { unlocked: 'SUCCÈS DÉBLOQUÉ', xp: 'XP', open: 'Voir tous les succès', close: 'Fermer la notification' },
  ar: { unlocked: 'إنجاز جديد', xp: 'نقطة خبرة', open: 'عرض كل الإنجازات', close: 'إغلاق الإشعار' },
};

const VISIBLE_MS = 7000;

function Toast({ id, onDismiss, t }) {
  const item = toastCopy(id, t.lang);
  const { dismissToast } = useAchievements();

  // Disparition automatique ; le nettoyage annule le minuteur si le joueur
  // ferme la notification avant (ou si un autre succès arrive).
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id, dismissToast]);

  if (!item) return null;

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <span className="achievement-toast-icon" aria-hidden="true">{item.icon}</span>
      <div className="achievement-toast-body">
        <span className="achievement-toast-kicker">{t.unlocked}</span>
        <strong className="achievement-toast-name">{item.name}</strong>
        <span className="achievement-toast-xp">+{item.xp} {t.xp}</span>
        <Link className="achievement-toast-link" to="/achievements" onClick={onDismiss}>
          {t.open} ↗
        </Link>
      </div>
      <button
        type="button"
        className="achievement-toast-close"
        onClick={onDismiss}
        aria-label={t.close}
      >
        ×
      </button>
      <span className="achievement-toast-timer" aria-hidden="true" />
    </div>
  );
}

/**
 * Notifications de succès débloqués, empilées en bas à droite (en bas à
 * gauche en arabe, pour ne pas passer sous le contenu). Montées une fois dans
 * `Layout` : elles s'affichent quelle que soit la page où l'action a eu lieu.
 */
export default function AchievementToasts() {
  const { toasts, dismissToast } = useAchievements();
  const { lang } = useLanguage();
  const t = { ...(copy[lang] || copy.en), lang };

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toasts" aria-label={t.unlocked}>
      {toasts.map((id) => (
        <Toast key={id} id={id} t={t} onDismiss={() => dismissToast(id)} />
      ))}
    </div>
  );
}
