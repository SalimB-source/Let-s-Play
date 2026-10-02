import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_RUSH_CITIES } from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_NIGHT_LIGHT,
  CITY_RUSH_THEMES,
  cityRushLightRig,
  cityRushTheme,
} from '../src/games/cityRushThemes.js';

// Luminance relative (0 → 1) d'une couleur 0xrrggbb : sert à distinguer un ciel
// de plein jour d'un ciel nocturne sans coder les valeurs en dur.
const luminance = (hex) => {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test('every city has a complete art direction theme', () => {
  for (const city of CITY_RUSH_CITIES) {
    const theme = cityRushTheme(city.id);
    assert.equal(theme, CITY_RUSH_THEMES[city.id], `${city.id} a son propre thème`);
    for (const key of ['top', 'mid', 'horizon', 'haze', 'sun']) assert.ok(key in theme.sky, `${city.id} : ciel incomplet`);
    assert.ok(typeof theme.sky.sun.elevation === 'number');
    assert.ok(theme.weather);
    assert.ok(theme.fogNear > 0 && theme.fogFar > theme.fogNear);
    assert.ok(theme.facade.style && theme.facade.floor > 0);
    assert.ok(theme.facade.litRatio >= 0 && theme.facade.litRatio <= 1);
    assert.ok(theme.shops.length >= 3);
    assert.ok(theme.sponsors.length >= 4);
    assert.ok(theme.gate.style && theme.gate.text);
    assert.ok(theme.gantryText);
    assert.ok(theme.crowdColors.length >= 4);
    assert.ok(theme.verticalSigns.length >= 3);
    assert.ok(theme.roadTint !== undefined && theme.sidewalkTint !== undefined);
    assert.ok(theme.laneColor.startsWith('#') && theme.edgeColor.startsWith('#'));
    assert.ok(theme.lamp && theme.tree);
  }
});

test('Vice City runs in broad daylight on a beach, the other cities stay at night', () => {
  const vice = cityRushTheme('vice-city');
  assert.equal(vice.daylight, true);
  assert.equal(vice.beach, true);
  // Ciel de plein jour : soleil haut, aucune étoile, aucune lune.
  assert.equal(vice.sky.stars, 0);
  assert.equal(vice.sky.moon, 0);
  assert.ok(vice.sky.sun.elevation > 0.5, 'le soleil est haut dans le ciel');
  assert.equal(vice.sky.sun.stripes, 0, 'pas de soleil rétro à bandes la nuit tombée');
  assert.ok(luminance(vice.sky.top) > 0.2, 'zénith franchement bleu et lumineux');
  assert.ok(luminance(vice.sky.horizon) > 0.7, 'horizon de brume marine claire');
  // Sable au sol et sur les trottoirs, bitume éclairci, brume repoussée.
  assert.ok(luminance(vice.ground) > 0.7, 'le sol est du sable, pas du bitume nocturne');
  assert.ok(luminance(vice.sidewalkTint) > 0.7);
  assert.ok(luminance(vice.roadTint) > 0.35);
  assert.ok(vice.glow < 0.4, 'enseignes et fenêtres très peu émissives en plein jour');
  assert.ok(vice.lampCone < 0.03, 'les halos de lampadaires sont éteints');
  assert.ok(vice.facade.litRatio <= 0.1, 'presque aucune fenêtre allumée');
  assert.ok(vice.fogFar > 300, 'la brume de chaleur repousse l’horizon');
  assert.ok(vice.materials.sand, 'un matériau sable est prévu pour le mobilier de plage');

  for (const city of CITY_RUSH_CITIES.filter((item) => item.id !== 'vice-city')) {
    const theme = cityRushTheme(city.id);
    assert.notEqual(theme.daylight, true, `${city.id} garde son ambiance nocturne`);
    assert.equal(theme.ground, undefined);
    assert.equal(theme.materials, undefined);
    assert.ok(theme.sky.stars > 0 || theme.sky.moon > 0, `${city.id} a des étoiles ou une lune`);
  }
});

test('the light rig brightens the sun for Vice City and keeps night cities untouched', () => {
  const vice = CITY_RUSH_CITIES.find((city) => city.id === 'vice-city');
  const rig = cityRushLightRig(cityRushTheme('vice-city'), vice);
  assert.ok(rig.key.intensity > CITY_RUSH_NIGHT_LIGHT.key.intensity, 'soleil plus puissant en plein jour');
  assert.ok(rig.key.position[1] > CITY_RUSH_NIGHT_LIGHT.key.position[1], 'soleil plus haut');
  assert.equal(rig.headlamp, 0, 'les phares ne servent à rien en plein jour');
  assert.equal(rig.exposure, cityRushTheme('vice-city').light.exposure);
  assert.equal(rig.hemi.sky, cityRushTheme('vice-city').light.hemi.sky);
  assert.equal(rig.hemi.ground, cityRushTheme('vice-city').light.hemi.ground);
  assert.deepEqual(rig.rim.position, cityRushTheme('vice-city').light.rim.position);
  assert.deepEqual(rig.fill.position, cityRushTheme('vice-city').light.fill.position);

  for (const city of CITY_RUSH_CITIES.filter((item) => item.id !== 'vice-city')) {
    const theme = cityRushTheme(city.id);
    const nightRig = cityRushLightRig(theme, city);
    assert.deepEqual(nightRig.key, CITY_RUSH_NIGHT_LIGHT.key, `${city.id} : soleil nocturne inchangé`);
    assert.equal(nightRig.hemi.sky, theme.sky.mid, `${city.id} : l'hémisphère suit le ciel du thème`);
    assert.equal(nightRig.hemi.ground, CITY_RUSH_NIGHT_LIGHT.hemi.ground);
    assert.equal(nightRig.rim.color, Number.parseInt(city.secondary.slice(1), 16), `${city.id} : contre-jour = couleur secondaire`);
    assert.equal(nightRig.fill.color, Number.parseInt(city.accent.slice(1), 16), `${city.id} : remplissage = accent`);
    assert.equal(nightRig.headlamp, CITY_RUSH_NIGHT_LIGHT.headlamp, `${city.id} : phares allumés`);
    assert.equal(nightRig.exposure, CITY_RUSH_NIGHT_LIGHT.exposure);
  }
});

test('the daylight theme keeps the Vice City beach identity readable in the UI', () => {
  const vice = CITY_RUSH_CITIES.find((city) => city.id === 'vice-city');
  const theme = cityRushTheme('vice-city');
  // L'identité rose/turquoise reste (cartes UI, néons, foule), en version plage.
  assert.equal(vice.accent, '#ff5db8');
  assert.equal(vice.secondary, '#43ead5');
  assert.equal(theme.lamp, 'deco');
  assert.equal(theme.tree, 'palm');
  assert.equal(theme.gate.style, 'deco-arch');
  assert.equal(theme.weather, 'clear');
  assert.ok(vice.buildingColors.every((color) => luminance(color) > 0.6), 'façades pastel de front de mer');
  assert.ok(theme.shops.some((shop) => /SURF/i.test(shop.text)), 'une devanture de surf');
  assert.ok(theme.verticalSigns.includes('BEACH'));
});
