import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_RUSH_CITIES, CITY_RUSH_ROAD_HALF_WIDTH } from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_NIGHT_LIGHT,
  CITY_RUSH_THEMES,
  cityRushLightRig,
  cityRushTheme,
  cityRushThemeDriveSide,
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
    if (theme.expressway) {
      // Une voie rapide surélevée n'a ni trottoir ni devanture : la publicité
      // passe par les grands panneaux scellés sur les murs antibruit.
      assert.equal(theme.shops, undefined, `${city.id} : aucune boutique sur une voie rapide`);
      assert.ok(theme.expressway.billboards.length >= 3, `${city.id} : panneaux publicitaires`);
    } else {
      assert.ok(theme.shops.length >= 3);
    }
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

test('Tokyo runs on the Shuto Expressway Route 1 with an expressway art direction', () => {
  const city = CITY_RUSH_CITIES.find((item) => item.id === 'tokyo');
  const theme = cityRushTheme('tokyo');
  const expressway = theme.expressway;
  assert.ok(expressway, 'le thème de Tokyo décrit une voie rapide');
  // L'anneau intérieur officiel : 14,8 km, 内回り, limité à 50 km/h.
  assert.equal(expressway.route, city.route, 'le thème pointe sur la route de la ville');
  assert.equal(expressway.route.id, 'shuto-c1');
  assert.equal(expressway.route.marker, 'C1');
  assert.equal(expressway.route.direction, '内回り');
  assert.ok(Math.abs(expressway.route.lengthKm - 14.8) < 1e-6);
  assert.equal(expressway.route.speedLimit, 50);
  assert.ok(expressway.route.sectors.length >= 12, 'chaque échangeur et tunnel a son secteur');
  // Coupe transversale : le tablier dépasse la chaussée (bandes d'arrêt,
  // murets, parapets) et tout ce qui enjambe la piste reste au-dessus de la
  // caméra de poursuite (6,7 m au plus haut).
  assert.ok(expressway.deckHalfWidth > CITY_RUSH_ROAD_HALF_WIDTH + 2);
  assert.ok(expressway.barrierHeight > 0.9 && expressway.barrierHeight < 1.4);
  assert.ok(expressway.parapetHeight > 0.8);
  assert.ok(expressway.streetDepth > 10, 'la ville passe sous le viaduc');
  assert.ok(expressway.wallHeight > 2.5, 'des murs antibruit translucides');
  // Signalisation verte officielle Shuto et vert sombre de contre-jour.
  assert.equal(expressway.signGreen, '#0b6b3f');
  assert.ok(expressway.signWhite.startsWith('#'));
  // Matières : béton du tablier, acier galvanisé, parois de tunnel, panneaux
  // antibruit translucides, néons de la ville en dessous.
  for (const key of ['concrete', 'deckConcrete', 'parapet', 'steel', 'galvanized', 'darkSteel']) {
    assert.ok(key in expressway.materials, `matière manquante : ${key}`);
  }
  for (const key of ['wall', 'ceiling', 'portal', 'sodium', 'led']) {
    assert.ok(key in expressway.tunnel, `tunnel incomplet : ${key}`);
  }
  for (const key of ['panel', 'post']) assert.ok(key in expressway.soundWall, `mur antibruit incomplet : ${key}`);
  assert.ok(expressway.soundWall.opacity > 0.3 && expressway.soundWall.opacity < 0.8, 'panneaux translucides');
  for (const key of ['ground', 'neonA', 'neonB', 'palace']) assert.ok(key in expressway.below, `ville sous le viaduc : ${key}`);
  // Pas de devantures, mais des panneaux publicitaires et une porte de mi-tour
  // annoncée comme un JCT (谷町), pas comme une arche de rue.
  assert.equal(theme.shops, undefined);
  assert.ok(expressway.billboards.every((board) => board.text && board.color));
  assert.equal(theme.gate.style, 'shuto-gantry');
  assert.ok(/JCT/.test(theme.gate.text), 'la porte de mi-tour est un échangeur');
  assert.ok(theme.gantryText, 'le portique de départ garde son texte');
  // Ambiance nocturne de la baie de Tokyo, comme les autres villes de nuit.
  assert.notEqual(theme.daylight, true);
  assert.equal(theme.ground, undefined);
  assert.equal(theme.materials, undefined);
});

test('the driving side is painted by the theme and mirrored by the course, city by city', () => {
  // Le côté de circulation vit à deux endroits : la ville (règles, voies) et
  // son thème (textures de route, flèches au sol). Le commentaire du thème de
  // Tokyo le dit : les deux doivent rester d'accord, sinon les flèches
  // annoncent un contresens que le jeu ne connaît pas.
  for (const city of CITY_RUSH_CITIES) {
    const theme = cityRushTheme(city.id);
    const expected = city.id === 'tokyo' || city.id === 'london' ? 'left' : 'right';
    assert.equal(theme.driveSide || 'right', expected, `${city.id} : thème`);
    assert.equal(city.driveSide || 'right', expected, `${city.id} : parcours`);
    assert.equal(cityRushThemeDriveSide(theme), expected, `${city.id} : helper de texture`);
  }
  // Les seuls thèmes « à gauche » sont Tokyo et Londres : les autres n'ont pas
  // le champ (défaut « à droite »), pas un champ contradictoire.
  const leftHand = Object.entries(CITY_RUSH_THEMES)
    .filter(([, theme]) => cityRushThemeDriveSide(theme) === 'left')
    .map(([id]) => id)
    .sort();
  assert.deepEqual(leftHand, ['london', 'tokyo']);
});
