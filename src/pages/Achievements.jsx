import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievements } from '../achievements/AchievementContext';
import AchievementsPanel, { AchievementLevelCard, achievementsCopy } from '../achievements/AchievementsPanel';
import { metricValue } from '../achievements/engine';
import { ACHIEVEMENTS } from '../achievements/catalog';

/**
 * Page /achievements — la vitrine des succès du site.
 *
 * Elle affiche la progression réelle du joueur (lue depuis le contexte des
 * succès, alimenté par les actions effectuées sur le site) : niveau, XP,
 * succès débloqués, prochains objectifs et le détail du catalogue.
 */

const copy = {
  en: {
    label1: 'PLAYER / ACHIEVEMENTS',
    label2: 'TRACKED LIVE ON THIS DEVICE',
    eyebrow: 'Progress unlocked by real actions',
    titleA: 'COLLECT',
    titleB: 'YOUR PLAYS.',
    intro: 'Every achievement below is unlocked by something you actually do on Let’s Play: reading a story, watching an episode, commenting, searching, exploring a new section or coming back day after day.',
    statArticles: 'Articles read',
    statVideos: 'Videos started',
    statComments: 'Comments',
    statSections: 'Sections explored',
    statStreak: 'Best day streak',
    statLanguages: 'Languages used',
    howTitle: 'HOW IT WORKS',
    howText: 'Actions are counted on this device and saved automatically — no account needed. Sign in and the same progress is kept with your player profile, so it follows you to another device.',
    syncLocal: 'Saved on this device',
    syncAccount: 'Synced with your player account',
    signInCta: 'CREATE AN ACCOUNT TO SYNC',
    newsCta: 'READ THE LATEST NEWS',
    resetTitle: 'RESET MY PROGRESS',
    resetText: 'Clears every achievement, level and counter on this device. The actions themselves are not affected.',
    resetConfirm: 'Reset all achievement progress on this device?',
    totalLabel: 'ACHIEVEMENTS UNLOCKED',
  },
  fr: {
    label1: 'JOUEUR / SUCCÈS',
    label2: 'SUIVI EN DIRECT SUR CET APPAREIL',
    eyebrow: 'Une progression débloquée par de vraies actions',
    titleA: 'COLLECTIONNE',
    titleB: 'TES PARTIES.',
    intro: 'Chaque succès ci-dessous se débloque par ce que tu fais réellement sur Let’s Play : lire un article, regarder un épisode, commenter, chercher, explorer une nouvelle section ou revenir jour après jour.',
    statArticles: 'Articles lus',
    statVideos: 'Vidéos lancées',
    statComments: 'Commentaires',
    statSections: 'Sections explorées',
    statStreak: 'Meilleure série de jours',
    statLanguages: 'Langues utilisées',
    howTitle: 'COMMENT ÇA MARCHE',
    howText: 'Les actions sont comptées sur cet appareil et enregistrées automatiquement — aucun compte n’est nécessaire. Connecte-toi et la même progression est conservée avec ton profil joueur, pour te suivre sur un autre appareil.',
    syncLocal: 'Enregistré sur cet appareil',
    syncAccount: 'Synchronisé avec ton compte joueur',
    signInCta: 'CRÉER UN COMPTE POUR SYNCHRONISER',
    newsCta: 'LIRE LES DERNIÈRES ACTUS',
    resetTitle: 'RÉINITIALISER MA PROGRESSION',
    resetText: 'Efface tous les succès, le niveau et les compteurs de cet appareil. Les actions elles-mêmes ne sont pas touchées.',
    resetConfirm: 'Réinitialiser toute la progression des succès sur cet appareil ?',
    totalLabel: 'SUCCÈS DÉBLOQUÉS',
  },
  ar: {
    label1: 'اللاعب / الإنجازات',
    label2: 'متابعة مباشرة على هذا الجهاز',
    eyebrow: 'تقدم يُفتح عبر إجراءات حقيقية',
    titleA: 'اجمع',
    titleB: 'إنجازاتك.',
    intro: 'كل إنجاز أدناه يُفتح بما تفعله فعلًا على Let’s Play: قراءة مقال، مشاهدة حلقة، التعليق، البحث، استكشاف قسم جديد أو العودة يومًا بعد يوم.',
    statArticles: 'المقالات المقروءة',
    statVideos: 'الفيديوهات المشغّلة',
    statComments: 'التعليقات',
    statSections: 'الأقسام المستكشفة',
    statStreak: 'أفضل سلسلة أيام',
    statLanguages: 'اللغات المستخدمة',
    howTitle: 'كيف يعمل ذلك',
    howText: 'تُحسب الإجراءات على هذا الجهاز وتُحفظ تلقائيًا — دون حاجة إلى حساب. وعند تسجيل الدخول يبقى التقدم نفسه مرتبطًا بملف اللاعب ليتابعك على جهاز آخر.',
    syncLocal: 'محفوظ على هذا الجهاز',
    syncAccount: 'متزامن مع حساب اللاعب',
    signInCta: 'أنشئ حسابًا للمزامنة',
    newsCta: 'اقرأ آخر الأخبار',
    resetTitle: 'إعادة تعيين تقدمي',
    resetText: 'يمسح كل الإنجازات والمستوى والعدادات على هذا الجهاز. الإجراءات نفسها لا تتأثر.',
    resetConfirm: 'هل تريد إعادة تعيين كل تقدم الإنجازات على هذا الجهاز؟',
    totalLabel: 'إنجازات مفتوحة',
  },
};

export default function Achievements() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { summary, state, reset, synced } = useAchievements();
  const t = copy[lang] || copy.en;
  // Libellés communs aux cartes de succès (partagés avec le hub joueur).
  const cardCopy = achievementsCopy[lang] || achievementsCopy.en;

  const stats = useMemo(() => ([
    { key: 'articles', value: metricValue(state, 'articlesRead'), label: t.statArticles },
    { key: 'videos', value: metricValue(state, 'videosWatched'), label: t.statVideos },
    { key: 'comments', value: metricValue(state, 'commentsPosted'), label: t.statComments },
    { key: 'sections', value: metricValue(state, 'sectionsVisited'), label: t.statSections },
    { key: 'streak', value: metricValue(state, 'bestStreak'), label: t.statStreak },
    { key: 'languages', value: metricValue(state, 'languagesUsed'), label: t.statLanguages },
  ]), [state, t]);

  const handleReset = () => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(t.resetConfirm)) return;
    reset();
  };

  return (
    <div className="achievements-page">
      <section className="page-hero wrap">
        <div className="section-label">
          <span><b>01</b> / {t.label1}</span>
          <span>{t.label2}</span>
        </div>
        <p className="eyebrow"><span className="live-dot" /> {t.eyebrow}</p>
        <h1>
          {t.titleA}
          <br />
          <em>{t.titleB}</em>
        </h1>
        <p className="page-hero-text">{t.intro}</p>
      </section>

      <section className="wrap achievements-body">
        {/* NIVEAU, XP ET SUCCÈS DÉBLOQUÉS */}
        <div className="achievement-hero-card">
          <div className="achievement-hero-top">
            <div className="achievement-hero-count">
              <span className="achievement-hero-number">{summary.unlockedCount}</span>
              <span className="achievement-hero-total">/ {ACHIEVEMENTS.length}</span>
              <span className="achievement-hero-caption">{t.totalLabel}</span>
            </div>
            <div className="achievement-hero-meter">
              <div className="achievement-progress-bar big" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent}>
                <span style={{ width: `${summary.percent}%` }} />
              </div>
              <span className={`achievement-sync-tag${synced ? ' synced' : ''}`}>
                {synced ? `☁ ${t.syncAccount}` : `⛁ ${t.syncLocal}`}
              </span>
            </div>
          </div>
          <AchievementLevelCard summary={summary} lang={lang} t={cardCopy} />
        </div>

        {/* COMPTEURS D'ACTIONS */}
        <div className="player-stats-grid achievements-stats">
          {stats.map((stat) => (
            <div className="player-stat-card" key={stat.key}>
              <div className="player-stat-value">{stat.value}</div>
              <div className="player-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CATALOGUE */}
        <section className="achievement-catalog">
          <div className="section-label">
            <span><b>02</b> / {cardCopy.heading}</span>
            <span>{summary.unlockedCount} / {summary.totalCount}</span>
          </div>
          <p className="achievement-catalog-intro">{cardCopy.unlockedSub}</p>
          <AchievementsPanel variant="full" />
        </section>

        {/* EXPLICATIONS, SYNCHRONISATION ET RÉINITIALISATION */}
        <section className="achievement-how">
          <div className="achievement-how-text">
            <h2>{t.howTitle}</h2>
            <p>{t.howText}</p>
          </div>
          <div className="achievement-how-actions">
            {!user && (
              <Link className="button button-yellow" to="/register">
                {t.signInCta} <span aria-hidden="true">↗</span>
              </Link>
            )}
            <Link className="button button-ghost" to="/news">
              {t.newsCta} <span aria-hidden="true">↗</span>
            </Link>
            <button type="button" className="achievement-reset" onClick={handleReset}>
              {t.resetTitle}
            </button>
            <p className="achievement-reset-note">{t.resetText}</p>
          </div>
        </section>
      </section>
    </div>
  );
}
