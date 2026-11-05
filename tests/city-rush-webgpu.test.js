/**
 * L'entrée RENDU de la conduite libre : les **règles pures** du module de
 * rendu. La page elle-même est vérifiée à part
 * (`npm run check:city-rush-webgpu`, sur la vraie ville montée en jsdom) ;
 * ce fichier fige ce qui ne dépend ni du DOM ni d'un GPU.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_GRAPHICS_CINEMA,
  CITY_RUSH_GRAPHICS_PREF_KEY,
  CITY_RUSH_GRAPHICS_STANDARD,
  CITY_RUSH_GRAPHICS_WEBGPU,
  cityRushCinemaAvailable,
  cityRushCinemaSettings,
  cityRushDesktopShell,
  cityRushGraphicsModeLabel,
  cityRushLiteDevice,
  cityRushNextGraphicsMode,
  cityRushPostSupport,
  cityRushRendererFallback,
  cityRushWebGpuMaybe,
  cityRushWebGpuSupport,
  nextCityRushGraphicsMode,
  normalizeCityRushGraphicsMode,
  resetCityRushWebGpuProbe,
  cityRushWebGpuAvailable,
} from '../src/games/cityRushPost.js';

test('le cycle du bouton RENDU fait le tour des trois modes', () => {
  assert.equal(cityRushNextGraphicsMode(CITY_RUSH_GRAPHICS_STANDARD), CITY_RUSH_GRAPHICS_CINEMA);
  assert.equal(cityRushNextGraphicsMode(CITY_RUSH_GRAPHICS_CINEMA), CITY_RUSH_GRAPHICS_WEBGPU);
  assert.equal(cityRushNextGraphicsMode(CITY_RUSH_GRAPHICS_WEBGPU), CITY_RUSH_GRAPHICS_STANDARD);
  // Trois tours ramènent au point de départ, quel qu'il soit.
  for (const start of [CITY_RUSH_GRAPHICS_STANDARD, CITY_RUSH_GRAPHICS_CINEMA, CITY_RUSH_GRAPHICS_WEBGPU]) {
    let mode = start;
    for (let i = 0; i < 3; i += 1) mode = cityRushNextGraphicsMode(mode);
    assert.equal(mode, start);
  }
});

test('le cycle court V reste standard ⇄ cinéma', () => {
  assert.equal(nextCityRushGraphicsMode(CITY_RUSH_GRAPHICS_STANDARD), CITY_RUSH_GRAPHICS_CINEMA);
  assert.equal(nextCityRushGraphicsMode(CITY_RUSH_GRAPHICS_CINEMA), CITY_RUSH_GRAPHICS_STANDARD);
  // Une préférence WebGPU retenue retombe au cinéma : la touche ne force pas
  // l'essai, elle ne fait que passer d'un rendu à l'autre.
  assert.equal(nextCityRushGraphicsMode(CITY_RUSH_GRAPHICS_WEBGPU), CITY_RUSH_GRAPHICS_CINEMA);
});

test('une préférence inconnue ou abîmée ne casse pas la ville', () => {
  for (const junk of [null, undefined, '', 'webgl', 'ULTRA', 42, {}]) {
    assert.equal(normalizeCityRushGraphicsMode(junk), CITY_RUSH_GRAPHICS_STANDARD);
  }
  assert.equal(normalizeCityRushGraphicsMode(' WEBGPU '), CITY_RUSH_GRAPHICS_WEBGPU);
  assert.equal(normalizeCityRushGraphicsMode('Cinema'), CITY_RUSH_GRAPHICS_CINEMA);
});

test('les libellés disent ce qui va se passer', () => {
  assert.equal(cityRushGraphicsModeLabel(CITY_RUSH_GRAPHICS_STANDARD), 'STANDARD');
  assert.equal(cityRushGraphicsModeLabel(CITY_RUSH_GRAPHICS_CINEMA), 'CINÉMA');
  // L'essai s'annonce comme un essai : jamais présenté comme acquis.
  assert.equal(cityRushGraphicsModeLabel(CITY_RUSH_GRAPHICS_WEBGPU), 'WEBGPU · ESSAI');
  assert.equal(cityRushGraphicsModeLabel('n’importe quoi'), 'STANDARD');
});

test('la préférence a sa propre clé, à côté du son et de la caméra', () => {
  assert.equal(CITY_RUSH_GRAPHICS_PREF_KEY, 'letsplay_vice_city_highway_graphics_v1'.replace('highway', 'rush'));
  assert.notEqual(CITY_RUSH_GRAPHICS_PREF_KEY, 'letsplay_vice_city_rush_sound_v1');
});

test('l’essai WebGPU demande l’API, une carte, et jamais la qualité allégée', () => {
  const withGpu = { navigator: { gpu: { requestAdapter: async () => ({}) } } };
  const withoutGpu = { navigator: {} };
  assert.equal(cityRushWebGpuSupport(withGpu), true);
  assert.equal(cityRushWebGpuSupport(withoutGpu), false);
  assert.equal(cityRushWebGpuSupport(null), false);
  // `true` seulement pour le mode WebGPU, hors appareil allégé, avec l'API.
  assert.equal(cityRushWebGpuMaybe({ mode: CITY_RUSH_GRAPHICS_WEBGPU, support: true }), true);
  assert.equal(cityRushWebGpuMaybe({ mode: CITY_RUSH_GRAPHICS_WEBGPU, support: false }), false);
  assert.equal(cityRushWebGpuMaybe({ mode: CITY_RUSH_GRAPHICS_WEBGPU, support: true, lite: true }), false);
  assert.equal(cityRushWebGpuMaybe({ mode: CITY_RUSH_GRAPHICS_CINEMA, support: true }), false);
});

test('la sonde de carte répond, et un échec n’est jamais définitif', async () => {
  resetCityRushWebGpuProbe();
  let calls = 0;
  const flaky = {
    navigator: {
      gpu: {
        requestAdapter: async () => {
          calls += 1;
          return calls === 1 ? null : { name: 'carte revenue' };
        },
      },
    },
  };
  assert.equal(await cityRushWebGpuAvailable(flaky), false, 'pas de carte la première fois');
  assert.equal(await cityRushWebGpuAvailable(flaky), true, 'la carte répond au second essai');
  // Sans API du tout : pas de sonde, pas d'attente.
  resetCityRushWebGpuProbe();
  assert.equal(await cityRushWebGpuAvailable({ navigator: {} }), false);
});

test('la qualité allégée se reconnaît sans toucher au rendu', () => {
  const coarse = { matchMedia: () => ({ matches: true }) };
  const desktop = { matchMedia: () => ({ matches: false }) };
  assert.equal(cityRushLiteDevice(coarse), true);
  assert.equal(cityRushLiteDevice(desktop), false);
  assert.equal(cityRushLiteDevice({ LetsPlayAndroid: true, matchMedia: () => ({ matches: false }) }), true);
  // Un `matchMedia` qui lève (WebView bridée) ne doit pas empêcher de jouer.
  assert.equal(cityRushLiteDevice({ matchMedia: () => { throw new Error('non'); } }), false);
  assert.equal(cityRushLiteDevice(null), false);
});

test('la coque PC n’est pas un téléphone, même avec un écran tactile', () => {
  // Electron sur un portable tactile : `pointer: coarse` est vrai, et pourtant
  // c'est un Chromium de bureau avec un vrai pilote. Sans cette exception,
  // l'essai WebGPU et le halo étaient refusés sur les meilleures machines.
  const coqueTactile = { letsPlayDesktop: { isDesktop: true }, matchMedia: () => ({ matches: true }) };
  assert.equal(cityRushDesktopShell(coqueTactile), true);
  assert.equal(cityRushLiteDevice(coqueTactile), false, 'la coque PC garde le rendu complet');

  // Un navigateur classique sur le même portable reste en qualité allégée.
  assert.equal(cityRushLiteDevice({ matchMedia: () => ({ matches: true }) }), true);

  // L'APK reste allégée, coque ou pas : `LetsPlayAndroid` parle en premier.
  assert.equal(cityRushLiteDevice({ LetsPlayAndroid: true, letsPlayDesktop: { isDesktop: true }, matchMedia: () => ({ matches: true }) }), true);

  // Et rien d'autre ne fait croire à une coque.
  assert.equal(cityRushDesktopShell({}), false);
  assert.equal(cityRushDesktopShell(null), false);
});

test('le halo ne tourne jamais en qualité allégée', () => {
  assert.equal(cityRushCinemaAvailable({ mode: CITY_RUSH_GRAPHICS_CINEMA }), true);
  assert.equal(cityRushCinemaAvailable({ mode: CITY_RUSH_GRAPHICS_CINEMA, lite: true }), false);
  assert.equal(cityRushCinemaAvailable({ mode: CITY_RUSH_GRAPHICS_STANDARD }), false);
  assert.equal(cityRushCinemaAvailable({ mode: CITY_RUSH_GRAPHICS_WEBGPU }), false);
});

test('le halo de jour reste discret, celui de nuit prend les néons', () => {
  const day = cityRushCinemaSettings({ daylight: true, glow: 0.35 });
  const night = cityRushCinemaSettings({ glow: 1 });
  // De jour, le seuil est haut : pas de voile laiteux sur le bitume clair.
  assert.ok(day.threshold > night.threshold);
  assert.ok(day.strength < night.strength);
  assert.ok(day.strength >= 0.26 && day.strength <= 0.36);
  // Une ville qui éteint ses enseignes produit un halo plus sage.
  assert.ok(cityRushCinemaSettings({ glow: 0 }).strength < cityRushCinemaSettings({ glow: 1 }).strength);
  // Les réglages sont figés : personne ne les modifie par inadvertance.
  assert.ok(Object.isFrozen(day) && Object.isFrozen(night));
});

test('la chaîne accepte ce que le matériel accorde', () => {
  const webgl2Half = { capabilities: { isWebGL2: true }, extensions: { has: (name) => name === 'EXT_color_buffer_half_float' } };
  const webgl2Float = { capabilities: { isWebGL2: true }, extensions: { has: (name) => name === 'EXT_color_buffer_float' } };
  const webgl1 = { capabilities: { isWebGL2: false }, extensions: { has: () => true } };
  const webgpu = {};
  assert.deepEqual(cityRushPostSupport(webgl2Half), { halfFloat: true, samples: 4 });
  assert.deepEqual(cityRushPostSupport(webgl2Float), { halfFloat: true, samples: 4 });
  // WebGL1 : cible 8 bits, pas de MSAA — le halo reste, sans précision.
  assert.deepEqual(cityRushPostSupport(webgl1), { halfFloat: false, samples: 0 });
  // Un renderer WebGPU n'expose ni `capabilities` ni `extensions` : la chaîne
  // n'est de toute façon pas montée dans ce mode.
  assert.deepEqual(cityRushPostSupport(webgpu), { halfFloat: false, samples: 0 });
});

test('un moteur qui renonce le dit, en clair', () => {
  const plain = cityRushRendererFallback(new Error('pas de carte'));
  assert.equal(plain.mode, CITY_RUSH_GRAPHICS_STANDARD);
  assert.equal(plain.requested, CITY_RUSH_GRAPHICS_WEBGPU);
  assert.match(plain.reason, /pas de carte/);
  // Une erreur sans message reste explicable.
  assert.match(cityRushRendererFallback().reason, /WebGPU indisponible/);
});
