// Accès React aux traductions d'articles.
//
// Deux besoins, deux hooks :
//   - `useLocalizedListings` — une grille de cartes : on charge les
//     métadonnées de liste de la langue (un petit module par langue), puis on
//     traduit titre + chapô de chaque carte ;
//   - `useLocalizedStory` — un article ouvert : on charge en plus le corps
//     complet de CET article, et seulement lui.
//
// Pendant le chargement, l'écran n'attend pas : les cartes/l'article restent
// affichés en français, puis basculent dans la langue demandée quand le fichier
// arrive. Un article jamais traduit reste en français, `translated: false` —
// l'appelant affiche alors la mention « Version française ».

import { useEffect, useMemo, useState } from 'react';
import { SITE_LANG } from '../../i18n/languages.js';
import { useLanguage } from '../../i18n/LanguageContext';
import { localizeListing, localizeStory } from './index.js';
import { loadArticleBody, loadArticleListings } from './load.js';

// Une seule promesse de métadonnées par langue, partagée par tous les écrans :
// deux grilles montées en même temps ne téléchargent qu'un fichier.
const listingsReady = new Map();
function ensureListings(lang) {
  if (!listingsReady.has(lang)) listingsReady.set(lang, loadArticleListings(lang));
  return listingsReady.get(lang);
}

/** Vrai quand les métadonnées de liste de cette langue sont chargées. */
export function useArticleListingsReady(lang) {
  const active = lang || SITE_LANG;
  const [ready, setReady] = useState(active === SITE_LANG);
  useEffect(() => {
    if (active === SITE_LANG) {
      setReady(true);
      return undefined;
    }
    let cancelled = false;
    setReady(false);
    ensureListings(active).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [active]);
  return ready;
}

/**
 * Liste de cartes traduites. `listings` peut être recréé à chaque rendu sans
 * casser l'identité : le calcul est mémorisé sur la langue et sur le contenu.
 */
export function useLocalizedListings(listings, lang) {
  const ready = useArticleListingsReady(lang);
  const active = lang || SITE_LANG;
  return useMemo(
    () => (Array.isArray(listings) ? listings.map((listing) => localizeListing(listing, active)) : []),
    // `ready` force le recalcul quand le module de langue vient d'arriver.
    [listings, active, ready],
  );
}

/**
 * Article complet traduit. Renvoie `{ story, translated, loading }`.
 *
 * `loading` ne vaut `true` que si une traduction est peut-être en route et
 * qu'aucune n'est encore affichable : la vue peut alors garder le titre
 * français plutôt que de clignoter.
 */
export function useLocalizedStory(story, lang) {
  const { lang: contextLang } = useLanguage();
  const active = lang || contextLang || SITE_LANG;
  const key = story?.to || story?.__key || (story?.slug ? `/news/${story.slug}` : '');
  const [loadedKey, setLoadedKey] = useState(null);

  useEffect(() => {
    if (!story || !key || active === SITE_LANG) return undefined;
    let cancelled = false;

    // Le corps d'abord, les métadonnées ensuite : c'est le corps qui porte le
    // contenu long, autant le demander tout de suite.
    Promise.all([loadArticleBody(key, active), ensureListings(active)]).then(() => {
      if (!cancelled) setLoadedKey(`${active}:${key}`);
    });

    return () => { cancelled = true; };
  }, [active, key, story]);

  const ready = active === SITE_LANG || loadedKey === `${active}:${key}`;

  return useMemo(() => {
    const localized = localizeStory(story, active);
    return {
      story: localized,
      translated: Boolean(localized?.translated),
      loading: !ready && active !== SITE_LANG,
    };
  }, [story, active, ready]);
}
