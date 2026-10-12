import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RPG_PLATEAUX } from '../src/games/rpgPlateaux.js';
import {
  RPG_TABLE_3D_KEY,
  RPG_TABLE_SCENE_THEMES,
  particleAt,
  particleLayout,
  plateauxSansDecor3d,
  readRpgTable3dPref,
  tableSceneBudget,
  tableSceneTheme,
  writeRpgTable3dPref,
} from '../src/games/rpgTableSceneThemes.js';
import { buildTableGeometry, coverTransform, tileableNoise } from '../src/games/rpgTableScene.js';

test('chaque plateau du catalogue a son décor 3D, et seulement eux', () => {
  assert.deepEqual(plateauxSansDecor3d(), []);
  assert.deepEqual(Object.keys(RPG_TABLE_SCENE_THEMES).sort(), RPG_PLATEAUX.map((plateau) => plateau.id).sort());
  // Un identifiant inconnu retombe sur la table d'origine, jamais sur undefined.
  assert.equal(tableSceneTheme('plateau-inconnu'), RPG_TABLE_SCENE_THEMES['table-des-heures']);
  assert.equal(tableSceneTheme(undefined), RPG_TABLE_SCENE_THEMES['table-des-heures']);
});

test('les ambiances sont distinctes et leurs réglages restent dans les bornes', () => {
  const signatures = new Set();
  for (const [id, theme] of Object.entries(RPG_TABLE_SCENE_THEMES)) {
    // La peinture garde sa luminosité d'origine : ambiante + clé ≈ 1 en face.
    const exposure = theme.ambientIntensity + theme.keyIntensity;
    assert.ok(exposure > 0.9 && exposure < 1.2, `${id} : exposition ${exposure}`);
    assert.ok(theme.relief > 0 && theme.relief <= 2, `${id} : relief`);
    assert.ok(theme.roughness >= 0.2 && theme.roughness <= 1, `${id} : rugosité`);
    assert.ok(Object.isFrozen(theme), `${id} : thème gelé`);
    for (const lamp of theme.lights) {
      assert.ok(Math.abs(lamp.x) <= 1 && Math.abs(lamp.y) <= 1, `${id} : lampe dans la table`);
      assert.ok(lamp.intensity > 0 && lamp.intensity <= 6, `${id} : intensité de lampe`);
      assert.ok(lamp.flicker + lamp.pulse < 0.95, `${id} : une lampe ne s'éteint pas complètement`);
    }
    assert.ok(theme.lights.length <= 4, `${id} : au plus quatre lampes (coût du fragment shader)`);
    const motes = theme.particles;
    assert.ok(motes.count > 0 && motes.count <= 100, `${id} : budget de particules`);
    assert.ok(motes.opacity > 0 && motes.opacity <= 0.9);
    if (theme.overlay) {
      assert.ok(['ombre', 'caustiques'].includes(theme.overlay.kind));
      assert.ok(theme.overlay.opacity > 0 && theme.overlay.opacity <= 0.25, `${id} : un voile qui ne gêne pas les textes`);
    }
    signatures.add(JSON.stringify([theme.key, theme.lights.length, motes.color, motes.vx, motes.vy, theme.overlay?.kind]));
  }
  assert.equal(signatures.size, RPG_PLATEAUX.length, 'neuf ambiances, pas neuf recolorations');
});

test('les particules sont déterministes, bornées et se replient dans la table', () => {
  const theme = tableSceneTheme('fjord-des-neuf-hivers');
  const a = particleLayout(theme.particles, 1, 7);
  const b = particleLayout(theme.particles, 1, 7);
  assert.deepEqual(a, b, 'même ciel à chaque ouverture');
  assert.equal(a.length, theme.particles.count);
  assert.equal(particleLayout(theme.particles, 0.5, 7).length, Math.round(theme.particles.count * 0.5));
  assert.equal(particleLayout(theme.particles, 0, 7).length, 0);
  assert.equal(particleLayout(null, 1, 7).length, 0);
  for (const item of a) {
    assert.ok(item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1 && item.z > 0);
    // Une longue partie (3 h) ne fait ni sortir ni dériver les particules.
    for (const t of [0, 1.5, 60, 3600, 3 * 3600]) {
      const at = particleAt(theme.particles, item, t);
      assert.ok(at.x >= -0.1 && at.x <= 1.1 && at.y >= -0.1 && at.y <= 1.1, `t=${t} : (${at.x}, ${at.y})`);
    }
  }
  const sample = a[0];
  const start = particleAt(theme.particles, sample, 0);
  assert.ok(Math.abs(start.x - sample.x) < 0.02 + theme.particles.sway * 0.1 && Math.abs(start.y - sample.y) < 1e-9);
  // La neige tombe, les bulles montent.
  const later = particleAt(theme.particles, { ...sample, y: 0.5 }, 2);
  assert.ok(later.y < 0.5, 'la neige descend');
  const bubble = tableSceneTheme('abysses-phosphorescentes').particles;
  assert.ok(particleAt(bubble, { ...sample, y: 0.5 }, 2).y > 0.5, 'les bulles montent');
});

test('le budget de rendu borne les pixels, la cadence et les particules', () => {
  const desktop = tableSceneBudget({ width: 2560, height: 1440, devicePixelRatio: 2 });
  assert.ok(desktop.pixelRatio * 2560 * desktop.pixelRatio * 1440 <= 900000 * 1.03, 'environ 900 000 pixels au plus (plancher de ratio 0,5)');
  assert.equal(desktop.particles, 1);
  const phone = tableSceneBudget({ width: 844, height: 390, devicePixelRatio: 3, coarse: true });
  assert.ok(phone.pixelRatio <= 1.25);
  assert.ok(phone.particles < desktop.particles && phone.fps <= 30 && phone.textureSize <= 1536);
  const small = tableSceneBudget({ width: 568, height: 320, devicePixelRatio: 1 });
  assert.equal(small.pixelRatio, 1, 'une petite fenêtre garde sa netteté native');
  const slow1 = tableSceneBudget({ width: 1280, height: 720, devicePixelRatio: 1, degraded: 1 });
  const slow2 = tableSceneBudget({ width: 1280, height: 720, devicePixelRatio: 1, degraded: 2 });
  assert.ok(slow1.particles < 1 && slow1.fps <= 30);
  assert.equal(slow2.particles, 0, 'second palier : plus de particules');
  const huge = tableSceneBudget({ width: 7680, height: 4320, devicePixelRatio: 2 });
  assert.ok(huge.pixelRatio >= 0.5);
});

test('le cadrage de la peinture est un « cover » centré, comme le fond CSS', () => {
  // Fenêtre plus large que l'image 3:2 : on rogne en hauteur, centré.
  const wide = coverTransform(2, 1.5);
  assert.equal(wide.repeatX, 1);
  assert.ok(Math.abs(wide.repeatY - 0.75) < 1e-9 && Math.abs(wide.offsetY - 0.125) < 1e-9 && wide.offsetX === 0);
  // Fenêtre plus étroite (téléphone portrait) : on rogne en largeur.
  const narrow = coverTransform(1, 1.5);
  assert.equal(narrow.repeatY, 1);
  assert.ok(Math.abs(narrow.repeatX - 2 / 3) < 1e-9 && Math.abs(narrow.offsetX - 1 / 6) < 1e-9);
  const same = coverTransform(1.5, 1.5);
  assert.deepEqual([same.repeatX, same.repeatY, same.offsetX, same.offsetY], [1, 1, 0, 0]);
});

test('la table est plate au centre, relevée au bord, avec des normales valides', () => {
  const geometry = buildTableGeometry(10, 6);
  try {
    const positions = geometry.attributes.position;
    let centre = 0, rim = 0, flat = 0;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      assert.ok(Number.isFinite(z) && z >= 0 && z <= 0.25);
      const edge = Math.max(Math.abs(x) / 5, Math.abs(y) / 3);
      if (edge < 0.8) { flat += 1; assert.equal(z, 0, 'la peinture reste à plat sous les cartes'); }
      if (edge < 0.05) centre = Math.max(centre, z);
      if (edge > 0.99) rim = Math.max(rim, z);
    }
    assert.ok(flat > 500 && centre === 0 && rim > 0.2, 'bord relevé seulement');
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
    assert.ok(geometry.attributes.uv, 'les UV portent la peinture');
  } finally { geometry.dispose(); }
});

test('les bruits de nuages et de caustiques sont locaux, raccordables et utiles', () => {
  for (const kind of ['ombre', 'caustiques']) {
    const texture = tileableNoise(kind);
    try {
      assert.ok(texture.isDataTexture, 'généré localement, sans image à charger');
      assert.equal(texture.wrapS, THREE.RepeatWrapping);
      const { data, width } = texture.image;
      const tone = (x, y) => data[(y * width + x) * 4];
      // Raccord : la dernière colonne est aussi proche de la première que de sa voisine.
      let seam = 0, inner = 0;
      for (let y = 0; y < width; y += 1) {
        seam += Math.abs(tone(width - 1, y) - tone(0, y));
        inner += Math.abs(tone(width - 2, y) - tone(width - 1, y));
      }
      assert.ok(seam <= inner * 3 + width * 8, `${kind} : raccord sans couture (${seam} vs ${inner})`);
      const values = new Set();
      for (let i = 0; i < data.length; i += 4) values.add(data[i]);
      assert.ok(values.size > 12, `${kind} : un vrai dégradé, pas un aplat`);
    } finally { texture.dispose(); }
  }
});

test('la préférence du décor 3D est mémorisée, et activée par défaut', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.equal(readRpgTable3dPref(storage), true, 'activé par défaut');
  writeRpgTable3dPref(false, storage);
  assert.equal(memory.get(RPG_TABLE_3D_KEY), 'off');
  assert.equal(readRpgTable3dPref(storage), false);
  writeRpgTable3dPref(true, storage);
  assert.equal(readRpgTable3dPref(storage), true);
  const broken = { getItem() { throw new Error('refusé'); }, setItem() { throw new Error('refusé'); } };
  assert.equal(readRpgTable3dPref(broken), true, 'stockage refusé : le décor reste actif');
  assert.doesNotThrow(() => writeRpgTable3dPref(false, broken));
});
