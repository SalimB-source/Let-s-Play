/**
 * videoThumbnails
 * ---------------
 * Les miniatures YouTube du site, et leur repli quand YouTube n'en publie pas.
 *
 * Le problème
 * -----------
 * YouTube ne génère pas toutes les qualités pour toutes les vidéos :
 *
 *   - `maxresdefault.jpg` (1280×720) n'existe que si la vidéo a été traitée en
 *     HD — sinon l'URL répond **404** ;
 *   - `sddefault.jpg` (640×480) manque sur les uploads basse résolution ;
 *   - `hqdefault.jpg` (480×360) est la seule qualité publiée systématiquement.
 *
 * C'est exactement le cas du FreeFire Algerian Championship 2023
 * (`twbaM8fiXpo`, épisode partenaire Ooredoo de l'accueil) : sa carte demandait
 * `maxresdefault.jpg`, que YouTube ne publie pas pour cette vidéo — d'où une
 * carte sans miniature. Les mesures (15/09/2026) :
 *
 *   https://i.ytimg.com/vi/twbaM8fiXpo/maxresdefault.jpg → 404
 *   https://i.ytimg.com/vi/twbaM8fiXpo/hqdefault.jpg    → 200, JPEG 480×360
 *
 * La règle du site
 * ----------------
 * 1. on demande la meilleure qualité disponible, puis on **descend l'échelle**
 *    (maxres → sd → hq) au lieu de s'arrêter au premier échec ;
 * 2. une vidéo connue sans miniature HD est listée dans
 *    `VIDEOS_WITHOUT_HD_THUMB` : sa chaîne commence directement à `hqdefault`,
 *    on n'envoie donc aucune requête vouée au 404 ;
 * 3. si toute la chaîne échoue, l'afficheur (`src/components/VideoThumb.jsx`)
 *    dessine un cadre Let's Play — jamais un carré vide ou gris ;
 * 4. une carte peut avoir sa **propre illustration** (`lead`) : les miniatures
 *    maison des quizz (`public/quizzes/<slug>.jpg`) passent avant l'échelle
 *    YouTube, dont l'épisode lié ne devient alors qu'un repli.
 *
 * Le repli ne repose pas seulement sur `onError` : un 404 servi depuis le cache
 * du navigateur peut se régler avant que React n'attache l'écouteur, et
 * l'événement est alors perdu. `isThumbMissing()` relit l'état réel de l'image
 * (`complete && naturalWidth === 0`), ce qui couvre ce cas.
 */

const YT_IMG_ORIGIN = 'https://i.ytimg.com';

/** Échelle des qualités, de la meilleure à la plus sûre. */
export const THUMB_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'];

/** Qualité publiée par YouTube pour toute vidéo visible : dernier barreau. */
export const THUMB_BASELINE = 'hqdefault';

const QUALITY_ALIASES = {
  maxres: 'maxresdefault',
  hd: 'maxresdefault',
  sd: 'sddefault',
  hq: 'hqdefault',
};

/**
 * Vidéos dont YouTube ne publie aucune miniature HD (`maxresdefault` → 404).
 *
 * La clé est l'identifiant YouTube, la valeur la trace qui le justifie. Ajouter
 * une entrée ici suffit à corriger toutes les cartes qui utilisent la vidéo :
 * `thumbFallbackChain()` saute alors les qualités absentes.
 */
export const VIDEOS_WITHOUT_HD_THUMB = {
  twbaM8fiXpo:
    'FreeFire Algerian Championship 2023 (FFAC2023) — maxresdefault 404, hqdefault 200 (480×360), vérifié le 15/09/2026',
};

/** Qualité demandée → nom de fichier YouTube, ou null si inconnue. */
export function normalizeThumbQuality(quality) {
  if (!quality) return null;
  const resolved = QUALITY_ALIASES[quality] || quality;
  return THUMB_QUALITIES.includes(resolved) ? resolved : null;
}

/**
 * URL d'une miniature YouTube.
 *
 * @param {string} id identifiant de la vidéo YouTube
 * @param {string} [quality] `maxresdefault` par défaut (alias : maxres/hd, sd, hq)
 * @returns {string}
 */
export function youTubeThumbUrl(id, quality = THUMB_QUALITIES[0]) {
  const resolved = normalizeThumbQuality(quality) || THUMB_QUALITIES[0];
  return `${YT_IMG_ORIGIN}/vi/${id}/${resolved}.jpg`;
}

/**
 * Chaîne de repli d'une miniature : les URL à essayer, dans l'ordre.
 *
 * Elle part de la qualité demandée (`quality`) et descend jusqu'à `hqdefault`.
 * Sans qualité demandée, elle part de `maxresdefault`, sauf pour les vidéos de
 * `VIDEOS_WITHOUT_HD_THUMB`, où elle commence à `hqdefault` — inutile
 * d'attendre un 404 que l'on connaît déjà.
 *
 * @param {string} id identifiant de la vidéo YouTube
 * @param {{quality?: string}} [options]
 * @returns {string[]} au moins une URL, la dernière étant toujours `hqdefault`
 */
export function thumbFallbackChain(id, { quality } = {}) {
  const start =
    normalizeThumbQuality(quality) ||
    (id in VIDEOS_WITHOUT_HD_THUMB ? THUMB_BASELINE : THUMB_QUALITIES[0]);
  const from = Math.max(THUMB_QUALITIES.indexOf(start), 0);
  return THUMB_QUALITIES.slice(from).map((name) => youTubeThumbUrl(id, name));
}

/**
 * L'image est-elle chargée mais vide ? C'est la signature d'une miniature
 * absente quand l'événement `error` n'a pas pu être observé (404 en cache,
 * réponse réglée avant l'attache de l'écouteur).
 *
 * @param {{complete?: boolean, naturalWidth?: number}|null} img
 * @returns {boolean}
 */
export function isThumbMissing(img) {
  return Boolean(img) && img.complete === true && img.naturalWidth === 0;
}

/**
 * Pilote de repli d'une vignette. Garde la position dans la chaîne et signale
 * chaque changement à l'afficheur (`onChange`) — la logique vit ici, hors
 * React, pour pouvoir être rejouée par `npm run check:thumbs`.
 *
 * `lead` place une ou plusieurs sources **avant** l'échelle YouTube : c'est le
 * cas des miniatures maison — l'illustration locale d'un quizz
 * (`public/quizzes/<slug>.jpg`) est essayée d'abord, l'épisode lié ne servant
 * que de repli. Le reste de la mécanique ne change pas : la source en cours
 * échoue, on descend d'un cran, et le cadre Let's Play n'arrive qu'après le
 * dernier barreau de la chaîne.
 *
 * @param {string} id identifiant de la vidéo YouTube
 * @param {{quality?: string, lead?: string|string[], onChange?: (state: {id: string, src: string|null, failed: boolean, index: number}) => void}} [options]
 */
export function createThumbFallback(id, { quality, lead, onChange } = {}) {
  const localSources = (Array.isArray(lead) ? lead : [lead]).filter(Boolean);
  const chain = [...localSources, ...thumbFallbackChain(id, { quality })];
  let index = 0;
  let failed = false;

  const publish = () =>
    onChange?.({ id, src: failed ? null : chain[index], failed, index });

  return {
    id,
    quality: quality ?? null,
    /** Sources locales essayées avant l'échelle YouTube (vide s'il n'y en a pas). */
    lead: localSources,
    /** Toutes les URL candidates, dans l'ordre d'essai. */
    chain,
    /** URL en cours, ou null une fois la chaîne épuisée. */
    get src() {
      return failed ? null : chain[index];
    },
    get index() {
      return index;
    },
    /** true quand aucune qualité n'a répondu : l'afficheur dessine son cadre. */
    get failed() {
      return failed;
    },
    /**
     * La source en cours n'a rien affiché : on passe à la suivante, ou on
     * déclare l'échec si c'était la dernière.
     */
    reportMissing() {
      if (failed) return;
      if (index + 1 < chain.length) {
        index += 1;
      } else {
        failed = true;
      }
      publish();
    },
  };
}
