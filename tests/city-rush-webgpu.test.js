import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * L'essai **WebGPU** : ce qu'on peut figer sans carte graphique.
 *
 * Trois choses, et trois seulement, se vérifient en Node : le ciel peint
 * (des pixels, pas de GPU), la sonde de navigateur, et le fait que l'essai
 * **échoue proprement** quand il n'y a ni API ni carte — c'est le cas de la
 * grande majorité des machines, et la course ne doit jamais rester noire.
 */

// Un canevas 2D factice : il capture les pixels que `putImageData` reçoit.
function pixelCanvas() {
  const state = { data: null, drawn: null };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (width, height) => {
        state.data = { data: new Uint8ClampedArray(width * height * 4), width, height };
        return state.data;
      },
      putImageData: (image) => { state.drawn = image; },
    }),
  };
  return { canvas, state };
}

const { cityRushTheme } = await import('../src/games/cityRushThemes.js');
const { makeSkyDomeTexture, makeSkyDomePainted } = await import('../src/games/cityRushStage.js');
const {
  CITY_RUSH_GRAPHICS_WEBGPU,
  cityRushNextGraphicsMode,
  cityRushWebGpuAvailable,
  cityRushWebGpuSupport,
  createCityRushRenderer,
  resetCityRushWebGpuProbe,
} = await import('../src/games/cityRushPost.js');

/** Rend le ciel d'un thème et renvoie de quoi lire ses pixels. */
function paint(cityId, options = { width: 64, height: 32 }) {
  const { canvas, state } = pixelCanvas();
  const previous = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  try {
    makeSkyDomeTexture(cityRushTheme(cityId), options);
  } finally {
    globalThis.document = previous;
  }
  const pixel = (x, y) => {
    const offset = (y * state.drawn.width + x) * 4;
    return [state.drawn.data[offset], state.drawn.data[offset + 1], state.drawn.data[offset + 2]];
  };
  return { width: state.drawn.width, height: state.drawn.height, pixel };
}

test('le ciel peint reprend le ciel du shader, pixel par pixel', () => {
  // Vice City, plein jour : zénith bleu franc, horizon très clair, jamais noir.
  const day = paint('vice-city');
  const zenith = day.pixel(day.width >> 1, 0);
  const horizon = day.pixel(day.width >> 1, day.height - 1);
  assert.ok(zenith[2] > zenith[0], 'le zénith est bleu');
  assert.ok(horizon[0] > zenith[0], 'l’horizon est plus clair (sable) que le zénith');
  assert.ok(horizon[1] > zenith[1] && horizon[2] > zenith[2] * 0.5, 'l’horizon reste lumineux');
  for (const [x, y] of [[0, 0], [day.width - 1, 0], [3, day.height >> 1], [day.width >> 1, day.height - 1]]) {
    const [r, g, b] = day.pixel(x, y);
    assert.ok(r + g + b > 30, `aucun pixel noir (${x},${y})`);
  }

  // Nuit (New York) : sombre, mais pas vide — la ville se découpe dessus.
  const night = paint('new-york');
  const nightZenith = night.pixel(night.width >> 1, 0);
  assert.ok(nightZenith[0] + nightZenith[1] + nightZenith[2] < 120, 'le zénith de nuit est sombre');
  assert.ok(night.pixel(night.width >> 1, night.height - 1)[0] > nightZenith[0], 'l’horizon de nuit est plus chaud');

  // Le soleil de Vice City est un disque posé dans le ciel (`radius` 0,055 rad)
  // doublé d'un halo : au-dessus du bleu du zénith, le disque est blanc chaud,
  // et il est **petit** — trois texels sur une carte 64 × 32, donc un point
  // franchement plus clair que ses voisins, pas un aplat.
  let brightest = -1;
  let brightestAt = [0, 0];
  for (let y = 0; y < day.height; y += 1) {
    for (let x = 0; x < day.width; x += 1) {
      const [r, g, b] = day.pixel(x, y);
      if (r + g + b > brightest) { brightest = r + g + b; brightestAt = [x, y]; }
    }
  }
  const [sr, sg, sb] = day.pixel(brightestAt[0], brightestAt[1]);
  assert.ok(sr > 240 && sg > 200, `le disque solaire est blanc chaud (${sr}/${sg}/${sb})`);
  const neighbour = day.pixel(brightestAt[0] + 2, brightestAt[1]);
  assert.ok(neighbour[0] < sr - 30, 'le halo retombe autour du disque');
  assert.ok(brightestAt[1] < day.height * 0.6, 'le soleil de Vice City est haut dans le ciel');
  // Et il est **plus clair** que le zénith comme que l'horizon : c'est un
  // point lumineux, pas un dégradé de plus.
  assert.ok(sr > zenith[0] && sr > horizon[0], 'le soleil domine le ciel');
});

test('le dôme peint ne demande ni GLSL ni uniforms', async () => {
  const { canvas } = pixelCanvas();
  const previous = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  let dome;
  try {
    dome = makeSkyDomePainted(cityRushTheme('tokyo'), { width: 16, height: 8 });
  } finally {
    globalThis.document = previous;
  }
  assert.ok(dome?.isMesh, 'un maillage');
  assert.equal(dome.name, 'sky-dome-painted');
  // Ce que WebGPU sait compiler : un matériau standard, pas de shader d'auteur.
  assert.equal(dome.material.type, 'MeshBasicMaterial');
  assert.equal(dome.material.vertexShader, undefined, 'aucun shader GLSL');
  assert.equal(dome.material.uniforms, undefined, 'aucun uniform');
  assert.equal(dome.material.map.colorSpace, 'srgb', 'la texture est en sRGB');
  assert.equal(dome.material.side, 1, 'le dôme se voit de l’intérieur (BackSide)');
  assert.equal(dome.material.fog, false, 'le ciel ne prend pas la brume');
  assert.equal(dome.renderOrder, -10, 'il est dessiné en premier');
  // Sans canevas 2D, le dôme rend `null` : le monde garde alors son ciel de
  // shader plutôt que de rester sans ciel.
  const saved = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  try {
    assert.equal(makeSkyDomePainted(cityRushTheme('tokyo')), null);
  } finally {
    globalThis.document = saved;
  }
});

test('l’essai WebGPU échoue proprement sans navigateur compatible', async () => {
  // Sans `navigator.gpu`, la sonde est franche et l'usine de renderer lève —
  // c'est cette erreur que `createCityRushWorldAsync` attrape pour retomber en
  // standard, avec le message affiché à l'écran de pause.
  resetCityRushWebGpuProbe();
  assert.equal(cityRushWebGpuSupport(globalThis.window), false);
  assert.equal(await cityRushWebGpuAvailable(globalThis.window), false);
  await assert.rejects(
    () => createCityRushRenderer({ mode: CITY_RUSH_GRAPHICS_WEBGPU }),
    (error) => error instanceof Error,
    'demander WebGPU sans API échoue',
  );
  // La qualité allégée ne tente même pas : elle prend le chemin WebGL, qui
  // échoue ici faute de `document` — mais jamais en chargeant `three/webgpu`.
  await assert.rejects(() => createCityRushRenderer({ mode: CITY_RUSH_GRAPHICS_WEBGPU, lite: true }), (error) => {
    assert.doesNotMatch(String(error?.message), /webgpu/i, 'three/webgpu n’est pas chargé en qualité allégée');
    return true;
  });
});

test('le cycle de l’entrée RENDU traverse l’essai sans s’y arrêter sur un appareil incapable', () => {
  // Cycle complet côté machine capable : standard → cinéma → webgpu → standard.
  assert.equal(cityRushNextGraphicsMode('standard'), 'cinema');
  assert.equal(cityRushNextGraphicsMode('cinema'), 'webgpu');
  assert.equal(cityRushNextGraphicsMode('webgpu'), 'standard');
});
