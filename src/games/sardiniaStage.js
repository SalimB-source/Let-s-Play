import * as THREE from 'three';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** A row of stacked wine barrels: low and jumpable, same clearance as every other stage's barrier. */
function barrelRow() {
  const group = new THREE.Group();
  const oak = material(0x8a5a34);
  const hoop = material(0x2e2620);
  const cork = material(0x6b4226);
  for (const x of [-1.55, 0, 1.55]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.92, 10), oak);
    barrel.position.set(x, 0.46, 0);
    group.add(barrel);
    for (const y of [0.18, 0.46, 0.74]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.465, 0.035, 4, 12), hoop);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y, 0);
      group.add(band);
    }
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), cork);
    plug.rotation.z = Math.PI / 2;
    plug.position.set(x, 0.46, 0.47);
    group.add(plug);
  }
  // A plank laid across the tops hints at a makeshift dockside barricade.
  box(group, oak, 0, 0.95, 0, 3.7, 0.12, 0.5);
  return group;
}

/** Cypress in a terracotta pot: tall and narrow, dodge rather than jump — the "cactus" slot for this stage. */
function cypressTree() {
  const group = new THREE.Group();
  const terracotta = material(0xb5502e);
  const trunk = material(0x4a3324);
  const foliage = material(0x203d2b);
  const foliageLight = material(0x2c5138);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.24, 0.42, 8), terracotta);
  pot.position.y = 0.21;
  group.add(pot);
  box(group, trunk, 0, 0.58, 0, 0.14, 0.5, 0.14);
  for (let i = 0; i < 5; i++) {
    const radius = 0.34 - i * 0.045;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 0.5, 7), i % 2 ? foliageLight : foliage);
    cone.position.y = 0.95 + i * 0.34;
    group.add(cone);
  }
  return group;
}

export function sardiniaObstacle(kind) {
  return kind === 'barrier' ? barrelRow() : cypressTree();
}

const SIGN_WORDS = ['TRATTORIA', 'CANTINA', 'PORTO', 'OSTERIA', 'DOGANA', 'VILLA'];
const FACADES = [0xe3b084, 0xe8d8b0, 0xd98e7c, 0xcfc79a];

/** Pastel coastal house: terracotta roof, shuttered windows and a hand-painted sign. */
export function sardiniaVillage(index, side) {
  const group = new THREE.Group();
  const facade = material(FACADES[index % FACADES.length]);
  const roof = material(0xa8492c);
  const shutter = material(0x3e6e7a);
  const stone = material(0xcabf9c);
  const h = 3.1 + (index % 3) * 0.55;
  box(group, facade, side * 8.6, h / 2, 0, 4.8, h, 6);
  box(group, stone, side * 8.6, 0.18, 0, 5, 0.35, 6.2);
  box(group, roof, side * 8.6, h + 0.22, 0, 5.3, 0.44, 6.6);
  box(group, roof, side * 8.6, h + 0.55, 0, 4.5, 0.28, 5.7);
  for (const z of [-1.9, 1.9]) {
    box(group, shutter, side * 6.02, h * 0.62, z, 0.1, 1.15, 0.85);
    box(group, stone, side * 6.1, h * 0.62, z, 0.06, 1.3, 1);
  }
  box(group, shutter, side * 6.05, 0.9, 0, 0.1, 1.55, 1.05);
  // A washing line strung between neighbouring facades — pure Mediterranean village flavour.
  if (index % 2 === 0) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.4, 4), material(0xe7ddc8));
    line.rotation.z = Math.PI / 2;
    line.position.set(side * 8.6, h + 0.05, 2.6);
    group.add(line);
    const laundryColors = [0xdedfe0, 0xb3554d, 0x4c7a8c, 0xe3c65b];
    for (let i = 0; i < 4; i++) {
      const cloth = box(group, material(laundryColors[i % laundryColors.length]), side * 8.6 - 2 + i * 1.3, h - 0.35, 2.6, 0.5, 0.7, 0.04);
      cloth.rotation.y = 0.08;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c231c'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#e8c98f'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#f3dba0'; ctx.font = 'bold 50px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SIGN_WORDS[index % SIGN_WORDS.length], 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(side * 6.05, h - 0.7, 0);
  sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);
  // Move the houses to the roadside and stagger their rows to leave a clear
  // central view of the coastal sunset down the course.
  group.position.x = side * 8.5;
  group.position.z = 6 - index * 11 + (side === 1 ? -4 : 0);
  group.userData.speedFactor = 1;
  return group;
}

// Café terraces occupy the strip between the shopfronts (x ≈ -14.5)
// and the left edge of the track (x = -4.2). They are scenery only.
const TERRACE_SHIRTS = [0xe38161, 0x4c9ca5, 0xe4c057, 0x779b6d, 0xede2c8];
const TERRACE_SKIN = [0xc58a60, 0xe4b98c, 0x88563d, 0xf1c9a0];

function terraceGuest(parent, x, z, facing, variant) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.terraceGuest = true;
  parent.add(group);
  const shirt = material(TERRACE_SHIRTS[variant % TERRACE_SHIRTS.length]);
  const skin = material(TERRACE_SKIN[variant % TERRACE_SKIN.length]);
  const hair = material([0x49302b, 0x322d29, 0x996d43, 0x533c2c][variant % 4]);
  const trousers = material(variant % 2 ? 0xe6d6b4 : 0x374f60);
  // Both knees project toward the table: these are seated patrons, not walkers.
  box(group, trousers, 0, 0.63, -facing * 0.19, 0.48, 0.18, 0.62);
  for (const dx of [-0.15, 0.15]) {
    box(group, trousers, dx, 0.32, -facing * 0.46, 0.17, 0.5, 0.17);
    box(group, hair, dx, 0.09, -facing * 0.49, 0.2, 0.12, 0.28);
    const arm = box(group, skin, dx * 2.3, 1.08, -facing * 0.24, 0.13, 0.15, 0.58);
    arm.rotation.x = facing * 0.12;
  }
  box(group, shirt, 0, 1.07, 0, 0.63, 0.76, 0.4);
  box(group, skin, 0, 1.52, 0, 0.14, 0.18, 0.14);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), skin);
  head.position.set(0, 1.77, 0);
  group.add(head);
  // Hair on the back of the head, or a little sun hat for some guests.
  if (variant % 3 === 0) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.055, 10), material(0xe7d29b));
    brim.position.y = 2.03;
    group.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.17, 10), material(0xd5b77b));
    crown.position.y = 2.13;
    group.add(crown);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), hair);
    cap.position.y = 1.8;
    group.add(cap);
  }
}

function terraceTable(parent, x, z, variant, parasol) {
  const table = new THREE.Group();
  table.position.set(x, 0, z);
  parent.add(table);
  const wicker = material(0x92704e);
  const iron = material(0x394e50);
  const linen = material(0xf6ead1);
  const glass = new THREE.MeshStandardMaterial({ color: 0x81c8cb, transparent: true, opacity: 0.75, roughness: 0.18 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.09, 12), linen);
  top.position.y = 0.9;
  table.add(top);
  box(table, iron, 0, 0.45, 0, 0.09, 0.9, 0.09);
  box(table, iron, 0, 0.05, 0, 0.75, 0.08, 0.12);
  // Two espresso glasses and a little terracotta flower pot.
  for (const dx of [-0.32, 0.32]) {
    const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.15, 8), glass);
    drink.position.set(dx, 1.02, 0.12);
    table.add(drink);
  }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 7), material(0xb66142));
  pot.position.set(0, 1.04, -0.2);
  table.add(pot);
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), material(0xe8a45c));
  flower.position.set(0, 1.2, -0.2);
  table.add(flower);

  for (const side of [-1, 1]) {
    const chairZ = side * 1.13;
    box(table, wicker, 0, 0.53, chairZ, 0.65, 0.11, 0.54);
    box(table, wicker, 0, 0.91, chairZ + side * 0.32, 0.67, 0.85, 0.11);
    for (const dx of [-0.25, 0.25]) for (const dz of [-0.18, 0.18]) {
      box(table, iron, dx, 0.26, chairZ + dz, 0.07, 0.5, 0.07);
    }
    terraceGuest(table, 0, chairZ, side, variant + (side + 1) / 2);
  }

  if (parasol) {
    // Alternating canvas panels give the parasol a sun-drenched café look.
    const shade = new THREE.Group();
    // Plant the parasol beside the table, so the seated guests remain visible.
    shade.position.set(-1.4, 0, 0.2);
    table.add(shade);
    const pole = material(0xeee2c7);
    const canvas = [variant % 2 ? 0xf8eed5 : 0xe48461, variant % 2 ? 0x51a4ae : 0xf8eed5];
    const fabric = canvas.map(color => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.95, flatShading: true }));
    box(shade, pole, 0, 2.14, 0, 0.075, 2.35, 0.075);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      const b = (i + 1) * Math.PI / 5;
      const canopy = new THREE.Mesh(new THREE.BufferGeometry(), fabric[i % 2]);
      canopy.geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 3.28, 0, Math.cos(a) * 1.9, 2.64, Math.sin(a) * 1.9,
        Math.cos(b) * 1.9, 2.64, Math.sin(b) * 1.9,
      ], 3));
      canopy.geometry.computeVertexNormals();
      shade.add(canopy);
    }
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), pole);
    finial.position.y = 3.33;
    shade.add(finial);
  }
}

/** Repeating, non-collidable pavement cafés along the left of Costa Omertà. */
export function sardiniaTerrace(index) {
  const group = new THREE.Group();
  const paving = material(index % 2 ? 0xdac6a0 : 0xe4d2ad);
  box(group, paving, -9.55, -0.17, 0, 9.1, 0.3, 10.8);
  // A low curb separates the tables from the horses without entering a lane.
  box(group, material(0xf3e3c0), -4.95, 0.08, 0, 0.22, 0.2, 10.8);
  terraceTable(group, -8.05, index % 2 ? -1.3 : 0.7, index * 2, true);
  if (index % 2 === 0) terraceTable(group, -11.5, -2.5, index * 2 + 2, false);
  group.position.z = 6 - index * 11;
  group.userData.speedFactor = 1;
  return group;
}

const BOAT_HULLS = [0x3e6e7a, 0xb3554d, 0xe7ddc8, 0x2f5a4a];

/** Small wooden fishing boat (gozzo) moored off the quay. */
function fishingBoat(index) {
  const group = new THREE.Group();
  const hull = material(BOAT_HULLS[index % BOAT_HULLS.length]);
  const trim = material(0xe8d8b0);
  const wood = material(0x7a5232);
  box(group, hull, 0, 0.25, 0, 1.5, 0.5, 3.6);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 4), hull);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.5);
  bow.position.set(0, 0.25, -2.3);
  group.add(bow);
  box(group, trim, 0, 0.52, 0, 1.56, 0.08, 3.66);
  box(group, wood, 0, 0.45, 0.2, 1.3, 0.06, 2.6);
  if (index % 2 === 0) {
    box(group, wood, 0, 1.4, -0.3, 0.08, 1.9, 0.08);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshStandardMaterial({ color: 0xf1e3c4, roughness: 0.9, side: THREE.DoubleSide }));
    sail.rotation.y = Math.PI / 2;
    sail.position.set(0, 1.45, 0.25);
    group.add(sail);
  } else {
    box(group, material(0xe7ddc8), 0, 0.8, 0.6, 0.9, 0.6, 0.9);
  }
  return group;
}

/**
 * Seaside segment for the right-hand side of Costa Omertà: a stone quay edge
 * with bollards and lamp posts, the water below, and a boat moored now and then.
 * Segments are 11 m long and scroll like the village houses on the other side.
 */
export function sardiniaSeaside(index) {
  const group = new THREE.Group();
  const stone = material(0xcabf9c);
  const stoneDark = material(0xa89a78);
  const iron = material(0x2e2620);
  const foam = new THREE.MeshBasicMaterial({ color: 0xcfe9ea, transparent: true, opacity: 0.55, depthWrite: false });
  // Capstones along the quay edge, alternating shades so the speed reads well.
  for (let i = 0; i < 5; i++) {
    const z = -4.4 + i * 2.2;
    box(group, i % 2 ? stone : stoneDark, 5.9, -0.28, z, 1.2, 0.22, 2.16);
    box(group, i % 2 ? stoneDark : stone, 6.45, -0.95, z, 0.12, 1.2, 2.16);
  }
  // Mooring bollard.
  const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), iron);
  bollard.position.set(6, 0.08, -1.5);
  group.add(bollard);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8), iron);
  cap.position.set(6, 0.36, -1.5);
  group.add(cap);
  // Harbour lamp post every other segment.
  if (index % 2 === 1) {
    box(group, iron, 5.9, 1.3, 2.5, 0.12, 3, 0.12);
    box(group, iron, 5.9, 2.85, 2.5, 0.3, 0.1, 0.3);
    const lamp = box(group, new THREE.MeshBasicMaterial({ color: 0xffd98a }), 5.9, 2.65, 2.5, 0.24, 0.3, 0.24);
    lamp.userData.glow = true;
  }
  // Foam streaks on the water to give the sea some movement.
  for (let i = 0; i < 3; i++) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + (i + index) % 3, 0.14), foam);
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(8 + ((index * 7 + i * 5) % 17), -0.88, -4 + i * 3.4);
    group.add(streak);
  }
  // A boat moored off the quay, bobbing on the swell.
  if (index % 3 !== 2) {
    const boat = fishingBoat(index);
    boat.position.set(index % 2 ? 8.4 : 11.5, -1.05, 0);
    boat.rotation.y = (index % 2 ? 0.05 : -0.2);
    boat.userData.bob = index * 1.7;
    group.add(boat);
    group.userData.boat = boat;
  }
  // Rope from the bollard to the boat.
  if (index % 3 !== 2 && index % 2) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 4), material(0xc9b27f));
    rope.rotation.z = Math.PI / 2 - 0.22;
    rope.rotation.y = 0.4;
    rope.position.set(7.1, -0.1, -0.9);
    group.add(rope);
  }
  group.position.z = 6 - index * 11;
  group.userData.speedFactor = 1;
  group.userData.seaside = true;
  return group;
}
