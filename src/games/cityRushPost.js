// ════════════════════════════════════════════════════════════════════
// Vice City Rush — « CINÉMA » : la chaîne de post-traitement de la course.
//
// Jusqu'ici, la course dessinait la scène **directement dans l'écran**, avec le
// tone-mapping ACES et l'encodage sRGB faits par chaque matériau (c'est le
// comportement de three.js quand la cible de rendu est le framebuffer par
// défaut). C'est le plus court chemin, et c'est ce que garde le niveau
// **STANDARD** : rien ne change, image pour image.
//
// Le niveau **CINÉMA** (facultatif, choisi par le joueur) intercale une chaîne
// de passes entre la scène et l'écran :
//
//   scène ──▶ RenderPass ──▶ UnrealBloomPass ──▶ OutputPass ──▶ écran
//             (cible HDR)     (le halo)          (ACES + sRGB)
//
// Pourquoi c'est possible sans refaire le jeu : quand three.js dessine dans une
// **cible de rendu** (et non dans l'écran), il n'applique **ni tone-mapping ni
// conversion d'espace colorimétrique** — les matériaux écrivent alors leurs
// valeurs linéaires, brutes, éventuellement supérieures à 1. C'est exactement
// ce qu'il faut pour un *bloom* : le seuil se lit sur la luminance réelle des
// enseignes et des néons, et non sur une image déjà écrasée à 1.
//
// `OutputPass` refait ensuite, **une seule fois pour toute l'image**, l'ACES et
// l'encodage sRGB que le renderer appliquait auparavant matériau par matériau.
// La chaîne est donc colorimétriquement équivalente au rendu direct : mêmes
// couleurs, même exposition (`toneMappingExposure` reste lu sur le renderer),
// plus le halo. C'est pour cette raison que le renderer **garde** son ACES en
// mode cinéma : c'est `OutputPass` qui le lit, alors que les passes de scène
// l'ignorent automatiquement (cible de rendu).
//
// Ce qui change vraiment à l'écran, et qu'il faut savoir avant de toucher aux
// réglages :
//
//   - les surfaces **non éclairées** (`toneMapped: false` : enseignes au trait,
//     phares, gyrophares, drapeaux de départ) ne court-circuitent plus l'ACES ;
//     elles passent dans la chaîne comme le reste. Leur valeur reste à 1, donc
//     elles ressortent blanches ou très lumineuses et **prennent le halo** —
//     c'est le but recherché ;
//   - le **ciel** et la ligne d'horizon peints (`ShaderMaterial` du dôme,
//     `MeshBasicMaterial` du skyline) écrivent des couleurs composées « comme à
//     l'écran » ; passées dans ACES elles s'éclaircissent de quelques pour cent.
//     C'est le seul écart assumé, et il n'existe qu'en mode cinéma ;
//   - le MSAA du canvas ne sert plus à rien : c'est la cible de rendu qui porte
//     l'anticrénelage (`samples: 4`), et seulement quand le matériel accepte une
//     cible flottante.
//
// Le module ne connaît ni React ni le DOM : préférence, libellés, réglages de
// halo et chaîne three.js. La page lit et écrit la préférence (`localStorage`),
// le monde 3D monte et démonte la chaîne en direct via `setGraphics`.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * L'usine de renderer de la course. Elle cache une décision : WebGL pour tout
 * le monde, sauf l'essai **WEBGPU**.
 *
 * Pourquoi une fonction et pas un choix dans la page : le moteur 3D n'a le droit
 * de dessiner en WebGPU que si la scène est **compatible**. Le seul obstacle
 * connu de Vice City Rush est le dôme du ciel, écrit en GLSL (`ShaderMaterial`,
 * que WebGPU ne compile pas) : l'essai reçoit donc un ciel peint à la place
 * (`makeSkyDomePainted`), et tout le reste — matériaux standard, Lambert,
 * Phong, Basic, sprites, points, ombres — passe par les matériaux WebGPU de
 * three.js.
 *
 * `import('three/webgpu')` est **paresseux** : c'est un demi-mégaoctet de code
 * GPU que 95 % des joueurs n'ouvriront jamais. Le build le range dans son propre
 * morceau, chargé au moment du choix.
 */
export async function createCityRushRenderer({ mode, lite = false, antialias = true } = {}) {
  const normalized = normalizeCityRushGraphicsMode(mode);
  if (normalized === CITY_RUSH_GRAPHICS_WEBGPU && !lite) {
    const { WebGPURenderer } = await import('three/webgpu');
    // `forceWebGL: false` : on demande le vrai backend WebGPU. S'il n'y a pas de
    // carte, le renderer lève à l'initialisation — d'où le repli de la page.
    const renderer = new WebGPURenderer({ antialias, alpha: false, powerPreference: 'high-performance' });
    await renderer.init();
    renderer.domElement.className = 'city-rush-canvas';
    renderer.isCityRushWebGpu = true;
    return renderer;
  }
  return new THREE.WebGLRenderer({ antialias, alpha: false, powerPreference: 'high-performance' });
}

export const CITY_RUSH_GRAPHICS_STANDARD = 'standard';
export const CITY_RUSH_GRAPHICS_CINEMA = 'cinema';
/**
 * L'essai **WEBGPU** : la même course, dessinée par `WebGPURenderer` (three.js
 * compile alors la scène en WGSL au lieu de GLSL). C'est un essai assumé, pas un
 * niveau de qualité :
 *
 *   - il ne s'ouvre que si le navigateur expose `navigator.gpu` **et** qu'une
 *     carte est disponible (`requestAdapter`) ;
 *   - le moteur peut reclamer le WebGL au dernier moment (contexte perdu,
 *     compilation refusée) : la course ne reste jamais noire, elle retombe sur
 *     STANDARD et l'écran de pause le dit ;
 *   - il est **incompatible avec CINÉMA** : la chaîne de post-traitement est
 *     écrite pour le renderer WebGL. Les deux choix sont exclusifs, et c'est le
 *     dernier choisi qui gagne.
 */
export const CITY_RUSH_GRAPHICS_WEBGPU = 'webgpu';
export const CITY_RUSH_GRAPHICS_MODES = Object.freeze([
  CITY_RUSH_GRAPHICS_STANDARD,
  CITY_RUSH_GRAPHICS_CINEMA,
  CITY_RUSH_GRAPHICS_WEBGPU,
]);
/** Cycles de l'entrée RENDU : le clic passe au suivant de la liste. */
export function cityRushNextGraphicsMode(mode) {
  const index = CITY_RUSH_GRAPHICS_MODES.indexOf(normalizeCityRushGraphicsMode(mode));
  return CITY_RUSH_GRAPHICS_MODES[(index + 1) % CITY_RUSH_GRAPHICS_MODES.length];
}
/** Le rendu historique : la scène droit dans l'écran, sans post-traitement. */
export const CITY_RUSH_DEFAULT_GRAPHICS = CITY_RUSH_GRAPHICS_STANDARD;
/** Préférence de l'appareil, comme le son, la vue et la conduite : rien au compte. */
export const CITY_RUSH_GRAPHICS_PREF_KEY = 'letsplay_vice_city_rush_graphics_v1';

/** Toute valeur inconnue (préférence corrompue, ancienne version) vaut `standard`. */
export function normalizeCityRushGraphicsMode(mode) {
  return CITY_RUSH_GRAPHICS_MODES.includes(mode) ? mode : CITY_RUSH_GRAPHICS_STANDARD;
}

/**
 * Le cycle historique de la touche **V** : STANDARD ⇄ CINÉMA. La touche ne passe
 * pas par WEBGPU — c'est un essai, il se choisit à la souris, pas par accident
 * sur une frappe au clavier.
 */
export function nextCityRushGraphicsMode(mode) {
  return normalizeCityRushGraphicsMode(mode) === CITY_RUSH_GRAPHICS_CINEMA
    ? CITY_RUSH_GRAPHICS_STANDARD
    : CITY_RUSH_GRAPHICS_CINEMA;
}

export function cityRushGraphicsModeLabel(mode) {
  const normalized = normalizeCityRushGraphicsMode(mode);
  if (normalized === CITY_RUSH_GRAPHICS_CINEMA) return 'CINÉMA';
  if (normalized === CITY_RUSH_GRAPHICS_WEBGPU) return 'WEBGPU · ESSAI';
  return 'STANDARD';
}

/**
 * Le navigateur peut-il ouvrir l'essai WebGPU ? Deux verrous, et pas un :
 * `navigator.gpu` (l'API existe, derrière un drapeau ou non) et
 * `requestAdapter` (une carte est réellement disponible — un navigateur peut
 * exposer l'API sans adaptateur, par exemple dans une machine virtuelle).
 * La seconde réponse est asynchrone : `cityRushWebGpuSupport` ne fait que le
 * premier verrou, `cityRushWebGpuAvailable` interroge le second.
 */
export function cityRushWebGpuSupport(globalObject = typeof window === 'undefined' ? null : window) {
  const nav = globalObject?.navigator;
  return Boolean(nav && typeof nav === 'object' && nav.gpu && typeof nav.gpu.requestAdapter === 'function');
}

let webGpuAdapterProbe = null;
/**
 * La seconde moitié : une carte répond-elle ? Le résultat est mémorisé (une
 * sonde par session), mais **un échec n'est jamais définitif** : un navigateur
 * peut accorder l'adaptateur plus tard (drapeau activé, GPU réveillé). On
 * renvoie donc `false` sans le graver en dur.
 */
export async function cityRushWebGpuAvailable(globalObject = typeof window === 'undefined' ? null : window) {
  if (!cityRushWebGpuSupport(globalObject)) return false;
  if (webGpuAdapterProbe === null) {
    webGpuAdapterProbe = (async () => {
      try {
        const adapter = await globalObject.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        return Boolean(adapter);
      } catch {
        return false;
      }
    })();
  }
  const available = await webGpuAdapterProbe;
  if (!available) webGpuAdapterProbe = null; // l'essai suivant resonde
  return available;
}

/** Pour les vérifications : oublie la sonde mémorisée. */
export function resetCityRushWebGpuProbe() {
  webGpuAdapterProbe = null;
}

/**
 * La qualité « allégée » de la course : écran tactile, ou coque Android, ou
 * WebView — les appareils qu'on ménage. C'est la règle historique du monde 3D
 * (`detectLiteQuality`, désormais ici pour que la page et le moteur répondent
 * d'une seule voix) : pas d'ombres, pas de deuxième rangée d'immeubles, une
 * pluie plus légère, et **pas de chaîne cinéma**.
 */
export function cityRushLiteDevice(globalObject = typeof window === 'undefined' ? null : window) {
  if (!globalObject) return false;
  if (globalObject.LetsPlayAndroid) return true;
  try {
    return Boolean(globalObject.matchMedia?.('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Le niveau cinéma peut-il tourner ici ? Il demande une cible de rendu et deux
 * passes plein écran : la **qualité allégée** (écran tactile, WebView Android,
 * `window.LetsPlayAndroid`) est justement le matériel qu'on ménage, elle garde
 * donc le rendu standard quoi que dise la préférence. Le choix du joueur n'est
 * pas perdu pour autant : il revit sur un appareil capable.
 */
export function cityRushCinemaAvailable({ mode, lite = false } = {}) {
  return normalizeCityRushGraphicsMode(mode) === CITY_RUSH_GRAPHICS_CINEMA && !lite;
}

/**
 * L'essai WebGPU peut-il tourner ici ? Même logique que le cinéma : jamais en
 * qualité allégée (c'est le matériel qu'on ménage), et seulement si le
 * navigateur expose l'API. La carte est sondée à part, en asynchrone, parce
 * qu'elle ne répond pas dans la même image.
 */
export function cityRushWebGpuMaybe({ mode, lite = false, support = false } = {}) {
  return normalizeCityRushGraphicsMode(mode) === CITY_RUSH_GRAPHICS_WEBGPU && !lite && Boolean(support);
}

/**
 * Les réglages du halo, dérivés de l'ambiance du parcours.
 *
 * Les valeurs se lisent en **linéaire** (voir l'en-tête) : un néon d'auteur
 * `#22d3ee` vaut 0,60 sur son canal vert, une vitre allumée de nuit gravite
 * autour de 0,7, le bitume 0,02. Un seuil de 0,58 ne prend donc que les sources
 * lumineuses et les reflets vifs.
 *
 * De jour, le soleil et les carrosseries claires montent près de 1 : le seuil
 * passe au-dessus pour ne garder qu'un éclat de soleil discret, sans voile
 * laiteux sur le bitume clair. `glow` est l'émissivité de la ville (1 pour les
 * villes de nuit, 0,1–0,3 pour les parcours en plein jour) : une ville qui
 * éteint ses enseignes produit un halo plus sage.
 */
export function cityRushCinemaSettings({ daylight = false, glow = 1 } = {}) {
  const safeGlow = Number.isFinite(glow) ? clamp(glow, 0, 1) : 1;
  if (daylight) {
    return Object.freeze({
      threshold: 0.9,
      strength: 0.26 + 0.1 * safeGlow,
      radius: 0.5,
    });
  }
  return Object.freeze({
    threshold: 0.58,
    strength: 0.45 + 0.3 * safeGlow,
    radius: 0.6,
  });
}

/**
 * Ce que le matériel accepte, sans jamais faire tomber la course : une cible
 * flottante (pour garder les valeurs > 1 et la précision des fonds sombres) et
 * un anticrénelage multisample sur cette cible. Sur un WebGL2 sans extension de
 * tampon flottant, on retombe sur une cible 8 bits, sans MSAA : le halo reste,
 * un peu plus « numérique ».
 */
export function cityRushPostSupport(renderer) {
  const webgl2 = Boolean(renderer?.capabilities?.isWebGL2);
  const halfFloat = webgl2 && Boolean(
    renderer?.extensions?.has?.('EXT_color_buffer_half_float')
    || renderer?.extensions?.has?.('EXT_color_buffer_float'),
  );
  return { halfFloat, samples: halfFloat ? 4 : 0 };
}

/**
 * Monte la chaîne. `width` / `height` sont en pixels CSS ; le pixel ratio est
 * celui du renderer, relu à chaque `setSize` pour suivre la résolution
 * adaptative de la course (la chaîne ne peut pas coûter plus de pixels que la
 * scène qu'elle étale).
 */
export function createCityRushPostChain({
  renderer,
  scene,
  camera,
  width = 1,
  height = 1,
  settings = cityRushCinemaSettings(),
  samples,
}) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const support = cityRushPostSupport(renderer);
  const target = new THREE.WebGLRenderTarget(w, h, {
    type: support.halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
    samples: Number.isFinite(samples) ? Math.max(0, samples) : support.samples,
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    settings.strength,
    settings.radius,
    settings.threshold,
  );
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);

  const apply = (next = {}) => {
    if (Number.isFinite(next.strength)) bloomPass.strength = next.strength;
    if (Number.isFinite(next.radius)) bloomPass.radius = next.radius;
    if (Number.isFinite(next.threshold)) bloomPass.threshold = next.threshold;
  };

  return {
    bloomPass,
    /** Ce que le matériel a réellement accordé (lu par les vérifications). */
    get halfFloat() { return support.halfFloat; },
    get samples() { return target.samples; },
    apply,
    setSize(nextWidth, nextHeight, pixelRatio = renderer.getPixelRatio()) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(Math.max(1, Math.floor(nextWidth)), Math.max(1, Math.floor(nextHeight)));
    },
    render(deltaSeconds) {
      composer.render(deltaSeconds);
    },
    dispose() {
      renderPass.dispose?.();
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
      target.dispose();
    },
  };
}
