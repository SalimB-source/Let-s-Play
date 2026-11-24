/**
 * DIAPORAMA DU HÉROS — ACCUEIL
 * --------------------------------------------------------------------------
 * Le héros de l'accueil fait défiler quatre visuels fournis par le propriétaire
 * du site, en fondu enchaîné automatique toutes les 2,5 secondes :
 *
 *   1. Phantom Blade Zero — key art officiel déjà en place (reste le premier) ;
 *   2. The Blood of Dawnwalker — key art fourni, emblème et titre retirés de
 *      l'image à la demande du propriétaire (le site affiche son propre titre
 *      dans le héros : le logotype du jeu doublonnait) ;
 *   3. The Legend of Zelda — key art fourni (Link et la fée dans la forêt) ;
 *   4. Cyberpunk — visuel fourni, titre d'origine retiré de l'image.
 *
 * Les fichiers sources d'origine (`launch-art-fhd.jpg`, `1414762.png`) ne sont
 * pas versionnés : `public/*-hero*.jpg` contient les recadrages 16:9 (bureau)
 * et portrait (téléphone) prêts à servir.
 *
 * Cadrages :
 * - Dawnwalker : sur bureau, le personnage est à droite → le voile de gauche
 *   garde le titre lisible ; en portrait, le recadrage est centré sur le
 *   cavalier et son cercle de lumière.
 * - Zelda : visuel très clair et lumineux → voir `.hero-picture--light` dans
 *   `src/styles.css`, qui renforce le voile côté titre. **Image inversée
 *   horizontalement** (« flop ») à la demande du propriétaire : Link regarde
 *   désormais vers la gauche, ce qui équilibre la forêt à droite et libère la
 *   zone du titre.
 *
 * ⚠️ Let's Play n'est affilié à aucun de ces éditeurs. Visuels promotionnels
 * fournis par le propriétaire du site : ne pas les remplacer sans son accord.
 */

/* `import.meta.env` n'existe pas sous Node : le repli sur « / » permet de
   tester la liste des visuels (voir tests/home-hero-carousel.test.js) sans
   charger Vite. */
const baseUrl = import.meta.env?.BASE_URL || '/';
const asset = (name) => `${baseUrl}${name}`;

/** Visuel affiché en dernier recours si un fichier manquait. */
export const heroFallbackImage = asset('phantom-blade-zero-hero.jpg');

/** Délai entre deux visuels : 2,5 secondes. */
export const HERO_SLIDE_MS = 2500;

/**
 * Visuels du diaporama, dans l'ordre d'apparition.
 * `portrait` : variante téléphone (voir le `<source media="(max-width:800px)">`).
 */
export const heroSlides = [
  {
    id: 'phantom-blade-zero',
    label: 'Phantom Blade Zero',
    image: asset('phantom-blade-zero-hero.jpg'),
    portrait: asset('phantom-blade-zero-hero-portrait.jpg'),
    // Key art déjà sombre : le voile standard suffit.
    light: false,
  },
  {
    id: 'dawnwalker',
    label: 'The Blood of Dawnwalker',
    image: asset('dawnwalker-hero.jpg'),
    portrait: asset('dawnwalker-hero-portrait.jpg'),
    // Rouge sombre à gauche : voile standard.
    light: false,
  },
  {
    id: 'zelda',
    label: 'The Legend of Zelda',
    image: asset('zelda-totk-hero.jpg'),
    portrait: asset('zelda-totk-hero-portrait.jpg'),
    // Forêt très lumineuse : voile renforcé sous le titre. Visuel inversé
    // horizontalement (Link tourné vers la gauche).
    light: true,
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    image: asset('cyberpunk-hero.jpg'),
    portrait: asset('cyberpunk-hero-portrait.jpg'),
    // Visuel cyberpunk fourni : le titre d'origine a été retiré de l'image
    // (le héros affiche son propre titre). Scène sombre : voile standard.
    light: false,
  },
];
