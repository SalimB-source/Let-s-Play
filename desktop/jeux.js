/**
 * Les **jeux** que la maison coque — `desktop/jeux.js`
 * ---------------------------------------------------
 * Une seule coque Electron, deux (demain trois) applications : ce module dit
 * *quel* jeu une application sert, et ne contient ni Electron ni DOM, pour être
 * testé sans lancer l'application (`npm run check:desktop`).
 *
 * L'identité vient de l'**environnement**, posé par `scripts/desktop-bundle.mjs`
 * au moment d'assembler le projet d'empaquetage :
 *
 *   LETSPLAY_JEU=sablier    → « Le Sablier de Bab El », dz.letsplay.sablier
 *   LETSPLAY_JEU=vice-city  → « Vice City Rush »,        dz.letsplay.vicecity
 *
 * Pourquoi une variable et pas deux copies de `desktop/` : tout le travail de
 * la coque (GPU, serveur local, mise à jour automatique, verrou de navigation,
 * diagnostic) est commun. Deux copies, c'est deux fois chaque correctif à
 * faire — et un jour un des deux qui marche mal. Ici, un jeu se décrit en
 * quelques lignes, et le reste est partagé.
 *
 * Ce que chaque jeu apporte :
 *   - `route`     : la page du site qu'ouvre la fenêtre ;
 *   - `titre`     : le titre de la fenêtre — le nom du jeu, pas celui du média ;
 *   - `appId`     : l'identifiant Windows (regroupement, notifications) ;
 *   - `prenom`    : le préfixe des fichiers d'installeur
 *                   (`le-sablier-de-bab-el-…`, `vice-city-rush-…`) ;
 *   - `release`   : le tag de la Release GitHub qui porte ses mises à jour.
 *                   **Un tag par jeu** : deux `latest.yml` sur la même Release
 *                   se disputeraient le numéro de version au lancement.
 *   - `icones`    : le dossier d'icônes du jeu, sous `desktop/`.
 */

/** Le genre de « Vice City Rush » — conduite libre dans une ville de 1986. */
export const JEUX = Object.freeze({
  sablier: Object.freeze({
    id: 'sablier',
    titre: 'Le Sablier de Bab El',
    appId: 'dz.letsplay.sablier',
    prenom: 'le-sablier-de-bab-el',
    route: '/jeu/sablier-de-bab-el',
    release: 'desktop',
    icones: 'app-icons',
    description: 'Version PC installable du Sablier de Bab El, le jeu de cartes de Let\'s Play : coque qui ouvre le site en ligne, rendu 3D WebGL accéléré par la carte graphique, installeur Windows signé par le dépôt.',
  }),
  'vice-city': Object.freeze({
    id: 'vice-city',
    titre: 'Vice City Rush',
    appId: 'dz.letsplay.vicecity',
    prenom: 'vice-city-rush',
    route: '/jeu/vice-city-rush',
    release: 'desktop-vice-city',
    icones: 'app-icons-vice-city',
    description: 'Version PC installable de Vice City Rush, la conduite libre de Let\'s Play : coque qui ouvre la ville de 1986, rendu accéléré par la carte graphique (WebGL, et essai WebGPU), installeur Windows signé par le dépôt.',
  }),
});

/** Le jeu servi par défaut quand `LETSPLAY_JEU` est absent : le premier venu. */
export const JEU_PAR_DEFAUT = 'sablier';

/**
 * Résout le jeu à servir.
 *
 * Une valeur inconnue **ne fait pas tomber l'application** : elle retombe sur
 * le jeu par défaut, avec un avertissement sur la sortie d'erreur. Un
 * installeur qui refuse de démarrer pour une faute de frappe dans une variable
 * d'environnement serait pire que le mauvais jeu ouvert.
 *
 * @param {object} [options]
 * @param {string} [options.env] variable `LETSPLAY_JEU` (déjà lue par l'appelant).
 * @returns {{jeu: object, avertissement: string|null}}
 */
export function resoudreJeu({ env = '' } = {}) {
  const demande = String(env || '').trim().toLowerCase();
  if (!demande) return { jeu: JEUX[JEU_PAR_DEFAUT], avertissement: null };
  if (JEUX[demande]) return { jeu: JEUX[demande], avertissement: null };
  return {
    jeu: JEUX[JEU_PAR_DEFAUT],
    avertissement: `LETSPLAY_JEU="${demande}" est inconnu (jeux : ${Object.keys(JEUX).join(', ')}) — « ${JEUX[JEU_PAR_DEFAUT].titre} » est ouvert.`,
  };
}
