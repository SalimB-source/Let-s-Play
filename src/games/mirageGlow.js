import * as THREE from 'three';

/*
 * `mirageGlow` — la lumière du jeu, peinte à la main.
 *
 * Mirage Rush se dessine en **une seule passe**, en couleurs d'écran : le ciel
 * et le sable du désert écrivent leurs couleurs sRGB telles quelles (voir
 * `desertTerrain.js`, « pas de tone-mapping ici »), et les matériaux de la piste
 * passent par le tone-mapping du moteur. Un post-traitement (bloom, étalonnage)
 * obligerait à reprendre toutes ces couleurs une par une — et changerait le
 * désert du tout au tout. La lumière est donc **peinte**, à l'ancienne :
 *
 *   · `makeGlowTexture()`   — un dégradé radial blanc qui s'éteint à zéro au
 *     bord (un sprite sans `map` serait un carré) ;
 *   · `makeShadowTexture()` — le même genre de dégradé, plus large, pour les
 *     ombres portées ;
 *   · `makeHalo()` — le sprite **additif** posé devant ce qui brille : les
 *     cristaux de la piste (`makeCrystal` dans `MirageWorld.jsx`), les éclats
 *     d'un ramassage… Il n'occulte rien (`depthWrite: false`) et garde sa
 *     couleur d'origine (`toneMapped: false`), comme les feux du Château de
 *     l'Infini ;
 *   · `makeGroundShadow()` — le disque couché au sol sous les cavaliers : un
 *     bord qui s'efface au lieu du décalogue net d'autrefois.
 *
 * Les textures se créent **une fois par monde 3D** et se partagent : un
 * `makeHalo()` qui fabriquerait sa texture à chaque appel en laisserait une
 * derrière lui à chaque réapparition de cristal (les rangées se recyclent en
 * pleine course). Le `destroy()` du monde les libère toutes les deux.
 */

/** Côté (px) des deux dégradés. 128 suffit : ils sont flous par nature. */
const TEXTURE_SIZE = 128;

/**
 * Un dégradé radial blanc centré, dont l'alpha suit `stops`
 * (`[position 0→1, alpha]`, du centre vers le bord). Le canvas est rendu en
 * `CanvasTexture` ; c'est l'appelant qui décide ce qu'il en fait (halo additif,
 * ombre teintée).
 */
function radialTexture(stops) {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  const radius = TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for (const [offset, alpha] of stops) gradient.addColorStop(offset, `rgba(255, 255, 255, ${alpha})`);
  context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  return new THREE.CanvasTexture(canvas);
}

/** Le halo : un cœur franc, une longue queue qui s'éteint. */
export function makeGlowTexture() {
  return radialTexture([[0, 0.92], [0.16, 0.52], [0.38, 0.15], [0.68, 0.035], [1, 0]]);
}

/** L'ombre : plus pleine au centre, coupée net bien avant le bord du carré. */
export function makeShadowTexture() {
  return radialTexture([[0, 0.95], [0.42, 0.62], [0.72, 0.22], [0.9, 0.04], [1, 0]]);
}

/**
 * Un halo de lumière : un sprite qui regarde toujours la caméra (la rotation de
 * son parent ne le penche pas, seul son centre compte) et dont la lumière
 * s'ajoute à la scène. `size` est le côté du sprite en unités monde ; la
 * matière lumineuse n'occupe que son premier tiers.
 *
 * `userData.glow` reprend la convention du décor : un halo ne se fige jamais
 * dans un `bakeStaticScenery` (sa couleur et son intensité changent en course).
 */
export function makeHalo(texture, { color = 0xffffff, size = 1.6, opacity = 0.5 } = {}) {
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  halo.scale.set(size, size, 1);
  halo.userData.glow = true;
  return halo;
}

/**
 * Une ombre au sol : un carré plat (couché par `rotation.x`) portant le dégradé
 * d'ombre, teinté. C'est l'appelant qui pose son `y` juste au-dessus du sol et
 * qui l'étire (un cheval projette une ombre plus longue que large).
 */
export function makeGroundShadow(texture, { size = 1.16, color = 0x2f1c38, opacity = 0.46 } = {}) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, opacity, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  return shadow;
}
