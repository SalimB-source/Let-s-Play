/**
 * VISUEL DU HÉROS « GTA 6 / VICE CITY »
 * --------------------------------------------------------------------------
 * Seule trace restante de l'habillage temporaire de la sortie de *Grand Theft
 * Auto VI* (19 novembre 2026). Toute la peau — papiers roses, palmiers,
 * troisième thème `vice`, bandeau d'avertissement, compte à rebours — a été
 * retirée à la demande du propriétaire du site : le site a retrouvé son thème
 * normal, et le héros garde la clé d'art de GTA 6.
 *
 * Ce qui reste ici est volontairement minuscule : un chemin d'image. Toute la
 * mécanique de thème vit dans `ThemeContext.jsx` et `src/theme.css`, inchangés
 * par ce retrait.
 *
 * ⚠️ Hommage NON OFFICIEL : Let's Play n'est affilié ni à Rockstar Games ni à
 * Take-Two. Les visuels sont fournis par le propriétaire du site (Jason et Lucia
 * devant la station-service, avant eux la vue nocturne de Vice City) : ce ne
 * sont pas des images générées, et il ne faut pas les remplacer par une vue de
 * jour produite pour un skin (essayé, puis retiré à sa demande).
 *
 * Pour tout retirer : repointer `Home.jsx` sur `defaultHeroImage`, supprimer ce
 * fichier et `public/gta6-jason-lucia-hero.jpg`.
 */

/**
 * Clé d'art du héros : Jason et Lucia devant la station-service, au crépuscule
 * (visuel fourni par le propriétaire du site). C'est l'image de communication
 * de GTA 6, pas une capture de jeu.
 *
 * Le voile et la géométrie du héros sont ceux du site (voir `styles.css`,
 * `.hero-shade`) : un dégradé sombre à gauche qui porte le titre clair, sans
 * aucune teinte rose. C'est ce voile qui garantit le contraste sur un ciel
 * clair en haut à gauche — ne pas le retirer sans remesurer.
 */
export const viceHeroImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero.jpg`;

/** Visuel du héros d'origine — conservé pour revenir en arrière d'une ligne. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;
