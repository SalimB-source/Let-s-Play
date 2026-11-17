/**
 * VISUEL DU HÉROS « GTA 6 / VICE CITY »
 * --------------------------------------------------------------------------
 * Seule trace restante de l'habillage temporaire de la sortie de *Grand Theft
 * Auto VI* (19 novembre 2026). Toute la peau — papiers roses, palmiers,
 * troisième thème `vice`, bandeau d'avertissement, compte à rebours — a été
 * retirée à la demande du propriétaire du site : le site a retrouvé son thème
 * normal, et le héros garde la clé d'art de Vice City.
 *
 * Ce qui reste ici est volontairement minuscule : un chemin d'image. Toute la
 * mécanique de thème vit dans `ThemeContext.jsx` et `src/theme.css`, inchangés
 * par ce retrait.
 *
 * ⚠️ Hommage NON OFFICIEL : Let's Play n'est affilié ni à Rockstar Games ni à
 * Take-Two. L'image est fournie par le propriétaire du site — ce n'est pas une
 * image générée, et il ne faut pas la remplacer par une vue de jour produite
 * pour un skin (essayé, puis retiré à sa demande).
 *
 * Pour tout retirer : repointer `Home.jsx` sur `defaultHeroImage`, supprimer ce
 * fichier et `public/vice-city-hero.jpg`.
 */

/**
 * Clé d'art du héros : la vue nocturne de Vice City fournie par le
 * propriétaire du site.
 *
 * Le voile et la géométrie du héros sont ceux du site (voir `styles.css`,
 * `.hero-shade`) : un dégradé sombre à gauche qui porte le titre clair, sans
 * aucune teinte rose. C'est le voile d'origine qui garantit le contraste sur
 * cette photo de nuit — ne pas le retirer sans remesurer.
 */
export const viceHeroImage = `${import.meta.env.BASE_URL}vice-city-hero.jpg`;

/** Visuel du héros d'origine — conservé pour revenir en arrière d'une ligne. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;
