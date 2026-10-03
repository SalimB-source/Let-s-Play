import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTER_NAMES, CHARACTER_PALETTES, CLOUD_CHOCOBO_INDEX, LINK_EPONA_INDEX } from '../src/games/mirageCharacters.js';
import { disposeExplorer, makeExplorer, paintModel } from '../src/games/mirageExplorer.js';

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
    assert.equal(meshCount(head), 6, 'six matières fusionnées : robe, robe claire, crins, liste, œil, pupille');
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

test('le détail est fusionné : un cavalier reste à une quarantaine d’appels de dessin', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    const parts = model.userData.parts;
    // Un mesh par matière dans le corps et la tête : les blocs fixes sont soudés.
    assert.equal(meshCount(parts.horseBody), colorsOf(parts.horseBody).size);
    assert.equal(meshCount(parts.horseHead), colorsOf(parts.horseHead).size);
    assert.equal(meshCount(model), 40, 'les jambes, la queue, la cape, les bras et le chapeau restent à part');
    assert.ok(triangleCount(model) >= 900, '…sans avoir perdu le détail');
  } finally {
    disposeExplorer(model);
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
  const ceilings = [[0, 42], [4, 58], [5, 98], [6, 146]];
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
  assert.match(world, /parts\.capeFlap\.rotation\.x/, 'le pan de cape bat au rythme du galop');
  assert.match(world, /if \(rivalParts\.horseHead\?\.visible\)/, 'et les rivaux ont la même vie');
  assert.match(world, /rivalParts\.capeFlap\.rotation\.x/);
});

test('câblage : les vignettes de skin animent les mêmes pièces, sans écraser la queue', () => {
  assert.match(preview, /capeFlap, horseHead, armGroup/, 'les pièces sont récupérées des parts');
  assert.match(preview, /capeFlap\.rotation\.x/);
  assert.match(preview, /horseHead\.rotation\.x/);
  assert.match(preview, /tail\.rotation\.x = -0\.35 \+ Math\.sin/, 'la queue garde sa base de −0,35');
});

test('câblage : le vainqueur de la coupe salue lui aussi', () => {
  assert.match(trophy, /parts\.horseHead\?\.visible/, 'la tête hoche sur le podium');
  assert.match(trophy, /parts\.capeFlap\.rotation\.x/);
  assert.match(trophy, /parts\.armGroup\.rotation\.x/);
});
