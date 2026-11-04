// ════════════════════════════════════════════════════════════════════
// Niveaux de détail (LOD) d'un véhicule de trafic.
//
// Une berline de `makeTrafficVehicle` est un **groupe de 10 à 16 maillages** :
// caisse fusionnée, glaces, roues, feux, gyrophares, décalcomanies, pare-buffles.
// Sur une image de Vice City Rush, le trafic peut peser une trentaine de
// véhicules visibles — soit trois cents à cinq cents appels de dessin par image
// pour des voitures qui, à deux cents mètres, ne font plus que vingt pixels.
//
// Ce module donne à chaque véhicule **trois niveaux**, et la même règle de
// choix que la course applique dans sa boucle :
//
//   - `near`   : tout, roues qui tournent et gyrophares qui clignotent. C'est
//                le véhicule que l'on voit, évite, percute et photographie ;
//   - `mid`    : la caisse et ses feux, les gyrophares. Les vitres, les
//                décalcomanies et les roues tombent : à plus de 70 m une roue
//                fait trois pixels, et une vitre transparente coûte un appel de
//                dessin **et** un tri de transparence. Le maillage fusionné
//                passe de quatorze appels à huit ;
//   - `far`    : la **silhouette** (`traffic-lod-proxy`), une boîte de
//                Lambert peint de la couleur de la caisse, plus les
//                gyrophares. Une boîte au lieu de six matériaux : à 150 m dans
//                la brume, on ne distingue plus que la masse et les feux.
//                C'est deux à trois appels de dessin par véhicule au lieu de
//                quatorze.
//
// **Ce qui se joue ne change pas.** La collision, la voie, la distance et la
// vitesse sont calculées sur les données du véhicule, jamais sur son maillage :
// un niveau ne touche que ce qui est dessiné. Et le niveau n'est choisi que sur
// les voitures **visibles** : une voiture hors champ garde son `visible = false`
// et ne coûte rien du tout.
//
// Ce fichier ne connaît ni React ni le DOM, et pas davantage three.js : il
// manipule les `userData` publiés par `makeTrafficVehicle`. Les règles pures
// (`cityRushLodLevel`, `cityRushTrafficLod`) sont vérifiées par
// `tests/city-rush-lod.test.js` ; les seuils sont réglés une fois pour toutes
// ici, pas dispersés dans la boucle de la course.
// ════════════════════════════════════════════════════════════════════

export const CITY_RUSH_LOD_NEAR = 'near';
export const CITY_RUSH_LOD_MID = 'mid';
export const CITY_RUSH_LOD_FAR = 'far';
export const CITY_RUSH_LOD_LEVELS = Object.freeze([
  CITY_RUSH_LOD_NEAR,
  CITY_RUSH_LOD_MID,
  CITY_RUSH_LOD_FAR,
]);

/**
 * Seuils, en mètres **devant le joueur** (le trafic est trié sur sa distance de
 * piste ; la caméra est à quelques mètres derrière la voiture, l'écart est
 * négligeable à cette échelle).
 *
 * `near` : 70 m — c'est la portée à laquelle une berline fait encore plus de
 * 40 px de haut sur un téléphone couché ; ses roues et ses gyrophares se lisent.
 * `mid`  : 150 m — au-delà, les détails ne font plus que quelques pixels, et la
 * brume a déjà commencé (les `fogNear` des parcours vont de 40 à 160 m).
 */
export const CITY_RUSH_LOD_NEAR_DISTANCE = 70; // m
export const CITY_RUSH_LOD_MID_DISTANCE = 150; // m
/**
 * Au-delà de la brume **et** de cette marge, une voiture qui arrive (donc que
 * l'on voit de face) passe en `far` : elle n'est plus qu'une silhouette et deux
 * feux. 30 m de marge : à la limite du brouillard, la caisse se distingue
 * encore, et une voiture de face se remarque plus tôt qu'une voiture de dos.
 */
export const CITY_RUSH_LOD_FOG_MARGIN = 30; // m

/**
 * Le niveau d'un véhicule, à partir de sa distance signée au joueur (m, positif
 * devant) et de la distance de brume du parcours. Deux règles qui comptent :
 *
 *   - une voiture **derrière** le joueur (distance négative) est en `near` : la
 *     caméra la voit de dos pendant qu'elle double, et à la limite arrière du
 *     streaming (quelques dizaines de mètres) c'est encore gros à l'écran ;
 *   - `fogFar` ne peut que **rapprocher** le passage en `far` (jamais
 *     l'éloigner) : sur la Nordschleife (480 m de brume) il tombe à 150 m,
 *     sur les Abysses (200 m) à 200 m — dans les deux cas c'est la brume qui,
 *     la première, a déjà mangé la voiture.
 */
export function cityRushLodLevel(gap, fogFar = Infinity) {
  // `Number(null)` vaut 0 : un véhicule qui n'a pas encore de distance ne doit
  // pas être pris pour une voiture collée au joueur.
  if (gap === null || gap === undefined) return CITY_RUSH_LOD_FAR;
  const distance = Number(gap);
  if (!Number.isFinite(distance)) return CITY_RUSH_LOD_FAR;
  if (distance <= 0) return CITY_RUSH_LOD_NEAR;
  if (distance < CITY_RUSH_LOD_NEAR_DISTANCE) return CITY_RUSH_LOD_NEAR;
  const fog = Number.isFinite(fogFar) ? fogFar : Infinity;
  if (distance < Math.min(CITY_RUSH_LOD_MID_DISTANCE, fog)) return CITY_RUSH_LOD_MID;
  return CITY_RUSH_LOD_FAR;
}

/**
 * Le niveau d'un véhicule dans la course. Une voiture vue de face
 * (`approaching` : le contresens) ne passe jamais en `far` avant la brume +
 * marge : c'est elle qu'on doit repérer de loin pour l'éviter, et sa caisse est
 * la seule chose qui la distingue d'un point de lumière. Une voiture de dos,
 * elle, tombe en `far` dès 150 m.
 */
export function cityRushTrafficLod({ gap, fogFar = Infinity, approaching = false } = {}) {
  const level = cityRushLodLevel(gap, approaching ? Infinity : fogFar);
  if (level !== CITY_RUSH_LOD_FAR) return level;
  const distance = Number(gap);
  if (approaching && Number.isFinite(fogFar) && distance < fogFar + CITY_RUSH_LOD_FOG_MARGIN) {
    return CITY_RUSH_LOD_MID;
  }
  return CITY_RUSH_LOD_FAR;
}

/**
 * Quand chaque famille de maillage disparaît (`userData.lodDrop`), et ce qui
 * ne disparaît jamais :
 *
 *   - `glass` (le maillage fusionné des vitres) et `ghost` (décalcomanies :
 *     logo du taxi, bandeau d'ambulance, plaque « POLICE ») : **mid**. Des
 *     plans transparents, un appel de dessin et un tri chacun, pour des
 *     motifs illisibles au-delà de 70 m ;
 *   - `wheels` : **mid**. Quatre à huit appels de dessin (chaque roue a sa
 *     jante et son pneu) pour des cercles de trois pixels ;
 *   - les gyrophares : **jamais**. C'est ce qui signale la police de loin, et
 *     ce que le joueur surveille du coin de l'œil ;
 *   - la caisse : **jamais**, mais remplacée par la silhouette au niveau `far`.
 */
export const CITY_RUSH_LOD_DROP_MID = Object.freeze(['glass', 'ghost', 'wheels']);

/**
 * Applique un niveau au véhicule. Le groupe porte tout ce qu'il faut dans son
 * `userData` (voir `makeTrafficVehicle`) :
 *
 *   - `lodBody` : la caisse fusionnée (un maillage par matériau) ;
 *   - `lodProxy` : la silhouette d'une seule boîte, peinte de la couleur de la
 *     caisse — le niveau `far` ;
 *   - `lodDetail` : roues et gyrophares, posés à part ;
 *   - `beacons` : les gyrophares, qui clignotent à tous les niveaux.
 *
 * Idempotent : rappeler le même niveau ne touche rien (la course appelle cette
 * fonction à chaque image, pour chaque véhicule).
 */
export function applyCityRushVehicleLod(mesh, level = CITY_RUSH_LOD_NEAR) {
  const data = mesh?.userData;
  if (!data || data.kind !== 'traffic') return level;
  const next = CITY_RUSH_LOD_LEVELS.includes(level) ? level : CITY_RUSH_LOD_NEAR;
  // Idempotence : un niveau déjà posé n'est pas reposé, c'est ce qui permet
  // d'appeler cette fonction à chaque image sans coût mesurable. `lodDirty`
  // fait exception : le `reset` de la course rallume les pièces à la main (pour
  // l'intro) sans passer par ici, et laisse `lodLevel` à `near` ; le drapeau
  // force alors une remise à plat du gabarit à la première image.
  if (data.lodLevel === next && !data.lodDirty) return next;
  data.lodLevel = next;
  data.lodDirty = false;

  const body = data.lodBody;
  const proxy = data.lodProxy;
  const detail = data.lodDetail || [];
  const bodyParts = body?.children || [];

  // 1. Les pièces posées à part : roues (`lodDrop: 'mid'`) et gyrophares (sans
  //    étiquette, donc jamais retirés).
  for (const object of detail) {
    const drop = object.userData.lodDrop;
    if (drop === CITY_RUSH_LOD_MID) object.visible = next === CITY_RUSH_LOD_NEAR;
    else if (drop === CITY_RUSH_LOD_FAR) object.visible = next !== CITY_RUSH_LOD_FAR;
    else object.visible = true;
  }
  // 2. Ce qui pend sous la caisse : vitres et décalcomanies (`mid`), le reste
  //    jusqu'au niveau lointain. La caisse elle-même cède la place à la
  //    silhouette en `far`.
  if (body) body.visible = next !== CITY_RUSH_LOD_FAR;
  for (const object of bodyParts) {
    if (next === CITY_RUSH_LOD_NEAR) object.visible = true;
    else if (next === CITY_RUSH_LOD_FAR) object.visible = false;
    else object.visible = !CITY_RUSH_LOD_DROP_MID.includes(object.userData.lod);
  }
  // 3. La silhouette, pour le seul niveau lointain.
  if (proxy) proxy.visible = next === CITY_RUSH_LOD_FAR;
  return next;
}
