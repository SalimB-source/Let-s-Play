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
 * Take-Two. Les visuels sont fournis par le propriétaire du site (couple GTA 6
 * sur la voiture rouge, avant la station-service puis la vue nocturne de Vice
 * City) : ce ne sont pas des images générées, et il ne faut pas les remplacer
 * par une vue de jour produite pour un skin (essayé, puis retiré à sa demande).
 *
 * Pour tout retirer : repointer `Home.jsx` sur `defaultHeroImage`, supprimer ce
 * fichier et `public/gta6-jason-lucia-hero.jpg`.
 */

/**
 * Clé d'art du héros : Jason et Lucia assis sur la voiture rouge au coucher
 * de soleil (visuel fourni par le propriétaire du site, version « Lock and
 * Load » — palmiers, avion et sac de sport). C'est l'image de communication
 * de GTA 6, pas une capture de jeu.
 *
 * Le voile et la géométrie du héros sont ceux du site (voir `styles.css`,
 * `.hero-shade`) : un dégradé sombre à gauche qui porte le titre clair, sans
 * aucune teinte rose. C'est ce voile qui garantit le contraste sur un ciel
 * clair en haut à gauche — ne pas le retirer sans remesurer.
 */
export const viceHeroImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero.jpg`;

/**
 * Même image, recadrée en PORTRAIT (900×1414) pour le téléphone.
 *
 * L'original est un panoramique 2,1:1 : posé dans un héros presque vertical, il
 * ne garde qu'une bande de ciel et un bras. On ne pouvait pas rattraper ça au
 * `object-position` — aucun cadrage d'une image si large ne garde un couple
 * étalé sur toute la longueur. Ce cadrage vertical garde Lucia en entier, avec
 * la voiture et Jason en amorce à droite.
 *
 * Le basculement se fait en CSS (`@media` téléphone), pas en JavaScript : pas de
 * `matchMedia` à écouter, et l'image lourde reste hors du chemin critique sur
 * ordinateur.
 */
export const viceHeroPortraitImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero-portrait.jpg`;

/** Visuel du héros d'origine — conservé pour revenir en arrière d'une ligne. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;
