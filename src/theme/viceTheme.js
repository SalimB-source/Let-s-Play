/**
 * VISUEL DU HÉROS — PHANTOM BLADE ZERO
 * --------------------------------------------------------------------------
 * Le héros de l'accueil affiche la clé d'art officielle de *Phantom Blade
 * Zero*, le test maison publié le 29 octobre 2026 : Soul de dos, chapeau
 * d'ombrelle, sabre à la main, face aux deux guerriers spectraux.
 *
 * Historique : ce fichier portait jusque-là le visuel de *Grand Theft Auto VI*
 * (Jason et Lucia devant la voiture en feu) mis en place pour la sortie du
 * 19 novembre 2026. Il a été remplacé à la demande du propriétaire du site ;
 * les deux fichiers `public/gta6-jason-lucia-hero*.jpg` restent en place pour
 * pouvoir revenir en arrière, mais ne sont plus référencés.
 *
 * ⚠️ Let's Play n'est affilié ni à S-Game ni à l'éditeur du jeu. Le visuel est
 * le key art officiel du jeu, fourni par le propriétaire du site : ne pas le
 * remplacer sans son accord.
 *
 * Le voile (`.hero-shade`, voir `src/styles.css`) garde le titre lisible : cette
 * image est très sombre, le contraste du texte blanc est donc meilleur que sur
 * l'ancien visuel.
 */

/** Clé d'art desktop, 16:9 (2560 × 1440). */
export const heroImage = `${import.meta.env.BASE_URL}phantom-blade-zero-hero.jpg`;

/**
 * Même visuel recadré en PORTRAIT (900 × 990) pour le téléphone.
 *
 * L'original est un 16:9 : posé dans un héros presque vertical, `object-fit:
 * cover` ne garderait qu'une bande et couperait le guerrier et ses adversaires.
 * Le cadrage vertical garde le personnage central de dos et les deux créatures
 * spectrales dans le cadre.
 */
export const heroPortraitImage = `${import.meta.env.BASE_URL}phantom-blade-zero-hero-portrait.jpg`;

/** Ancien visuel GTA VI, conservé pour un retour arrière d'une ligne. */
export const viceHeroImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero.jpg`;
export const viceHeroPortraitImage = `${import.meta.env.BASE_URL}gta6-jason-lucia-hero-portrait.jpg`;

/** Visuel du héros d'origine — conservé pour revenir en arrière d'une ligne. */
export const defaultHeroImage = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;
