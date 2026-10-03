import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les deux dégradés sont peints sur un canvas 2D : on fournit un contexte « qui
// écoute » — il accepte tout (dégradés, remplissages) et retient ce qu'on lui
// demande, là où un vrai navigateur peindrait des pixels.
const paint = { gradients: [], stops: [], fills: [] };
const context = {
  createRadialGradient: (...args) => {
    paint.gradients.push(args);
    const stops = [];
    paint.stops.push(stops);
    return { addColorStop: (offset, color) => stops.push([offset, color]) };
  },
  clearRect: () => {},
  fillRect: (...args) => paint.fills.push(args),
  fillStyle: '',
};
const canvases = [];
globalThis.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') return {};
    const canvas = { width: 0, height: 0, getContext: () => context };
    canvases.push(canvas);
    return canvas;
  },
};

const {
  makeGlowTexture,
  makeGroundShadow,
  makeHalo,
  makeShadowTexture,
} = await import('../src/games/mirageGlow.js');

/** Le dernier dégradé peint : ses rayons et ses arrêts (position 0→1, alpha). */
const lastPaint = () => {
  const stops = paint.stops[paint.stops.length - 1];
  return {
    stops,
    alphas: stops.map(([, color]) => Number(color.match(/[\d.]+\)$/)?.[0].slice(0, -1))),
  };
};

test('glow: le halo est un dégradé radial dont le bord s’éteint à zéro', () => {
  paint.gradients.length = 0;
  paint.stops.length = 0;
  const texture = makeGlowTexture();
  assert.ok(texture.isCanvasTexture, 'la texture est prête pour le GPU');
  assert.equal(canvases[canvases.length - 1].width, 128);
  assert.equal(canvases[canvases.length - 1].height, 128);
  const [cx, cy, r0, , , r1] = paint.gradients[0];
  assert.deepEqual([cx, cy, r0, r1], [64, 64, 0, 64], 'le dégradé part du centre et va jusqu’au bord');
  const { alphas } = lastPaint();
  assert.equal(alphas[0], 0.92, 'le cœur est franc');
  assert.equal(alphas[alphas.length - 1], 0, 'sans quoi le sprite serait un carré');
  for (let i = 1; i < alphas.length; i += 1) assert.ok(alphas[i] < alphas[i - 1], 'la lumière ne remonte jamais');
});

test('glow: l’ombre est le même genre de dégradé, plus pleine', () => {
  paint.stops.length = 0;
  makeShadowTexture();
  const { alphas } = lastPaint();
  assert.equal(alphas[0], 0.95);
  assert.equal(alphas[alphas.length - 1], 0);
  assert.ok(alphas[1] > 0.5, 'plus pleine au centre qu’un halo');
});

test('glow: un halo s’ajoute à la scène, ne cache rien et garde ses couleurs', () => {
  const texture = makeGlowTexture();
  const halo = makeHalo(texture, { color: 0xffdc6b, size: 1.9, opacity: 0.34 });
  assert.ok(halo.isSprite, 'toujours face à la caméra, quel que soit le virage du cristal');
  assert.equal(halo.material.map, texture);
  assert.equal(halo.material.blending, THREE.AdditiveBlending, 'la lumière s’ajoute au sable');
  assert.equal(halo.material.depthWrite, false, 'un halo ne masque jamais la piste');
  assert.equal(halo.material.toneMapped, false, 'la couleur reste celle du cristal');
  assert.equal(halo.material.transparent, true);
  assert.equal(halo.material.opacity, 0.34);
  assert.deepEqual([halo.scale.x, halo.scale.y], [1.9, 1.9]);
  assert.equal(halo.visible, true);
  assert.equal(halo.userData.glow, true, 'un halo ne se fige pas dans le décor (bakeStaticScenery)');
});

test('glow: une ombre au sol est couchée à plat, éteinte par défaut et qui suit son porteur', () => {
  const texture = makeShadowTexture();
  const shadow = makeGroundShadow(texture, { size: 1.16, opacity: 0.4 });
  assert.ok(shadow.isMesh);
  assert.equal(shadow.material.map, texture);
  assert.equal(shadow.material.transparent, true);
  assert.equal(shadow.material.depthWrite, false);
  assert.equal(shadow.rotation.x, -Math.PI / 2, 'posée au sol, pas debout');
  assert.equal(shadow.visible, false, 'invisible tant que le cavalier ne l’a pas placée');
  assert.deepEqual(
    [shadow.geometry.parameters.width, shadow.geometry.parameters.height],
    [1.16, 1.16],
    'c’est l’appelant qui l’allonge (un cheval projette une ombre plus longue que large)',
  );
});

test('glow: chaque monde 3D reçoit ses propres textures', () => {
  const first = { glow: makeGlowTexture(), shadow: makeShadowTexture() };
  const second = { glow: makeGlowTexture(), shadow: makeShadowTexture() };
  assert.notEqual(first.glow, second.glow);
  assert.notEqual(first.shadow, second.shadow);
  assert.notEqual(first.glow.image, second.glow.image, 'deux canvas distincts');
  // La libération d'un monde ne doit pas éteindre les halos de l'autre.
  first.glow.dispose();
  first.shadow.dispose();
  assert.equal(second.glow.image.width, 128);
});
