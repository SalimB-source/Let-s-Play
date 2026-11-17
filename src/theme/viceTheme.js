/**
 * HABILLAGE « VICE CITY » — GTA 6, TEMPORAIRE
 * --------------------------------------------------------------------------
 * Peau saisonnière posée sur le site pour la sortie de *Grand Theft Auto VI*
 * (19 novembre 2026) : néon rose / aqua / jaune sur nuit violette, palmiers,
 * façade Art déco. Elle est **temporaire par construction** : elle s'active
 * depuis le bouton de thème, se range dans le même `localStorage` (`lp-theme`)
 * et se retire en un clic. Rien du contenu éditorial n'est modifié.
 *
 * Où vit quoi :
 *   — les COULEURS et les décorations sont en CSS, dans `src/theme/vice.css`
 *     (importé en dernier, après `theme.css`, pour avoir le dernier mot) ;
 *   — ce fichier ne porte que ce que JavaScript doit connaître : l'identifiant
 *     du thème, le visuel du héros, la date de sortie et les textes de la
 *     bande d'information.
 *
 * ⚠️ L'habillage est un hommage NON OFFICIEL. Let's Play n'est affilié ni à
 * Rockstar Games ni à Take-Two : aucun logo du jeu n'est utilisé, aucune
 * jaquette officielle n'est embarquée, et la mention le rappelle dans l'avis
 * affiché en bas de page (`viceCopy.*.legal`). Si l'un de ces points devait
 * être retiré, c'est ici et dans `src/theme/vice.css` que ça se joue.
 */

/**
 * Fenêtre de la campagne. L'habillage est le thème PAR DÉFAUT des visiteurs
 * pendant ces dates (puis le site revient tout seul au sombre) — c'est ce qui
 * le rend « temporaire » pour de vrai : rien à penser le jour de la sortie.
 *
 * ⚠️ Ces deux dates sont reprises À L'IDENTIQUE par le script de démarrage
 * d'`index.html` (qui pose `data-theme` avant le premier rendu). Les changer
 * ici ne suffit pas : mettre les deux endroits à jour.
 *
 * Le choix explicite du visiteur reste prioritaire : un `lp-theme` déjà
 * enregistré (sombre, clair ou vice) n'est jamais écrasé.
 */
export const VICE_CAMPAIGN = { start: '2026-11-12', end: '2026-11-30' };

/** La campagne est-elle en cours à cette date ? (bornes incluses) */
export function isViceCampaignOn(now = new Date()) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return day >= VICE_CAMPAIGN.start && day <= VICE_CAMPAIGN.end;
}

/** Identifiant du thème, posé dans `data-theme` sur <html>. */
export const VICE_THEME = 'vice';

/** Nom du choix mémorisé (`localStorage`) pour ne pas réafficher l'avis. */
export const VICE_NOTICE_KEY = 'lp-vice-notice';

/**
 * Date de sortie retenue : jeudi 19 novembre 2026 (PS5, Xbox Series X|S),
 * confirmée par Rockstar. Elle sert UNIQUEMENT au compte à rebours de la bande
 * d'information — aucune donnée « en direct » n'est inventée.
 */
export const GTA6_RELEASE = { year: 2026, month: 11, day: 19 };

/** Visuel du héros en habillage « vice » (généré pour ce skin, non officiel). */
export const viceHeroImage = `${import.meta.env.BASE_URL}vice-city-keyart.jpg`;

/** Visuel du héros dans l'habillage d'origine. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;

/**
 * Visuel du héros selon le thème. `Home` n'a plus qu'à passer `isVice`.
 * @param {boolean} isVice
 */
export function heroImageFor(isVice) {
  return isVice ? viceHeroImage : defaultHeroImage;
}

/** Jours restants avant la sortie (0 = jour de sortie, négatif = sorti). */
export function gta6DaysLeft(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const release = Date.UTC(GTA6_RELEASE.year, GTA6_RELEASE.month - 1, GTA6_RELEASE.day);
  return Math.round((release - today) / 86400000);
}

/**
 * Libellé du compte à rebours. Après la sortie, on ne compte plus : la bande
 * annonce que le jeu est disponible, ce qui évite un « J-0 » figé des semaines
 * durant si l'habillage traîne.
 */
export function gta6CountdownLabel(lang, now = new Date()) {
  const copy = viceCopy[lang] || viceCopy.fr;
  const days = gta6DaysLeft(now);
  if (days < 0) return copy.released;
  if (days === 0) return copy.today;
  return copy.countdown.replace('{n}', String(days));
}

/**
 * Textes de l'habillage (FR / EN / AR).
 *
 * Volontairement LOCAUX au module : ce sont les textes d'une peau temporaire,
 * pas ceux du site. Les faire entrer dans les dictionnaires i18n les
 * obligerait à survivre à la fin de l'opération — et à être retraduits à
 * chaque évolution de l'habillage.
 */
export const viceCopy = {
  fr: {
    chip: 'HABILLAGE TEMPORAIRE',
    title: 'Couleurs de Vice City, en attendant GTA 6.',
    body: 'Néon rose, aqua et palmiers sur tout le site, pour accompagner la sortie du jeu le 19 novembre 2026.',
    short: 'Couleurs Vice City jusqu’au lancement de GTA 6.',
    countdown: 'J-{n}',
    today: 'SORTIE AUJOURD’HUI',
    released: 'DISPONIBLE',
    exit: 'Revenir à l’habillage normal',
    exitShort: 'Normal',
    close: 'Masquer cet avis',
    legal: 'Hommage non officiel : Let’s Play n’est affilié ni à Rockstar Games ni à Take-Two. Visuel et couleurs sont une création de la maison.',
    heroTag: 'SORTIE 19.11.2026 · PS5 · XBOX SERIES',
    heroKicker: 'VICE CITY MODE',
  },
  en: {
    chip: 'TEMPORARY SKIN',
    title: 'Vice City colours, while we wait for GTA 6.',
    body: 'Pink neon, aqua and palm trees across the site, for the game’s launch on November 19, 2026.',
    short: 'Vice City colours until GTA 6 launches.',
    countdown: 'D-{n}',
    today: 'OUT TODAY',
    released: 'AVAILABLE NOW',
    exit: 'Back to the normal look',
    exitShort: 'Normal',
    close: 'Hide this notice',
    legal: 'Unofficial tribute: Let’s Play is not affiliated with Rockstar Games or Take-Two. Artwork and colours are our own.',
    heroTag: 'OUT NOV 19, 2026 · PS5 · XBOX SERIES',
    heroKicker: 'VICE CITY MODE',
  },
  ar: {
    chip: 'مظهر مؤقت',
    title: 'ألوان فايس سيتي بانتظار GTA 6.',
    body: 'نيون وردي وأزرق ونخيل على كل الموقع، تزامنًا مع إصدار اللعبة في 19 نوفمبر 2026.',
    short: 'ألوان فايس سيتي حتى إطلاق GTA 6.',
    countdown: 'باقي {n} يومًا',
    today: 'صدر اليوم',
    released: 'متوفّر الآن',
    exit: 'العودة إلى المظهر العادي',
    exitShort: 'عادي',
    close: 'إخفاء هذا التنبيه',
    legal: 'تحية غير رسمية: Let’s Play غير تابعة لـ Rockstar Games أو Take-Two. الصورة والألوان من إنتاج الموقع.',
    heroTag: 'الإصدار 19.11.2026 · PS5 · XBOX SERIES',
    heroKicker: 'وضع فايس سيتي',
  },
};
