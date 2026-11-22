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
 * Take-Two. Le visuel est fourni par le propriétaire du site (Jason et Lucia
 * marchant dans le champ devant la voiture en feu, silos en arrière-plan) :
 * il ne faut pas le remplacer sans son accord.
 *
 * Pour tout retirer : repointer `Home.jsx` sur `defaultHeroImage`, supprimer ce
 * fichier et `public/gta6-jason-lucia-hero.jpg`.
 */

/**
 * Clé d'art du héros : Jason et Lucia avancent dans un champ de blé devant une
 * voiture en feu, silos et fumée en arrière-plan (visuel fourni par le
 * propriétaire du site). C'est une image 16:9.
 *
 * Le voile et la géométrie du héros sont ceux du site (voir `styles.css`,
 * `.hero-shade`) : un dégradé sombre à gauche qui porte le titre clair, sans
 * aucune teinte rose. C'est ce voile qui garantit le contraste sur les zones
 * claires du ciel — ne pas le retirer sans remesurer.
 */
export const viceHeroImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero.jpg`;

/**
 * Même image, recadrée en PORTRAIT (900×990) pour le téléphone.
 *
 * L'original est un 16:10 (1280×720) : posé dans un héros presque vertical,
 * `object-fit: cover` ne garderait qu'une fine bande et couperait les deux
 * personnages. Ce cadrage vertical recentre sur Jason et Lucia (depuis la
 * crosse du fusil jusqu'à Jason), avec un morceau de la voiture en feu à
 * gauche — les deux restent lisibles sur un écran de téléphone.
 *
 * Le basculement se fait en CSS (`@media` téléphone), pas en JavaScript : pas de
 * `matchMedia` à écouter, et l'image lourde reste hors du chemin critique sur
 * ordinateur.
 */
export const viceHeroPortraitImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero-portrait.jpg`;

/** Visuel du héros d'origine — conservé pour revenir en arrière d'une ligne. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;
