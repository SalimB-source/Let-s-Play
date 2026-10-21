import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RPG_PLATEAUX, plateauParId } from '../src/games/rpgPlateaux.js';
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
import { existsSync, readFileSync } from 'node:fs';
import { buildTableGeometry, coverTransform, rimHeight, tableObjectTransform, tileableNoise } from '../src/games/rpgTableScene.js';
import { RPG_TABLE_OBJECT_KINDS, createTableObject, disposeTableObject, updateTableObject } from '../src/games/rpgTableObjects.js';
import { tablePlaqueFile } from '../src/games/rpgTableSceneThemes.js';

test('la cour de l’Empereur garde sa peinture : des pétales, aucun objet 3D', () => {
  const plateau = plateauParId('cour-de-l-empereur');
  const theme = tableSceneTheme(plateau.id);
  // Les accessoires du palais (portes, galeries, tambour, bannières, bassin,
  // pins, cerisiers) sont peints : rien n'est reconstruit en 3D, donc la
  // peinture sert de plan.
  assert.deepEqual(theme.objets, []);
  assert.equal(theme.plaque, null);
  assert.equal(theme.paintZoom, 1.16, 'la Cour seule rapproche la peinture');
  assert.equal(tablePlaqueFile(plateau), plateau.fichier);
  const feuille = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(feuille, /\.card-table--plateau-cour-de-l-empereur::before[\s\S]*?transform:\s*scale\(1\.16\)/,
    'le fond CSS de repli garde le même zoom que WebGL');
  // Les pétales de cerisier tombent en dérivant, comme la neige du fjord.
  const petals = theme.particles;
  assert.ok(petals.vy < 0, 'les pétales descendent');
  assert.ok(petals.vx > 0, 'le vent les pousse vers la droite');
  const item = particleLayout(petals, 1, 3)[0];
  assert.ok(particleAt(petals, item, 3).y < item.y, 'la chute se voit');
  // Le jour se lève sur le parvis : la lumière vient de la droite.
  assert.ok(theme.keyDirection[0] > 0 && theme.keyDirection[1] > 0, ' lumière du matin');
});

test('le navire pirate éclaire son pont par quatre fanaux d’angle et ses embruns marins', () => {
  const plateau = plateauParId('navire-pirate');
  const theme = tableSceneTheme(plateau.id);
  assert.deepEqual(theme.objets, []);
  assert.equal(theme.plaque, null);
  assert.equal(tablePlaqueFile(plateau), 'plateau-navire-pirate.jpg');
  assert.equal(theme.lights.length, 4, 'les quatre fanaux peints aux angles scintillent en 3D');
  assert.ok(theme.lights.every((lamp) => lamp.flicker > 0), 'chaque fanal vacille légèrement');
  assert.ok(theme.particles.vx > 0, 'la brise du large pousse les embruns le long du pont');
});

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
  const close = coverTransform(2, 1.5, 1.16);
  assert.ok(close.repeatX < wide.repeatX && close.repeatY < wide.repeatY, 'un zoom resserre le recadrage');
  assert.ok(Math.abs(close.offsetX - (1 - close.repeatX) / 2) < 1e-9);
  assert.ok(Math.abs(close.offsetY - (1 - close.repeatY) / 2) < 1e-9, 'le zoom reste centré');
});

test('la table est plate au centre, relevée au bord, avec des normales valides', () => {
  const geometry = buildTableGeometry(10, 6);
  try {
    const positions = geometry.attributes.position;
    let centre = 0, rim = 0, flat = 0;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      assert.ok(Number.isFinite(z) && z >= 0 && z <= 0.12);
      const edge = Math.max(Math.abs(x) / 5, Math.abs(y) / 3);
      if (edge < 0.8) { flat += 1; assert.equal(z, 0, 'la peinture reste à plat sous les cartes'); }
      if (edge < 0.05) centre = Math.max(centre, z);
      if (edge > 0.99) rim = Math.max(rim, z);
    }
    assert.ok(flat > 500 && centre === 0 && rim > 0.08, 'bord relevé seulement');
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

const jpegSize = (file) => {
  // Lit la taille d'un JPEG sans dépendance : premier marqueur SOFn.
  const data = readFileSync(file);
  for (let i = 2; i < data.length;) {
    if (data[i] !== 0xff) { i += 1; continue; }
    const marker = data[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) };
    i += 2 + data.readUInt16BE(i + 2);
  }
  return null;
};

test('les objets 3D déclarés sont valides, et chacun a sa peinture « vide »', () => {
  for (const [id, theme] of Object.entries(RPG_TABLE_SCENE_THEMES)) {
    const plateau = RPG_PLATEAUX.find((candidate) => candidate.id === id);
    assert.ok(Object.isFrozen(theme.objets), `${id} : objets gelés`);
    if (!theme.objets.length) {
      assert.equal(theme.plaque, null, `${id} : pas d'objets, donc la peinture d'origine sert de plan`);
      assert.equal(tablePlaqueFile(plateau), plateau.fichier);
      continue;
    }
    // Des objets 3D sans plaque vide feraient deux objets : le peint et le 3D.
    assert.ok(theme.plaque, `${id} : des objets exigent la plaque sans les objets peints`);
    assert.notEqual(theme.plaque, plateau.fichier, `${id} : la plaque n'est pas la peinture d'origine`);
    assert.equal(tablePlaqueFile(plateau), theme.plaque);
    const file = new URL(`../public/${theme.plaque}`, import.meta.url);
    assert.ok(existsSync(file), `${id} : ${theme.plaque} existe`);
    const size = jpegSize(file);
    assert.ok(size && Math.abs(size.width / size.height - 1.5) < 0.01, `${id} : plaque en 3:2 comme la peinture (${JSON.stringify(size)})`);
    assert.ok(size.width <= 2048, `${id} : plaque bornée à 2048 px (c'est la taille de texture maximale)`);
    assert.ok(theme.objets.length <= 24, `${id} : au plus vingt-quatre objets`);
    for (const objet of theme.objets) {
      assert.ok(RPG_TABLE_OBJECT_KINDS.includes(objet.kind), `${id} : genre ${objet.kind} connu`);
      assert.ok(objet.u >= -0.05 && objet.u <= 1.05 && objet.v >= -0.05 && objet.v <= 1.05, `${id}/${objet.kind} : dans l'image`);
      assert.ok(objet.size > 0.015 && objet.size <= 0.4, `${id}/${objet.kind} : taille plausible`);
      assert.ok(Number.isFinite(objet.angle));
    }
  }
  assert.ok(RPG_TABLE_SCENE_THEMES['erg-du-sahara'].objets.length >= 5, 'le pilote : lanterne, gourde, galets, bol et corde');
});

test('chaque objet se construit sous Node, posé au sol, borné et sans valeur invalide', () => {
  assert.equal(createTableObject('licorne'), null);
  // Le catalogue grandit avec les plateaux : on exige les genres déjà livrés, pas une liste figée.
  for (const kind of ['astrolabe', 'baton', 'corde-chanvre', 'rose-rouge', 'rose-verte', 'rose-rose', 'rose-mauve', 'sapin', 'rocher', 'bol', 'compas', 'cor', 'corde', 'corde-brune', 'galets', 'gourde', 'hache', 'lanterne', 'lanterne-fer', 'tapis']) {
    assert.ok(RPG_TABLE_OBJECT_KINDS.includes(kind), `genre livré : ${kind}`);
  }
  const byKind = {};
  for (const kind of RPG_TABLE_OBJECT_KINDS) {
    let triangles = 0;
    const group = createTableObject(kind);
    try {
      const bounds = new THREE.Box3().setFromObject(group);
      const size = bounds.getSize(new THREE.Vector3());
      const { extent } = group.userData;
      assert.equal(group.userData.kind, kind);
      assert.ok(bounds.min.z >= -0.03, `${kind} : ne s'enfonce pas dans la table (${bounds.min.z})`);
      assert.ok(bounds.min.z <= 0.03, `${kind} : ne flotte pas (${bounds.min.z})`);
      assert.ok(size.z < Math.max(size.x, size.y), `${kind} : posé à plat, pas dressé`);
      // La plus grande dimension suit l'`extent` annoncé : c'est lui qui règle l'échelle à l'écran.
      assert.ok(Math.max(size.x, size.y) / extent > 0.6 && Math.max(size.x, size.y) / extent < 2.6, `${kind} : encombrement ${Math.max(size.x, size.y)} pour extent ${extent}`);
      group.traverse((part) => {
        if (!part.isMesh) return;
        triangles += (part.geometry.index ? part.geometry.index.count : part.geometry.attributes.position.count) / 3;
        for (const attribute of Object.values(part.geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite), `${kind}/${part.name} : aucun sommet invalide`);
        assert.ok(part.geometry.attributes.normal, `${kind}/${part.name} : réagit à la lumière`);
        for (const material of [].concat(part.material)) {
          for (const value of Object.values(material)) if (value?.isTexture) assert.ok(value.isDataTexture, `${kind} : textures locales, sans image à charger`);
        }
      });
      byKind[kind] = triangles;
      assert.ok(triangles > 100 && triangles < 20000, `${kind} : ${triangles} triangles`);
    } finally { disposeTableObject(group); }
  }
  // Le budget se tient par plateau : c'est lui qui est dessiné en même temps.
  for (const [id, theme] of Object.entries(RPG_TABLE_SCENE_THEMES)) {
    const total = theme.objets.reduce((sum, objet) => sum + byKind[objet.kind], 0);
    assert.ok(total < 60000, `${id} : budget de géométrie des objets : ${total} triangles`);
  }
});

test('les objets font de l\'ombre, sauf le verre ; seule la lanterne vit', () => {
  const lantern = createTableObject('lanterne');
  try {
    const glass = lantern.getObjectByName('globe');
    assert.equal(glass.castShadow, false, 'le verre ne projette pas d\'ombre pleine');
    assert.equal(lantern.getObjectByName('pied').castShadow, true);
    const lamp = lantern.getObjectByName('lueur');
    const values = [];
    for (let t = 0; t < 6; t += 0.37) { updateTableObject(lantern, t, 1.9); values.push(lamp.intensity); }
    assert.ok(Math.max(...values) - Math.min(...values) > 0.05, 'la flamme vacille');
    assert.ok(values.every((value) => value > 0.5 && value < 1.4), 'sans jamais s\'éteindre ni aveugler');
  } finally { disposeTableObject(lantern); }
  const bowl = createTableObject('bol');
  assert.doesNotThrow(() => updateTableObject(bowl, 3), 'un objet inerte ignore l\'animation');
  disposeTableObject(bowl);
});

test('disposeTableObject libère géométries, matériaux et textures', () => {
  const group = createTableObject('gourde');
  const freed = new Set();
  group.traverse((part) => {
    if (part.geometry) part.geometry.addEventListener('dispose', () => freed.add(part.geometry));
    for (const material of [].concat(part.material ?? [])) {
      material.addEventListener('dispose', () => freed.add(material));
      for (const value of Object.values(material)) if (value?.isTexture) value.addEventListener('dispose', () => freed.add(value));
    }
  });
  disposeTableObject(group);
  let meshes = 0;
  group.traverse((part) => { if (part.isMesh) meshes += 1; });
  assert.ok(freed.size >= meshes * 2, `${freed.size} ressources libérées pour ${meshes} maillages`);
});

test('un objet reste collé à son emplacement peint, à toutes les tailles d\'écran', () => {
  const lantern = RPG_TABLE_SCENE_THEMES['erg-du-sahara'].objets.find((objet) => objet.kind === 'lanterne');
  const imageAspect = 1.5;
  const place = (aspect, spec = lantern) => {
    const planeHeight = 5.16, planeWidth = planeHeight * aspect;
    const cover = coverTransform(aspect, imageAspect);
    return { planeWidth, planeHeight, cover, result: tableObjectTransform(spec, { planeWidth, planeHeight, cover, imageAspect }) };
  };
  // Aux deux bouts du cadrage : le coin bas-gauche de l'image reste en bas à gauche.
  for (const aspect of [1, 1.5, 16 / 9, 2.4]) {
    const { planeWidth, planeHeight, result } = place(aspect);
    assert.ok(result.x < 0 && result.y < 0, `${aspect} : en bas à gauche`);
    // Écran carré ou ultra-large : l'image est rognée, la lanterne (près du bord) sort du cadre — comme sa peinture.
    if (aspect >= 1.5 && aspect <= 16 / 9) assert.ok(Math.abs(result.x) <= planeWidth / 2 * 1.3 && Math.abs(result.y) <= planeHeight / 2 * 1.3, `${aspect} : près du cadre`);
    assert.ok(result.z >= rimHeight(result.x, result.y, planeWidth, planeHeight) - 1e-9, `${aspect} : jamais sous le rebord de la table`);
    assert.ok(result.z <= 0.1, `${aspect} : pas en lévitation`);
    assert.equal(result.normal, undefined, 'posé à plat : le plan tangent d\'une cuvette passe sous la table');
  }
  // À 3:2 l'image remplit exactement le plan : taille = fraction de la largeur.
  const exact = place(1.5);
  assert.ok(Math.abs(exact.result.size - lantern.size * exact.planeWidth) < 1e-9);
  assert.ok(Math.abs(exact.result.x - (lantern.u - 0.5) * exact.planeWidth) < 1e-9, 'exactement où la peinture le disait');
  // Écran plus large : l'image déborde en largeur, l'objet grandit avec elle.
  assert.ok(place(16 / 9).result.size > exact.result.size);
  // Écran plus étroit : l'image est rognée sur les côtés, la taille suit la hauteur.
  const narrow = place(1);
  assert.ok(Math.abs(narrow.result.size - lantern.size * narrow.planeHeight * 1.5) < 1e-9);
  // Les objets de droite restent à droite.
  const bowl = RPG_TABLE_SCENE_THEMES['erg-du-sahara'].objets.find((objet) => objet.kind === 'bol');
  assert.ok(place(16 / 9, bowl).result.x > 0 && place(16 / 9, bowl).result.y < 0);
});
