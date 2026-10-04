import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from './AchievementContext';
import { AchievementCard, achievementsCopy } from './AchievementsPanel';
import { GROUPS, groupIcon, groupLabel, groupTagline, tierRank } from './catalog';
import MirageCupTrophyCollection from '../games/MirageCupTrophyCollection';
import './trophy-shelf.css';

/**
 * Vitrine à trophées du profil joueur — classée par catégorie.
 * -------------------------------------------------------------
 * Une section par famille du catalogue (`GROUPS`) : les succès du site
 * (lecture, vidéo, communauté, fidélité, compte, quizz) et les trophées des
 * deux jeux d'arcade (**Mirage Rush** et **Vice City Rush**), qui se gagnent
 * en jouant. Chaque catégorie montre son nom, son accroche, le nombre de
 * trophées gagnés et sa barre de progression ; les cartes sont celles du
 * panneau des succès (bulle d'information au survol, cadre du grade).
 *
 * La catégorie Mirage Rush embarque en plus la collection des coupes
 * remportées (`MirageCupTrophyCollection`), rangée avec ses trophées de jeu.
 */

const copy = {
  en: {
    heading: 'YOUR TROPHIES BY CATEGORY',
    sub: 'Each category gathers the trophies the site and its games put up for grabs — win them to add them to your cabinet.',
    filterAll: 'All',
    filterWon: 'Won',
    filterToWin: 'To win',
    wonOf: 'won',
    complete: 'Category complete',
    emptyCategory: 'No trophy of this category matches this filter yet.',
    emptyAll: 'No trophy matches this filter yet.',
    cupsHidden: 'Only won trophies show the cup collection.',
  },
  fr: {
    heading: 'TES TROPHÉES PAR CATÉGORIE',
    sub: 'Chaque catégorie regroupe les trophées que le site et ses jeux mettent en jeu — gagne-les pour les ajouter à ta vitrine.',
    filterAll: 'Tous',
    filterWon: 'Gagnés',
    filterToWin: 'À gagner',
    wonOf: 'gagnés',
    complete: 'Catégorie complétée',
    emptyCategory: 'Aucun trophée de cette catégorie ne correspond à ce filtre pour l’instant.',
    emptyAll: 'Aucun trophée ne correspond à ce filtre pour l’instant.',
    cupsHidden: 'Seuls les trophées gagnés affichent la collection de coupes.',
  },
  ar: {
    heading: 'كؤوسك حسب الفئة',
    sub: 'كل فئة تجمع الكؤوس التي يتيحها الموقع وألعابه — افز بها لتضيفها إلى خزانتك.',
    filterAll: 'الكل',
    filterWon: 'المفوز بها',
    filterToWin: 'للفوز بها',
    wonOf: 'مفوز بها',
    complete: 'فئة مكتملة',
    emptyCategory: 'لا توجد كأس في هذه الفئة مطابقة لهذه التصفية بعد.',
    emptyAll: 'لا توجد كأس مطابقة لهذه التصفية بعد.',
    cupsHidden: 'المفوز بها فقط تُظهر مجموعة الكؤوس.',
  },
};

/** Filtres de la vitrine : tout, gagnés seulement, ou restant à gagner. */
const FILTERS = ['all', 'won', 'towin'];

export default function TrophyShelf() {
  const { summary } = useAchievements();
  const { lang } = useLanguage();
  const t = copy[lang] || copy.en;
  const cardCopy = achievementsCopy[lang] || achievementsCopy.en;
  const [filter, setFilter] = useState('all');

  /** Une entrée par catégorie du catalogue qui contient au moins un trophée,
      dans l'ordre du catalogue ; à l'intérieur, les trophées sont rangés par
      grade (bronze → platine), gagnés d'abord. */
  const categories = useMemo(() => GROUPS
    .map((group) => {
      const items = summary.items
        .filter((item) => item.group === group.id)
        .sort((a, b) => (
          tierRank(a.rarity) - tierRank(b.rarity)
          || Number(b.unlocked) - Number(a.unlocked)
          || a.target - b.target
        ));
      return {
        group,
        items,
        won: items.filter((item) => item.unlocked).length,
      };
    })
    .filter((category) => category.items.length > 0), [summary.items]);

  const visible = useMemo(() => categories
    .map((category) => ({
      ...category,
      shown: category.items.filter((item) => (
        filter === 'all' ? true : filter === 'won' ? item.unlocked : !item.unlocked
      )),
    }))
    .filter((category) => category.shown.length > 0), [categories, filter]);

  const percent = summary.totalCount > 0
    ? Math.round((summary.unlockedCount / summary.totalCount) * 100)
    : 0;

  return (
    <div className="trophy-shelf" aria-labelledby="trophy-shelf-title">
      <div className="player-section-header">
        <h2 id="trophy-shelf-title">{t.heading}</h2>
        <p>{t.sub}</p>
      </div>

      {/* Résumé global : combien de trophées gagnés, sur combien en jeu. */}
      <div className="trophy-shelf-summary">
        <span className="trophy-shelf-count">
          <strong>{summary.unlockedCount}</strong>/{summary.totalCount} {t.wonOf}
        </span>
        <div className="trophy-shelf-bar" role="img" aria-label={`${percent} %`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className="trophy-shelf-percent">{percent} %</span>
      </div>

      <div className="trophy-filter-row" role="group" aria-label={t.heading}>
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            className={`trophy-filter-btn${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {key === 'all' ? t.filterAll : key === 'won' ? t.filterWon : t.filterToWin}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="trophy-shelf-empty">{t.emptyAll}</p>}

      {visible.map(({ group, items, won, shown }) => {
        const categoryPercent = items.length > 0 ? Math.round((won / items.length) * 100) : 0;
        // Les coupes remportées sont des trophées gagnés : elles suivent le filtre.
        const showCups = group.id === 'mirage' && filter !== 'towin';
        return (
          <section
            key={group.id}
            className={`trophy-category${won === items.length ? ' is-complete' : ''}`}
            data-group={group.id}
            aria-label={groupLabel(group.id, lang)}
          >
            <div className="trophy-category-head">
              <span className="trophy-category-icon" aria-hidden="true">{groupIcon(group.id)}</span>
              <div className="trophy-category-copy">
                <h3>{groupLabel(group.id, lang)}</h3>
                <p>{groupTagline(group.id, lang)}</p>
              </div>
              <span className="trophy-category-count">
                {won === items.length && won > 0
                  ? `★ ${t.complete}`
                  : `${won}/${items.length} ${t.wonOf}`}
              </span>
            </div>
            <div className="trophy-category-bar" aria-hidden="true">
              <span style={{ width: `${categoryPercent}%` }} />
            </div>

            {shown.length > 0 ? (
              <div className="achievement-grid compact trophy-category-grid">
                {shown.map((item) => (
                  <AchievementCard key={item.id} item={item} lang={lang} t={cardCopy} />
                ))}
              </div>
            ) : (
              <p className="trophy-shelf-empty">{t.emptyCategory}</p>
            )}

            {showCups && <MirageCupTrophyCollection variant="inline" />}
          </section>
        );
      })}
    </div>
  );
}
