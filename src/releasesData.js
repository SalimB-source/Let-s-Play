/**
 * Calendrier des sorties de la page Actus : données + helpers de date partagés
 * entre la grille du mois, la frise et le compte à rebours « le plus attendu ».
 *
 * Deux comportements automatiques, à connaître pour tenir la page à jour :
 *
 * 1. Le compte à rebours ne cite jamais un jeu en dur : il prend le premier de la
 *    file `awaitedRank` qui n'est pas encore disponible et bascule sur la sortie
 *    suivante dès que le décompte atteint zéro — tous mois confondus.
 * 2. La grille et la frise affichent le mois « actif » : le mois courant s'il a
 *    des sorties au calendrier, sinon le mois de la prochaine sortie annoncée.
 *
 * Faire suivre octobre = pousser des entrées avec `month: 10` (et un visuel dans
 * `public/releases/`), rien d'autre à modifier :
 *
 *   { slug: 'metroid-ravenous', month: 10, day: 28, title: 'Metroid Ravenous',
 *     platforms: 'SWITCH 2', image: 'releases/metroid-ravenous.jpg',
 *     alt: 'Metroid Ravenous — Samus dans une grotte organique', awaitedRank: 9 }
 */

export const RELEASE_YEAR = 2026; // année par défaut des entrées du calendrier
export const RELEASE_MONTH = 9; // mois par défaut (1 = janvier … 12 = décembre)

const DAY_MS = 86400000;

/**
 * Une entrée = une sortie programmée.
 * - day            : jour du mois (inutile si `releaseAt` est renseigné)
 * - month · year   : optionnels, sinon RELEASE_MONTH · RELEASE_YEAR
 * - releaseAt      : (optionnel) instant précis de lancement en ISO 8601 avec
 *                    fuseau, ex. '2026-09-15T09:00:00+02:00' ou
 *                    '2026-09-15T00:00:00Z'. Sans lui, le décompte vise minuit,
 *                    heure locale du visiteur ; avec lui, tout le monde bascule
 *                    au même moment.
 * - image · alt    : visuel 16:9 (800×450) servi depuis public/, sans baseUrl
 * - awaitedRank    : (optionnel) rang du bloc « le plus attendu ». 1 = premier
 *                    compte à rebours de la saison, 2 = celui qui prend le relais
 *                    dès que le n°1 est sorti… Le rang est une échelle globale :
 *                    le premier jeu du mois suivant prend le rang suivant. Un jeu
 *                    sans rang reste éligible en dernier recours, trié par date.
 * - countdownImage : (optionnel) visuel dédié au bloc « le plus attendu ».
 */
export const gameReleases = [
  { slug: 'crimson-moon', day: 1, title: 'Crimson Moon', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/crimson-moon.jpg', alt: 'Crimson Moon — combat gothique sous un ciel de lune rouge' },
  { slug: 'moonlighter-2', day: 2, title: 'Moonlighter 2: The Endless Vault', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/moonlighter-2.jpg', alt: 'Moonlighter 2 — le héros traverse un couloir de donjon coloré' },
  { slug: 'the-blood-of-dawnwalker', day: 3, title: 'The Blood of Dawnwalker', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/the-blood-of-dawnwalker.jpg', alt: 'The Blood of Dawnwalker — key art du RPG vampire' },
  { slug: 'onimusha-way-of-the-sword', day: 4, title: 'Onimusha: Way of the Sword', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/onimusha-way-of-the-sword.jpg', alt: 'Onimusha: Way of the Sword — samouraï face aux démons', awaitedRank: 8 },
  { slug: 'wardogs', day: 10, title: 'Wardogs', platforms: 'PC', image: 'releases/wardogs.jpg', alt: 'Wardogs — mercenaires dans une cité en ruines' },
  { slug: 'marvels-wolverine', day: 15, title: 'Marvel’s Wolverine', platforms: 'PS5', image: 'releases/marvels-wolverine.jpg', countdownImage: 'wolverine-countdown.jpg', alt: 'Marvel’s Wolverine — key art de Insomniac', awaitedRank: 1 },
  { slug: 'fire-emblem-fortunes-weave', day: 17, title: 'Fire Emblem: Fortune’s Weave', platforms: 'SWITCH 2', image: 'releases/fire-emblem-fortunes-weave.jpg', alt: 'Fire Emblem: Fortune’s Weave — key art des héros entrelacés', awaitedRank: 2 },
  { slug: 'lego-batman-legacy-of-the-dark-knight', day: 18, title: 'LEGO Batman: Legacy of the Dark Knight', platforms: 'SWITCH 2', image: 'releases/lego-batman-legacy-of-the-dark-knight.jpg', alt: 'LEGO Batman — Batman miniature sous la pluie de Gotham', awaitedRank: 7 },
  { slug: 'control-resonant', day: 24, title: 'Control Resonant', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/control-resonant.jpg', alt: 'Control Resonant — Dylan Faden et son marteau au-dessus de Manhattan', awaitedRank: 4 },
  { slug: 'silent-hill-townfall', day: 24, title: 'Silent Hill Townfall', platforms: 'PC · PS5', image: 'releases/silent-hill-townfall.jpg', alt: 'Silent Hill Townfall — sheriff face à la brume rouge', awaitedRank: 3 },
  { slug: 'ea-sports-fc-27', day: 25, title: 'EA Sports FC 27', platforms: 'PC · PS5 · XBOX · SWITCH', image: 'releases/ea-sports-fc-27.jpg', alt: 'EA Sports FC 27 — visuel officiel de révélation', awaitedRank: 6 },
  { slug: 'the-witcher-3-remastered', day: 29, title: 'The Witcher 3: Wild Hunt – Remastered', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/the-witcher-3-remastered.jpg', alt: 'The Witcher 3 — Geralt, Ciri et Yennefer en peinture remasterisée', awaitedRank: 5 },
];

/* ---------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------- */

/** Accepte une Date, un timestamp ou une chaîne ISO ; retourne un timestamp. */
function timeOf(value){
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value);
  return Number(value);
}

function startOfDay(date){
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function toDay(value){
  return value instanceof Date ? value : new Date(timeOf(value));
}

/**
 * Instant de référence d'une sortie : `releaseAt` si fourni et valide, sinon
 * minuit local le `day` du mois par défaut (ou du `month`/`year` de l'entrée).
 */
export function releaseDate(release){
  if (release.releaseAt){
    const exact = new Date(release.releaseAt);
    if (!Number.isNaN(exact.getTime())) return exact;
  }
  const year = typeof release.year === 'number' ? release.year : RELEASE_YEAR;
  const month = typeof release.month === 'number' ? release.month : RELEASE_MONTH;
  const day = typeof release.day === 'number' ? release.day : 1;
  return new Date(year, month - 1, day, 0, 0, 0);
}

/** Jour / mois / année_effectifs d'une sortie (déduits de `releaseAt` le cas échéant). */
export function releaseDay(release){
  return releaseDate(release).getDate();
}
export function releaseMonth(release){
  return releaseDate(release).getMonth() + 1;
}
export function releaseYear(release){
  return releaseDate(release).getFullYear();
}

/** Nombre de jours d'un mois donné (9/2026 → 30). */
export function monthDays(year = RELEASE_YEAR, month = RELEASE_MONTH){
  return new Date(year, month, 0).getDate();
}

/** Sortie déjà passée (strictement avant aujourd'hui) — grille et frise. */
export function isPastRelease(release, today = new Date()){
  return releaseDate(release).getTime() < startOfDay(today);
}

/** Sortie qui tombe exactement le jour de `today`. */
export function isReleaseToday(release, today = new Date()){
  const midnight = startOfDay(today);
  const at = releaseDate(release).getTime();
  return at >= midnight && at < midnight + DAY_MS;
}

/** Retrouve une sortie par son slug. */
export function findRelease(slug, list = gameReleases){
  return list.find((release) => release.slug === slug);
}

/* ---------------------------------------------------------------------------
 * Libellés localisés (le mois n'est plus codé en dur dans la page)
 * ------------------------------------------------------------------------- */

/**
 * Locales des dates. `en-US` plutôt que `en-GB` : « September 15, 2026 » et le
 * mois abrégé sur trois lettres (« 15 SEP ») collent au ton déjà employé dans
 * les textes anglais du site. Les chiffres restent latins en arabe.
 */
const DATE_LOCALES = { fr: 'fr-FR', en: 'en-US', ar: 'ar-u-nu-latn' };

function formatDate(date, lang, options, fallback){
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang] || 'fr-FR', options).format(date);
  } catch (error) {
    return fallback();
  }
}

/** Nom long du mois, en capitales typographiques : « SEPTEMBRE ». */
export function monthHeadline(year, month, lang = 'fr'){
  const label = formatDate(new Date(year, month - 1, 1), lang, { month: 'long' }, () => `${month}/${year}`);
  return label.replace(/[.\s]+$/, '').toUpperCase();
}

/** Mois + année, en capitales : « SEPTEMBRE 2026 ». */
export function monthLabel(year, month, lang = 'fr'){
  const label = formatDate(new Date(year, month - 1, 1), lang, { month: 'long', year: 'numeric' }, () => `${month}/${year}`);
  return label.replace(/[.\s]+$/, '').toUpperCase();
}

/** Étiquette courte d'une sortie, ex. « 15 SEP » (ou « 15 SEPT » en français). */
export function releaseDayLabel(release, lang = 'fr'){
  const date = releaseDate(release);
  const short = formatDate(date, lang, { month: 'short' }, () => date.toLocaleDateString(lang === 'ar' ? 'ar' : lang, { month: 'short' }))
    .replace(/[.\s]/g, '')
    .toUpperCase();
  return `${String(date.getDate()).padStart(2, '0')} ${short}`;
}

/** Date longue d'une sortie, ex. « 15 septembre 2026 ». */
export function releaseDateLabel(release, lang = 'fr'){
  return formatDate(releaseDate(release), lang, { day: 'numeric', month: 'long', year: 'numeric' }, () => releaseDate(release).toLocaleDateString());
}

/* ---------------------------------------------------------------------------
 * Mois actif : ce que montrent la grille et la frise
 * ------------------------------------------------------------------------- */

export function monthKey(year, month){
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Sorties d'un mois donné, dans l'ordre du calendrier (puis par jour). */
export function releasesInMonth(year, month, list = gameReleases){
  return list
    .filter((release) => releaseYear(release) === year && releaseMonth(release) === month)
    .sort((a, b) => releaseDate(a).getTime() - releaseDate(b).getTime());
}

/**
 * Mois affiché par la page Actus : le mois courant s'il est au calendrier,
 * sinon le mois de la prochaine sortie (le calendrier reste donc utile avant
 * comme après le mois « vedette »), sinon le dernier mois connu.
 */
export function activeMonth(now = new Date(), list = gameReleases){
  const today = toDay(now);
  const currentKey = monthKey(today.getFullYear(), today.getMonth() + 1);
  const known = [...new Set(list.map((release) => monthKey(releaseYear(release), releaseMonth(release))))].sort();
  const upcoming = list
    .filter((release) => releaseDate(release).getTime() >= startOfDay(today))
    .sort((a, b) => releaseDate(a).getTime() - releaseDate(b).getTime());
  const nextKey = upcoming.length > 0 ? monthKey(releaseYear(upcoming[0]), releaseMonth(upcoming[0])) : null;

  let key = currentKey;
  if (!known.includes(key)) key = nextKey && known.includes(nextKey) ? nextKey : known[known.length - 1];
  if (!key) key = currentKey; // calendrier vide : on garde le mois courant, la section s'affiche vide

  const [year, month] = key.split('-').map(Number);
  const isCurrent = key === currentKey;
  return {
    key,
    year,
    month,
    days: monthDays(year, month),
    releases: releasesInMonth(year, month, list),
    isCurrent,
    todayDay: isCurrent ? today.getDate() : null,
  };
}

/* ---------------------------------------------------------------------------
 * File « le plus attendu » — alimente le bloc compte à rebours de la page Actus.
 * ------------------------------------------------------------------------- */

const UNRANKED = Number.MAX_SAFE_INTEGER;

function awaitedRank(release){
  return typeof release.awaitedRank === 'number' ? release.awaitedRank : UNRANKED;
}

/** Tri du bloc « le plus attendu » : rang éditorial d'abord, puis date de sortie. */
export function sortAwaited(list){
  return [...list].sort((a, b) => {
    const rankA = awaitedRank(a);
    const rankB = awaitedRank(b);
    if (rankA !== rankB) return rankA < rankB ? -1 : 1;
    return releaseDate(a).getTime() - releaseDate(b).getTime();
  });
}

/** Sorties pas encore disponibles, dans l'ordre où le compte à rebours doit les prendre. */
export function upcomingReleases(now = new Date(), list = gameReleases){
  const at = timeOf(now);
  return sortAwaited(list.filter((release) => releaseDate(release).getTime() > at));
}

/** Jeu à compter à présent (premier de la file), ou `null` si le calendrier est épuisé. */
export function nextAwaitedRelease(now = new Date(), list = gameReleases){
  return upcomingReleases(now, list)[0] || null;
}

/** Sorties du jour déjà disponibles (sert à la mention « sorti aujourd'hui »). */
export function todaysReleases(now = new Date(), list = gameReleases){
  const today = toDay(now);
  return sortAwaited(list.filter((release) => isReleaseToday(release, today)));
}

/** Temps restant avant une sortie, en jours/heures/minutes/secondes (jamais négatif). */
export function countdownParts(release, now = new Date()){
  const remaining = Math.max(0, releaseDate(release).getTime() - timeOf(now));
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
