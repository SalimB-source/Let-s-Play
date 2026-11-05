/**
 * Où la coque PC a le droit d'aller — `desktop/routes.js`
 * -------------------------------------------------------
 * Le jeu tient **sa propre fenêtre** : on n'en sort pas vers le site.
 *
 * Le site est une maison avec un hub, des articles, une messagerie — et le jeu
 * n'y est qu'une pièce. Dans un navigateur, un lien « Tous les jeux » y ramène,
 * c'est normal. Dans l'exe, la fenêtre s'appelle « Le Sablier de Bab El » : la
 * voir afficher le hub serait une trahison de ce que le joueur a lancé.
 *
 * Deux ceintures, plutôt qu'une :
 *
 *   1. **le verrou de navigation** (ce module) : toute navigation vers une
 *      autre page du site est refusée — le lien du hub, un retour arrière, une
 *      URL tapée après `Ctrl+L`. Seuls le jeu, la page « hors ligne » (locale)
 *      et l'origine du serveur local passent ;
 *   2. **le retrait du lien** côté site (`window.letsPlayDesktop`) : le logo et
 *      la croix « Tous les jeux » n'ont plus de sens dans la coque, donc ils
 *      sont masqués — comme la croix du Sablier (`desktopMode`, `RpgDuelPage`).
 *
 * Le verrou est le filet : même si un lien oublié subsiste, il ne peut pas
 * quitter le jeu.
 *
 * Ce module ne contient **ni Electron ni DOM** : il est testé par
 * `npm run check:desktop`, sans lancer l'application.
 */

/** Route du jeu dans l'app (identique au site, `src/main.jsx`). */
export const ROUTE_JEU = '/jeu/sablier-de-bab-el';

/**
 * Vrai si l'URL est **celle du jeu**, et elle seule.
 *
 * @param {string} url            URL visée par une navigation.
 * @param {object} [options]
 * @param {string} [options.route]        route du jeu (`/jeu/sablier-de-bab-el`).
 * @param {string} [options.origineSite]  origine du site en ligne.
 * @param {string} [options.origineLocale] origine du serveur local (pack hors
 *   ligne), vide en mode en ligne — quand elle est connue, elle est acceptée
 *   en entier : c'est notre propre serveur, qui ne sert que le jeu.
 * @returns {boolean}
 */
export function estRouteDuJeu(url, { route = ROUTE_JEU, origineSite = '', origineLocale = '' } = {}) {
  let cible;
  try {
    cible = new URL(url);
  } catch {
    return false; // `about:blank`, chaîne vide, bricolage : on refuse.
  }

  // La page « hors ligne » est une page locale : elle ne mène nulle part.
  if (cible.protocol === 'file:') return true;

  if (origineLocale) {
    try {
      if (cible.origin === new URL(origineLocale).origin) return true;
    } catch {
      // origine locale illisible : on l'ignore, le reste décide.
    }
  }

  let site;
  try {
    site = new URL(origineSite).origin;
  } catch {
    return false; // sans origine de site connue, on ne laisse rien passer « par défaut ».
  }
  if (cible.origin !== site) return false;

  // Le jeu lui-même : avec ou sans barre finale, avec ou sans requête ni hachage.
  const chemin = cible.pathname.replace(/\/+$/, '');
  return chemin === String(route).replace(/\/+$/, '');
}
