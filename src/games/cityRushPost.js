// ════════════════════════════════════════════════════════════════════
// Vice City — le moteur de rendu de la conduite libre.
//
// La ville se dessine en **WebGL** (three.js `WebGLRenderer`). Depuis peu,
// three.js livre un second moteur, `WebGPURenderer`, qui compile la même scène
// en **WGSL** et la confie au GPU par `navigator.gpu`. Ce module cache cette
// décision, et rien d'autre :
//
//   - le choix du mode (`standard`, `cinema`, `webgpu`), sa normalisation, son
//     libellé et son cycle ;
//   - la **sonde** du navigateur : l'API existe-t-elle, une carte répond-elle ?
//   - l'**usine de renderer** : `createCityRushRenderer`, seul endroit du
//     projet qui importe `three/webgpu` — paresseusement, parce que c'est un
//     demi-mégaoctet que la plupart des visiteurs n'ouvriront jamais.
//
// WebGPU est le premier choix en conduite libre. Si indisponible, la ville
// utilise WebGL ; une préférence explicite du joueur reste prioritaire.
//
// Le module ne connaît ni React ni le DOM de la page : il lit le navigateur
// quand on lui passe (`globalObject`), ce qui le rend vérifiable en Node.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const CITY_RUSH_GRAPHICS_STANDARD = 'standard';
export const CITY_RUSH_GRAPHICS_CINEMA = 'cinema';
/**
 * L'essai **WEBGPU** : la même ville, dessinée par `WebGPURenderer`. C'est un
 * essai assumé, pas un niveau de qualité :
 *
 *   - il ne s'ouvre que si le navigateur expose `navigator.gpu` **et** qu'une
 *     carte répond à `requestAdapter` ;
 *   - le moteur peut renoncer au dernier moment (pilote qui refuse, contexte
 *     perdu) : la ville ne reste jamais noire, elle retombe sur STANDARD et
 *     l'interface le dit ;
 *   - il est **incompatible avec CINÉMA** : la chaîne de post-traitement est
 *     écrite pour le renderer WebGL. Les deux choix sont exclusifs.
 */
export const CITY_RUSH_GRAPHICS_WEBGPU = 'webgpu';
export const CITY_RUSH_GRAPHICS_MODES = Object.freeze([
  CITY_RUSH_GRAPHICS_STANDARD,
  CITY_RUSH_GRAPHICS_CINEMA,
  CITY_RUSH_GRAPHICS_WEBGPU,
]);

/** Premier choix en conduite libre, en l'absence de préférence enregistrée. */
export const CITY_RUSH_DEFAULT_GRAPHICS = CITY_RUSH_GRAPHICS_WEBGPU;
/** Préférence de l'appareil, comme le son et la caméra : rien au compte. */
export const CITY_RUSH_GRAPHICS_PREF_KEY = 'letsplay_vice_city_rush_graphics_v1';

/**
 * Toute valeur inconnue (préférence corrompue, ancienne version) vaut
 * `standard`. La casse et les espaces sont tolérés : une préférence écrite à la
 * main (`WEBGPU`, ` cinema `) reste comprise au lieu de retomber en silence.
 */
export function normalizeCityRushGraphicsMode(mode) {
  if (typeof mode !== 'string') return CITY_RUSH_GRAPHICS_STANDARD;
  const trimmed = mode.trim().toLowerCase();
  return CITY_RUSH_GRAPHICS_MODES.includes(trimmed) ? trimmed : CITY_RUSH_GRAPHICS_STANDARD;
}

/**
 * Le cycle de la **touche V** et du clic : STANDARD → CINÉMA → WEBGPU →
 * STANDARD. La touche et le bouton font la même chose ; l'essai n'est jamais
 * engagé par une frappe seule sans le dire (le libellé l'annonce).
 */
export function cityRushNextGraphicsMode(mode) {
  const index = CITY_RUSH_GRAPHICS_MODES.indexOf(normalizeCityRushGraphicsMode(mode));
  return CITY_RUSH_GRAPHICS_MODES[(index + 1) % CITY_RUSH_GRAPHICS_MODES.length];
}

/** Le cycle court, historique : STANDARD ⇄ CINÉMA. */
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
 * La qualité « allégée » : écran tactile ou coque Android. Elle limite les
 * effets, y compris avec WebGPU ; pas de chaîne de post-traitement cinéma.
 *
 * **La coque PC fait exception.** Electron embarqué sur un portable tactile
 * répond `pointer: coarse`, et l'APK comme l'exe sont des WebView : sans cette
 * exception, l'essai WebGPU aurait été refusé sur les deux machines les mieux
 * équipées, pour un motif qui ne les concerne pas (ce n'est pas un téléphone,
 * c'est un Chromium de bureau avec un vrai pilote et, depuis D3D12/Vulkan, une
 * vraie carte WebGPU). Le halo CINÉMA reste monté sur PC, comme en navigateur.
 *
 * Ce que « coque PC » veut dire est décidé par `cityRushDesktopShell`, et non
 * ici : ce module ne lit que le verdict, pour rester testable sans Electron.
 */
export function cityRushLiteDevice(globalObject = typeof window === 'undefined' ? null : window) {
  if (!globalObject) return false;
  if (globalObject.LetsPlayAndroid) return true;
  if (cityRushDesktopShell(globalObject)) return false;
  try {
    return Boolean(globalObject.matchMedia?.('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Sommes-nous dans la **coque PC** (Electron) plutôt que dans un navigateur ou
 * dans l'APK ? `desktop/preload.cjs` y expose `window.letsPlayDesktop`, et rien
 * d'autre ne le fait : c'est le drapeau que lit déjà le Sablier de Bab El
 * (`desktopMode` dans `RpgDuelPage.jsx`), donc celui qui fait foi.
 *
 * Un portable tactile ou une tablette Windows dans un navigateur classique
 * n'est **pas** la coque : il reste en qualité allégée, comme avant.
 */
export function cityRushDesktopShell(globalObject = typeof window === 'undefined' ? null : window) {
  return Boolean(globalObject?.letsPlayDesktop);
}

/**
 * Le navigateur peut-il ouvrir l'essai WebGPU ? Deux verrous, et pas un :
 * `navigator.gpu` (l'API existe, derrière un drapeau ou non) et
 * `requestAdapter` (une carte est réellement disponible — un navigateur peut
 * exposer l'API sans adaptateur, dans une machine virtuelle par exemple).
 */
export function cityRushWebGpuSupport(globalObject = typeof window === 'undefined' ? null : window) {
  const nav = globalObject?.navigator;
  return Boolean(nav && typeof nav === 'object' && nav.gpu && typeof nav.gpu.requestAdapter === 'function');
}

let webGpuAdapterProbe = null;
/**
 * La seconde moitié : une carte répond-elle ? Le résultat est mémorisé (une
 * sonde par session), mais **un échec n'est jamais définitif** : un navigateur
 * peut accorder l'adaptateur plus tard (drapeau activé, GPU réveillé).
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

/** WebGPU exige l'API ; l'école reste en WebGL pour ses rétroviseurs. */
export function cityRushWebGpuMaybe({ mode, support = false, schoolMode = false } = {}) {
  return normalizeCityRushGraphicsMode(mode) === CITY_RUSH_GRAPHICS_WEBGPU && !schoolMode && Boolean(support);
}

/**
 * L'usine de renderer de la ville. WebGPU est chargé seulement lorsqu'il est
 * demandé ; STANDARD et CINÉMA utilisent WebGL.
 *
 * `import('three/webgpu')` est **paresseux** : un demi-mégaoctet de code GPU
 * que les appareils incompatibles n'ont pas besoin de télécharger. Le build le
 * range dans son propre morceau, chargé au moment du choix.
 *
 * Le renderer rendu porte `isCityRushWebGpu` : la ville s'en sert pour deux
 * détails (type d'ombre, cible flottante du rétroviseur).
 */
export async function createCityRushRenderer({ mode, lite = false, antialias = true } = {}) {
  // Point d'entrée unique de tout renderer : les vérifications y branchent leur
  // doublure (`globalThis.__cityRushTestRenderer`) pour juger le chemin suivi
  // sans ouvrir un vrai GPU.
  const factory = typeof globalThis !== 'undefined' ? globalThis.__cityRushTestRenderer : null;
  if (typeof factory === 'function') return factory(normalizeCityRushGraphicsMode(mode), { lite, antialias });
  const normalized = normalizeCityRushGraphicsMode(mode);
  if (normalized === CITY_RUSH_GRAPHICS_WEBGPU) {
    const { WebGPURenderer } = await import('three/webgpu');
    const renderer = new WebGPURenderer({ antialias, alpha: false, powerPreference: 'high-performance' });
    try {
      await renderer.init();
      // three.js peut utiliser WebGL en interne sans lever d'erreur.
      if (!renderer.backend?.isWebGPUBackend) throw new Error('Backend WebGPU indisponible');
    } catch (error) {
      renderer.dispose();
      throw error;
    }
    renderer.isCityRushWebGpu = true;
    return renderer;
  }
  return new THREE.WebGLRenderer({ antialias, alpha: false, powerPreference: 'high-performance' });
}

/**
 * Ce que la ville doit répondre quand l'essai n'a pas pu s'ouvrir : le mode
 * effectif (toujours `standard`), et la raison, en clair, pour l'interface.
 */
export function cityRushRendererFallback(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return {
    mode: CITY_RUSH_GRAPHICS_STANDARD,
    requested: CITY_RUSH_GRAPHICS_WEBGPU,
    reason: message ? `WebGPU indisponible (${message})` : 'WebGPU indisponible sur ce navigateur',
  };
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
 * Les réglages du halo, dérivés de l'ambiance du parcours.
 *
 * Les valeurs se lisent en **linéaire** : un néon d'auteur `#22d3ee` vaut 0,60
 * sur son canal vert, une vitre allumée de nuit gravite autour de 0,7, le
 * bitume 0,02. Un seuil de 0,58 ne prend donc que les sources lumineuses et les
 * reflets vifs. De jour, le soleil et les carrosseries claires montent près de
 * 1 : le seuil passe au-dessus pour ne garder qu'un éclat discret, sans voile
 * laiteux sur le bitume clair. `glow` est l'émissivité de la ville (1 la nuit,
 * 0,1–0,3 en plein jour) : une ville qui éteint ses enseignes produit un halo
 * plus sage. La conduite libre se déroule en plein jour : 0,35.
 */
export function cityRushCinemaSettings({ daylight = false, glow = 1 } = {}) {
  const safeGlow = Number.isFinite(glow) ? clamp(glow, 0, 1) : 1;
  if (daylight) {
    return Object.freeze({ threshold: 0.9, strength: 0.26 + 0.1 * safeGlow, radius: 0.5 });
  }
  return Object.freeze({ threshold: 0.58, strength: 0.45 + 0.3 * safeGlow, radius: 0.6 });
}

/**
 * Ce que le matériel accepte, sans jamais faire tomber la ville : une cible
 * flottante (pour garder les valeurs > 1 et la précision des fonds sombres) et
 * un anticrénelage multisample sur cette cible. Sur un WebGL2 sans extension de
 * tampon flottant, on retombe sur une cible 8 bits, sans MSAA : le halo reste.
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
 * Monte la chaîne de la ville :
 *
 *   scène ──▶ RenderPass ──▶ UnrealBloomPass ──▶ OutputPass ──▶ écran
 *             (cible HDR)     (le halo)          (ACES + sRGB)
 *
 * Quand three.js dessine dans une **cible de rendu** (et non dans l'écran), il
 * n'applique ni tone-mapping ni conversion d'espace : les matériaux écrivent
 * leurs valeurs linéaires, éventuellement > 1, ce qu'il faut pour un halo.
 * `OutputPass` refait ensuite, une seule fois pour toute l'image, l'ACES et le
 * sRGB que le renderer appliquait matériau par matériau : mêmes couleurs, même
 * exposition, plus le halo.
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
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), settings.strength, settings.radius, settings.threshold);
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
