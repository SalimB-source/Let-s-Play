// Voitures de course, fumée et trafic de Vice City Rush. Les modèles de course
// vivent dans cityRushRacerModels.js ; le trafic conserve ses propres véhicules.
import * as THREE from 'three';
import { CITY_RUSH_TRAFFIC_TYPES } from './cityRushRules.js';
import { createBatch } from './cityRushBuilder.js';
import { makeTrafficDecalAtlas, makeSmokeTexture } from './cityRushTextures.js';
import { animateRacerCar, makeRacerCar, makeWheel, setRacerDriver } from './cityRushRacerModels.js';

export { animateRacerCar, makeRacerCar, setRacerDriver };

const lerp = (a, b, amount) => a + (b - a) * amount;
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
let smokeTexture = null;
let trafficDecals = null;
// Profil réservé aux véhicules d'interception : les SUV policiers ne font pas
// partie du trafic aléatoire, mais réutilisent le même constructeur 3D.
const POLICE_SUV_PROFILE = Object.freeze({ id: 'police-suv', width: 2.02, length: 4.35 });

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.08, ...extra });
}

function paint(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0.28,
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
    emissive: color,
    emissiveIntensity: 0.04,
    ...extra,
  });
}

function mesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = null) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(position[0], position[1], position[2]);
  object.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) object.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  parent.add(object);
  return object;
}

// ─── Fumée de pneus / échappement ────────────────────────────────────────────
export function createSmokePool(count = 48) {
  if (!smokeTexture) smokeTexture = makeSmokeTexture();
  const group = new THREE.Group();
  group.name = 'smoke';
  const puffs = Array.from({ length: count }, () => {
    const material = new THREE.SpriteMaterial({ map: smokeTexture, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);
    return { sprite, material, life: 0, maxLife: 1, baseOpacity: 0.5, velocity: new THREE.Vector3(), startScale: 0.3, endScale: 1.2 };
  });
  let cursor = 0;
  return {
    group,
    emit(position, { color = 0xd8d8e0, opacity = 0.5, scale = 0.35, grow = 1.3, life = 0.7, velocity = [0, 0.6, 1.4] } = {}) {
      const puff = puffs[cursor];
      cursor = (cursor + 1) % puffs.length;
      puff.life = life;
      puff.maxLife = life;
      puff.startScale = scale;
      puff.endScale = scale * grow;
      puff.baseOpacity = opacity;
      puff.sprite.visible = true;
      puff.sprite.position.copy(position);
      puff.material.color.setHex(color);
      puff.material.opacity = opacity;
      puff.material.rotation = Math.random() * Math.PI * 2;
      puff.velocity.set(velocity[0] + (Math.random() - 0.5) * 0.6, velocity[1] + Math.random() * 0.4, velocity[2] + (Math.random() - 0.5) * 0.6);
    },
    update(dt, worldTravel = 0) {
      for (const puff of puffs) {
        if (!puff.sprite.visible) continue;
        puff.life -= dt;
        if (puff.life <= 0) { puff.sprite.visible = false; continue; }
        const progress = 1 - puff.life / puff.maxLife;
        puff.sprite.position.addScaledVector(puff.velocity, dt);
        puff.sprite.position.z += worldTravel;
        const size = lerp(puff.startScale, puff.endScale, progress);
        puff.sprite.scale.set(size, size, 1);
        puff.material.opacity = puff.baseOpacity * (1 - progress) * (1 - progress);
        puff.material.rotation += dt * 0.8;
      }
    },
    clear() {
      puffs.forEach((puff) => { puff.sprite.visible = false; puff.life = 0; });
    },
    dispose() {
      puffs.forEach((puff) => puff.material.dispose());
    },
  };
}

// ─── Trafic ──────────────────────────────────────────────────────────────────
export function makeTrafficVehicle(type) {
  const spec = CITY_RUSH_TRAFFIC_TYPES.find((vehicle) => vehicle.id === type)
    || (type === POLICE_SUV_PROFILE.id ? POLICE_SUV_PROFILE : CITY_RUSH_TRAFFIC_TYPES[0]);
  if (!trafficDecals) trafficDecals = makeTrafficDecalAtlas();
  const isTruck = type === 'garbage-truck';
  const isSports = type === 'white-lambo';
  const policeSUV = type === 'police-suv';
  const police = type === 'police' || policeSUV;
  const ambulance = type === 'ambulance';
  const bodyColor = police ? 0xf2f3f0 : ambulance ? 0xf8f7f0 : isTruck ? 0x4d8f55 : 0xf7f7f4;
  const accentColor = police ? 0x142947 : ambulance ? 0xe64a50 : isTruck ? 0xe0b847 : 0x1a1f2b;
  const m = {
    body: isSports ? paint(bodyColor, { clearcoat: 0.9, roughness: 0.22, emissiveIntensity: 0.02 }) : standard(bodyColor, { roughness: 0.55, metalness: 0.15 }),
    accent: standard(accentColor, { roughness: 0.6 }),
    glass: standard(isSports ? 0x101c2a : 0x1c3346, { metalness: 0.2, roughness: 0.18 }),
    dark: standard(0x12161f, { roughness: 0.88 }),
    chrome: standard(0xc9d3d8, { metalness: 0.6, roughness: 0.3 }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }),
    warm: new THREE.MeshBasicMaterial({ color: 0xffefb4, toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff3450, toneMapped: false }),
    decal: new THREE.MeshBasicMaterial({ map: trafficDecals.texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  };
  const beaconColors = { red: 0xff293f, blue: 0x28baff, amber: 0xffb13b };
  const group = new THREE.Group();
  group.name = `traffic-${type}`;
  const width = spec.width;
  const length = spec.length;
  const beacons = [];
  const b = createBatch();
  const box = (material, position, size, rotation = null) => b.box(material, position, size, rotation);
  const decal = (index, position, size, rotation) => b.plane(m.decal, position, size[0], size[1], rotation, { uv: trafficDecals.uv(index) });
  const beacon = (color, position, size) => {
    const material = new THREE.MeshBasicMaterial({ color: beaconColors[color], toneMapped: false, transparent: true, opacity: 1 });
    beacons.push(mesh(group, UNIT_BOX, material, position, size));
  };

  if (isTruck) {
    // Benne à ordures : cabine avancée, caisson, bras hydrauliques, gyrophares ambre.
    box(m.dark, [0, 0.42, 0], [width * 0.9, 0.3, length * 0.92]);
    box(m.body, [0, 1.0, -1.42], [width * 0.92, 1.1, 1.3]); // cabine
    box(m.glass, [0, 1.18, -2.08], [width * 0.74, 0.5, 0.05]);
    for (const side of [-1, 1]) {
      box(m.glass, [side * width * 0.46, 1.18, -1.42], [0.04, 0.42, 0.7]);
      box(m.chrome, [side * width * 0.52, 1.3, -1.7], [0.08, 0.2, 0.14]); // rétros
      box(m.warm, [side * width * 0.36, 0.72, -2.1], [0.26, 0.14, 0.05]);
      box(m.tail, [side * width * 0.4, 0.74, length * 0.46 + 0.02], [0.2, 0.22, 0.05]);
    }
    box(m.chrome, [0, 0.5, -2.12], [width * 0.96, 0.16, 0.1]); // pare-chocs
    box(m.body, [0, 1.22, 0.62], [width * 0.96, 1.3, 2.5]); // caisson
    box(m.accent, [0, 1.9, 0.62], [width * 0.98, 0.1, 2.56]);
    box(m.dark, [0, 1.1, 1.9], [width * 0.92, 1.05, 0.2]); // trappe arrière
    for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) box(m.dark, [x * width * 0.7, 1.22, 0.62], [0.06, 1.2, 2.5]); // nervures
    for (const side of [-1, 1]) {
      box(m.accent, [side * (width * 0.5 + 0.06), 1.3, -0.3], [0.1, 0.1, 1.5]); // bras hydrauliques
      box(m.accent, [side * (width * 0.5 + 0.06), 1.0, -1.0], [0.1, 0.7, 0.1]);
      decal(3, [side * (width * 0.5 + 0.02), 1.25, 0.9], [1.3, 0.45], [0, side * Math.PI / 2, 0]);
    }
    for (const x of [-0.5, 0.5]) beacon('amber', [x, 1.66, -1.42], [0.2, 0.16, 0.2]);
  } else if (isSports) {
    // Supercar blanche : coin plat, phares fins, aileron.
    box(m.dark, [0, 0.3, 0], [width * 0.9, 0.12, length * 0.9]);
    box(m.body, [0, 0.5, 0.1], [width, 0.3, length * 0.9]);
    box(m.body, [0, 0.62, -1.1], [width * 0.94, 0.14, 1.4], [0.12, 0, 0]); // capot plongeant
    box(m.glass, [0, 0.86, -0.2], [width * 0.8, 0.3, 1.1], [0.25, 0, 0]); // bulle
    box(m.body, [0, 0.78, 0.9], [width * 0.96, 0.26, 1.3]); // capot moteur
    box(m.dark, [0, 0.92, 0.9], [width * 0.7, 0.03, 1.0]); // grille moteur
    box(m.dark, [0, 1.0, 1.55], [width * 0.98, 0.05, 0.32], [-0.1, 0, 0]); // aileron
    for (const side of [-1, 1]) {
      box(m.dark, [side * width * 0.42, 0.86, 1.52], [0.05, 0.2, 0.36]);
      box(m.warm, [side * width * 0.36, 0.58, -1.86], [0.4, 0.06, 0.05]);
      box(m.tail, [side * width * 0.34, 0.68, 1.86], [0.42, 0.1, 0.04]);
      box(m.dark, [side * width * 0.47, 0.44, -0.2], [0.08, 0.16, 0.9]); // prise d'air latérale
      box(m.chrome, [side * width * 0.5, 0.78, -0.5], [0.1, 0.06, 0.16]);
    }
    box(m.dark, [0, 0.36, -1.9], [width * 0.98, 0.1, 0.1]);
    for (const x of [-0.4, -0.15, 0.15, 0.4]) b.cylinder(m.chrome, [x, 0.4, 1.9], 0.04, 0.04, 0.1, 8, [Math.PI / 2, 0, 0]);
  } else if (policeSUV) {
    // SUV d'interception : caisse plus haute et plus carrée qu'une berline,
    // fenêtres latérales verticales, marchepieds et pare-chocs renforcés.
    box(m.dark, [0, 0.34, 0], [width * 0.94, 0.17, length * 0.93]);
    box(m.body, [0, 0.62, 0], [width, 0.5, length * 0.92]);
    box(m.body, [0, 0.89, -length * 0.31], [width * 0.97, 0.13, 1.18]); // capot haut
    box(m.body, [0, 1.19, 0.18], [width * 0.9, 0.72, 2.45]); // pavillon carré
    box(m.glass, [0, 1.27, -0.83], [width * 0.8, 0.48, 0.06], [0.24, 0, 0]);
    box(m.glass, [0, 1.27, 1.36], [width * 0.78, 0.47, 0.06], [-0.18, 0, 0]);
    for (const side of [-1, 1]) {
      box(m.glass, [side * width * 0.44, 1.27, 0.16], [0.05, 0.38, 1.32]);
      box(m.glass, [side * width * 0.44, 1.27, 1.05], [0.05, 0.38, 0.46]);
      box(m.accent, [side * (width * 0.5 + 0.015), 0.7, 0.16], [0.035, 0.18, 2.68]);
      box(m.dark, [side * (width * 0.5 + 0.06), 0.48, 0.16], [0.12, 0.12, 2.45]); // marchepied
      decal(0, [side * (width * 0.5 + 0.04), 0.76, 0.2], [1.45, 0.32], [0, side * Math.PI / 2, 0]);
      box(m.chrome, [side * width * 0.53, 1.0, -0.62], [0.13, 0.1, 0.2]); // rétroviseur
      box(m.warm, [side * width * 0.36, 0.68, -length * 0.46 - 0.03], [0.32, 0.13, 0.06]);
      box(m.tail, [side * width * 0.36, 0.71, length * 0.46 + 0.03], [0.28, 0.22, 0.06]);
    }
    box(m.dark, [0, 1.57, 0.18], [width * 0.92, 0.09, 2.38]); // galerie de toit
    box(m.dark, [0, 1.55, 0.18], [width * 0.77, 0.08, 0.3]); // socle des gyrophares
    beacon('red', [-0.48, 1.66, 0.18], [0.38, 0.16, 0.32]);
    beacon('blue', [0.48, 1.66, 0.18], [0.38, 0.16, 0.32]);
    box(m.dark, [0, 0.48, -length * 0.48], [width * 1.02, 0.2, 0.15]); // pare-chocs avant
    box(m.dark, [0, 0.48, length * 0.48], [width * 1.02, 0.2, 0.15]); // pare-chocs arrière
    box(m.chrome, [0, 0.65, -length * 0.48 - 0.025], [width * 0.56, 0.12, 0.04]); // calandre
  } else {
    // Berlines d'intervention : police et ambulance.
    box(m.dark, [0, 0.32, 0], [width * 0.9, 0.14, length * 0.9]);
    box(m.body, [0, 0.56, 0], [width, 0.4, length * 0.92]);
    box(m.body, [0, 0.74, -length * 0.3], [width * 0.96, 0.1, 1.0]); // capot
    if (ambulance) {
      box(m.body, [0, 1.14, 0.45], [width * 0.98, 0.9, 2.3]); // cellule
      box(m.accent, [0, 1.6, 0.45], [width * 1.0, 0.1, 2.34]);
      box(m.glass, [0, 1.08, -0.72], [width * 0.84, 0.46, 0.06]);
      for (const side of [-1, 1]) {
        box(m.accent, [side * (width * 0.5 + 0.01), 0.6, 0.3], [0.03, 0.12, 2.6]);
        decal(2, [side * (width * 0.5 + 0.03), 1.15, 0.45], [0.7, 0.7], [0, side * Math.PI / 2, 0]);
        decal(1, [side * (width * 0.5 + 0.03), 0.84, 0.45], [1.6, 0.36], [0, side * Math.PI / 2, 0]);
      }
      box(m.glass, [0, 1.3, 1.62], [width * 0.6, 0.4, 0.04]);
      for (const x of [-0.5, 0.5]) for (const z of [-0.6, 1.4]) beacon('red', [x, 1.68, z], [0.18, 0.12, 0.18]);
    } else {
      box(m.body, [0, 0.98, 0.1], [width * 0.86, 0.5, 1.8]); // pavillon
      box(m.glass, [0, 1.0, -0.82], [width * 0.8, 0.42, 0.05], [0.3, 0, 0]);
      box(m.glass, [0, 1.0, 1.02], [width * 0.8, 0.4, 0.05], [-0.3, 0, 0]);
      for (const side of [-1, 1]) {
        box(m.glass, [side * width * 0.43, 1.02, 0.1], [0.04, 0.34, 1.5]);
        box(m.accent, [side * (width * 0.5 + 0.01), 0.52, 0.1], [0.03, 0.26, 2.4]);
        decal(0, [side * (width * 0.5 + 0.03), 0.62, 0.1], [1.4, 0.3], [0, side * Math.PI / 2, 0]);
        box(m.chrome, [side * (width * 0.5 + 0.08), 0.9, -0.5], [0.12, 0.08, 0.16]);
      }
      box(m.accent, [0, 1.0, 0.1], [width * 0.86, 0.5, 0.5]); // montant central
      box(m.dark, [0, 1.26, 0.1], [1.3, 0.08, 0.34]); // rampe
      beacon('red', [-0.42, 1.34, 0.1], [0.4, 0.14, 0.3]);
      beacon('blue', [0.42, 1.34, 0.1], [0.4, 0.14, 0.3]);
      box(m.warm, [0, 1.3, 0.1], [0.3, 0.1, 0.28]);
    }
    for (const side of [-1, 1]) {
      box(m.warm, [side * width * 0.36, 0.62, -length * 0.46 - 0.02], [0.3, 0.12, 0.05]);
      box(m.tail, [side * width * 0.36, 0.64, length * 0.46 + 0.02], [0.34, 0.12, 0.05]);
    }
    box(m.chrome, [0, 0.42, -length * 0.47], [width * 0.98, 0.12, 0.12]);
    box(m.chrome, [0, 0.42, length * 0.47], [width * 0.98, 0.12, 0.12]);
  }
  group.add(b.build('traffic-body'));

  const wheels = [];
  const wheelAxles = isTruck ? [-1.48, 0.92, 1.48] : [-length * 0.29, length * 0.29];
  const radius = isTruck ? 0.36 : policeSUV ? 0.34 : 0.3;
  for (const side of [-1, 1]) {
    for (const z of wheelAxles) {
      const wheel = makeWheel({ radius, width: isTruck ? 0.26 : policeSUV ? 0.25 : 0.22, side, material: m.wheel, racing: false });
      wheel.position.set(side * width * 0.49, radius, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  group.traverse((object) => { if (object.isMesh) object.castShadow = !object.material.transparent; });
  group.userData = { kind: 'traffic', trafficType: type, isPoliceSUV: policeSUV, wheels, beacons, width, length };
  return group;
}
