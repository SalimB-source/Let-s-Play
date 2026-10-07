// Scène de garage 3D de Vice City Rush — l'écran de préparation type Need for
// Speed : la voiture sélectionnée est modélisée en trois.js, posée sur un
// plateau tournant éclairé par des rampes de studio, avec ses enseignes au néon
// et son outillage. Les menus de la page (étapes, modes, villes, garage) sont
// posés par-dessus cette scène : elle ne sert que de décor.
//
// La scène est volontairement autonome et défensive :
//   • sans contexte WebGL (vieux appareil, bac à sable de test), elle se retire
//     et la page affiche la photo du modèle à la place — aucune exception ;
//   • `prefers-reduced-motion` coupe la rotation du plateau ;
//   • la boucle de rendu se met en pause quand l'onglet est caché ou que la
//     scène sort de l'écran (batterie) ;
//   • chaque matériau et géométrie créé ici est rendu à la fermeture.
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeRacerCar, configureCarReflections } from './cityRushCars.js';
import { makeCanvasTexture, neonText, seededRandom } from './cityRushBuilder.js';
import { CITY_RUSH_CARS } from './cityRushRules.js';

/* ── La cabine, en mètres ─────────────────────────────────────────────────── */
// Une baie d'atelier : le plateau occupe l'essentiel du cadre, la voiture est
// le sujet. Le décor (néon, rampes, outillage) l'entoure sans jamais le réduire.
// La cabine est assez grande pour que la caméra y reste toujours, même quand le
// cadrage recule pour faire passer une voiture entière sur un écran de téléphone.
const ROOM_WIDTH = 22; // x : −11 → 11
const ROOM_DEPTH = 22; // z : −11 → 11
const ROOM_HEIGHT = 6.4;
const BACK_WALL_Z = -ROOM_DEPTH / 2;
const TURNTABLE_RADIUS = 3.6;
const TURNTABLE_TOP = 0.16; // épaisseur du plateau
const CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0);
// Direction du regard : trois-quarts avant, légèrement plongeant sur la voiture.
const CAMERA_DIRECTION = new THREE.Vector3(0.738, 0.226, 0.636).normalize();
const CAMERA_FOV = 40;
// Le cadre se règle sur le plateau : il doit occuper ~92 % de la largeur visible,
// quelle que soit la forme de l'écran. Sur une fenêtre large, la caméra se
// rapproche (gros plan) ; sur un téléphone, elle recule jusqu'à ce que la
// voiture entière passe dans le cadre.
const FRAME_PLATFORM_FILL = 0.92;
const FRAME_MIN_DISTANCE = 4.4;
// Recul maximal : assez pour qu'une voiture entière (diagonale comprise, car le
// plateau tourne) passe dans le cadre d'un écran de téléphone.
const FRAME_MAX_DISTANCE = 13;
// Décalage de caméra offert par la page : à l'étape MODE, la bannière Histoire
// occupe la colonne de droite (fond opaque), donc la caméra se range à droite
// et la voiture se lit à gauche du cadre, dans le prolongement du chapeau.
const CAMERA_SHIFT_MODE = 1.6;
const TURNTABLE_SPEED = 0.17; // rad/s : un tour en ~37 secondes
const POINTER_YAW = 0.14; // rad : léger déport du regard à la souris
const POINTER_PITCH = 0.26; // m : idem à la verticale
const UP = new THREE.Vector3(0, 1, 0);

/** Distance caméra ↔ plateau pour que le plateau remplisse le cadre. */
function frameDistance(fovDegrees, aspect) {
  const half = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const wanted = (TURNTABLE_RADIUS * 2) / FRAME_PLATFORM_FILL;
  const fitted = wanted / (2 * half * Math.max(aspect, 0.4));
  return Math.min(FRAME_MAX_DISTANCE, Math.max(FRAME_MIN_DISTANCE, fitted));
}

/** Le plateau ne tourne plus si l'appareil demande moins de mouvement. */
function detectReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

/** Dalles de béton brut : bruit, joints et taches d'huile dessinés au canvas. */
function makeFloorTexture() {
  const texture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0e131a';
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(1986);
    for (let pass = 0; pass < 2; pass += 1) {
      for (let index = 0; index < 1500; index += 1) {
        const x = random() * width;
        const y = random() * height;
        const r = 0.3 + random() * 1.7;
        ctx.fillStyle = pass === 0
          ? `rgba(255,255,255,${0.012 + random() * 0.03})`
          : `rgba(0,0,0,${0.02 + random() * 0.06})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Dalles 2 × 2 : les joints coupent la brillance du polissage.
    ctx.strokeStyle = 'rgba(140,165,200,.10)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    for (let index = 0; index < 4; index += 1) {
      const x = random() * width;
      const y = random() * height;
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.beginPath();
      ctx.ellipse(x, y, 26 + random() * 44, 16 + random() * 26, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512, 512, { smooth: true, repeat: true });
  texture.repeat.set(4, 3);
  return texture;
}

/** Tôles peintes du garage : bandes et joints verticaux. */
function makeWallTexture() {
  const texture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(64);
    for (let index = 0; index < 900; index += 1) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.02})`;
      ctx.fillRect(random() * width, random() * height, 2, 2);
    }
    ctx.fillStyle = 'rgba(150,175,210,.055)';
    for (let x = 0; x < width; x += width / 4) ctx.fillRect(x, 0, 2, height);
    ctx.fillStyle = 'rgba(255,255,255,.016)';
    for (let y = 0; y < height; y += height / 6) ctx.fillRect(0, y, width, 2);
  }, 256, 256, { smooth: true, repeat: true });
  texture.repeat.set(6, 2);
  return texture;
}

/** Enseigne au néon : le nom de la voiture suivante celui du jeu. */
function makeSignTexture(accent, carName) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    neonText(ctx, 'VICE CITY RUSH', width / 2, height * 0.34, `900 ${Math.round(height * 0.3)}px "Orbitron", Arial, sans-serif`, accent, 26);
    neonText(ctx, `GARAGE · ${carName}`, width / 2, height * 0.74, `800 ${Math.round(height * 0.13)}px "Orbitron", Arial, sans-serif`, '#eaf2ff', 14);
  }, 1024, 256, { smooth: true });
}

/** Halo radial réutilisé pour le néon et les poussières. */
function makeGlowTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, 128, 128, { smooth: true });
}

/** Pile de pneus : quatre galettes empilées, ancre du décor. */
function makeTireStack(materials, height = 4) {
  const group = new THREE.Group();
  for (let index = 0; index < height; index += 1) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 18), materials.rubber);
    tire.position.y = 0.11 + index * 0.21;
    tire.castShadow = true;
    group.add(tire);
  }
  return group;
}

/** Établi à rouleaux : caisson tôle, plan rouge, tiroirs et poignées chrome. */
function makeToolChest(materials) {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.92, 0.62), materials.steel);
  shell.position.y = 0.46;
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.7), materials.red);
  top.position.y = 0.95;
  top.castShadow = true;
  group.add(top);
  for (let index = 0; index < 4; index += 1) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.02), materials.steelDark);
    drawer.position.set(0, 0.24 + index * 0.2, 0.32);
    group.add(drawer);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.035), materials.chrome);
    handle.position.set(0, 0.24 + index * 0.2, 0.35);
    group.add(handle);
  }
  for (const side of [-1, 1]) {
    const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), materials.rubber);
    caster.rotation.z = Math.PI / 2;
    caster.position.set(side * 0.66, 0.07, 0);
    group.add(caster);
  }
  return group;
}

/** Bidon d'essence : caisse rouge, bouchon noir, bec verseur. */
function makeJerryCan(materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.17), materials.red);
  body.position.y = 0.2;
  body.castShadow = true;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), materials.rubber);
  cap.position.set(-0.08, 0.43, 0);
  group.add(cap);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), materials.red);
  spout.position.set(0.2, 0.34, 0);
  group.add(spout);
  return group;
}

export default function ViceCityGarageStage({ carId, carName, accent = '#48edc2', fallbackSrc = '', cameraShift = 0 }) {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    // Bac à sable de test ou appareil sans WebGL : la photo du modèle prend le
    // relais, posée par la page sous forme de repli.
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }

    const reducedMotion = detectReducedMotion();
    // Appareil tactile (ou écran à pointeur grossier) : la scène reste entière
    // mais sans carte d'ombres — le décor, lui, ne bouge pas.
    const lite = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
    const accentColor = new THREE.Color(accent);
    const profile = CITY_RUSH_CARS.find((car) => car.id === carId) || CITY_RUSH_CARS[0];

    // Tout ce que la scène fabrique elle-même est rendu à la fermeture.
    const ownGeometries = new Set();
    const ownMaterials = new Set();
    const ownTextures = new Set();
    const geometry = (build) => {
      const item = build();
      ownGeometries.add(item);
      return item;
    };
    const material = (build) => {
      const item = build();
      ownMaterials.add(item);
      return item;
    };
    const texture = (build) => {
      const item = build();
      ownTextures.add(item);
      return item;
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.Fog(0x04060a, 14, 38);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);
    // Distance de cadrage : réglée à chaque changement de taille pour que le
    // plateau remplisse le cadre (voir `frameDistance`). La boucle de rendu
    // replace ensuite la caméra à chaque image (parallasse, décalage de page).
    let distance = FRAME_MIN_DISTANCE;
    const applyCameraBase = () => {
      camera.position.copy(CAMERA_DIRECTION).multiplyScalar(distance).add(CAMERA_TARGET);
      camera.position.x += Number(cameraShift) || 0;
      camera.lookAt(CAMERA_TARGET);
    };

    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'city-rush-hub-stage-canvas-element';
    mount.appendChild(renderer.domElement);

    /* ── Matériaux du décor ───────────────────────────────────────────────── */
    const materials = {
      concrete: material(() => new THREE.MeshStandardMaterial({
        map: texture(makeFloorTexture), color: 0xffffff, roughness: 0.42, metalness: 0.3, envMapIntensity: 0.55,
      })),
      wall: material(() => new THREE.MeshStandardMaterial({
        map: texture(makeWallTexture), color: 0xffffff, roughness: 0.92, metalness: 0.04,
      })),
      ceiling: material(() => new THREE.MeshStandardMaterial({ color: 0x0a0d13, roughness: 0.95, metalness: 0.05 })),
      steel: material(() => new THREE.MeshStandardMaterial({ color: 0x232b36, roughness: 0.4, metalness: 0.7 })),
      steelDark: material(() => new THREE.MeshStandardMaterial({ color: 0x161c25, roughness: 0.5, metalness: 0.55 })),
      chrome: material(() => new THREE.MeshStandardMaterial({ color: 0xc6cfdb, roughness: 0.22, metalness: 0.85 })),
      rubber: material(() => new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.96, metalness: 0.03 })),
      red: material(() => new THREE.MeshStandardMaterial({ color: 0xa11d2b, roughness: 0.45, metalness: 0.4 })),
      strip: material(() => new THREE.MeshBasicMaterial({ color: 0xeaf4ff, toneMapped: false })),
      accent: material(() => new THREE.MeshBasicMaterial({ color: accentColor, toneMapped: false })),
      mark: material(() => new THREE.MeshBasicMaterial({ color: 0xf2c14e, toneMapped: false, transparent: true, opacity: 0.55 })),
      platform: material(() => new THREE.MeshStandardMaterial({ color: 0x171d26, roughness: 0.34, metalness: 0.72 })),
      sign: material(() => new THREE.MeshBasicMaterial({
        map: texture(() => makeSignTexture(accent, carName || profile.name)),
        transparent: true, toneMapped: false, depthWrite: false,
      })),
      glow: material(() => new THREE.MeshBasicMaterial({
        map: texture(makeGlowTexture), color: accentColor, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })),
      dust: material(() => new THREE.PointsMaterial({
        size: 0.055, map: texture(makeGlowTexture), color: 0xbfd4ff, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
      })),
    };

    /* ── La cabine ────────────────────────────────────────────────────────── */
    const room = new THREE.Group();
    room.name = 'vice-city-garage-room';
    scene.add(room);

    const floor = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH)), materials.concrete);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const ceiling = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH)), materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    room.add(ceiling);

    const wallPanels = [
      { size: [ROOM_WIDTH, ROOM_HEIGHT], position: [0, ROOM_HEIGHT / 2, BACK_WALL_Z], rotation: [0, 0, 0] },
      { size: [ROOM_DEPTH, ROOM_HEIGHT], position: [-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0] },
      { size: [ROOM_DEPTH, ROOM_HEIGHT], position: [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0] },
      { size: [ROOM_WIDTH, ROOM_HEIGHT], position: [0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2], rotation: [0, Math.PI, 0] },
    ];
    for (const panel of wallPanels) {
      const wall = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(panel.size[0], panel.size[1])), materials.wall);
      wall.position.set(...panel.position);
      wall.rotation.set(...panel.rotation);
      wall.receiveShadow = true;
      room.add(wall);
    }

    // Poteaux d'angle : le regard accroche un volume, pas un décor plat.
    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        const post = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.34, ROOM_HEIGHT, 0.34)), materials.steelDark);
        post.position.set(side * (ROOM_WIDTH / 2 - 0.17), ROOM_HEIGHT / 2, depth * (ROOM_DEPTH / 2 - 0.17));
        post.castShadow = true;
        room.add(post);
      }
    }

    /* ── Enseigne et halo, fond de cabine ─────────────────────────────────── */
    // La caméra est en trois-quarts : le mur qu'elle regarde est le mur de
    // gauche. L'enseigne y est donc posée de face, comme dans une vraie baie
    // d'atelier, et non sur le mur du fond que le cadrage ne montre plus.
    const SIGN_WALL_X = -ROOM_WIDTH / 2 + 0.06;
    const SIGN_WALL_Z = -6.5;
    const signGlow = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(10, 3.6)), materials.glow);
    signGlow.position.set(SIGN_WALL_X - 0.02, 3.0, SIGN_WALL_Z + 0.5);
    signGlow.rotation.y = Math.PI / 2;
    room.add(signGlow);

    const sign = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(8.4, 2.1)), materials.sign);
    sign.position.set(SIGN_WALL_X, 3.0, SIGN_WALL_Z);
    sign.rotation.y = Math.PI / 2;
    room.add(sign);

    // Plaque d'immatriculation du mur : la date d'ouverture du garage.
    const plateTexture = texture(() => makeCanvasTexture((ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(12,16,22,.9)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(200,220,255,.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, width - 12, height - 12);
      neonText(ctx, 'EST. 1986', width / 2, height * 0.4, `900 ${Math.round(height * 0.26)}px "Orbitron", Arial, sans-serif`, '#f2c14e', 12);
      neonText(ctx, 'VICE CITY · MIAMI', width / 2, height * 0.74, `800 ${Math.round(height * 0.15)}px "Orbitron", Arial, sans-serif`, '#cfe0ff', 8);
    }, 512, 200, { smooth: true }));
    const wallPlate = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(1.5, 0.58)), material(() => new THREE.MeshBasicMaterial({
      map: plateTexture, transparent: true, toneMapped: false,
    })));
    wallPlate.position.set(SIGN_WALL_X, 3.5, -3.0);
    wallPlate.rotation.y = Math.PI / 2;
    room.add(wallPlate);

    /* ── Plateau tournant ─────────────────────────────────────────────────── */
    const turntable = new THREE.Group();
    turntable.name = 'vice-city-garage-turntable';
    scene.add(turntable);

    const platform = new THREE.Mesh(geometry(() => new THREE.CylinderGeometry(TURNTABLE_RADIUS, TURNTABLE_RADIUS + 0.12, TURNTABLE_TOP, 48)), materials.platform);
    platform.position.y = TURNTABLE_TOP / 2;
    platform.receiveShadow = true;
    platform.castShadow = true;
    turntable.add(platform);

    const ring = new THREE.Mesh(geometry(() => new THREE.TorusGeometry(TURNTABLE_RADIUS - 0.02, 0.035, 10, 64)), materials.accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = TURNTABLE_TOP + 0.005;
    turntable.add(ring);

    const innerRing = new THREE.Mesh(geometry(() => new THREE.TorusGeometry(TURNTABLE_RADIUS - 0.55, 0.014, 8, 64)), materials.mark);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = TURNTABLE_TOP + 0.006;
    turntable.add(innerRing);

    // Marquage au sol autour du plateau.
    const markHalfX = TURNTABLE_RADIUS + 1.6;
    const markHalfZ = TURNTABLE_RADIUS + 1.6;
    for (const [size, position] of [
      [[markHalfX * 2, 0.05, 0.06], [0, 0.03, -markHalfZ]],
      [[markHalfX * 2, 0.05, 0.06], [0, 0.03, markHalfZ]],
      [[0.06, 0.05, markHalfZ * 2], [-markHalfX, 0.03, 0]],
      [[0.06, 0.05, markHalfZ * 2], [markHalfX, 0.03, 0]],
    ]) {
      const line = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(...size)), materials.mark);
      line.position.set(...position);
      room.add(line);
    }

    /* ── Outillage et fluides ─────────────────────────────────────────────── */
    const props = new THREE.Group();
    props.name = 'vice-city-garage-props';
    room.add(props);

    const chest = makeToolChest(materials);
    chest.position.set(-6.2, 0, -1.4);
    chest.rotation.y = 0.5;
    props.add(chest);

    for (const [x, z] of [[-6.6, -4.0], [-5.6, -4.6]]) {
      const stack = makeTireStack(materials, 4);
      stack.position.set(x, 0, z);
      props.add(stack);
    }
    for (const [x, z] of [[6.6, -3.8], [6.6, -4.4]]) {
      const stack = makeTireStack(materials, 3);
      stack.position.set(x, 0, z);
      props.add(stack);
    }

    for (const [x, z] of [[6.2, -2.0], [6.2, -1.5]]) {
      const can = makeJerryCan(materials);
      can.position.set(x, 0, z);
      can.rotation.y = -0.4;
      props.add(can);
    }

    // Étagère murale avec caisses d'outillage.
    for (const side of [-1, 1]) {
      const shelf = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(3.6, 0.08, 0.5)), materials.steelDark);
      shelf.position.set(side * 6.4, 2.0, -3.0);
      props.add(shelf);
      for (let index = 0; index < 3; index += 1) {
        const crate = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.7, 0.4, 0.42)), index === 1 ? materials.red : materials.steel);
        crate.position.set(side * 6.4 + (index - 1) * 0.95, 2.24, -3.0);
        crate.castShadow = true;
        props.add(crate);
      }
    }

    /* ── Lumière : rampes de studio ───────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x2a3648, 0.55));
    scene.add(new THREE.HemisphereLight(0x415470, 0x0a0c10, 0.6));

    for (const z of [-4, 0, 4]) {
      const strip = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.38, 0.06, 12)), materials.strip);
      strip.position.set(0, ROOM_HEIGHT - 0.1, z);
      room.add(strip);
    }

    const key = new THREE.SpotLight(0xfff3e2, 480, 20, 0.66, 0.7, 2);
    key.position.set(3.6, ROOM_HEIGHT - 0.25, 3.6);
    key.target.position.copy(CAMERA_TARGET);
    key.castShadow = !lite;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1.2;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.0006;
    key.shadow.radius = 3;
    scene.add(key, key.target);

    const fill = new THREE.SpotLight(0xcfe0ff, 230, 20, 0.75, 0.85, 2);
    fill.position.set(-4.2, ROOM_HEIGHT - 0.5, 1.4);
    fill.target.position.copy(CAMERA_TARGET);
    scene.add(fill, fill.target);

    const rim = new THREE.SpotLight(accentColor.getHex(), 280, 18, 0.8, 0.9, 2);
    rim.position.set(-1.0, 3.6, BACK_WALL_Z + 2.4);
    rim.target.position.set(0, 0.7, 0.3);
    scene.add(rim, rim.target);

    const signLight = new THREE.PointLight(accentColor.getHex(), 34, 12, 2);
    signLight.position.set(SIGN_WALL_X + 1.2, 2.8, SIGN_WALL_Z);
    scene.add(signLight);

    /* ── La voiture, sur le plateau ───────────────────────────────────────── */
    // Les reflets de carrosserie viennent d'une carte d'environnement générée
    // à la volée par le moteur de rendu du garage (`configureCarReflections`).
    configureCarReflections(renderer);
    const car = makeRacerCar(profile, { player: true, daylight: false, number: 86 });
    car.position.y = TURNTABLE_TOP;
    car.name = `vice-city-garage-car-${profile.id}`;
    turntable.add(car);

    // Les matériaux de la voiture sont fabriqués par le modèle à chaque appel
    // et ne sont partagés avec personne : eux seuls sont rendus au changement
    // de voiture (géométries et textures peuvent l'être avec d'autres scènes).
    const carMaterials = new Set();
    car.traverse((object) => {
      const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      list.forEach((item) => carMaterials.add(item));
    });

    /* ── Poussières dans les faisceaux ────────────────────────────────────── */
    const dustCount = 170;
    const dustPositions = new Float32Array(dustCount * 3);
    const random = seededRandom(21);
    for (let index = 0; index < dustCount; index += 1) {
      dustPositions[index * 3] = (random() - 0.5) * 12;
      dustPositions[index * 3 + 1] = 0.2 + random() * 4.4;
      dustPositions[index * 3 + 2] = (random() - 0.5) * 9.5;
    }
    const dustGeometry = geometry(() => {
      const item = new THREE.BufferGeometry();
      item.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      return item;
    });
    const dust = new THREE.Points(dustGeometry, materials.dust);
    scene.add(dust);

    /* ── Regard : cadrage, parallasse, Plateau ────────────────────────────── */
    const resize = () => {
      const width = Math.max(1, mount.clientWidth || 1);
      const height = Math.max(1, mount.clientHeight || 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Le plateau doit remplir le cadre : la caméra se rapproche ou recule
      // selon la forme de la fenêtre (large → gros plan, téléphone → recul
      // jusqu'à ce que la voiture entière passe).
      distance = frameDistance(camera.fov, camera.aspect);
      camera.updateProjectionMatrix();
      applyCameraBase();
    };
    resize();

    let resizeObserver = null;
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
    } else {
      globalThis.addEventListener?.('resize', resize);
    }

    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let dragging = false;

    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const onPointerDown = (event) => {
      dragging = true;
      onPointerMove(event);
      mount.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = () => { dragging = false; };
    const onPointerLeave = () => {
      dragging = false;
      pointerX = 0;
      pointerY = 0;
    };
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    mount.addEventListener('pointerleave', onPointerLeave);
    globalThis.addEventListener?.('pointerup', onPointerUp);

    let running = true;
    const onVisibility = () => {
      running = !document.hidden;
      last = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    let observer = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        running = entries[0]?.isIntersecting !== false && !document.hidden;
        last = 0;
      }, { threshold: 0.02 });
      observer.observe(mount);
    }

    const offset = new THREE.Vector3();
    const placeCamera = () => {
      // La caméra tourne autour du plateau (regard à la souris / au doigt) en
      // gardant la distance de cadrage.
      offset.copy(CAMERA_DIRECTION).applyAxisAngle(UP, smoothX * POINTER_YAW).multiplyScalar(distance).add(CAMERA_TARGET);
      offset.x += (Number(cameraShift) || 0) * Math.cos(smoothX * POINTER_YAW);
      offset.y += smoothY * POINTER_PITCH;
      camera.position.copy(offset);
      camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y + smoothY * 0.06, CAMERA_TARGET.z);
    };

    let raf = 0;
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!reducedMotion && !dragging) turntable.rotation.y += dt * TURNTABLE_SPEED;
      if (!reducedMotion) dust.rotation.y += dt * 0.012;
      const ease = Math.min(1, dt * 6);
      smoothX += (pointerX - smoothX) * ease;
      smoothY += (pointerY - smoothY) * ease;
      placeCamera();
      renderer.render(scene, camera);
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      observer?.disconnect();
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('pointerleave', onPointerLeave);
      carMaterials.forEach((item) => item.dispose());
      ownGeometries.forEach((item) => item.dispose());
      ownMaterials.forEach((item) => item.dispose());
      ownTextures.forEach((item) => item.dispose());
      scene.traverse((object) => {
        if (object.isLight) {
          object.dispose?.();
          if (object.shadow) object.shadow.dispose?.();
        }
      });
      renderer.dispose();
      try {
        renderer.forceContextLoss();
      } catch {
        // Certains contextes refusent la libération forcée : sans conséquence.
      }
      renderer.domElement.remove();
    };
  }, [carId, carName, accent, cameraShift]);

  if (failed) {
    return (
      <div className="city-rush-hub-stage-fallback">
        {fallbackSrc && <img src={fallbackSrc} alt="" loading="lazy" decoding="async" />}
        <span>GARAGE 3D INDISPONIBLE SUR CET APPAREIL</span>
      </div>
    );
  }

  return <div className="city-rush-hub-stage-canvas" ref={mountRef} />;
}
