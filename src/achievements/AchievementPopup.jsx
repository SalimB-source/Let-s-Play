import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements, notificationCopy } from './AchievementContext';
import { rarityLabel } from './catalog';

/**
 * Fenêtre de déblocage d'un succès.
 * --------------------------------
 * Dès qu'un succès tombe, une fenêtre s'ouvre au centre du site : icône,
 * nom, description, rareté, XP — et le passage de niveau quand les points
 * gagnés font monter d'un rang. Plusieurs succès d'affilée (une rafale
 * d'actions, un premier passage) sont présentés **un par un** : la file vient
 * du contexte, la fenêtre affiche toujours son premier élément, et se fermer
 * fait passer au suivant.
 *
 * Elle se ferme au clic (n'importe où), avec Échap, par le bouton principal,
 * ou toute seule après quelques secondes — le minuteur est suspendu tant que
 * la souris survole la fenêtre, pour laisser le temps de lire.
 */

const copy = {
  en: {
    unlocked: 'ACHIEVEMENT UNLOCKED',
    levelUp: 'LEVEL {level} REACHED',
    xp: 'XP',
    next: 'NEXT',
    nextCount: 'Next achievement',
    continue: 'CONTINUE',
    viewAll: 'SEE ALL ACHIEVEMENTS',
    close: 'Close',
    queue: '{index} of {total}',
  },
  fr: {
    unlocked: 'SUCCÈS DÉBLOQUÉ',
    levelUp: 'NIVEAU {level} ATTEINT',
    xp: 'XP',
    next: 'SUIVANT',
    nextCount: 'Succès suivant',
    continue: 'CONTINUER',
    viewAll: 'VOIR TOUS LES SUCCÈS',
    close: 'Fermer',
    queue: '{index} sur {total}',
  },
  ar: {
    unlocked: 'إنجاز جديد',
    levelUp: 'وصلت إلى المستوى {level}',
    xp: 'نقطة خبرة',
    next: 'التالي',
    nextCount: 'الإنجاز التالي',
    continue: 'متابعة',
    viewAll: 'عرض كل الإنجازات',
    close: 'إغلاق',
    queue: '{index} من {total}',
  },
};

// Temps d'affichage quand le joueur ne touche à rien.
const VISIBLE_MS = 9000;

export default function AchievementPopup() {
  const { notifications, dismissNotification, dismissAllNotifications } = useAchievements();
  const { lang } = useLanguage();
  const t = copy[lang] || copy.en;
  const [paused, setPaused] = useState(false);
  const primaryRef = useRef(null);
  const restoreFocus = useRef(null);

  const current = notifications[0] || null;
  const item = current ? notificationCopy(current.id, lang) : null;
  const hasNext = notifications.length > 1;

  const close = () => {
    if (current) dismissNotification(current.id);
  };

  // Échap ferme la fenêtre, et le focus part sur le bouton principal (il
  // revient ensuite là où le joueur était avant l'ouverture).
  useEffect(() => {
    if (!current) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    if (typeof document !== 'undefined') {
      restoreFocus.current = document.activeElement;
      primaryRef.current?.focus?.();
    }
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      restoreFocus.current?.focus?.();
    };
  }, [current?.id]);

  // Fermeture automatique : le minuteur repart à chaque nouveau succès et se
  // met en pause pendant la lecture (survol de la fenêtre).
  useEffect(() => {
    if (!current || paused) return undefined;
    const timer = setTimeout(close, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current?.id, paused]);

  if (!current || !item) return null;

  return (
    <div
      className="achievement-popup-backdrop"
      onClick={close}
      data-testid="achievement-popup"
    >
      <div
        className={`achievement-popup rarity-${item.rarity || 'common'}${paused ? ' paused' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-popup-title"
        aria-describedby="achievement-popup-desc"
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button
          type="button"
          className="achievement-popup-close"
          onClick={close}
          aria-label={t.close}
        >
          ×
        </button>

        <span className="achievement-popup-sweep" aria-hidden="true" />

        <span className="achievement-popup-kicker">
          <span className="achievement-popup-spark" aria-hidden="true">◆</span> {t.unlocked}
        </span>

        <span className="achievement-popup-icon" aria-hidden="true">{item.icon}</span>

        <h2 className="achievement-popup-title" id="achievement-popup-title">{item.name}</h2>

        <span className={`achievement-rarity rarity-${item.rarity || 'common'}`}>
          {rarityLabel(item.rarity, lang)}
        </span>

        <p className="achievement-popup-desc" id="achievement-popup-desc">{item.desc}</p>

        <div className="achievement-popup-rewards">
          <span className="achievement-popup-xp">+{item.xp} {t.xp}</span>
          {current.levelUp && (
            <span className="achievement-popup-level">
              ★ {t.levelUp.replace('{level}', current.levelUp.to)}
            </span>
          )}
        </div>

        <div className="achievement-popup-actions">
          <button
            type="button"
            className="button button-yellow"
            ref={primaryRef}
            onClick={close}
            title={hasNext ? t.nextCount : undefined}
          >
            {hasNext ? t.next : t.continue} <span aria-hidden="true">↗</span>
          </button>
          <Link
            className="achievement-popup-link"
            to="/achievements"
            onClick={dismissAllNotifications}
          >
            {t.viewAll} ↗
          </Link>
        </div>

        {hasNext && (
          <span className="achievement-popup-queue">
            {t.queue.replace('{index}', 1).replace('{total}', notifications.length)}
          </span>
        )}

        {!paused && <span className="achievement-popup-timer" aria-hidden="true" />}
      </div>
    </div>
  );
}
