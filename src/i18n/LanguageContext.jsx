import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BASE_LANG,
  LANG_STORAGE_KEY,
  SITE_LANG,
  getDictionary,
  isSupportedLanguage,
  languageMeta,
  languages,
  matchDeviceLanguage,
  peekDictionary,
  preloadAllDictionariesSync,
  withBaseFallback,
} from './dictionary';

/**
 * Langue du site — FR / EN / AR, choisie par le visiteur.
 * -----------------------------------------------
 * Ordre de décision, au premier rendu :
 *   1. la langue que le visiteur a explicitement choisie (switch de langue),
 *      mémorisée dans `localStorage` ;
 *   2. sinon la langue de SON APPAREIL (`navigator.languages`) : un téléphone
 *      réglé en anglais ou en arabe arrive directement dans sa langue, sans
 *      toucher au switch ;
 *   3. sinon le français, langue de référence du site.
 *
 * Le dictionnaire français est embarqué dans le paquet de départ ; l'anglais et
 * l'arabe sont chargés à la demande (`dictionary.js`). Pendant ce chargement,
 * `t` reste celui de la langue précédente et `pending` vaut `true` : l'écran ne
 * se vide pas, et la direction du texte n'est posée qu'une fois le dictionnaire
 * disponible (pas de saut visuel LTR → RTL sur une page à moitié rendue).
 *
 * La prop `lang` reste une prise pour les rendus hors navigateur (scripts de
 * vérification, SSR) : elle fige la langue et charge les trois dictionnaires de
 * façon synchrone.
 *
 * Le contexte expose `{ lang, dir, t, setLang, languages, pending }`.
 */

export const LanguageContext = createContext(null);

// Langue de référence, réexportée pour les composants montés hors fournisseur
// (le jeu Le Sablier lit le contexte en direct pour rester inerte en test).
export { SITE_LANG };

function readStoredLanguage() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null; // navigation privée : on ne mémorise simplement pas
  }
}

function readDeviceLanguage() {
  // Uniquement dans un VRAI navigateur. Les builds de vérification (SSR) sont
  // exécutés dans jsdom/Node, où `navigator` existe sans représenter le
  // visiteur : y détecter « en-US » ferait basculer tous les contrôles en
  // anglais. `import.meta.env.SSR` est une constante de compilation : le paquet
  // navigateur ne garde que la branche du dessous.
  if (import.meta.env.SSR) return SITE_LANG;
  if (typeof navigator === 'undefined') return SITE_LANG;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  return matchDeviceLanguage(candidates);
}

export function detectInitialLanguage() {
  return readStoredLanguage() || readDeviceLanguage();
}

export function LanguageProvider({ children, lang: fixedLang }) {
  // Rendu hors navigateur : la langue est imposée, tout est déjà chargé.
  const forced = isSupportedLanguage(fixedLang) ? fixedLang : null;

  const [lang, setLangState] = useState(() => forced || detectInitialLanguage());
  // `t` peut retarder d'une microtâche sur `lang` : c'est le dictionnaire réellement
  // disponible. `pending` signale cet écart.
  const [t, setT] = useState(() => peekDictionary(forced || detectInitialLanguage()) || peekDictionary(SITE_LANG));
  const [pending, setPending] = useState(false);

  // Le dictionnaire suit la langue. Français : synchrone, aucun état transitoire.
  useEffect(() => {
    if (forced) {
      // SSR / vérifications : les dictionnaires sont chargés avant le rendu.
      const ready = peekDictionary(forced);
      if (ready) setT(ready);
      return;
    }
    const ready = peekDictionary(lang);
    if (ready) {
      setT(ready);
      setPending(false);
      return;
    }
    let cancelled = false;
    setPending(true);
    Promise.resolve(getDictionary(lang)).then((dictionary) => {
      if (cancelled) return;
      if (dictionary) setT(dictionary);
      setPending(false);
    });
    return () => { cancelled = true; };
  }, [lang, forced]);

  // Direction et langue du document, dès que le dictionnaire affiché suit la
  // langue demandée : pas de bascule RTL au milieu d'un chargement.
  const dir = languageMeta(lang).dir;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (pending) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir, pending]);

  const setLang = useCallback((code) => {
    if (!isSupportedLanguage(code)) return;
    setLangState(code);
    // Le choix explicite du visiteur prime, définitivement, sur la langue de
    // l'appareil — c'est le sens du switch.
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch {
      /* navigation privée : le choix vaut pour la session */
    }
  }, []);

  const value = useMemo(() => ({
    lang,
    dir,
    t,
    setLang,
    languages,
    pending,
  }), [lang, dir, t, setLang, pending]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

/**
 * Préchauffe tout de façon synchrone — réservé aux rendus hors navigateur.
 * L'appelant fournit le dictionnaire source complet (`translations.js`), ce qui
 * évite que le bundle navigateur ne tire les trois langues.
 */
export function primeServerLanguages(translations) {
  preloadAllDictionariesSync(translations);
  // Le français du navigateur est déjà fusionné (généré) ; en SSR on repart du
  // dictionnaire source, complété des replis anglais pour rester identique.
  preloadAllDictionariesSync({
    ...translations,
    [SITE_LANG]: withBaseFallback(translations[SITE_LANG], translations[BASE_LANG]),
  });
}
