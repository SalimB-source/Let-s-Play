/**
 * `miragePixelBudget` — la résolution de rendu de la piste 3D.
 *
 * Le jeu dessine à `min(devicePixelRatio, MAX_PIXEL_RATIO)` : la définition d'un
 * écran Retina n'apporte rien de plus à une scène de cubes. Dans la page, la
 * vue mesure au plus ~980 × 700 px CSS, soit ~1,6 million de pixels rendus — une
 * charge que tout appareil porte.
 *
 * En **plein écran**, la même scène s'étale sur tout l'écran : 1920 × 1080 fait
 * déjà 2,1 millions de pixels, un portable Retina environ 3 millions, un écran 4K
 * jusqu'à 8 millions. Les processeurs graphiques intégrés décrochent bien avant
 * (le coût d'une image suit le nombre de pixels), et le jeu devient saccadé juste
 * parce qu'on l'a agrandi. D'où un **budget de pixels** : au-delà, le ratio
 * baisse pour que l'image garde `MAX_RENDER_PIXELS` pixels, le navigateur
 * étirant le résultat. La netteté d'un cube se joue à peine, la fluidité se
 * ressent tout de suite.
 *
 * Le budget laisse passer le 1080p plein écran à sa définition native et ne
 * touche ni la vue de la page, ni le téléphone.
 */

/** Plafond de la densité de pixels (écrans Retina et téléphones). */
export const MAX_PIXEL_RATIO = 1.55;
/** Pixels rendus au maximum par image : un peu plus qu'un écran 1920 × 1080 (2 073 600). */
export const MAX_RENDER_PIXELS = 2_200_000;

/**
 * Ratio de rendu pour une vue de `width` × `height` pixels CSS sur un écran de
 * densité `devicePixelRatio`. Ne dépasse jamais `MAX_PIXEL_RATIO`, ni le ratio
 * qui garde l'image sous `MAX_RENDER_PIXELS`. Vue nulle ou valeurs absurdes :
 * on retombe sur le plafond de densité (jamais `NaN`, jamais 0).
 */
export function renderPixelRatio(width, height, devicePixelRatio = 1) {
  const density = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const ratio = Math.min(density, MAX_PIXEL_RATIO);
  const area = Number(width) * Number(height);
  if (!Number.isFinite(area) || area <= 0) return ratio;
  return Math.min(ratio, Math.sqrt(MAX_RENDER_PIXELS / area));
}
