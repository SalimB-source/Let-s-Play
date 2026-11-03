import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { translations as allTranslations, languages } from './translations';
import { frenchSiteDictionary } from './translations-fr-site';

// La version publiée n'est qu'en français : son dictionnaire complet contient
// déjà les replis anglais nécessaires, sans envoyer les paquets EN/AR au
// navigateur. Le build SSR garde les trois langues pour les rendus et contrôles
// de toutes les routes (`check:i18n`). `import.meta.env.SSR` est une constante
// de build, donc Rollup élimine les dictionnaires de test du bundle web.
const translations = import.meta.env.SSR
  ? allTranslations
  : { fr: frenchSiteDictionary };

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
 *   - les dictionnaires complets EN / FR / AR restent dans `translations.js`
 *     pour le rendu SSR et les contrôles. Le bundle navigateur ne garde que le
 *     français complété à la génération par les replis anglais
 *     (`translations-fr-site.js`) : aucune clé absente ne casse une page et EN/AR
 *     ne sont pas téléchargés par le site publié ;
 *   - la direction du texte (`dir`) et le câblage RTL restent testés avec AR ;
 *   - la prop `lang` du provider reste une prise réservée aux scripts SSR, qui
 *     rendent chaque route en FR / EN / AR (`npm run check:i18n`). Aucun écran
 *     ne s'en sert, aucun visiteur ne peut changer la langue.
 *
 * Le contexte expose `{ lang, dir, t }` : `setLang` a disparu avec le
 * sélecteur.
 */

// Langue publiée dans `index.html` (`<html lang="fr">`) et seul réglage du
// site. Sert aussi de repli quand la prop `lang` ne correspond à aucun
// dictionnaire.
export const SITE_LANG = 'fr';

// Langue de secours utilisée pendant le rendu SSR des dictionnaires source.
// Le navigateur reçoit le même repli déjà fusionné dans `frenchSiteDictionary`.
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

/**
 * Le contexte est exporté : certains composants montés hors fournisseur —
 * le jeu (vérifications jsdom) — le lisent en direct pour rester inertes
 * (`useContext(LanguageContext)` au lieu de `useLanguage()` qui lève).
 */
export const LanguageContext = createContext(null);

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
