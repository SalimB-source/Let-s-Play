// Langues du site — métadonnées SEULES, sans dictionnaire.
//
// Pourquoi ce fichier existe : `LanguageContext` doit connaître la liste des
// langues, leurs libellés et leur sens de lecture même quand aucun dictionnaire
// n'est encore chargé. Importer `translations.js` pour trois objets coûterait
// les 175 Ko du fichier à chaque visiteur, y compris à celui qui reste en
// français. Les dictionnaires, eux, sont chargés à la demande
// (`dictionary.js`) : le français est déjà dans le paquet de départ, l'anglais
// et l'arabe n'arrivent que si le visiteur les demande.

/**
 * `default` = langue proposée quand l'appareil n'annonce aucune des langues du
 * site. Le français reste la langue de référence éditoriale : les articles sont
 * écrits en français, puis traduits.
 */
export const languages = [
  { code: 'fr', label: 'FR', name: 'Français', dir: 'ltr', locale: 'fr-FR' },
  { code: 'en', label: 'EN', name: 'English', dir: 'ltr', locale: 'en-GB' },
  { code: 'ar', label: 'AR', name: 'العربية', dir: 'rtl', locale: 'ar-DZ' },
];

/** Langue de repli : celle du contenu rédigé à la main et des articles source. */
export const SITE_LANG = 'fr';

/** Langue de secours clé par clé quand une traduction est incomplète. */
export const BASE_LANG = 'en';

export const LANGUAGE_CODES = languages.map((language) => language.code);

/** Clé de mémorisation du choix explicite du visiteur (ancienne clé reprise). */
export const LANG_STORAGE_KEY = 'letsplay-lang';

export function isSupportedLanguage(code) {
  return typeof code === 'string' && LANGUAGE_CODES.includes(code);
}

export function languageMeta(code) {
  return languages.find((language) => language.code === code) || languages[0];
}

/**
 * Devine la langue de l'appareil à partir d'une liste de codes BCP-47
 * (`navigator.languages`, ou un en-tête `Accept-Language`).
 *
 * Règles :
 *   1. le premier code dont la langue principale (avant le tiret) est
 *      proposée par le site gagne — « ar-DZ » vaut « ar » ;
 *   2. sinon, la langue de référence du site (`SITE_LANG`, le français).
 *
 * `fr-CA`, `en-US`, `ar-EG`… tombent donc naturellement sur `fr`, `en`, `ar` :
 * le site n'a pas de variantes régionales, mais l'ordre de préférence de
 * l'appareil est respecté (un appareil réglé en « en-US, ar » reçoit l'anglais).
 */
export function matchDeviceLanguage(candidates) {
  const list = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  for (const candidate of list) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const primary = candidate.trim().toLowerCase().split(/[-_]/)[0];
    if (isSupportedLanguage(primary)) return primary;
  }
  return SITE_LANG;
}
