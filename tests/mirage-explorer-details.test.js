import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CHARACTER_NAMES, CHARACTER_PALETTES, CLOUD_CHOCOBO_INDEX, LINK_EPONA_INDEX } from '../src/games/mirageCharacters.js';
import { disposeExplorer, makeExplorer, orientExplorerForRace, paintModel, RACE_EXPLORER_YAW } from '../src/games/mirageExplorer.js';

/**
 * Les détails du cavalier et de sa monture : visage, crinière, harnachement.
 * Ils ne se jugent vraiment qu'à l'œil en jeu, mais on peut garantir ici qu'ils
 * sont bien là, qu'ils suivent la palette du skin, que Cloud et Link gardent
 * leur propre tête — et que tout ce détail ne se paie pas en appels de dessin.
 */
const world = readFileSync(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../src/games/mirageSkinRenderer.js', import.meta.url), 'utf8');
const trophy = readFileSync(new URL('../src/games/mirageTrophyScene.js', import.meta.url), 'utf8');

/** Les deux yeux, communs à toutes les robes : jamais pris dans la palette. */
const EYE_WHITE = 0xfdf6e6;
const EYE_DARK = 0x1b1417;

function meshCount(group) {
  let count = 0;
  group.traverse((node) => { if (node.isMesh) count += 1; });
  return count;
}

function triangleCount(group) {
  let count = 0;
  group.traverse((node) => {
    if (!node.isMesh) return;
    count += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
  });
  return count;
}

function colorsOf(group) {
  const colors = new Set();
  group.traverse((node) => { if (node.isMesh) colors.add(node.material.color.getHex()); });
  return colors;
}

test('la monture a un visage : yeux, naseaux, museau et liste sur le chanfrein', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const head = model.userData.parts.horseHead;
    assert.ok(head, 'la tête est exposée : c’est elle qui hoche au galop');
    assert.equal(head.name, 'horse-head');
    const colors = colorsOf(head);
    assert.ok(colors.has(EYE_WHITE) && colors.has(EYE_DARK), 'un œil et un naseau de chaque côté');
    assert.equal(meshCount(head), 8, 'huit matières fusionnées : robe, nuances, crins, liste, bride, œil, pupille');
    assert.ok(triangleCount(head) >= 180, 'museau, oreilles et crinière en trois mèches');
  } finally {
    disposeExplorer(model);
  }
});

test('le cavalier a un visage : yeux, bandana remonté sur le nez et nœud dans la nuque', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const face = model.userData.parts.face;
    assert.ok(face, 'le visage est un groupe à part, que Cloud et Link remplacent');
    assert.equal(face.name, 'rider-face');
    assert.equal(face.visible, true, 'le cow-boy de base le porte');
    const colors = colorsOf(face);
    assert.ok(colors.has(EYE_WHITE) && colors.has(EYE_DARK), 'deux yeux');
    assert.equal(meshCount(face), 3, 'les yeux, le bandana et son nœud');
    // Le nœud est dans le dos : c’est ce que voit la caméra de course.
    assert.ok(triangleCount(face) >= 72);
  } finally {
    disposeExplorer(model);
  }
});

test('Cloud et Link remplacent le visage du cow-boy au lieu de le porter sous le leur', () => {
  for (const index of [CLOUD_CHOCOBO_INDEX, LINK_EPONA_INDEX]) {
    const model = makeExplorer(false, CHARACTER_PALETTES[index]);
    try {
      assert.equal(model.userData.parts.face.visible, false, `${CHARACTER_NAMES[index]} a sa propre tête`);
      paintModel(model, CHARACTER_PALETTES[0]);
      assert.equal(model.userData.parts.face.visible, true, 'et le revoit en quittant le skin');
    } finally {
      disposeExplorer(model);
    }
  }
});

test('le relief de la robe suit la palette : les tons dérivés se recalculent au changement de skin', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const derived = model.userData.derived;
    assert.equal(derived.length, 3, 'poitrail, arrière-main et crins');
    const before = derived.map(({ material }) => material.color.clone());
    paintModel(model, CHARACTER_PALETTES[2]);
    derived.forEach(({ material, source, factor }, i) => {
      const base = model.userData.materials[source].color;
      assert.ok(Math.abs(material.color.r - base.r * factor) < 1e-6, 'la nuance reste un ton de sa couleur source');
      assert.notEqual(material.color.getHex(), before[i].getHex(), 'et elle a bien suivi le skin');
    });
    // Aucune de ces nuances n’est une couleur de la palette : elles n’en ajoutent pas.
    for (const { material } of derived) {
      assert.equal(model.userData.materials.includes(material), false);
    }
  } finally {
    disposeExplorer(model);
  }
});

test('le détail est fusionné : un cavalier tient sous cinquante appels de dessin', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const parts = model.userData.parts;
    // Un mesh par matière dans le corps et la tête : les blocs fixes sont soudés.
    assert.equal(meshCount(parts.horseBody), colorsOf(parts.horseBody).size);
    assert.equal(meshCount(parts.horseHead), colorsOf(parts.horseHead).size);
    assert.equal(meshCount(model), 48, 'les jambes, la queue, la cape, les bras et le chapeau restent à part');
    assert.ok(triangleCount(model) >= 1000, '…sans avoir perdu le détail');
  } finally {
    disposeExplorer(model);
  }
});

test('les jambes descendent le long des flancs : plus rien ne dépasse sur les côtés', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const parts = model.userData.parts;
    model.updateMatrixWorld(true);
    const trouserMesh = parts.riderBody.children.find((child) => (
      child.isMesh && child.material === model.userData.materials[2] && child !== parts.cape
    ));
    assert.ok(trouserMesh, 'les jambes sont fusionnées avec les pièces en tissu pour préserver le budget de rendu');
    const bounds = new THREE.Box3().setFromObject(trouserMesh);
    assert.ok(bounds.max.x < 0.66 && bounds.min.x > -0.66, 'bottes et manchettes restent dans la silhouette de la monture');
    assert.ok(bounds.max.x > 0.5, 'la jambe reste posée sur le flanc, lisible de profil');
  } finally {
    disposeExplorer(model);
  }
});

test('les modèles du joueur, des rivaux et des joueurs en ligne reçoivent le yaw de course', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    assert.equal(model.rotation.y, 0, 'les aperçus 3D gardent leur orientation propre');
    assert.equal(orientExplorerForRace(model), model, 'le helper garde la même instance');
    assert.equal(model.rotation.y, RACE_EXPLORER_YAW);
    assert.equal((world.match(/orientExplorerForRace\(makeExplorer/g) || []).length, 3, 'les trois types de cavaliers sont orientés en piste');
  } finally {
    disposeExplorer(model);
  }
});

test('les sabots sont de la corne, pas des crins : une robe à crins clairs garde ses sabots sombres', () => {
  // L'Ombre (crins argentés) et Sauge (crins bruns) : la palette ne doit pas
  // décider de la couleur du sabot.
  for (const index of [1, 2]) {
    const model = makeExplorer(false, CHARACTER_PALETTES[index]);
    try {
      const hooves = new Set();
      for (const leg of model.userData.parts.legs) {
        for (const mesh of leg.userData.knee.children) {
          if (mesh.isMesh) hooves.add(mesh.material.color.getHex());
        }
      }
      assert.ok(hooves.has(0x2e1d16), `sabot de corne attendu sur ${CHARACTER_NAMES[index]}`);
      const mane = model.userData.materials[1].color.getHex();
      assert.equal(hooves.has(mane), false, 'et surtout pas la couleur des crins');
    } finally {
      disposeExplorer(model);
    }
  }
});

test('chaque jambe a un genou : le sabot se replie au galop sans passer sous le sol', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const legs = model.userData.parts.legs;
    assert.equal(legs.length, 4);
    for (const leg of legs) {
      assert.ok(leg.userData.knee, 'la cuisse porte son genou');
      assert.equal(leg.userData.knee.name, 'horse-knee');
      assert.equal(leg.userData.knee.parent, leg);
    }
    const box = new THREE.Box3();
    model.updateMatrixWorld(true);
    model.traverse((node) => { if (node.isMesh) box.expandByObject(node); });
    assert.ok(box.min.y > 0.02 && box.min.y < 0.05, 'les sabots reposent au sol, comme avant le genou');
    const knee = legs[0].userData.knee;
    knee.rotation.x = -0.5; // le sabot se replie sous la jambe, comme au galop
    model.updateMatrixWorld(true);
    const hoof = new THREE.Box3().setFromObject(knee);
    assert.ok(hoof.min.y > 0, 'un genou plié lève le sabot, il ne le plante pas dans la piste');
  } finally {
    disposeExplorer(model);
  }
});

test('les montures de la boutique ont le même genou : Épona et le chocobo', () => {
  for (const [index, legs] of [[CLOUD_CHOCOBO_INDEX, 2], [LINK_EPONA_INDEX, 4]]) {
    const model = makeExplorer(false, CHARACTER_PALETTES[index]);
    try {
      const parts = model.userData.parts;
      assert.equal(parts.legs.length, legs);
      for (const leg of parts.legs) {
        assert.ok(leg.userData.knee, `${CHARACTER_NAMES[index]} : chaque jambe a son jarret`);
      }
      const box = new THREE.Box3();
      model.updateMatrixWorld(true);
      model.traverse((node) => { if (node.isMesh) box.expandByObject(node); });
      assert.ok(box.min.y > 0.02 && box.min.y < 0.05, 'et ses pieds reposent au sol');
    } finally {
      disposeExplorer(model);
    }
  }
});

test('les pièces animées ne sont jamais soudées : queue, pan de cape, bras et cavalier', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const parts = model.userData.parts;
    assert.equal(parts.horseTail.name, 'horse-tail');
    assert.equal(parts.horseTail.isGroup, true);
    assert.ok(Math.abs(parts.horseTail.rotation.x + 0.35) < 1e-6, 'l’inclinaison de base que la vignette reprend');
    assert.equal(parts.capeFlap.name, 'cape-flap');
    assert.equal(parts.armGroup.name, 'rider-arms');
    assert.equal(parts.cape.isMesh, true, 'la cape bat au galop : elle n’est pas dans le corps soudé');
    assert.equal(parts.cape.parent, parts.riderBody);
    assert.equal(parts.legs.length, 4);
  } finally {
    disposeExplorer(model);
  }
});

test('les skins de la boutique restent sous le plafond de coût (jusqu’à huit cavaliers à l’écran)', () => {
  const ceilings = [[0, 50], [4, 66], [5, 108], [6, 156]];
  for (const [index, ceiling] of ceilings) {
    const model = makeExplorer(false, CHARACTER_PALETTES[index]);
    try {
      assert.ok(meshCount(model) <= ceiling, `${CHARACTER_NAMES[index]} : ${meshCount(model)} meshes > ${ceiling}`);
    } finally {
      disposeExplorer(model);
    }
  }
});

test('câblage : le monde anime la tête, les rênes et le pan de cape, joueur comme rivaux', () => {
  assert.match(world, /if \(parts\.horseHead\?\.visible\)/, 'la tête ne hoche pas sous Cloud ou Link');
  assert.match(world, /parts\.armGroup\.rotation\.x/, 'les bras tirent sur les rênes');
  assert.match(world, /const knee = leg\.userData\.knee/, 'le genou se plie à chaque foulée');
  assert.match(world, /knee\.rotation\.x = index < 2 \? 0 : -0\.6/, 'au saut, les postérieurs se replient');
  assert.match(world, /parts\.capeFlap\.rotation\.x/, 'le pan de cape bat au rythme du galop');
  assert.match(world, /if \(rivalParts\.horseHead\?\.visible\)/, 'et les rivaux ont la même vie');
  assert.match(world, /rivalParts\.capeFlap\.rotation\.x/);
});

test('câblage : les vignettes de skin animent les mêmes pièces, sans écraser la queue', () => {
  assert.match(preview, /capeFlap, horseHead, armGroup/, 'les pièces sont récupérées des parts');
  assert.match(preview, /capeFlap\.rotation\.x/);
  assert.match(preview, /horseHead\.rotation\.x/);
  assert.match(preview, /leg\.userData\.knee\.rotation\.x/);
  assert.match(preview, /tail\.rotation\.x = -0\.35 \+ Math\.sin/, 'la queue garde sa base de −0,35');
});

test('câblage : le vainqueur de la coupe salue lui aussi', () => {
  assert.match(trophy, /parts\.horseHead\?\.visible/, 'la tête hoche sur le podium');
  assert.match(trophy, /parts\.capeFlap\.rotation\.x/);
  assert.match(trophy, /parts\.armGroup\.rotation\.x/);
  assert.match(trophy, /leg\.userData\.knee\.rotation\.x/);
});
