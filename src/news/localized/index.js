// Traductions des ARTICLES — registre et repli, sans données.
//
// Le problème d'origine : le site savait afficher son interface en FR / EN / AR,
// mais **le contenu des articles n'existait qu'en français**. Un nouvel article
// paraissait donc toujours en français, quelle que soit la langue choisie.
//
// La règle retenue : l'article est écrit en français (langue de référence),
// puis traduit **au moment de sa publication** par le robot actus
// (`scripts/news-bot/`) ou, pour le stock existant, par la commande
// `npm run news:translate`. Les traductions vivent à part, dans
// `src/news/localized/<langue>/` :
//
//   - `index.js` — les métadonnées de liste (titre, chapô) de tous les
//     articles : petit fichier, chargé avec les pages d'actualités ;
//   - `<slug>.js` — le corps complet d'UN article : chargé seulement quand on
//     ouvre cet article-là.
//
// Le visiteur français ne télécharge jamais ces fichiers. Un article pas encore
// traduit s'affiche quand même : dans sa version française, avec une mention
// discrète (« Version française ») — jamais une page vide, jamais un faux texte
// traduit.
//
// Clé d'une entrée : la route de l'article (`/news/<slug>`), identique dans les
// cartes, la recherche, l'article et le fil d'actualité.

import { SITE_LANG } from '../../i18n/languages.js';

/** Champs éditoriaux traduisibles, dans l'ordre d'affichage de l'article. */
export const LOCALIZED_FIELDS = [
  'title', 'accent', 'dek', 'lead', 'intro',
  'h2', 'p1', 'quote', 'quoteBy', 'h2b', 'p2', 'p3', 'p4',
  'take', 'takeText', 'imageAlt', 'readTime', 'category', 'cover',
  'source', 'sourceDetail', 'credit', 'videoTitle',
];

/** Champs repris par les cartes de liste. */
export const LISTING_FIELDS = ['title', 'accent', 'dek', 'imageAlt', 'category', 'readTime'];

// `/news/<slug>` → métadonnées de liste, par langue.
const listingsByLang = new Map();
// `/news/<slug>` → corps complet, par langue.
const bodiesByLang = new Map();

function bucket(store, lang) {
  if (!store.has(lang)) store.set(lang, new Map());
  return store.get(lang);
}

/**
 * Normalise une route d'article : `cinema/foo` → `/news/cinema/foo`, préfixe de
 * base retiré, barres de fin supprimées. Tolère une URL absolue.
 */
export function normalizeArticleKey(key) {
  if (!key) return '';
  let value = String(key).trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      /* on garde la chaîne telle quelle */
    }
  }
  value = value.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!value.startsWith('news/')) value = `news/${value}`;
  return `/${value}`;
}

/** Enregistre les métadonnées de liste d'une langue (`{ '/news/…': {...} }`). */
export function registerListings(lang, map) {
  if (!lang || !map || typeof map !== 'object') return;
  const store = bucket(listingsByLang, lang);
  for (const [key, value] of Object.entries(map)) store.set(normalizeArticleKey(key), value);
}

/** Enregistre le corps traduit d'un article. */
export function registerBody(lang, key, fields) {
  if (!lang || !key || !fields || typeof fields !== 'object') return;
  bucket(bodiesByLang, lang).set(normalizeArticleKey(key), fields);
}

/** Traduction de liste déjà chargée, ou `null`. */
export function getListingTranslation(key, lang) {
  if (!lang || lang === SITE_LANG || !key) return null;
  return listingsByLang.get(lang)?.get(normalizeArticleKey(key)) || null;
}

/** Corps traduit déjà chargé, ou `null`. */
export function getBodyTranslation(key, lang) {
  if (!lang || lang === SITE_LANG || !key) return null;
  return bodiesByLang.get(lang)?.get(normalizeArticleKey(key)) || null;
}

/**
 * Inventaire d'une langue, pour les contrôles : les articles dont les
 * métadonnées de liste sont chargées et ceux dont le corps est chargé.
 */
export function countLocalized(lang) {
  return {
    listings: [...(listingsByLang.get(lang)?.keys() || [])],
    bodies: bodiesByLang.get(lang) || new Map(),
  };
}

/** Nombre d'articles traduits pour une langue (métadonnées de liste). */
export function articleTranslationCount(lang) {
  return listingsByLang.get(lang)?.size || 0;
}

/** Langues pour lesquelles des traductions sont chargées (utile aux contrôles). */
export function loadedTranslationLanguages() {
  return [...listingsByLang.keys()].filter((lang) => lang !== SITE_LANG);
}

// Repli champ par champ : une traduction partielle donne une page lisible.
function merged(base, translation, fields) {
  const out = {};
  for (const field of fields) {
    const value = translation?.[field];
    out[field] = typeof value === 'string' && value.trim() ? value : base?.[field];
  }
  return out;
}

/**
 * Article complet dans la langue demandée.
 *
 * Renvoie toujours un objet affichable :
 *   - `translated: true`, `contentLang: lang` si la traduction existe ;
 *   - sinon l'article français, `translated: false`, `contentLang: 'fr'`.
 */
export function localizeStory(story, lang) {
  if (!story) return story;
  if (!lang || lang === SITE_LANG) return { ...story, translated: true, contentLang: SITE_LANG };
  const key = story.to || story.__key || (story.slug ? `/news/${story.slug}` : '');
  const translation = getBodyTranslation(key, lang) || getListingTranslation(key, lang);
  if (!translation) return { ...story, translated: false, contentLang: SITE_LANG };
  return {
    ...story,
    ...merged(story, translation, LOCALIZED_FIELDS),
    translated: true,
    contentLang: lang,
  };
}

/**
 * Carte d'actualité (liste, carrousel, recherche) dans la langue demandée.
 * Le titre est recomposé depuis sa traduction ; image, route et sentiment ne
 * changent pas.
 */
export function localizeListing(listing, lang) {
  if (!listing) return listing;
  if (!lang || lang === SITE_LANG) return { ...listing, translated: true };
  const key = listing.to || listing.route || '';
  const translation = getListingTranslation(key, lang);
  if (!translation) return { ...listing, translated: false };
  return {
    ...listing,
    ...merged(listing, translation, LISTING_FIELDS),
    title: translation.title && translation.accent
      ? `${translation.title} ${translation.accent}`.trim()
      : translation.title || listing.title,
    excerpt: translation.dek || listing.excerpt,
    alt: translation.imageAlt || listing.alt,
    badge: translation.category || listing.badge,
    translated: true,
  };
}

/** Applique `localizeListing` à une liste. */
export function localizeListings(listings, lang) {
  if (!Array.isArray(listings)) return listings;
  if (!lang || lang === SITE_LANG) return listings.map((listing) => ({ ...listing, translated: true }));
  return listings.map((listing) => localizeListing(listing, lang));
}

/**
 * Entrée de recherche : le titre et le chapô affichés (donc traduits), plus les
 * mots-clés de la langue d'origine — un jeu s'écrit pareil dans les deux
 * langues, et c'est souvent ce que tape le visiteur.
 */
export function searchTextFor(listing, lang) {
  const translated = lang && lang !== SITE_LANG ? getListingTranslation(listing.to || listing.route, lang) : null;
  if (!translated) return listing;
  return {
    ...listing,
    title: translated.title && translated.accent ? `${translated.title} ${translated.accent}`.trim() : translated.title || listing.title,
    description: translated.dek || listing.description,
  };
}
