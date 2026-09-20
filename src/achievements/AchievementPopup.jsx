import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements, notificationCopy } from './AchievementContext';

/**
 * Notifications de déblocage.
 * --------------------------------
 * Plus de fenêtre centrale : les succès tombés glissent **petits, en bas à
 * droite**, comme de simples notifications. Chaque notification s'auto-
 * ferme après quelques secondes (le minuteur est suspendu tant que la souris
 * survole la pile) ou au clic. Les succès d'affilée (une rafale d'actions,
 * un premier passage) s'empilent les uns sur les autres : la file vient du
 * contexte (4 au maximum), chaque notification est autonome.
 */

const copy = {
  en: {
    unlocked: 'ACHIEVEMENT UNLOCKED',
    levelUp: 'LEVEL {level} REACHED',
    xp: 'XP',
    close: 'Close',
  },
  fr: {
    unlocked: 'SUCCÈS DÉBLOQUÉ',
    levelUp: 'NIVEAU {level} ATTEINT',
    xp: 'XP',
    close: 'Fermer',
  },
  ar: {
    unlocked: 'إنجاز جديد',
    levelUp: 'وصلت إلى المستوى {level}',
    xp: 'نقطة خبرة',
    close: 'إغلاق',
  },
};

// Temps d'affichage quand le joueur ne touche à rien.
const VISIBLE_MS = 5000;

/** Une seule notification : icône, titre, et récompense (XP / niveau). */
function AchievementToast({ entry }) {
  const { dismissNotification } = useAchievements();
  const { lang } = useLanguage();
  const t = copy[lang] || copy.en;
  const [paused, setPaused] = useState(false);
  const item = notificationCopy(entry.id, lang);

  // Fermeture automatique : le minuteur démarre à l'arrivée de la
  // notification et se met en pause pendant la lecture (survol).
  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => dismissNotification(entry.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [entry.id, paused, dismissNotification]);

  if (!item) return null;

  return (
    <button
      type="button"
      className={`achievement-toast rarity-${item.rarity || 'common'}`}
      onClick={() => dismissNotification(entry.id)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label={`${t.unlocked} : ${item.name}`}
      title={t.close}
    >
      <img className="achievement-toast-icon" src={item.icon} alt="" aria-hidden="true" />
      <span className="achievement-toast-text">
        <span className="achievement-toast-kicker">
          <span className="achievement-toast-spark" aria-hidden="true">◆</span> {t.unlocked}
        </span>
        <span className="achievement-toast-title">{item.name}</span>
        <span className="achievement-toast-desc">{item.desc}</span>
        <span className="achievement-toast-meta">
          <span className="achievement-toast-xp">+{item.xp} {t.xp}</span>
          {entry.levelUp && (
            <span className="achievement-toast-level">
              ★ {t.levelUp.replace('{level}', entry.levelUp.to)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/** Pile des notifications, ancrée en bas à droite de l'écran. */
export default function AchievementPopup() {
  const { notifications } = useAchievements();
  if (!notifications.length) return null;

  return (
    <div className="achievement-toasts" role="status" aria-live="polite">
      {notifications.map((entry) => (
        <AchievementToast key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
