import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from './AchievementContext';
import { GROUPS, TIER_ORDER, achievementIconUrl, achievementLabel, groupLabel, levelTitle, rarityLabel } from './catalog';

/**
 * Panneau des succès, affiché dans le hub joueur `/auth`. Il ne lit que le
 * récapitulatif du contexte :
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
    filterByTier: 'Filter by tier',
    tiers: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' },
    empty: 'No achievement matches this filter yet.',
    remaining: '{n} more to go',
    howHintUnlocked: 'Unlocked — keep playing!',
    howTo: 'How to unlock',
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
    filterByTier: 'Filtrer par grade',
    tiers: { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' },
    empty: 'Aucun succès ne correspond à ce filtre pour l’instant.',
    remaining: 'Encore {n}',
    howHintUnlocked: 'Débloqué — continue comme ça !',
    howTo: 'Comment débloquer',
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
    filterByTier: 'تصفية حسب الرتبة',
    tiers: { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' },
    empty: 'لا يوجد إنجاز مطابق لهذا التصفية بعد.',
    remaining: 'متبق {n}',
    howHintUnlocked: 'مفتوح — واصل اللعب!',
    howTo: 'كيفية الفتح',
  },
};

/**
 * Carte de succès :
 * - Gagné : fond transparent + cadre doré + shimmer.
 * - Survol : tooltip custom qui explique comment le gagner (desc + progression).
 */
export function AchievementCard({ item, lang, t }) {
  const label = achievementLabel(item, lang);
  const progressText = `${item.current}/${item.target}`;
  return (
    <article
      className={`achievement-card rarity-${item.rarity}${item.unlocked ? ' unlocked' : ''}`}
      aria-label={item.unlocked ? `${label.name} — ${t.unlockedTag}` : `${label.name} — ${t.lockedTag}`}
      tabIndex={0}
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
        <span className={`achievement-card-tier rarity-${item.rarity}`}>{t.tiers?.[item.rarity] || rarityLabel(item.rarity, lang)}</span>
        {item.unlocked && <span className="achievement-card-check" aria-hidden="true">✓</span>}
      </div>

      {/* Tooltip premium au survol / focus */}
      <div className="achievement-tooltip" role="tooltip">
        <div className="achievement-tooltip-header">
          <span className="achievement-tooltip-name">{label.name}</span>
          <span className={`achievement-tooltip-tier rarity-${item.rarity}`}>
            <span className="achievement-tooltip-tier-dot" aria-hidden="true" />
            {t.tiers?.[item.rarity] || rarityLabel(item.rarity, lang)}
          </span>
          <span className={`achievement-tooltip-status ${item.unlocked ? 'unlocked' : 'locked'}`}>
            {item.unlocked ? t.unlockedTag : t.lockedTag}
          </span>
        </div>
        <p className="achievement-tooltip-desc">{label.desc}</p>
        <div className="achievement-tooltip-footer">
          {!item.unlocked ? (
            <div className="achievement-tooltip-progress">
              <div className="achievement-tooltip-bar" aria-hidden="true">
                <span style={{ width: `${item.percent}%` }} />
              </div>
              <span>{progressText}</span>
            </div>
          ) : (
            <span className="achievement-tooltip-hint">{t.howHintUnlocked || ''}</span>
          )}
          <span className="achievement-tooltip-xp">{item.xp} XP</span>
        </div>
        {!item.unlocked && item.remaining > 0 && item.remaining !== item.target && (
          <span className="achievement-tooltip-remaining">
            {t.remaining?.replace('{n}', String(item.remaining)) || `${item.remaining} left`}
          </span>
        )}
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
  const [tier, setTier] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const usedGroups = useMemo(
    () => GROUPS.filter((entry) => summary.items.some((item) => item.group === entry.id)),
    [summary.items],
  );

  // Compteurs par grade : débloqués / total, dans l'ordre bronze → platine.
  const tierCounts = useMemo(() => (
    TIER_ORDER.map((id) => {
      const items = summary.items.filter((item) => item.rarity === id);
      return {
        id,
        total: items.length,
        unlocked: items.filter((item) => item.unlocked).length,
      };
    }).filter((entry) => entry.total > 0)
  ), [summary.items]);

  const filtered = useMemo(() => {
    let items = summary.items;
    if (group !== 'all') items = items.filter((item) => item.group === group);
    if (tier !== 'all') items = items.filter((item) => item.rarity === tier);
    if (stateFilter === 'unlocked') items = items.filter((item) => item.unlocked);
    if (stateFilter === 'locked') items = items.filter((item) => !item.unlocked);
    if (stateFilter === 'progress') items = items.filter((item) => !item.unlocked && item.current > 0);
    // Les succès obtenus en premier, puis ceux dont on est le plus proche.
    return [...items].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (a.unlocked && b.unlocked) return String(b.unlockedAt).localeCompare(String(a.unlockedAt));
      return b.percent - a.percent || a.target - b.target;
    });
  }, [summary.items, group, tier, stateFilter]);

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
        {/* Grades : bronze → platine, avec le nombre de succès obtenus. */}
        <div className="achievement-filter-row" role="group" aria-label={t.filterByTier}>
          {tierCounts.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`achievement-chip tier-chip rarity-${entry.id}${tier === entry.id ? ' active' : ''}`}
              onClick={() => setTier(tier === entry.id ? 'all' : entry.id)}
              aria-pressed={tier === entry.id}
            >
              <span className="tier-chip-dot" aria-hidden="true" />
              {t.tiers?.[entry.id] || rarityLabel(entry.id, lang)}
              <span className="tier-chip-count">{entry.unlocked}/{entry.total}</span>
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
