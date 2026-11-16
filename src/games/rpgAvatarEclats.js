/** Les « mille morceaux » de l'avatar — géométrie pure, sans DOM ni image.
 *
 * Le disque doré est découpé en une grille de 36 × 36 cases. On ne garde que
 * les cases dont le centre tombe DANS le cercle : environ un millier d'éclats
 * (π/4 × 1296), et aucun morceau ne vient d'un coin qui n'existait pas.
 * Chaque éclat reçoit sa tranche du portrait (`--col` / `--ligne` pilotent
 * `background-position` dans la feuille) et sa propre trajectoire : angle,
 * portée, rotation, retard et durée. Le tout est DÉTERMINISTE (hachage entier
 * sur les coordonnées), donc identique au rendu serveur, au rendu client et
 * dans les tests — aucun tirage aléatoire ne fait danser l'avatar à chaque
 * re-render. Aucun PNG, aucun fichier image nouveau : l'éclat est un fond CSS
 * opaque (`#d7ad61`) recouvert d'une tranche du WebP déjà livré.
 */

/** Côté de la grille : 36 × 36 = 1296 cases, ~1016 dans le disque. */
export const GRILLE_ECLATS = 36;

/** Un nombre pseudo-aléatoire stable dans [0, 1[ pour une case et un grain. */
function hasard(col, ligne, grain) {
  let h = Math.imul(col + 1, 0x9e3779b1)
    ^ Math.imul(ligne + 1, 0x85ebca6b)
    ^ Math.imul(grain + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Construit la liste des éclats. Exportée pour les tests et le composant. */
export function creerEclatsAvatar() {
  const eclats = [];
  for (let ligne = 0; ligne < GRILLE_ECLATS; ligne += 1) {
    for (let col = 0; col < GRILLE_ECLATS; col += 1) {
      const nx = ((col + 0.5) / GRILLE_ECLATS) * 2 - 1;
      const ny = ((ligne + 0.5) / GRILLE_ECLATS) * 2 - 1;
      const distance = Math.hypot(nx, ny);
      // Le médaillon est un cercle : les cases des coins n'ont rien à briser.
      if (distance > 1) continue;

      const a = hasard(col, ligne, 1);
      const b = hasard(col, ligne, 2);
      const c = hasard(col, ligne, 3);
      const d = hasard(col, ligne, 4);

      // Explosion radiale : l'angle suit la position dans le disque, avec une
      // dispersion pour que le centre ne parte pas tout d'un bloc. La portée
      // est exprimée en `cqw` (100 cqw = le diamètre du disque), donc l'effet
      // garde la même allure du petit écran au grand.
      const angle = Math.atan2(ny, nx) + (a - 0.5) * 0.9;
      const portee = 48 + 105 * b + (1 - distance) * 52;
      const x = Math.cos(angle) * portee + (c - 0.5) * 18;
      const y = Math.sin(angle) * portee * 0.82 - 16 + d * 74;

      eclats.push({
        id: ligne * GRILLE_ECLATS + col,
        forme: (col + ligne) % 4,
        style: {
          '--col': col,
          '--ligne': ligne,
          '--x': `${x.toFixed(1)}cqw`,
          '--y': `${y.toFixed(1)}cqw`,
          '--r': `${((d - 0.5) * 1080).toFixed(0)}deg`,
          '--d': `${(distance * 145 + c * 85).toFixed(0)}ms`,
          '--duree': `${(1080 + b * 520).toFixed(0)}ms`,
          '--teinte': (0.82 + a * 0.4).toFixed(2),
        },
      });
    }
  }
  return eclats;
}

/** Calculée une seule fois au chargement du module : ~1 000 éclats, pas un
 *  recalcul à chaque rendu React de la fin de duel. */
export const ECLATS_AVATAR = Object.freeze(creerEclatsAvatar());

/** Le nombre exact de morceaux, pour les tests et les libellés. */
export const NOMBRE_ECLATS = ECLATS_AVATAR.length;
