// Chargement des dictionnaires — à la demande, jamais au démarrage.
//
// Le site publie trois langues. Les dictionnaires complets pèsent ~175 Ko de
// source (~58 Ko compressés), et la très grande majorité des visiteurs reste
// dans la langue de son appareil : envoyer FR + EN + AR à tout le monde serait
// du gaspillage pur.
//
// Le découpage :
//   - `fr` est déjà dans le paquet de départ. Il est COMPLET : les clés oubliées
//     en français y ont été comblées avec les replis anglais à la génération
//     (`npm run i18n:fr-site`), donc une page ne peut pas planter faute de clé ;
//   - `en` et `ar` arrivent par import dynamique (un fichier chacune),
//     uniquement quand le visiteur passe dans cette langue ;
//   - pendant le chargement, l'interface garde la dernière langue affichée : un
//     menu ne se vide jamais au moment du clic.

import { frenchSiteDictionary } from './translations-fr-site';
import { BASE_LANG, SITE_LANG } from './languages';
// Builds de vérification (SSR) uniquement : `import.meta.env.SSR` est une
// constante de compilation, si bien que le paquet navigateur ne garde PAS cet
// import — les dictionnaires EN / AR n'y arrivent que par `loadDictionary`.
import { translations as serverTranslations } from './translations';

export {
  languages,
  SITE_LANG,
  BASE_LANG,
  LANG_STORAGE_KEY,
  LANGUAGE_CODES,
  isSupportedLanguage,
  languageMeta,
  matchDeviceLanguage,
} from './languages';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Fusionne profondément `dict` sur `base` : une clé absente ou vide côté
 * traduction retombe sur la langue de secours au lieu de valoir `undefined`.
 *
 * Sans ce filet, un dictionnaire partiellement traduit casse toute page qui
 * lit la clé manquante : c'était exactement le bug ff6d390, qui avait laissé la
 * page Actus blanche en FR / AR après l'ajout d'un article.
 */
export function withBaseFallback(dict, base, path = '') {
  if (!isPlainObject(dict)) return dict;
  const hasBase = isPlainObject(base);
  const merged = {};
  const keys = new Set([...Object.keys(dict), ...(hasBase ? Object.keys(base) : [])]);
  for (const key of keys) {
    const value = dict[key];
    const fallback = hasBase ? base[key] : undefined;
    const keyPath = path ? `${path}.${key}` : key;

    if (isPlainObject(value) && isPlainObject(fallback)) {
      merged[key] = withBaseFallback(value, fallback, keyPath);
    } else if (value === undefined || value === null || value === '') {
      if (fallback === undefined) {
        merged[key] = value;
        continue;
      }
      if (import.meta.env?.DEV) {
        console.warn(`[i18n] "${keyPath}" n'est pas traduit — repli sur ${BASE_LANG}.`);
      }
      merged[key] = fallback;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

// Cache des dictionnaires déjà résolus, par langue.
const dictionaries = new Map();

// Chargements en cours : deux appels simultanés partagent la même promesse.
const pending = new Map();

// Rendu hors navigateur : `renderToString` ne sait pas attendre une promesse.
// On remplit donc le cache avec les trois dictionnaires, de façon synchrone.
// Dans le paquet navigateur, cette branche et l'import ci-dessus disparaissent.
if (import.meta.env.SSR) {
  for (const [code, dictionary] of Object.entries(serverTranslations)) {
    dictionaries.set(
      code,
      code === BASE_LANG ? dictionary : withBaseFallback(dictionary, serverTranslations[BASE_LANG]),
    );
  }
}
if (!dictionaries.has(SITE_LANG)) dictionaries.set(SITE_LANG, frenchSiteDictionary);

/**
 * Dictionnaire anglais de secours. Il sert de base aux autres langues (clés
 * oubliées) et de repli pour les routes rendues hors navigateur (SSR, scripts
 * de vérification) où le chargement dynamique n'a pas la même souplesse.
 */
export async function loadEnglishDictionary() {
  const { translations } = await import('./translations');
  return translations[BASE_LANG];
}

async function loadDictionary(code) {
  if (dictionaries.has(code)) return dictionaries.get(code);
  if (code === BASE_LANG) {
    const english = await loadEnglishDictionary();
    dictionaries.set(code, english);
    return english;
  }
  const { translations } = await import('./translations');
  const dictionary = translations[code];
  if (!dictionary) return null;
  const merged = withBaseFallback(dictionary, translations[BASE_LANG]);
  dictionaries.set(code, merged);
  return merged;
}

/**
 * Dictionnaire d'une langue, éventuellement asynchrone.
 *
 * Renvoie directement le dictionnaire quand il est déjà en cache (cas du
 * français : synchrone, sans suspense), sinon une promesse.
 */
export function getDictionary(code) {
  if (dictionaries.has(code)) return dictionaries.get(code);
  if (!pending.has(code)) {
    pending.set(
      code,
      loadDictionary(code)
        .catch((error) => {
          console.warn(`[i18n] dictionnaire "${code}" indisponible : ${error.message}`);
          return null;
        })
        .finally(() => pending.delete(code)),
    );
  }
  return pending.get(code);
}

/** Dictionnaire déjà chargé, sans déclencher de chargement (`null` sinon). */
export function peekDictionary(code) {
  return dictionaries.get(code) || null;
}

/**
 * Rendu hors navigateur (scripts `check:i18n`, SSR) : tout est chargé d'un coup,
 * de façon synchrone, parce que `renderToString` ne sait pas attendre. Aucun
 * bundle navigateur n'emprunte ce chemin — les trois dictionnaires n'y arrivent
 * que si `import.meta.env.SSR` est vrai.
 */
export function preloadAllDictionariesSync(translations) {
  for (const [code, dictionary] of Object.entries(translations)) {
    dictionaries.set(code, code === BASE_LANG ? dictionary : withBaseFallback(dictionary, translations[BASE_LANG]));
  }
}
