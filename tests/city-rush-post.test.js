import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const {
  CITY_RUSH_GRAPHICS_CINEMA,
  CITY_RUSH_DEFAULT_GRAPHICS,
  CITY_RUSH_GRAPHICS_MODES,
  CITY_RUSH_GRAPHICS_PREF_KEY,
  CITY_RUSH_GRAPHICS_STANDARD,
  cityRushCinemaAvailable,
  cityRushCinemaSettings,
  cityRushGraphicsModeLabel,
  cityRushPostSupport,
  createCityRushPostChain,
  nextCityRushGraphicsMode,
  normalizeCityRushGraphicsMode,
} = await import('../src/games/cityRushPost.js');
const { cityRushTheme } = await import('../src/games/cityRushThemes.js');
const { CITY_RUSH_COURSES } = await import('../src/games/cityRushRules.js');

// Un renderer factice : la chaîne se monte sans contexte WebGL (aucune passe
// n'est dessinée ici, on lit sa structure).
function fakeRenderer({ webgl2 = true, extensions = ['EXT_color_buffer_half_float'], pixelRatio = 1.5 } = {}) {
  const supported = new Set(extensions);
  return {
    capabilities: { isWebGL2: webgl2 },
    extensions: { has: (name) => supported.has(name) },
    getPixelRatio: () => pixelRatio,
    getSize: (target) => target.set(1280, 720),
  };
}

test('le rendu standard reste le défaut ; toute valeur inconnue y retombe', () => {
  assert.equal(CITY_RUSH_DEFAULT_GRAPHICS, CITY_RUSH_GRAPHICS_STANDARD);
  assert.deepEqual([...CITY_RUSH_GRAPHICS_MODES], ['standard', 'cinema']);
  assert.equal(CITY_RUSH_GRAPHICS_PREF_KEY, 'letsplay_vice_city_rush_graphics_v1');
  assert.equal(normalizeCityRushGraphicsMode('cinema'), CITY_RUSH_GRAPHICS_CINEMA);
  for (const value of ['standard', undefined, null, '', 'CINÉMA', 'ultra', 'cinema ', 42, {}]) {
    assert.equal(normalizeCityRushGraphicsMode(value), CITY_RUSH_GRAPHICS_STANDARD, `${String(value)} → standard`);
  }
  assert.equal(nextCityRushGraphicsMode('standard'), 'cinema');
  assert.equal(nextCityRushGraphicsMode('cinema'), 'standard');
  assert.equal(nextCityRushGraphicsMode('n-importe-quoi'), 'cinema');
  assert.equal(cityRushGraphicsModeLabel('cinema'), 'CINÉMA');
  assert.equal(cityRushGraphicsModeLabel(null), 'STANDARD');
});

test('le cinéma ne tourne jamais en qualité allégée (tactile, WebView Android)', () => {
  assert.equal(cityRushCinemaAvailable({ mode: 'cinema', lite: false }), true);
  assert.equal(cityRushCinemaAvailable({ mode: 'cinema', lite: true }), false);
  assert.equal(cityRushCinemaAvailable({ mode: 'standard', lite: false }), false);
  assert.equal(cityRushCinemaAvailable({}), false);
});

test('le seuil du halo se règle sur la lumière réelle du parcours', () => {
  const night = cityRushCinemaSettings({ daylight: false, glow: 1 });
  const day = cityRushCinemaSettings({ daylight: true, glow: 0.16 });
  // De nuit : seuil bas, halo franc. De jour : seuil haut, halo discret, sinon
  // le bitume clair se couvre d'un voile laiteux.
  assert.ok(night.threshold < day.threshold, 'le seuil de jour est au-dessus de celui de nuit');
  assert.ok(night.strength > day.strength, 'le halo de nuit est plus fort que celui de jour');
  assert.ok(night.strength > 0 && night.strength <= 1, 'force de halo bornée');
  assert.ok(day.strength > 0 && day.strength <= 1, 'force de halo bornée');
  assert.ok(night.radius > 0 && night.radius < 2, 'rayon de halo plausible');
  // Valeurs de repli : une ville sans `glow` ni `daylight` reste sur la nuit.
  const fallback = cityRushCinemaSettings({});
  assert.equal(fallback.threshold, night.threshold);
  assert.equal(fallback.strength, night.strength);
  assert.equal(fallback.radius, night.radius);
  // `glow` hors bornes (thème abîmé) ne casse pas le réglage.
  assert.deepEqual(cityRushCinemaSettings({ glow: 42 }), cityRushCinemaSettings({ glow: 1 }));
  assert.deepEqual(cityRushCinemaSettings({ glow: -3 }), cityRushCinemaSettings({ glow: 0 }));
});

test('les cinq villes ont de quoi régler leur halo', () => {
  assert.ok(CITY_RUSH_COURSES.length >= 5);
  for (const city of CITY_RUSH_COURSES) {
    const theme = cityRushTheme(city.id);
    const settings = cityRushCinemaSettings({ daylight: Boolean(theme.daylight), glow: theme.glow });
    assert.ok(settings.strength > 0.2, `${city.id} : halo visible`);
    if (theme.daylight) assert.ok(settings.threshold >= 0.8, `${city.id} : seuil de jour`);
    else assert.ok(settings.threshold <= 0.65, `${city.id} : seuil de nuit`);
  }
});

test('le support matériel : flottant et MSAA quand la carte les donne, sinon repli', () => {
  assert.deepEqual(cityRushPostSupport(fakeRenderer()), { halfFloat: true, samples: 4 });
  // WebGL1 ou WebGL2 sans EXT_color_buffer_half_float : cible 8 bits, pas de MSAA.
  assert.deepEqual(cityRushPostSupport(fakeRenderer({ webgl2: false })), { halfFloat: false, samples: 0 });
  assert.deepEqual(cityRushPostSupport(fakeRenderer({ extensions: [] })), { halfFloat: false, samples: 0 });
  assert.deepEqual(cityRushPostSupport(undefined), { halfFloat: false, samples: 0 });
});

test('la chaîne est scène → halo → sortie, la sortie en dernier', () => {
  const renderer = fakeRenderer();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const chain = createCityRushPostChain({
    renderer,
    scene,
    camera,
    width: 1280,
    height: 720,
    settings: cityRushCinemaSettings({ daylight: false, glow: 1 }),
  });
  // La chaîne publiée : exactement les réglages demandés, appliqués au halo.
  assert.equal(chain.bloomPass.threshold, cityRushCinemaSettings({ daylight: false, glow: 1 }).threshold);
  chain.apply({ strength: 0.9, threshold: 0.7, radius: 0.3 });
  assert.equal(chain.bloomPass.strength, 0.9);
  assert.equal(chain.bloomPass.threshold, 0.7);
  assert.equal(chain.bloomPass.radius, 0.3);
  // Un réglage incomplet ne remet pas les autres à zéro.
  chain.apply({ strength: 0.5 });
  assert.equal(chain.bloomPass.threshold, 0.7);
  assert.equal(chain.bloomPass.radius, 0.3);
  // Ce que le matériel a accordé est lisible (les vérifications s'en servent).
  assert.equal(chain.halfFloat, true);
  assert.equal(chain.samples, 4);
  chain.setSize(640, 360, 1);
  chain.dispose();
});

test('sans cible flottante, la chaîne se monte quand même', () => {
  const chain = createCityRushPostChain({
    renderer: fakeRenderer({ webgl2: true, extensions: [] }),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    width: 320,
    height: 180,
  });
  assert.equal(chain.halfFloat, false);
  assert.equal(chain.samples, 0);
  chain.dispose();
});
