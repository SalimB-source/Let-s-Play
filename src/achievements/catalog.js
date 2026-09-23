/**
 * Catalogue des succès — la seule source de vérité.
 * ------------------------------------------------
 * Chaque succès est une donnée : une métrique du moteur (`src/achievements/
 * engine.js`) comparée à une `target`. Rien d'autre à écrire pour en ajouter
 * un — les compteurs, la progression et les notifications sont déduits de
 * cette liste.
 *
 *   { id, icon, group, rarity, xp, metric, target, labels: { en, fr, ar } }
 *
 * `icon` pointe vers une icône 3D de 3dicons.co (licence CC0, aucune
 * attribution requise), rendue dans public/icons/achievements/ d'après
 * l'identifiant du succès.
 *
 * Grades
 * ------
 * `rarity` porte le **grade** du succès, du plus accessible au plus convoité :
 * bronze → argent → or → platine. Le grade se lit sur la carte (couleur du
 * cadre), dans les filtres de la page et dans la notification de déblocage ;
 * il résume la difficulté d'obtention (voir `TIER_ORDER` pour l'ordre).
 *
 * Ajouter un succès
 * -----------------
 * 1. `metric` doit exister dans `METRICS` (engine.js). Les métriques déjà
 *    suivies : pagesVisited, articlesRead, newsRead, reviewsRead,
 *    dossiersRead, readAllKinds, sectionsVisited, profileOpened,
 *    videosWatched, liveWatched, commentsPosted, searchesPerformed,
 *    distinctSearches, languagesUsed, providersLinked, profileUpdates,
 *    accountsCreated, sessions, visitDays, bestStreak, nightReading,
 *    earlyReading, nightReadingDays.
 * 2. `target` est le seuil à atteindre (1 = une fois).
 * 3. `labels` porte le nom et la description dans les trois langues du site
 *    (l'anglais sert de repli).
 *
 * Une nouvelle action sur le site (nouveau bouton, nouveau geste) s'ajoute
 * en deux temps : un cas dans `reduce()` (engine.js) + une métrique, puis
 * autant de succès que voulu ici.
 */

/** Grades : du plus accessible au plus difficile. Couleur et libellé affichés
    sur la carte, dans les filtres et dans la notification de déblocage. */
export const RARITIES = {
  bronze: { id: 'bronze', labels: { en: 'Bronze', fr: 'Bronze', ar: 'برونزي' } },
  silver: { id: 'silver', labels: { en: 'Silver', fr: 'Argent', ar: 'فضي' } },
  gold: { id: 'gold', labels: { en: 'Gold', fr: 'Or', ar: 'ذهبي' } },
  platinum: { id: 'platinum', labels: { en: 'Platinum', fr: 'Platine', ar: 'بلاتيني' } },
};

/** Ordre des grades, du plus accessible au plus difficile. */
export const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

/** Rang d'un grade (0 = bronze). Les grades inconnus reviennent au bas. */
export function tierRank(tier) {
  const index = TIER_ORDER.indexOf(tier);
  return index === -1 ? 0 : index;
}

/** Familles de succès, utilisées pour filtrer dans le hub joueur. */
export const GROUPS = [
  { id: 'start', icon: '🚀', labels: { en: 'Getting started', fr: 'Premiers pas', ar: 'البدايات' } },
  { id: 'reading', icon: '📚', labels: { en: 'Reading', fr: 'Lecture', ar: 'القراءة' } },
  { id: 'video', icon: '▶️', labels: { en: 'Video', fr: 'Vidéo', ar: 'الفيديو' } },
  { id: 'community', icon: '💬', labels: { en: 'Community', fr: 'Communauté', ar: 'المجتمع' } },
  { id: 'loyalty', icon: '🔥', labels: { en: 'Loyalty', fr: 'Fidélité', ar: 'الوفاء' } },
  { id: 'profile', icon: '🎮', labels: { en: 'Account', fr: 'Compte', ar: 'الحساب' } },
  { id: 'quiz', icon: '🧠', labels: { en: 'Quizzes', fr: 'Quizz', ar: 'اختبارات' } },
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
    rarity: 'bronze',
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
    rarity: 'bronze',
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
    rarity: 'silver',
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
    rarity: 'bronze',
    xp: 25,
    metric: 'profileOpened',
    target: 1,
    labels: {
      en: { name: 'Trophy hunter', desc: 'Open your player profile.' },
      fr: { name: 'Chasseur de trophées', desc: 'Ouvre ton profil joueur.' },
      ar: { name: 'باحث الأوسمة', desc: 'افتح ملف اللاعب الخاص بك.' },
    },
  },
  {
    id: 'player-one',
    icon: 'icons/achievements/player-one.webp',
    group: 'start',
    rarity: 'silver',
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
    rarity: 'bronze',
    xp: 30,
    metric: 'sessions',
    target: 1,
    labels: {
      en: { name: 'Welcome back', desc: 'Sign in to your account.' },
      fr: { name: 'Bon retour', desc: 'Connecte-toi à ton compte.' },
      ar: { name: 'مرحبًا بعودتك', desc: 'سجّل الدخول إلى حسابك.' },
    },
  },
  {
    // Platine : toutes les sections du site, y compris recherche et compte
    // — aucun recoin ne reste inexploré.
    id: 'full-passport',
    icon: 'icons/achievements/full-passport.webp',
    group: 'start',
    rarity: 'platinum',
    xp: 400,
    metric: 'sectionsVisited',
    target: 8,
    labels: {
      en: { name: 'Full passport', desc: 'Visit all 8 sections: home, news, reviews, dossiers, events, calendar, search and account.' },
      fr: { name: 'Passeport complet', desc: 'Visite les 8 sections : accueil, actus, tests, dossiers, events, calendrier, recherche et compte.' },
      ar: { name: 'جواز سفر كامل', desc: 'زُر الأقسام الثمانية كلها: الرئيسية، الأخبار، المراجعات، الملفات، الفعاليات، التقويم، البحث والحساب.' },
    },
  },

  /* --------------------------------- Lecture -------------------------------- */
  {
    id: 'first-read',
    icon: 'icons/achievements/first-read.webp',
    group: 'reading',
    rarity: 'bronze',
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
    rarity: 'silver',
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
    rarity: 'gold',
    xp: 150,
    metric: 'articlesRead',
    target: 12,
    labels: {
      en: { name: 'Deep reader', desc: 'Read 12 different articles.' },
      fr: { name: 'Lecteur profond', desc: 'Lis 12 articles différents.' },
      ar: { name: 'قارئ متعمّق', desc: 'اقرأ 12 مقالًا مختلفًا.' },
    },
  },
  {
    // Platine : lire la quasi-totalité du contenu éditorial publié.
    id: 'librarian',
    icon: 'icons/achievements/librarian.webp',
    group: 'reading',
    rarity: 'platinum',
    xp: 600,
    metric: 'articlesRead',
    target: 30,
    labels: {
      en: { name: 'Librarian', desc: 'Read 30 different articles — news, reviews and dossiers combined.' },
      fr: { name: 'Bibliothécaire', desc: 'Lis 30 articles différents : actus, tests et dossiers réunis.' },
      ar: { name: 'أمين المكتبة', desc: 'اقرأ 30 مقالًا مختلفًا: أخبار ومراجعات وملفات معًا.' },
    },
  },
  {
    id: 'news-wire',
    icon: 'icons/achievements/news-wire.webp',
    group: 'reading',
    rarity: 'silver',
    xp: 60,
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
    rarity: 'silver',
    xp: 70,
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
    rarity: 'silver',
    xp: 70,
    metric: 'dossiersRead',
    target: 3,
    labels: {
      en: { name: 'Archivist', desc: 'Read 3 dossiers.' },
      fr: { name: 'Archiviste', desc: 'Lis 3 dossiers.' },
      ar: { name: 'أمين الأرشيف', desc: 'اقرأ 3 ملفات.' },
    },
  },
  {
    id: 'erudit',
    icon: 'icons/achievements/erudit.webp',
    group: 'reading',
    rarity: 'gold',
    xp: 180,
    metric: 'dossiersRead',
    target: 6,
    labels: {
      en: { name: 'Scholar', desc: 'Read 6 dossiers.' },
      fr: { name: 'Érudit', desc: 'Lis 6 dossiers.' },
      ar: { name: 'مثقف', desc: 'اقرأ 6 ملفات.' },
    },
  },
  {
    id: 'trinity-reader',
    icon: 'icons/achievements/trinity-reader.webp',
    group: 'reading',
    rarity: 'silver',
    xp: 90,
    metric: 'readAllKinds',
    target: 1,
    labels: {
      en: { name: 'Reading trinity', desc: 'Read at least one news story, one review and one dossier.' },
      fr: { name: 'Trinité de lecture', desc: 'Lis au moins une actu, un test et un dossier.' },
      ar: { name: 'ثالوث القراءة', desc: 'اقرأ خبرًا ومراجعة وملفًا على الأقل.' },
    },
  },
  {
    id: 'night-owl',
    icon: 'icons/achievements/night-owl.webp',
    group: 'reading',
    rarity: 'gold',
    xp: 120,
    metric: 'nightReading',
    target: 1,
    labels: {
      en: { name: 'Night owl', desc: 'Read an article between midnight and 5 a.m.' },
      fr: { name: 'Oiseau de nuit', desc: 'Lis un article entre minuit et 5 h du matin.' },
      ar: { name: 'ساهر الليل', desc: 'اقرأ مقالًا بين منتصف الليل والخامسة صباحًا.' },
    },
  },
  {
    id: 'early-bird',
    icon: 'icons/achievements/early-bird.webp',
    group: 'reading',
    rarity: 'gold',
    xp: 120,
    metric: 'earlyReading',
    target: 1,
    labels: {
      en: { name: 'Early bird', desc: 'Read an article between 5 and 8 a.m.' },
      fr: { name: 'Lève-tôt', desc: 'Lis un article entre 5 h et 8 h du matin.' },
      ar: { name: 'طائر مبكر', desc: 'اقرأ مقالًا بين الخامسة والثامنة صباحًا.' },
    },
  },
  {
    // Platine : trois nuits différentes après minuit — pas trois lectures
    // d'affilée la même nuit (le moteur retient chaque nuit une seule fois).
    id: 'night-shift',
    icon: 'icons/achievements/night-shift.webp',
    group: 'reading',
    rarity: 'platinum',
    xp: 450,
    metric: 'nightReadingDays',
    target: 3,
    labels: {
      en: { name: 'Creature of the night', desc: 'Read after midnight on 3 different nights.' },
      fr: { name: 'Créature de la nuit', desc: 'Lis après minuit, 3 nuits différentes.' },
      ar: { name: 'كائن الليل', desc: 'اقرأ بعد منتصف الليل في ثلاث ليالٍ مختلفة.' },
    },
  },

  /* ---------------------------------- Vidéo --------------------------------- */
  {
    id: 'prime-time',
    icon: 'icons/achievements/prime-time.webp',
    group: 'video',
    rarity: 'bronze',
    xp: 30,
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
    rarity: 'gold',
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
    rarity: 'gold',
    xp: 100,
    metric: 'liveWatched',
    target: 1,
    labels: {
      en: { name: 'Live signal', desc: 'Start the channel’s live player.' },
      fr: { name: 'Signal direct', desc: 'Lance le direct de la chaîne.' },
      ar: { name: 'إشارة مباشرة', desc: 'شغّل البث المباشر للقناة.' },
    },
  },
  {
    id: 'marathon-viewer',
    icon: 'icons/achievements/marathon-viewer.webp',
    group: 'video',
    rarity: 'platinum',
    xp: 500,
    metric: 'videosWatched',
    target: 12,
    labels: {
      en: { name: 'Cine marathon', desc: 'Play 12 different videos: episodes, trailers and reels.' },
      fr: { name: 'Marathon ciné', desc: 'Lance 12 vidéos différentes : épisodes, bandes-annonces et reels.' },
      ar: { name: 'ماراثون السينما', desc: 'شغّل 12 فيديو مختلفًا: حلقات وإعلانات ومقاطع قصيرة.' },
    },
  },

  /* -------------------------------- Communauté ------------------------------ */
  {
    id: 'first-comment',
    icon: 'icons/achievements/first-comment.webp',
    group: 'community',
    rarity: 'bronze',
    xp: 30,
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
    rarity: 'gold',
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
    id: 'community-pillar',
    icon: 'icons/achievements/community-pillar.webp',
    group: 'community',
    rarity: 'platinum',
    xp: 500,
    metric: 'commentsPosted',
    target: 15,
    labels: {
      en: { name: 'Community pillar', desc: 'Post 15 comments — the conversations count on you.' },
      fr: { name: 'Pilier de la communauté', desc: 'Publie 15 commentaires : les discussions comptent sur toi.' },
      ar: { name: 'عمود المجتمع', desc: 'انشر 15 تعليقًا — النقاشات تعتمد عليك.' },
    },
  },
  {
    id: 'scout',
    icon: 'icons/achievements/scout.webp',
    group: 'community',
    rarity: 'bronze',
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
    rarity: 'silver',
    xp: 80,
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
    rarity: 'silver',
    xp: 90,
    metric: 'bestStreak',
    target: 3,
    labels: {
      en: { name: 'Three in a row', desc: 'Visit the site 3 days in a row.' },
      fr: { name: 'Trois jours de suite', desc: 'Visite le site 3 jours de suite.' },
      ar: { name: 'ثلاثة أيام متتالية', desc: 'زُر الموقع ثلاثة أيام متتالية.' },
    },
  },
  {
    id: 'week-streak',
    icon: 'icons/achievements/week-streak.webp',
    group: 'loyalty',
    rarity: 'gold',
    xp: 200,
    metric: 'bestStreak',
    target: 7,
    labels: {
      en: { name: 'Perfect week', desc: 'Visit the site 7 days in a row, without missing one.' },
      fr: { name: 'Semaine parfaite', desc: 'Visite le site 7 jours d’affilée, sans en manquer un.' },
      ar: { name: 'أسبوع كامل', desc: 'زُر الموقع سبعة أيام متتالية دون انقطاع.' },
    },
  },
  {
    id: 'iron-streak',
    icon: 'icons/achievements/iron-streak.webp',
    group: 'loyalty',
    rarity: 'platinum',
    xp: 700,
    metric: 'bestStreak',
    target: 14,
    labels: {
      en: { name: 'Iron streak', desc: 'Visit the site 14 days in a row. Two weeks, not one missed.' },
      fr: { name: 'Série de fer', desc: 'Visite le site 14 jours d’affilée. Deux semaines, pas un jour manqué.' },
      ar: { name: 'سلسلة حديدية', desc: 'زُر الموقع 14 يومًا متتاليًا: أسبوعان دون تفويت يوم.' },
    },
  },
  {
    id: 'seven-day-regular',
    icon: 'icons/achievements/seven-day-regular.webp',
    group: 'loyalty',
    rarity: 'gold',
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
    id: 'monthly-legend',
    icon: 'icons/achievements/monthly-legend.webp',
    group: 'loyalty',
    rarity: 'platinum',
    xp: 800,
    metric: 'visitDays',
    target: 30,
    labels: {
      en: { name: 'Site legend', desc: 'Visit the site on 30 different days. A whole month of loyalty.' },
      fr: { name: 'Légende du site', desc: 'Visite le site 30 jours différents. Un mois entier de fidélité.' },
      ar: { name: 'أسطورة الموقع', desc: 'زُر الموقع في 30 يومًا مختلفًا: شهر كامل من الوفاء.' },
    },
  },
  {
    id: 'polyglot',
    icon: 'icons/achievements/polyglot.webp',
    group: 'loyalty',
    rarity: 'silver',
    xp: 70,
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
    rarity: 'gold',
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
    rarity: 'silver',
    xp: 80,
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
    rarity: 'bronze',
    xp: 40,
    metric: 'profileUpdates',
    target: 1,
    labels: {
      en: { name: 'Your own look', desc: 'Save a change to your player profile.' },
      fr: { name: 'Ton propre style', desc: 'Enregistre une modification de ton profil joueur.' },
      ar: { name: 'لمستك الخاصة', desc: 'احفظ تعديلًا على ملف اللاعب الخاص بك.' },
    },
  },

  /* ---------------------------------- Quizz ---------------------------------- */
  // XP dans les bandes du grade (bronze 25–40, argent 60–90, or 100–250,
  // platine 400–800) : la vérification `check:achievements` impose que l'XP
  // croisse avec le grade sur tout le catalogue.
  {
    id: 'first-quiz',
    icon: 'icons/achievements/first-quiz.webp',
    group: 'quiz',
    rarity: 'bronze',
    xp: 30,
    metric: 'quizzesCompleted',
    target: 1,
    labels: {
      en: { name: 'First quiz', desc: 'Complete your first gaming quiz.' },
      fr: { name: 'Premier quizz', desc: 'Termine ton premier quizz gaming.' },
      ar: { name: 'أول اختبار', desc: 'أكمل أول اختبار ألعاب لك.' },
    },
  },
  {
    id: 'perfect-score',
    icon: 'icons/achievements/perfect-score.webp',
    group: 'quiz',
    rarity: 'silver',
    xp: 70,
    metric: 'perfectQuizzes',
    target: 1,
    labels: {
      en: { name: 'Flawless', desc: 'Finish a quiz with a perfect score.' },
      fr: { name: 'Sans faute', desc: 'Termine un quizz avec 100 % de bonnes réponses.' },
      ar: { name: 'علامة كاملة', desc: 'أكمل اختبارًا بنسبة 100٪ من الإجابات الصحيحة.' },
    },
  },
  {
    id: 'quiz-tour',
    icon: 'icons/achievements/quiz-tour.webp',
    group: 'quiz',
    rarity: 'gold',
    xp: 200,
    metric: 'distinctQuizzes',
    // Le catalogue compte vingt-deux quizz : mettre à jour si un quizz est ajouté.
    target: 22,
    labels: {
      en: { name: 'Full tour', desc: 'Play all twenty-two quizzes of the site.' },
      fr: { name: 'Tour complet', desc: 'Joue les vingt-deux quizz du site.' },
      ar: { name: 'الجولة الكاملة', desc: 'العب الاختبارات الاثنين والعشرين في الموقع.' },
    },
  },
  {
    id: 'quiz-week',
    icon: 'icons/achievements/quiz-week.webp',
    group: 'quiz',
    rarity: 'platinum',
    xp: 500,
    metric: 'dailyQuizStreak',
    target: 7,
    labels: {
      en: { name: 'Perfect week', desc: 'Complete the daily quiz seven days in a row.' },
      fr: { name: 'Semaine parfaite', desc: 'Enchaîne sept jours de quizz du jour.' },
      ar: { name: 'أسبوع مثالي', desc: 'أكمل اختبار اليوم سبعة أيام متتالية.' },
    },
  },
  {
    id: 'first-challenge',
    icon: 'icons/achievements/first-challenge.webp',
    group: 'quiz',
    rarity: 'bronze',
    xp: 35,
    metric: 'challengesSent',
    target: 1,
    labels: {
      en: { name: 'Rival found', desc: 'Send your first quiz challenge to a friend.' },
      fr: { name: 'Rival trouvé', desc: 'Envoie ton premier défi de quizz à un ami.' },
      ar: { name: 'وجدت منافسًا', desc: 'أرسل أول تحدّي اختبار إلى صديق.' },
    },
  },
];

/** Libellé traduit d'un succès (repli sur l'anglais). */
export function achievementLabel(achievement, lang = 'en') {
  return achievement?.labels?.[lang] || achievement?.labels?.en || { name: achievement?.id || '', desc: '' };
}

/** Libellé traduit d'un grade (bronze par défaut). */
export function rarityLabel(rarity, lang = 'en') {
  return RARITIES[rarity]?.labels?.[lang] || RARITIES.bronze.labels.en;
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
