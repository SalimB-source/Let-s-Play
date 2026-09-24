import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { translations, languages } from './translations';

/**
 * Langue du site — le français, et rien d'autre.
 * ----------------------------------------------
 * Le sélecteur de langue a été retiré de la barre de navigation : le site est
 * publié en français. `SITE_LANG` est donc la langue de tous les visiteurs, et
 * plus rien n'est lu dans `localStorage` : l'ancienne clé `letsplay-lang` est
 * ignorée, y compris chez un visiteur qui avait choisi l'anglais ou l'arabe.
 *
 * Ce qui reste dans le dépôt, et pourquoi :
 *
 *   - les dictionnaires `en` et `ar` (`src/i18n/translations.js`). `en` reste le
 *     filet de sécurité du français : une clé oubliée dans `fr` s'affiche en
 *     anglais au lieu de casser la page (voir `withBaseFallback` — c'est le bug
 *     ff6d390 qui avait blanchi la page Actus) ;
 *   - la direction du texte (`dir`) et le câblage RTL qui va avec : inertes en
 *     français, déjà en place si une langue revient un jour ;
 *   - la prop `lang` du provider : une prise réservée aux scripts de
 *     vérification, qui continuent de rendre chaque route en FR / EN / AR
 *     (`npm run check:i18n`). Aucun écran ne s'en sert, aucun visiteur ne peut
 *     changer la langue.
 *
 * Le contexte expose `{ lang, dir, t }` : `setLang` a disparu avec le
 * sélecteur.
 */

// Langue publiée dans `index.html` (`<html lang="fr">`) et seul réglage du
// site. Sert aussi de repli quand la prop `lang` ne correspond à aucun
// dictionnaire.
export const SITE_LANG = 'fr';

// Dictionnaire de secours du français : celui de l'anglais.
const BASE_LANG = 'en';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fusionne profondément un dictionnaire de langue sur le dictionnaire de base,
 * pour qu'une clé absente d'une traduction retombe sur la langue de secours au
 * lieu de valoir `undefined`.
 *
 * Sans cela, un dictionnaire partiellement traduit fait planter toute page qui
 * lit la clé manquante (`t.news.million.coverAlt` lève quand `t.news.million`
 * est `undefined`) : c'est exactement ce qui avait laissé la page Actus blanche
 * en FR / AR.
 */
function withBaseFallback(dict, base, path = '') {
  if (!isPlainObject(dict)) return dict;
  const hasBase = isPlainObject(base);
  const merged = {};
  // On parcourt l'union des deux jeux de clés pour hériter de celles qui
  // manquent à `dict`.
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
        console.warn(`[i18n] "${keyPath}" is not translated — falling back to "${BASE_LANG}"`);
      }
      merged[key] = fallback;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function buildDictionary(lang) {
  const dict = translations[lang];
  const base = translations[BASE_LANG];
  if (!dict) return base;
  if (!base || lang === BASE_LANG) return dict;
  return withBaseFallback(dict, base);
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children, lang = SITE_LANG }) {
  // `lang` n'est qu'une prise de test (voir l'en-tête) : la langue du site ne
  // change pas en cours de visite, il n'y a donc ni état ni effet de bord.
  const active = translations[lang] ? lang : SITE_LANG;
  const meta = languages.find((entry) => entry.code === active) || languages[0];

  useEffect(() => {
    document.documentElement.lang = active;
    document.documentElement.dir = meta.dir;
  }, [active, meta.dir]);

  const value = useMemo(() => ({
    lang: active,
    dir: meta.dir,
    t: buildDictionary(active),
  }), [active, meta.dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
