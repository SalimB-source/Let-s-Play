// Chargement des traductions d'articles — un fichier par langue, un par article.
//
// Les traductions étaient des milliers de lignes dans un seul module : le
// visiteur ouvrant une actu en anglais téléchargeait aussi le corps des
// quarante autres. Ici :
//
//   - `./en/index.js` (métadonnées de liste) part avec les pages d'actualités ;
//   - `./en/<slug>.js` (corps complet) n'arrive qu'à l'ouverture de CET article.
//
// `import.meta.glob` est résolu à la compilation par Vite : chaque fichier
// devient un chunk à part. En Node (script de vérification), on repasse par une
// carte explicite construite au build — jamais par le système de fichiers, qui
// n'existe pas dans le navigateur.

import { SITE_LANG } from '../../i18n/languages.js';
import { registerBody, registerListings, getBodyTranslation } from './index.js';
import { registerTrailerTranslations } from '../../articleTrailers.js';

export const TRANSLATED_LANGS = ['en', 'ar'];

// Métadonnées de liste : un module par langue.
const listingLoaders = {
  en: () => import('./en/index.js'),
  ar: () => import('./ar/index.js'),
};

// Corps d'article : tous les fichiers `./<lang>/**/*.js` sauf `index.js` et le
// sous-dossier `media/` (phrases des blocs vidéo, chargées avec l'index).
const bodyModules = {
  ...import.meta.glob(['./en/**/*.js', '!./en/media/**', '!./en/index.js']),
  ...import.meta.glob(['./ar/**/*.js', '!./ar/media/**', '!./ar/index.js']),
};

// Phrases éditoriales des blocs vidéo (note, crédit, mention d'absence).
const mediaModules = {
  ...import.meta.glob('./en/media/**/*.js'),
  ...import.meta.glob('./ar/media/**/*.js'),
};

const listingPromises = new Map();
const bodyPromises = new Map();

/** Slug de route → nom de fichier : `/news/cinema/foo` → `cinema/foo`. */
function fileFor(key) {
  const normalized = String(key).replace(/^\/+/, '').replace(/^news\//, '').replace(/\.js$/, '');
  return normalized;
}

function bodyKey(lang, slug) {
  return `${lang}:${slug}`;
}

/**
 * Charge (une seule fois) les métadonnées de liste d'une langue et les
 * enregistre dans le registre. Résout à `true` si quelque chose est disponible.
 */
export function loadArticleListings(lang) {
  if (!lang || lang === SITE_LANG) return Promise.resolve(false);
  if (listingPromises.has(lang)) return listingPromises.get(lang);
  const loader = listingLoaders[lang];
  if (!loader) return Promise.resolve(false);
  const promise = loader()
    .then((module) => {
      registerListings(lang, module.listings || module.default || {});
      // Phrases éditoriales des blocs vidéo (un fichier par article) : elles
      // partent en même temps que l'index, ce sont quelques lignes.
      return Promise.all(
        Object.entries(mediaModules)
          .filter(([file]) => file.startsWith(`./${lang}/media/`))
          .map(([, load]) => load()),
      );
    })
    .then((media) => {
      for (const module of media || []) {
        const fields = module.default || {};
        for (const [key, value] of Object.entries(fields)) {
          registerTrailerTranslations(lang, { [key]: value });
        }
      }
      return true;
    })
    .catch((error) => {
      console.warn(`[i18n] traductions d'articles "${lang}" indisponibles : ${error.message}`);
      return false;
    });
  listingPromises.set(lang, promise);
  return promise;
}

/**
 * Charge le corps traduit d'un article. Résout avec les champs, ou `null` si
 * l'article n'a pas (encore) de traduction dans cette langue.
 */
export function loadArticleBody(key, lang) {
  if (!lang || lang === SITE_LANG || !key) return Promise.resolve(null);
  const slug = fileFor(key);
  const cached = getBodyTranslation(key, lang);
  if (cached) return Promise.resolve(cached);

  const id = bodyKey(lang, slug);
  if (bodyPromises.has(id)) return bodyPromises.get(id);

  const loader = bodyModules[`./${lang}/${slug}.js`];
  if (!loader) return Promise.resolve(null);

  const promise = loader()
    .then((module) => {
      const fields = module.default || module.fields || null;
      if (fields) registerBody(lang, key, fields);
      return fields;
    })
    .catch((error) => {
      console.warn(`[i18n] traduction "${lang}" de ${key} illisible : ${error.message}`);
      return null;
    });
  bodyPromises.set(id, promise);
  return promise;
}

/** Vrai si le fichier de corps existe pour cet article (sans le charger). */
export function hasArticleBody(key, lang) {
  if (!lang || lang === SITE_LANG || !key) return false;
  return Boolean(bodyModules[`./${lang}/${fileFor(key)}.js`]);
}

/** Liste des articles traduits embarqués, par langue (contrôles). */
export function translatedArticleSlugs(lang) {
  const prefix = `./${lang}/`;
  return Object.keys(bodyModules)
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length).replace(/\.js$/, '').replace(/(^|\/)index$/, ''));
}
