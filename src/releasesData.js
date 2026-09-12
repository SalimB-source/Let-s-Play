/**
 * Calendrier des sorties du mois affiché dans la page Actus (bloc « Sorties du
 * mois ») : données + petits helpers de date partagés entre la grille, la
 * frise du mois et le compte à rebours de Marvel's Wolverine.
 */

export const RELEASE_YEAR = 2026;
export const RELEASE_MONTH = 9; // 1 = janvier … 12 = décembre (septembre)
export const RELEASE_MONTH_LABEL = 'SEPTEMBRE 2026';

const DAY_MS = 86400000;

/**
 * Une entrée = un jeu qui sort ce mois-ci.
 * - day       : jour du mois dans RELEASE_MONTH / RELEASE_YEAR
 * - image     : visuel 16:9 (800×450) servi depuis public/, sans baseUrl
 * - alt       : description du visuel pour l'accessibilité
 */
export const septemberReleases = [
  { slug: 'crimson-moon', day: 1, title: 'Crimson Moon', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/crimson-moon.jpg', alt: 'Crimson Moon — combat gothique sous un ciel de lune rouge' },
  { slug: 'moonlighter-2', day: 2, title: 'Moonlighter 2: The Endless Vault', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/moonlighter-2.jpg', alt: 'Moonlighter 2 — le héros traverse un couloir de donjon coloré' },
  { slug: 'the-blood-of-dawnwalker', day: 3, title: 'The Blood of Dawnwalker', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/the-blood-of-dawnwalker.jpg', alt: 'The Blood of Dawnwalker — key art du RPG vampire' },
  { slug: 'onimusha-way-of-the-sword', day: 4, title: 'Onimusha: Way of the Sword', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/onimusha-way-of-the-sword.jpg', alt: 'Onimusha: Way of the Sword — samouraï face aux démons' },
  { slug: 'wardogs', day: 10, title: 'Wardogs', platforms: 'PC', image: 'releases/wardogs.jpg', alt: 'Wardogs — mercenaires dans une cité en ruines' },
  { slug: 'marvels-wolverine', day: 15, title: 'Marvel’s Wolverine', platforms: 'PS5', image: 'releases/marvels-wolverine.jpg', alt: 'Marvel’s Wolverine — key art de Insomniac' },
  { slug: 'fire-emblem-fortunes-weave', day: 17, title: 'Fire Emblem: Fortune’s Weave', platforms: 'SWITCH 2', image: 'releases/fire-emblem-fortunes-weave.jpg', alt: 'Fire Emblem: Fortune’s Weave — key art des héros entrelacés' },
  { slug: 'lego-batman-legacy-of-the-dark-knight', day: 18, title: 'LEGO Batman: Legacy of the Dark Knight', platforms: 'SWITCH 2', image: 'releases/lego-batman-legacy-of-the-dark-knight.jpg', alt: 'LEGO Batman — Batman miniature sous la pluie de Gotham' },
  { slug: 'control-resonant', day: 24, title: 'Control Resonant', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/control-resonant.jpg', alt: 'Control Resonant — Dylan Faden et son marteau au-dessus de Manhattan' },
  { slug: 'silent-hill-townfall', day: 24, title: 'Silent Hill Townfall', platforms: 'PC · PS5', image: 'releases/silent-hill-townfall.jpg', alt: 'Silent Hill Townfall — sheriff face à la brume rouge' },
  { slug: 'ea-sports-fc-27', day: 25, title: 'EA Sports FC 27', platforms: 'PC · PS5 · XBOX · SWITCH', image: 'releases/ea-sports-fc-27.jpg', alt: 'EA Sports FC 27 — visuel officiel de révélation' },
  { slug: 'the-witcher-3-remastered', day: 29, title: 'The Witcher 3: Wild Hunt – Remastered', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/the-witcher-3-remastered.jpg', alt: 'The Witcher 3 — Geralt, Ciri et Yennefer en peinture remasterisée' },
];

/** Date locale (minuit) de la sortie d'un jeu du calendrier. */
export function releaseDate(release){
  return new Date(RELEASE_YEAR, RELEASE_MONTH - 1, release.day, 0, 0, 0);
}

/** Nombre de jours du mois de sortie (septembre → 30). */
export function daysInReleaseMonth(){
  return new Date(RELEASE_YEAR, RELEASE_MONTH, 0).getDate();
}

function startOfDay(date){
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Sortie déjà passée (strictement avant aujourd'hui). */
export function isPastRelease(release, today = new Date()){
  return releaseDate(release).getTime() < startOfDay(today);
}

/** Sortie qui tombe exactement aujourd'hui. */
export function isReleaseToday(release, today = new Date()){
  const midnight = startOfDay(today);
  const at = releaseDate(release).getTime();
  return at >= midnight && at < midnight + DAY_MS;
}

/** Étiquette courte affichée sur les cartes, ex. « 15 SEP ». */
export function releaseDayLabel(release){
  return `${String(release.day).padStart(2, '0')} SEP`;
}

/** Retrouve une sortie par son slug (utilisé par le compte à rebours). */
export function findRelease(slug){
  return septemberReleases.find((release) => release.slug === slug);
}
