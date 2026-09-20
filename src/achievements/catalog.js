/**
 * Catalogue des succès — la seule source de vérité.
 * ------------------------------------------------
 * Chaque succès est une donnée : une métrique du moteur (`src/achievements/
 * engine.js`) comparée à une `target`. Rien d'autre à écrire pour en ajouter
 * un — les compteurs, la progression, les notifications et la page
 * `/achievements` sont déduits de cette liste.
 *
 *   { id, icon, group, rarity, xp, metric, target, labels: { en, fr, ar } }
 *
 * `icon` pointe vers une icône 3D de 3dicons.co (licence CC0, aucune
 * attribution requise), rendue dans public/icons/achievements/ d'après
 * l'identifiant du succès.
 *
 * Ajouter un succès
 * -----------------
 * 1. `metric` doit exister dans `METRICS` (engine.js). Les métriques déjà
 *    suivies : pagesVisited, articlesRead, newsRead, reviewsRead,
 *    dossiersRead, sectionsVisited, achievementsPageOpened, videosWatched,
 *    liveWatched, commentsPosted, searchesPerformed, distinctSearches,
 *    languagesUsed, providersLinked, profileUpdates, accountsCreated,
 *    sessions, visitDays, bestStreak, nightReading.
 * 2. `target` est le seuil à atteindre (1 = une fois).
 * 3. `labels` porte le nom et la description dans les trois langues du site
 *    (l'anglais sert de repli).
 *
 * Une nouvelle action sur le site (nouveau bouton, nouveau geste) s'ajoute
 * en deux temps : un cas dans `reduce()` (engine.js) + une métrique, puis
 * autant de succès que voulu ici.
 */

/** Rareté : couleur et libellé affichés sur la carte du succès. */
export const RARITIES = {
  common: { id: 'common', labels: { en: 'Common', fr: 'Commun', ar: 'شائع' } },
  rare: { id: 'rare', labels: { en: 'Rare', fr: 'Rare', ar: 'نادر' } },
  epic: { id: 'epic', labels: { en: 'Epic', fr: 'Épique', ar: 'ملحمي' } },
  legendary: { id: 'legendary', labels: { en: 'Legendary', fr: 'Légendaire', ar: 'أسطوري' } },
};

/** Familles de succès, utilisées pour filtrer sur la page /achievements. */
export const GROUPS = [
  { id: 'start', icon: '🚀', labels: { en: 'Getting started', fr: 'Premiers pas', ar: 'البدايات' } },
  { id: 'reading', icon: '📚', labels: { en: 'Reading', fr: 'Lecture', ar: 'القراءة' } },
  { id: 'video', icon: '▶️', labels: { en: 'Video', fr: 'Vidéo', ar: 'الفيديو' } },
  { id: 'community', icon: '💬', labels: { en: 'Community', fr: 'Communauté', ar: 'المجتمع' } },
  { id: 'loyalty', icon: '🔥', labels: { en: 'Loyalty', fr: 'Fidélité', ar: 'الوفاء' } },
  { id: 'profile', icon: '🎮', labels: { en: 'Account', fr: 'Compte', ar: 'الحساب' } },
];

/** Titres de rang déduits du niveau (le dernier palier atteint gagne). */
export const LEVEL_TITLES = [
  { min: 1, labels: { en: 'Novice gamer', fr: 'Novice', ar: 'لاعب مبتدئ' } },
  { min: 3, labels: { en: 'Regular player', fr: 'Habitué', ar: 'لاعب منتظم' } },
  { min: 5, labels: { en: 'Veteran', fr: 'Vétéran', ar: 'محارب قديم' } },
  { min: 7, labels: { en: 'Elite', fr: 'Élite', ar: 'نخبة' } },
  { min: 10, labels: { en: 'Legend', fr: 'Légende', ar: 'أسطورة' } },
];

export const ACHIEVEMENTS = [
  /* ------------------------------- Premiers pas ------------------------------ */
  {
    id: 'welcome-aboard',
    icon: 'icons/achievements/welcome-aboard.webp',
    group: 'start',
    rarity: 'common',
    xp: 25,
    metric: 'pagesVisited',
    target: 1,
    labels: {
      en: { name: 'Welcome aboard', desc: 'Open your first page on Let’s Play.' },
      fr: { name: 'Bienvenue à bord', desc: 'Ouvre ta première page sur Let’s Play.' },
      ar: { name: 'مرحبًا بك على المتن', desc: 'افتح أول صفحة لك على Let’s Play.' },
    },
  },
  {
    id: 'explorer',
    icon: 'icons/achievements/explorer.webp',
    group: 'start',
    rarity: 'common',
    xp: 40,
    metric: 'sectionsVisited',
    target: 3,
    labels: {
      en: { name: 'Explorer', desc: 'Visit 3 different sections of the site.' },
      fr: { name: 'Explorateur', desc: 'Visite 3 sections différentes du site.' },
      ar: { name: 'المستكشف', desc: 'زُر ثلاثة أقسام مختلفة من الموقع.' },
    },
  },
  {
    id: 'grand-tour',
    icon: 'icons/achievements/grand-tour.webp',
    group: 'start',
    rarity: 'rare',
    xp: 80,
    metric: 'sectionsVisited',
    target: 6,
    labels: {
      en: { name: 'Grand tour', desc: 'Visit 6 sections: home, news, reviews, dossiers, events, calendar.' },
      fr: { name: 'Grand tour', desc: 'Visite 6 sections : accueil, actus, tests, dossiers, events, calendrier.' },
      ar: { name: 'الجولة الكبرى', desc: 'زُر ستة أقسام: الرئيسية، الأخبار، المراجعات، الملفات، الفعاليات، التقويم.' },
    },
  },
  {
    id: 'trophy-hunter',
    icon: 'icons/achievements/trophy-hunter.webp',
    group: 'start',
    rarity: 'common',
    xp: 25,
    metric: 'achievementsPageOpened',
    target: 1,
    labels: {
      en: { name: 'Trophy hunter', desc: 'Open the achievements page.' },
      fr: { name: 'Chasseur de trophées', desc: 'Ouvre la page des succès.' },
      ar: { name: 'باحث الأوسمة', desc: 'افتح صفحة الإنجازات.' },
    },
  },
  {
    id: 'player-one',
    icon: 'icons/achievements/player-one.webp',
    group: 'start',
    rarity: 'rare',
    xp: 80,
    metric: 'accountsCreated',
    target: 1,
    labels: {
      en: { name: 'Player one has entered', desc: 'Create your Let’s Play account.' },
      fr: { name: 'Player one est entré', desc: 'Crée ton compte Let’s Play.' },
      ar: { name: 'اللاعب الأول دخل', desc: 'أنشئ حسابك على Let’s Play.' },
    },
  },
  {
    id: 'welcome-back',
    icon: 'icons/achievements/welcome-back.webp',
    group: 'start',
    rarity: 'common',
    xp: 40,
    metric: 'sessions',
    target: 1,
    labels: {
      en: { name: 'Welcome back', desc: 'Sign in to your account.' },
      fr: { name: 'Bon retour', desc: 'Connecte-toi à ton compte.' },
      ar: { name: 'مرحبًا بعودتك', desc: 'سجّل الدخول إلى حسابك.' },
    },
  },

  /* --------------------------------- Lecture -------------------------------- */
  {
    id: 'first-read',
    icon: 'icons/achievements/first-read.webp',
    group: 'reading',
    rarity: 'common',
    xp: 25,
    metric: 'articlesRead',
    target: 1,
    labels: {
      en: { name: 'First page', desc: 'Read your first article.' },
      fr: { name: 'Première page', desc: 'Lis ton premier article.' },
      ar: { name: 'الصفحة الأولى', desc: 'اقرأ مقالك الأول.' },
    },
  },
  {
    id: 'page-turner',
    icon: 'icons/achievements/page-turner.webp',
    group: 'reading',
    rarity: 'rare',
    xp: 80,
    metric: 'articlesRead',
    target: 5,
    labels: {
      en: { name: 'Page turner', desc: 'Read 5 different articles.' },
      fr: { name: 'Tourneur de pages', desc: 'Lis 5 articles différents.' },
      ar: { name: 'قارئ نهم', desc: 'اقرأ 5 مقالات مختلفة.' },
    },
  },
  {
    id: 'deep-reader',
    icon: 'icons/achievements/deep-reader.webp',
    group: 'reading',
    rarity: 'epic',
    xp: 160,
    metric: 'articlesRead',
    target: 12,
    labels: {
      en: { name: 'Deep reader', desc: 'Read 12 different articles.' },
      fr: { name: 'Lecteur profond', desc: 'Lis 12 articles différents.' },
      ar: { name: 'قارئ متعمّق', desc: 'اقرأ 12 مقالًا مختلفًا.' },
    },
  },
  {
    id: 'news-wire',
    icon: 'icons/achievements/news-wire.webp',
    group: 'reading',
    rarity: 'common',
    xp: 40,
    metric: 'newsRead',
    target: 5,
    labels: {
      en: { name: 'News wire', desc: 'Read 5 news stories.' },
      fr: { name: 'Fil d’actu', desc: 'Lis 5 actualités.' },
      ar: { name: 'على الخط', desc: 'اقرأ 5 أخبار.' },
    },
  },
  {
    id: 'critic-eye',
    icon: 'icons/achievements/critic-eye.webp',
    group: 'reading',
    rarity: 'rare',
    xp: 80,
    metric: 'reviewsRead',
    target: 3,
    labels: {
      en: { name: 'Critical eye', desc: 'Read 3 reviews.' },
      fr: { name: 'Œil critique', desc: 'Lis 3 tests.' },
      ar: { name: 'عين الناقد', desc: 'اقرأ 3 مراجعات.' },
    },
  },
  {
    id: 'archivist',
    icon: 'icons/achievements/archivist.webp',
    group: 'reading',
    rarity: 'rare',
    xp: 80,
    metric: 'dossiersRead',
    target: 3,
    labels: {
      en: { name: 'Archivist', desc: 'Read 3 dossiers.' },
      fr: { name: 'Archiviste', desc: 'Lis 3 dossiers.' },
      ar: { name: 'أمين الأرشيف', desc: 'اقرأ 3 ملفات.' },
    },
  },
  {
    id: 'night-owl',
    icon: 'icons/achievements/night-owl.webp',
    group: 'reading',
    rarity: 'epic',
    xp: 120,
    metric: 'nightReading',
    target: 1,
    labels: {
      en: { name: 'Night owl', desc: 'Read an article between midnight and 5 a.m.' },
      fr: { name: 'Oiseau de nuit', desc: 'Lis un article entre minuit et 5 h du matin.' },
      ar: { name: 'ساهر الليل', desc: 'اقرأ مقالًا بين منتصف الليل والخامسة صباحًا.' },
    },
  },

  /* ---------------------------------- Vidéo --------------------------------- */
  {
    id: 'prime-time',
    icon: 'icons/achievements/prime-time.webp',
    group: 'video',
    rarity: 'common',
    xp: 40,
    metric: 'videosWatched',
    target: 1,
    labels: {
      en: { name: 'Prime time', desc: 'Play an episode.' },
      fr: { name: 'Heure de pointe', desc: 'Lance un épisode.' },
      ar: { name: 'وقت الذروة', desc: 'شغّل حلقة.' },
    },
  },
  {
    id: 'binge-watcher',
    icon: 'icons/achievements/binge-watcher.webp',
    group: 'video',
    rarity: 'epic',
    xp: 140,
    metric: 'videosWatched',
    target: 5,
    labels: {
      en: { name: 'Binge watcher', desc: 'Play 5 different videos.' },
      fr: { name: 'Marathonien', desc: 'Lance 5 vidéos différentes.' },
      ar: { name: 'مشاهد متواصل', desc: 'شغّل 5 فيديوهات مختلفة.' },
    },
  },
  {
    id: 'live-signal',
    icon: 'icons/achievements/live-signal.webp',
    group: 'video',
    rarity: 'rare',
    xp: 100,
    metric: 'liveWatched',
    target: 1,
    labels: {
      en: { name: 'Live signal', desc: 'Start the channel’s live player.' },
      fr: { name: 'Signal direct', desc: 'Lance le direct de la chaîne.' },
      ar: { name: 'إشارة مباشرة', desc: 'شغّل البث المباشر للقناة.' },
    },
  },

  /* -------------------------------- Communauté ------------------------------ */
  {
    id: 'first-comment',
    icon: 'icons/achievements/first-comment.webp',
    group: 'community',
    rarity: 'common',
    xp: 40,
    metric: 'commentsPosted',
    target: 1,
    labels: {
      en: { name: 'First word', desc: 'Post a comment.' },
      fr: { name: 'Premier mot', desc: 'Publie un commentaire.' },
      ar: { name: 'الكلمة الأولى', desc: 'انشر تعليقًا.' },
    },
  },
  {
    id: 'community-voice',
    icon: 'icons/achievements/community-voice.webp',
    group: 'community',
    rarity: 'epic',
    xp: 140,
    metric: 'commentsPosted',
    target: 5,
    labels: {
      en: { name: 'Community voice', desc: 'Post 5 comments.' },
      fr: { name: 'Voix de la communauté', desc: 'Publie 5 commentaires.' },
      ar: { name: 'صوت المجتمع', desc: 'انشر 5 تعليقات.' },
    },
  },
  {
    id: 'scout',
    icon: 'icons/achievements/scout.webp',
    group: 'community',
    rarity: 'common',
    xp: 25,
    metric: 'searchesPerformed',
    target: 1,
    labels: {
      en: { name: 'Scout', desc: 'Search the Let’s Play archive.' },
      fr: { name: 'Éclaireur', desc: 'Cherche dans les archives Let’s Play.' },
      ar: { name: 'المستطلع', desc: 'ابحث في أرشيف Let’s Play.' },
    },
  },
  {
    id: 'detective',
    icon: 'icons/achievements/detective.webp',
    group: 'community',
    rarity: 'rare',
    xp: 100,
    metric: 'distinctSearches',
    target: 5,
    labels: {
      en: { name: 'Detective', desc: 'Run 5 different searches.' },
      fr: { name: 'Détective', desc: 'Lance 5 recherches différentes.' },
      ar: { name: 'المحقّق', desc: 'نفّذ 5 عمليات بحث مختلفة.' },
    },
  },

  /* --------------------------------- Fidélité ------------------------------- */
  {
    id: 'three-day-streak',
    icon: 'icons/achievements/three-day-streak.webp',
    group: 'loyalty',
    rarity: 'rare',
    xp: 120,
    metric: 'bestStreak',
    target: 3,
    labels: {
      en: { name: 'Three in a row', desc: 'Visit the site 3 days in a row.' },
      fr: { name: 'Trois jours de suite', desc: 'Visite le site 3 jours de suite.' },
      ar: { name: 'ثلاثة أيام متتالية', desc: 'زُر الموقع ثلاثة أيام متتالية.' },
    },
  },
  {
    id: 'seven-day-regular',
    icon: 'icons/achievements/seven-day-regular.webp',
    group: 'loyalty',
    rarity: 'epic',
    xp: 200,
    metric: 'visitDays',
    target: 7,
    labels: {
      en: { name: 'Regular', desc: 'Visit the site on 7 different days.' },
      fr: { name: 'Habitué', desc: 'Visite le site 7 jours différents.' },
      ar: { name: 'من المداومين', desc: 'زُر الموقع في سبعة أيام مختلفة.' },
    },
  },
  {
    id: 'polyglot',
    icon: 'icons/achievements/polyglot.webp',
    group: 'loyalty',
    rarity: 'rare',
    xp: 100,
    metric: 'languagesUsed',
    target: 2,
    labels: {
      en: { name: 'Polyglot', desc: 'Browse the site in 2 languages.' },
      fr: { name: 'Polyglotte', desc: 'Navigue sur le site en 2 langues.' },
      ar: { name: 'متعدد اللغات', desc: 'تصفّح الموقع بلغتين.' },
    },
  },
  {
    id: 'trilingual',
    icon: 'icons/achievements/trilingual.webp',
    group: 'loyalty',
    rarity: 'legendary',
    xp: 250,
    metric: 'languagesUsed',
    target: 3,
    labels: {
      en: { name: 'Trilingual', desc: 'Browse in all three languages: FR, EN, AR.' },
      fr: { name: 'Trilingue', desc: 'Navigue dans les trois langues : FR, EN, AR.' },
      ar: { name: 'ثلاثي اللغات', desc: 'تصفّح الموقع بثلاث لغات: الفرنسية، الإنجليزية، العربية.' },
    },
  },

  /* ---------------------------------- Compte -------------------------------- */
  {
    id: 'linked-player',
    icon: 'icons/achievements/linked-player.webp',
    group: 'profile',
    rarity: 'rare',
    xp: 100,
    metric: 'providersLinked',
    target: 1,
    labels: {
      en: { name: 'Linked player', desc: 'Connect a Google or Microsoft account.' },
      fr: { name: 'Compte associé', desc: 'Associe un compte Google ou Microsoft.' },
      ar: { name: 'حساب مرتبط', desc: 'اربط حساب Google أو Microsoft.' },
    },
  },
  {
    id: 'own-look',
    icon: 'icons/achievements/own-look.webp',
    group: 'profile',
    rarity: 'common',
    xp: 50,
    metric: 'profileUpdates',
    target: 1,
    labels: {
      en: { name: 'Your own look', desc: 'Save a change to your player profile.' },
      fr: { name: 'Ton propre style', desc: 'Enregistre une modification de ton profil joueur.' },
      ar: { name: 'لمستك الخاصة', desc: 'احفظ تعديلًا على ملف اللاعب الخاص بك.' },
    },
  },
];

/** Libellé traduit d'un succès (repli sur l'anglais). */
export function achievementLabel(achievement, lang = 'en') {
  return achievement?.labels?.[lang] || achievement?.labels?.en || { name: achievement?.id || '', desc: '' };
}

/** Libellé traduit d'une rareté. */
export function rarityLabel(rarity, lang = 'en') {
  return RARITIES[rarity]?.labels?.[lang] || RARITIES.common.labels.en;
}

/** Libellé traduit d'une famille. */
export function groupLabel(group, lang = 'en') {
  const found = GROUPS.find((entry) => entry.id === group);
  return found?.labels?.[lang] || found?.labels?.en || group;
}

/** Titre de rang pour un niveau donné. */
export function levelTitle(level, lang = 'en') {
  const tiers = LEVEL_TITLES.filter((tier) => level >= tier.min);
  const tier = tiers[tiers.length - 1] || LEVEL_TITLES[0];
  return tier.labels[lang] || tier.labels.en;
}

/**
 * URL publique d'une icône de succès, préfixée par la base Vite : sans elle,
 * un chemin absolu (`/icons/…`) pointe à côté du site déployé sous
 * `/Let-s-Play/` (GitHub Pages) et les récompenses s'affichent cassées.
 * Fonctionne aussi hors navigateur (scripts de vérification) : la base vaut
 * alors simplement `/`.
 */
export function achievementIconUrl(icon) {
  const clean = String(icon || '').replace(/^\/+/, '');
  let base = '/';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) base = import.meta.env.BASE_URL;
  } catch (e) { /* hors Vite : la base par défaut suffit */ }
  if (!base.endsWith('/')) base += '/';
  return `${base}${clean}`;
}
