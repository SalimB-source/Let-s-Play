import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from './AchievementContext';
import { GROUPS, achievementIconUrl, achievementLabel, groupLabel, levelTitle } from './catalog';

/**
 * Panneau des succès, partagé par la page `/achievements` (complet) et le
 * hub joueur `/auth` (compact). Il ne lit que le récapitulatif du contexte :
 * le catalogue, la progression et l'XP sont déduits des actions suivies.
 */

const copy = {
  en: {
    heading: 'ACHIEVEMENTS',
    headingHub: 'YOUR SITE ACHIEVEMENTS',
    hubSub: 'Unlocked by what you actually do on Let’s Play — reading, watching, commenting, exploring.',
    unlockedSub: 'Every achievement is unlocked by an action performed on the site.',
    level: 'LEVEL',
    xp: 'XP',
    toNext: 'XP to next level',
    unlockedTag: 'UNLOCKED',
    lockedTag: 'LOCKED',
    nextUp: 'NEXT UP',
    filterAll: 'All',
    filterUnlocked: 'Unlocked',
    filterInProgress: 'In progress',
    filterLocked: 'Locked',
    viewAll: 'SEE ALL ACHIEVEMENTS',
    empty: 'No achievement matches this filter yet.',
  },
  fr: {
    heading: 'SUCCÈS',
    headingHub: 'TES SUCCÈS SUR LE SITE',
    hubSub: 'Débloqués par ce que tu fais vraiment sur Let’s Play — lire, regarder, commenter, explorer.',
    unlockedSub: 'Chaque succès se débloque par une action réalisée sur le site.',
    level: 'NIVEAU',
    xp: 'XP',
    toNext: 'XP avant le niveau suivant',
    unlockedTag: 'DÉBLOQUÉ',
    lockedTag: 'VERROUILLÉ',
    nextUp: 'PROCHAIN OBJECTIF',
    filterAll: 'Tous',
    filterUnlocked: 'Débloqués',
    filterInProgress: 'En cours',
    filterLocked: 'Verrouillés',
    viewAll: 'VOIR TOUS LES SUCCÈS',
    empty: 'Aucun succès ne correspond à ce filtre pour l’instant.',
  },
  ar: {
    heading: 'الإنجازات',
    headingHub: 'إنجازاتك على الموقع',
    hubSub: 'تُفتح حسب ما تفعله فعلًا على Let’s Play — القراءة، المشاهدة، التعليق، الاستكشاف.',
    unlockedSub: 'كل إنجاز يُفتح عبر إجراء تقوم به على الموقع.',
    level: 'المستوى',
    xp: 'نقطة خبرة',
    toNext: 'نقطة للمستوى التالي',
    unlockedTag: 'مفتوح',
    lockedTag: 'مغلق',
    nextUp: 'الهدف القادم',
    filterAll: 'الكل',
    filterUnlocked: 'المفتوحة',
    filterInProgress: 'قيد التقدم',
    filterLocked: 'المغلقة',
    viewAll: 'عرض كل الإنجازات',
    empty: 'لا يوجد إنجاز مطابق لهذا التصفية بعد.',
  },
};

/**
 * Carte de succès, volontairement sobre : une icône 3D (3dicons.co) et un
 * titre. C'est tout. Le reste vit au survol (la description, en infobulle)
 * et dans la notification de déblocage. Les succès non encore gagnés sont
 * en gris ; ceux qui sont gagnés portent un outline coloré (couleur de la
 * rareté, avec un léger halo).
 */
export function AchievementCard({ item, lang, t }) {
  const label = achievementLabel(item, lang);
  return (
    <article
      className={`achievement-card rarity-${item.rarity}${item.unlocked ? ' unlocked' : ''}`}
      title={label.desc}
      aria-label={item.unlocked ? `${label.name} — ${t.unlockedTag}` : label.name}
    >
      <div className="achievement-card-inner">
        <img
          className="achievement-card-icon"
          src={achievementIconUrl(item.icon)}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <h3>{label.name}</h3>
      </div>
    </article>
  );
}

/** Carte de niveau : XP, rang et progression vers le niveau suivant. */
export function AchievementLevelCard({ summary, lang, t, compact = false }) {
  const { level } = summary;
  return (
    <div className={`achievement-level${compact ? ' compact' : ''}`}>
      <div className="achievement-level-badge">
        <span className="achievement-level-number">{level.level}</span>
        <span className="achievement-level-label">{t.level}</span>
      </div>
      <div className="achievement-level-body">
        <div className="achievement-level-head">
          <strong>{levelTitle(level.level, lang)}</strong>
          <span>
            {summary.xp} {t.xp} · {summary.unlockedCount}/{summary.totalCount}
          </span>
        </div>
        <div className="achievement-level-bar">
          <span style={{ width: `${level.percent}%` }} />
        </div>
        <span className="achievement-level-next">
          {level.xpForNextLevel - level.xpInLevel} {t.toNext}
        </span>
      </div>
    </div>
  );
}

/**
 * @param {'full'|'compact'} variant complet (page) ou résumé (hub joueur)
 * @param {number} [limit] nombre de succès affichés en variante compacte
 */
export default function AchievementsPanel({ variant = 'full', limit = 4 }) {
  const { summary } = useAchievements();
  const { lang } = useLanguage();
  const t = copy[lang] || copy.en;
  const [group, setGroup] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const usedGroups = useMemo(
    () => GROUPS.filter((entry) => summary.items.some((item) => item.group === entry.id)),
    [summary.items],
  );

  const filtered = useMemo(() => {
    let items = summary.items;
    if (group !== 'all') items = items.filter((item) => item.group === group);
    if (stateFilter === 'unlocked') items = items.filter((item) => item.unlocked);
    if (stateFilter === 'locked') items = items.filter((item) => !item.unlocked);
    if (stateFilter === 'progress') items = items.filter((item) => !item.unlocked && item.current > 0);
    // Les succès obtenus en premier, puis ceux dont on est le plus proche.
    return [...items].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (a.unlocked && b.unlocked) return String(b.unlockedAt).localeCompare(String(a.unlockedAt));
      return b.percent - a.percent || a.target - b.target;
    });
  }, [summary.items, group, stateFilter]);

  if (variant === 'compact') {
    const recent = filtered.filter((item) => item.unlocked).slice(0, limit);
    const upcoming = filtered.filter((item) => !item.unlocked).slice(0, Math.max(1, limit - recent.length));
    const shown = [...recent, ...upcoming];

    return (
      <div className="achievements-panel compact">
        <div className="player-section-header">
          <h2>{t.headingHub}</h2>
          <p>{t.hubSub}</p>
        </div>

        <AchievementLevelCard summary={summary} lang={lang} t={t} compact />

        {shown.length > 0 ? (
          <div className="achievement-grid compact">
            {shown.map((item) => (
              <AchievementCard key={item.id} item={item} lang={lang} t={t} />
            ))}
          </div>
        ) : (
          <p className="player-empty-note">{t.empty}</p>
        )}

        <Link className="arrow-link" to="/achievements">
          {t.viewAll} ↗
        </Link>
      </div>
    );
  }

  return (
    <div className="achievements-panel">
      <div className="achievement-filters">
        <div className="achievement-filter-row" role="group" aria-label={t.heading}>
          <button
            type="button"
            className={group === 'all' ? 'achievement-chip active' : 'achievement-chip'}
            onClick={() => setGroup('all')}
          >
            ★ {t.filterAll}
          </button>
          {usedGroups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={group === entry.id ? 'achievement-chip active' : 'achievement-chip'}
              onClick={() => setGroup(entry.id)}
            >
              {entry.icon} {groupLabel(entry.id, lang)}
            </button>
          ))}
        </div>
        <div className="achievement-filter-row" role="group" aria-label={t.heading}>
          {[
            ['all', t.filterAll],
            ['unlocked', t.filterUnlocked],
            ['progress', t.filterInProgress],
            ['locked', t.filterLocked],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={stateFilter === key ? 'achievement-chip subtle active' : 'achievement-chip subtle'}
              onClick={() => setStateFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="achievement-grid">
          {filtered.map((item) => (
            <AchievementCard key={item.id} item={item} lang={lang} t={t} />
          ))}
        </div>
      ) : (
        <p className="achievement-empty">{t.empty}</p>
      )}
    </div>
  );
}

export { copy as achievementsCopy };
