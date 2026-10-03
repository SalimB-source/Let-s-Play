// ════════════════════════════════════════════════════════════════════
// LA CENDRE — monde 3D (M0 : fondations)
// Contrôleur libre ZQSD/AWSD + caméra orbitale 3e personne (souris,
// pointer lock avec repli « glisser »), collisions, décor de la Cour du
// Seuil. La boucle suit le pattern MirageWorld : makeWorld() en logique
// pure, composant React juste pour le montage/nettoyage.
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CAMERA, PLAYER_RADIUS, RUN_SPEED, TURN_RATE, WALK_SPEED,
  createRunState, stepMovement, speedOf, stepYaw, yawToward,
  resolveCollisions, cameraPosition, cameraBasis, clampPitch,
} from './soulsRules';
import {
  TORSO_Y,
  seatDrop,
  makeInsectWarrior, makeBonfire, makeBrazier, makeWalls, makePillar,
  makeBarrel, makeRubble, makeFloor, makeMoon, makeAshField,
  makeSkyDome, makeStars, makeMoonGlow, makeMistPatches, makeLightShaft,
  makeGrassField, makeFlowerField, makeTree, makeBush,
  makeHitSparks, makeHealMotes, disposeAnimeMaps,
  buildNightEnvironment,
  makeStonePath, SEAT_POSE,
} from './soulsModels';
import {
  STAGE, BONFIRES, stageHeight, stageColliders, treeColliders, forestTrees,
  portalCollider, SPAWNS, MOB_AGGRO, zoneAt, ZONE_LABELS,
  blockAggro as stageBlockAggro, nearestBonfire, createQuest, interact,
  interactionPrompt,
} from './soulsStage';
import {
  makeOuterGround, makeForecourt, makeChapel, makeChest, makeForest,
  makeCastle, makeThroneHall, makeForestFloor,
} from './soulsCastle';
import { createPost } from './soulsPost';
import { preloadGameAssets, getGameAssets } from './soulsAssets';
import {
  createCombatState, stepCombat, tryLight, tryHeavy, tryDodge,
  attackPhase, playerStrikeReady, markSwingHit, damagePlayer,
  inArc, ATTACKS, DODGE, STAMINA, ENEMY, BOSS,
  DRINK, tryDrink, drinkHealDue, isDrinking, moveSpeedMult,
  createEnemyState, stepEnemy, damageEnemy, resetEnemy,
  pickLockTarget, lockStillValid,
} from './soulsCombat';
import {
  PROGRESS, STAT_LABELS, POTION_LABEL, createProgress, gainSouls, die, stainNear,
  rest, drinkFlask, tryLevelUp, maxHp, staminaMax, strMult,
} from './soulsProgress';
import { playSouls } from './soulsAudio';
import {
  TOUCH_LOOK_SENSITIVITY, TOUCH_QUEUE,
  attachLookPad, isTouchPointer, stickSpeedScale,
} from './soulsTouch';

const BASE_FOV = 55;
const SEAT = SEAT_POSE; // pose assise du Roi (soulsModels : contrat de rig)
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
/** Stick au repos — le Gardien Chitine s'arrête. */
const TOUCH_IDLE = Object.freeze({ x: 0, y: 0, magnitude: 0, run: false });

// Specs du boss (bond inclus) : BOSS, module pur soulsCombat.js.

function makeWorld(mount, callbacks) {
  // Un doigt plutôt qu'une souris ? Décidé une fois pour toutes à la
  // construction : les invites, l'aria-label et le verrou de souris en
  // dépendent, et le périphérique ne change pas en cours de partie.
  const touchDevice = isTouchPointer();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050610);
  // Nuit plus dense : les feux, les yeux composés et les runes découpent les
  // silhouettes au lieu d'éclairer toute la cour comme un crépuscule.
  scene.fog = new THREE.Fog(0x0d1023, 14, 56);

  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 400);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  // Ombres dynamiques douces (lune) — le remaster tient à ça.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'souls-canvas';
  renderer.domElement.setAttribute(
    'aria-label',
    touchDevice
      ? 'Jeu 3D La Cendre — parcours la Cour du Seuil au stick et aux boutons de la manette tactile'
      : 'Jeu 3D La Cendre — parcours la Cour du Seuil à la souris et au clavier',
  );
  mount.appendChild(renderer.domElement);

  // Environnement PBR nocturne sur-mesure : dôme dégradé, lune HDR,
  // lueurs ambrées des braseros → les reflets sur l'acier, la peau et
  // la pierre racontent la scène (pas une pièce générique).
  scene.environment = buildNightEnvironment(renderer);
  scene.environmentIntensity = 0.32;

  // ── Lumière : lune clé (ombres) + contre-jour froid + sources chaudes
  const hemi = new THREE.HemisphereLight(0x303967, 0x0a0818, 0.62);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0x8a93ca, 0.92);
  moonLight.position.set(-16, 24, -13);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -26;
  moonLight.shadow.camera.right = 26;
  moonLight.shadow.camera.top = 26;
  moonLight.shadow.camera.bottom = -26;
  moonLight.shadow.camera.near = 2;
  moonLight.shadow.camera.far = 80;
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.028;
  scene.add(moonLight);
  scene.add(moonLight.target); // la lune suit le joueur (carte longue de 130 m)
  const fill = new THREE.DirectionalLight(0x8d2a60, 0.13);
  fill.position.set(6, 8, 10);
  scene.add(fill);
  // Contour bleuté derrière l'épaule — silhouettage « remaster ».
  const rim = new THREE.DirectionalLight(0x3ea8b5, 0.42);
  rim.position.set(10, 6, -14);
  scene.add(rim);

  // ── Cour du Seuil ─────────────────────────────────────────────────
  const colliders = [];
  const cameraBlockers = [];
  const flickerables = [];

  const floor = makeFloor(46);
  scene.add(floor);

  const walls = makeWalls(17, 3.4, 1);
  scene.add(walls.group);
  colliders.push(...walls.colliders);
  cameraBlockers.push(...walls.blockers);

  // Ombres : helper partagé (ignore les matériaux transparents — flammes,
  // halos, ombres de contact — qui ne doivent rien projeter).
  const flagShadow = (root, receive = false) => {
    root.traverse((o) => {
      if (!o.isMesh || o.material?.transparent || o.material?.blending === THREE.AdditiveBlending) return;
      o.castShadow = !o.userData.noCast;
      o.receiveShadow = receive;
    });
  };
  floor.receiveShadow = true;
  flagShadow(walls.group, true);

  // ── Le Chemin du Roi : route, chapelle + coffre, forêt, château, nef ──
  const trees = forestTrees();
  const levelGroup = new THREE.Group();
  const roadPath = makeStonePath(STAGE.road, { width: 3.4, step: 0.7 });
  const spurPath = makeStonePath(STAGE.spur, { width: 2.6, step: 0.7 });
  const forecourt = makeForecourt();
  const chapel = makeChapel();
  const chest = makeChest();
  const forest = makeForest(trees);
  const forestFloor = makeForestFloor(trees);
  const castle = makeCastle();
  const hall = makeThroneHall();
  levelGroup.add(makeOuterGround(), roadPath.group, spurPath.group, forecourt.group,
    chapel.group, chest.group, forest.group, forestFloor.group, castle.group, hall.group);
  scene.add(levelGroup);
  const portalBlock = portalCollider(); // se retire quand la clé a ouvert le portail
  colliders.push(...stageColliders(), ...treeColliders(trees), portalBlock);
  cameraBlockers.push(...chapel.blockers, ...chest.blockers, ...forest.blockers,
    ...castle.blockers, ...hall.blockers);
  flagShadow(levelGroup, true);

  // Lumières de zone (les flammes de décor n'en portent pas : 5 sources
  // mutualisées au lieu d'une par brasero).
  const zoneLights = [
    [0xc44976, 20, 14, [-20.5, 3.0, -31]],      // chapelle — braise rouge
    [0xbc3b6d, 27, 18, [0, 3.6, -85.4]],         // parvis du portail
    [0x9f356d, 43, 29, [0, 7.0, -103]],          // nef
    [0x7f295b, 36, 23, [0, 4.6, -118]],          // estrade du Roi Chitine
  ];
  zoneLights.forEach(([color, intensity, distance, pos], i) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(...pos);
    scene.add(light);
    flickerables.push({ light, lightBase: intensity, flickerSeed: 1.7 + i * 2.3 });
  });
  flickerables.push(...chapel.flickerables, ...castle.flickerables, ...hall.flickerables);

  // Second feu de camp : éteint jusqu'à ce que le joueur l'allume (E).
  const seuilSpec = BONFIRES[1];
  const seuilFire = makeBonfire(seuilSpec.x, seuilSpec.z);
  scene.add(seuilFire.group);
  colliders.push(seuilFire.collider);
  cameraBlockers.push(...seuilFire.blockers);
  flickerables.push(seuilFire.flickerable);
  flagShadow(seuilFire.group, true);
  const seuilGlow = [];
  seuilFire.group.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if ((m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex() > 0) || m.transparent) seuilGlow.push(o);
  });
  const fireByIdOrNull = (id) => (id === 'seuil' ? seuilFire : null);
  const setFireLit = (id, lit) => {
    const f = fireByIdOrNull(id);
    if (!f) return;
    for (const o of seuilGlow) o.visible = lit;
    f.flickerable.lightBase = lit ? 14 : 0;
    f.flickerable.light.intensity = lit ? 14 : 0;
  };
  setFireLit('seuil', false);

  for (const [x, z, broken] of [
    [-7.5, -7.5, false], [7.5, -7.5, false], [-7.5, 7.5, false], [7.5, 7.5, true],
  ]) {
    const pillar = makePillar(x, z, broken);
    scene.add(pillar.group);
    colliders.push(pillar.collider);
    cameraBlockers.push(...pillar.blockers);
    flagShadow(pillar.group, true);
  }

  for (const [x, z, h, lying] of [
    [-11.5, -9, 0.95, false], [-12.4, -9.3, 0.8, false],
    [12, 8.6, 1.0, false], [11.1, 9.1, 0.85, false],
    [-13.5, 10.5, 0.9, true], [10.5, -12, 0.95, false],
  ]) {
    const barrel = makeBarrel(x, z, h, lying);
    scene.add(barrel.group);
    colliders.push(barrel.collider);
    cameraBlockers.push(...barrel.blockers);
    flagShadow(barrel.group, true);
  }

  for (const [x, z] of [[-5.4, -3.8], [5.4, -3.8], [-5.4, 4.2], [5.4, 4.2]]) {
    const brazier = makeBrazier(x, z);
    scene.add(brazier.group);
    colliders.push(brazier.collider);
    cameraBlockers.push(...brazier.blockers);
    flickerables.push(brazier.flickerable);
    flagShadow(brazier.group, true);
  }

  const bonfire = makeBonfire(0, 0);
  scene.add(bonfire.group);
  colliders.push(bonfire.collider);
  cameraBlockers.push(...bonfire.blockers);
  flickerables.push(bonfire.flickerable);
  flagShadow(bonfire.group, true);

  // ── Bloodstain : gage d'âmes lâchées à la mort ─────────────────────
  const stainCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.17, 0),
    new THREE.MeshBasicMaterial({
      color: 0x8fe0ff, transparent: true, opacity: 0.92, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  const stainRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.028, 8, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffc46a, transparent: true, opacity: 0.7, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  stainRing.rotation.x = Math.PI / 2;
  const stain = new THREE.Group();
  stain.add(stainCore, stainRing);
  stain.position.y = 0.14;
  stain.visible = false;
  scene.add(stain);

  for (const [x, z, seed] of [[-4, 9, 1], [6.5, -11, 2], [-13, 3, 3], [11, 12.5, 4], [3.5, -13.5, 5]]) {
    scene.add(makeRubble(x, z, seed));
  }

  // Braises flottantes autour des sources de feu.
  const ashField = makeAshField([[0, 0], [-5.4, -3.8], [5.4, -3.8], [-5.4, 4.2], [5.4, 4.2]]);
  scene.add(ashField.points);
  // Braises des feux éloignés : chapelle, parvis, nef, second feu de camp.
  const levelAsh = makeAshField([
    [-26, -28.1], [-26, -33.9], [-6.4, -86], [6.4, -86], [seuilSpec.x, seuilSpec.z],
    ...STAGE.hall.braziers,
  ]);
  scene.add(levelAsh.points);

  // ── Ambiance remaster : ciel, étoiles, halo lunaire, brumes ──────
  // Le ciel suit le joueur : la carte fait 130 m, pas question de sortir du dôme.
  const skyRig = new THREE.Group();
  skyRig.add(makeSkyDome(140), makeStars(460, 132), makeMoonGlow(-46, 34, -70, 36), makeMoon());
  scene.add(skyRig);
  const mist = makeMistPatches([
    [-8, -12, 13, 4.5, 0.12], [9, 11, 12, 4, 0.1],
    [-12, 6, 10, 3.6, 0.09], [11, -7, 11, 3.8, 0.1],
    [0, -15, 14, 4.2, 0.08],
    // Forêt : brumes basses le long de la route
    [3, -38, 14, 3.6, 0.1], [12, -52, 16, 4, 0.11], [-8, -58, 15, 4, 0.1],
    [16, -70, 14, 3.6, 0.1], [-14, -74, 14, 3.8, 0.1], [0, -80, 16, 3.6, 0.09],
    [28, -44, 14, 3.6, 0.1], [-22, -44, 14, 3.6, 0.1], [-4, -45, 12, 3.2, 0.09],
  ]);
  scene.add(mist);

  // Faisceaux de lumière au-dessus des flammes (pilotés par le flicker).
  const shafts = [];
  for (const [x, z] of [[-5.4, -3.8], [5.4, -3.8], [-5.4, 4.2], [5.4, 4.2]]) {
    const shaft = makeLightShaft(x, 1.2, z, { height: 4.6, rTop: 0.85, opacity: 0.12 });
    shafts.push(shaft);
    scene.add(shaft);
  }
  const bonfireShaft = makeLightShaft(0, 0.9, 0, { height: 5.4, rTop: 1.1, rBottom: 0.4, opacity: 0.1 });
  shafts.push(bonfireShaft);
  scene.add(bonfireShaft);

  // ── Végétation : modèles CC0 (Quaternius) si préchargés, sinon
  // les arbres procéduraux — le décor ne régresse jamais. ──────────
  const assets = getGameAssets() || {};
  const collectMeshes = (root) => {
    const list = [];
    root.traverse((o) => { if (o.isMesh) list.push(o); });
    return list;
  };
  // Normalise l'échelle par la bbox : hauteur cible = unité du monde.
  const placeModel = (proto, x, z, targetHeight, yaw) => {
    const model = proto.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = targetHeight / Math.max(0.001, size.y);
    model.scale.setScalar(scale);
    model.position.set(x, -box.min.y * scale, z);
    model.rotation.y = yaw;
    scene.add(model);
    flagShadow(model, true);
    return model;
  };

  const treeProtos = [assets.treeDead1, assets.treeDead2].filter(Boolean);
  const TREE_SPOTS = [
    [-13.6, 12.6, 1.05, 0.4], [12.8, -13.9, 0.95, 2.3], [14.2, 5.5, 0.8, 4.1],
  ];
  if (treeProtos.length) {
    TREE_SPOTS.forEach(([x, z, s, yaw], i) => {
      const model = placeModel(treeProtos[i % treeProtos.length], x, z, 5.4 * s, yaw);
      colliders.push({ kind: 'circle', x, z, r: 0.5 * s });
      cameraBlockers.push(...collectMeshes(model));
    });
  } else {
    for (const [x, z, s] of [[-13.6, 12.6, 1.05], [12.8, -13.9, 0.95], [14.2, 5.5, 0.8]]) {
      const tree = makeTree(x, z, s);
      scene.add(tree.group);
      colliders.push(tree.collider);
      cameraBlockers.push(...tree.blockers);
      flagShadow(tree.group, true);
    }
  }

  // Rochers moussus + bûche au sol (décor CC0, collisions simples).
  if (assets.rock1 || assets.rock2) {
    const ROCK_SPOTS = [
      [assets.rock1, -8.8, 11.2, 0.85, 0.7],
      [assets.rock2, 10.4, -8.6, 0.62, 2.9],
      [assets.rock1, -14.6, -11.4, 1.1, 4.4],
      [assets.rock2, 7.2, 13.6, 0.75, 1.2],
      [assets.rock1, -15.1, 6.4, 0.55, 5.5],
    ];
    for (const [proto, x, z, h, yaw] of ROCK_SPOTS) {
      if (!proto) continue;
      const model = placeModel(proto, x, z, h, yaw);
      const size = new THREE.Box3().setFromObject(model)
        .getSize(new THREE.Vector3());
      const r = Math.min(0.7, Math.max(0.26, Math.max(size.x, size.z) / 2));
      colliders.push({ kind: 'circle', x, z, r });
    }
  }
  if (assets.log) {
    placeModel(assets.log, 2.35, 1.85, 0.42, 0.9);
    colliders.push({ kind: 'circle', x: 2.35, z: 1.85, r: 0.72 });
  }
  for (const [x, z, s] of [[-15.2, -4.5, 1.1], [15.4, 10.5, 1], [-6.8, 14.8, 0.9], [5.5, 15.2, 1.05]]) {
    scene.add(makeBush(x, z, s));
  }
  const grass = makeGrassField(colliders, 900);
  scene.add(grass);
  const flowers = makeFlowerField(colliders, 40);
  scene.add(flowers);

  // ── Joueur : le Gardien Chitine, guerrier insecte anime ───────────
  const warrior = makeInsectWarrior();
  const parts = warrior.userData.parts;
  // Référence immuable de la garde centrale. Les attaques déplacent le pivot
  // autour de cette pose puis y reviennent sans réintroduire une arme latérale.
  const glaiveMountRest = parts.weaponMount
    ? { x: parts.weaponMount.position.x, y: parts.weaponMount.position.y, z: parts.weaponMount.position.z }
    : null;
  const state = createRunState({ x: 0, z: 6.5 });
  warrior.position.set(state.x, 0, state.z);
  scene.add(warrior);
  flagShadow(warrior, true);

  // ── Essaim hostile : sentinelles insectes + Roi Chitine sur son trône
  const makeFoe = (spawn, opts = {}) => {
    const e = createEnemyState(spawn.x, spawn.z);
    e.spec = { ...ENEMY, ...(opts.spec || {}) };
    e.hp = e.spec.maxHp; // PV pleins dès le premier combat (le boss n'a pas ceux d'un garde)
    e.name = spawn.name || (opts.boss ? 'ROI CHITINE DE CENDRE' : 'GUERRIER INSECTE DÉCHU');
    if (spawn.yaw !== undefined) e.yaw = spawn.yaw;
    if (opts.boss) {
      e.isBoss = true;
      e.baseSpec = { ...e.spec };
      if (e.spec.seated) {
        e.phase = 'seated';        // le Roi attend sur son trône
        e.seatYaw = spawn.yaw ?? 0;
      }
    }
    // Même silhouette insecte que le héros, mais chitiné de rouge cendre et
    // yeux carmin : les ennemis sont une caste corrompue, pas des humains.
    const K = makeInsectWarrior({ corrupted: true, boss: Boolean(opts.boss) });
    K.scale.setScalar(opts.scale ?? 1.05);
    K.position.set(spawn.x, stageHeight(spawn.x, spawn.z), spawn.z);
    K.rotation.y = e.yaw;
    const parts = K.userData.parts;
    if (parts.weapon) {
      // Sort l'arme du dos : elle part en main, pas de coup à main nue.
      parts.weapon.position.set(0.01, -0.24, -0.03);
      parts.weapon.rotation.set(0.18, 0, 0.06);
      parts.elbowR.add(parts.weapon);
    }
    scene.add(K);
    flagShadow(K, true);
    const col = { kind: 'circle', x: spawn.x, z: spawn.z, r: e.spec.radius, solid: true };
    colliders.push(col);
    return {
      e, K, parts, col, name: e.name,
      spawn: { x: spawn.x, z: spawn.z, yaw: spawn.yaw },
      phasePrev: null, from: null,
    };
  };
  const foes = SPAWNS.map((spawn) => makeFoe(spawn, spawn.boss
    ? { boss: true, scale: 1.85, spec: BOSS }
    : { spec: { ...MOB_AGGRO } }));
  const resetSquad = () => {
    for (const F of foes) {
      resetEnemy(F.e, F.spawn.x, F.spawn.z);
      if (F.spawn.yaw !== undefined) F.e.yaw = F.spawn.yaw;
      F.col.solid = true;
      F.col.x = F.spawn.x;
      F.col.z = F.spawn.z;
      F.phasePrev = null;
      F.from = null;
      F.groundY = stageHeight(F.spawn.x, F.spawn.z);
      F.K.visible = true;
      F.K.rotation.x = 0;
      F.K.rotation.z = 0;
      F.K.position.set(F.spawn.x, F.groundY, F.spawn.z);
    }
  };
  const sparks = makeHitSparks();
  scene.add(sparks.points);
  const healMotes = makeHealMotes();
  scene.add(healMotes.points);

  // Garde à deux mains : le glaive du héros reste levé au centre du thorax.
  // Les ennemis gardent leur reparentage main droite ci-dessus, mais le joueur
  // utilise son pivot central afin que les deux bras puissent serrer la hampe.
  const weaponState = { drawn: false };
  const setWeaponDrawn = (drawn) => {
    if (weaponState.drawn === drawn) return;
    weaponState.drawn = drawn;
    if (parts.weaponMount) {
      parts.weapon.visible = drawn;
      parts.weapon.position.set(0, 0, 0);
      parts.weapon.rotation.set(0.06, 0, Math.PI + 0.04);
      parts.weaponMount.add(parts.weapon);
      return;
    }
    if (drawn) {
      parts.weapon.position.set(0.01, -0.24, -0.03);
      parts.weapon.rotation.set(0.18, 0, 0.06);
      parts.elbowR.add(parts.weapon);
    } else {
      parts.weapon.position.set(0.1, 0.32, 0.19);
      parts.weapon.rotation.set(0.1, 0, -0.35);
      parts.torso.add(parts.weapon);
    }
  };

  // ── Prise à deux mains, devant le thorax ───────────────────────────
  // Les deux paumes sont résolues vers les deux repères de la même hampe.
  // Le coude part vers l'extérieur ET vers l'avant (−Z local), jamais derrière
  // les ailes : le glaive levé est une garde frontale, pas une arme de dos.
  const lockTwoHandedGlaive = (() => {
    const shoulder = new THREE.Vector3();
    const grip = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const bend = new THREE.Vector3();
    const elbowTarget = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const upperDirection = new THREE.Vector3();
    const lowerDirection = new THREE.Vector3();
    const frontOut = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const parentQuaternion = new THREE.Quaternion();
    const worldQuaternion = new THREE.Quaternion();
    const localQuaternion = new THREE.Quaternion();
    const torsoQuaternion = new THREE.Quaternion();
    const down = new THREE.Vector3(0, -1, 0);

    const pointJointAt = (joint, direction) => {
      joint.parent.getWorldQuaternion(parentQuaternion);
      worldQuaternion.setFromUnitVectors(down, direction);
      localQuaternion.copy(parentQuaternion).invert().multiply(worldQuaternion);
      joint.quaternion.copy(localQuaternion);
    };

    const solveArm = (arm, elbowJoint, gripAnchor, side) => {
      arm.getWorldPosition(shoulder);
      gripAnchor.getWorldPosition(grip);
      axis.copy(grip).sub(shoulder);
      const distance = axis.length();
      if (distance < 1e-4) return false;
      axis.multiplyScalar(1 / distance);

      arm.getWorldScale(scale);
      const upperLength = 0.31 * scale.y;
      const lowerLength = 0.3 * scale.y;
      const reach = THREE.MathUtils.clamp(
        distance,
        Math.abs(upperLength - lowerLength) + 0.002,
        upperLength + lowerLength - 0.003,
      );
      const along = (upperLength * upperLength - lowerLength * lowerLength + reach * reach) / (2 * reach);
      const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));

      // `side` garde les coudes séparés ; −Z les place clairement devant le
      // buste, entre les épaules et la garde, au lieu de les cacher derrière.
      frontOut.set(side * 0.9, 0, -0.78).normalize().applyQuaternion(torsoQuaternion);
      bend.copy(frontOut).addScaledVector(axis, -frontOut.dot(axis));
      if (bend.lengthSq() < 1e-5) {
        frontOut.set(side, 0, 0).applyQuaternion(torsoQuaternion);
        bend.copy(frontOut).addScaledVector(axis, -frontOut.dot(axis));
      }
      bend.normalize();
      elbowTarget.copy(shoulder).addScaledVector(axis, along).addScaledVector(bend, height);

      upperDirection.copy(elbowTarget).sub(shoulder).normalize();
      pointJointAt(arm, upperDirection);
      arm.updateWorldMatrix(true, true);
      elbowJoint.getWorldPosition(elbow);
      lowerDirection.copy(grip).sub(elbow).normalize();
      pointJointAt(elbowJoint, lowerDirection);
      return true;
    };

    return (rig) => {
      const {
        armL, armR, elbowL, elbowR, torso, weapon, weaponMount, rightGrip, offhandGrip,
      } = rig;
      if (!weaponMount || !rightGrip || !offhandGrip || weapon.parent !== weaponMount) return false;
      torso.updateWorldMatrix(true, true);
      torso.getWorldQuaternion(torsoQuaternion);
      // Droite basse puis gauche haute : les deux mains encadrent la hampe.
      const rightHeld = solveArm(armR, elbowR, rightGrip, 1);
      torso.updateWorldMatrix(true, true);
      torso.getWorldQuaternion(torsoQuaternion);
      const leftHeld = solveArm(armL, elbowL, offhandGrip, -1);
      return rightHeld && leftHeld;
    };
  })();

  // ── État caméra / entrées ─────────────────────────────────────────
  let camYaw = 0;
  let groundY = 0; // hauteur lissée du sol sous le Gardien Chitine
  let camPitch = -0.05;
  let active = false;
  let locked = false;
  let lockPending = false;
  let dragging = false;
  let dragDistance = 0;
  const lastMouse = { x: 0, y: 0 };
  const keys = new Set();
  // ── Entrées tactiles (téléphone, application) : le stick de la page remplit
  // `touch`, exactement comme le clavier remplit `keys`. Deux périphériques,
  // une seule lecture dans `readInput`.
  const touch = { x: 0, y: 0, magnitude: 0, run: false };
  const clearTouch = () => { Object.assign(touch, TOUCH_IDLE); };
  let gaitPhase = 0;
  let prevCombatAction = 'none';
  let rollSign = 1; // −1 = rouleau avant, +1 = rouleau arrière
  let atkStart = null;      // pose figée au départ d'une attaque
  let lockTarget = null;
  const combat = createCombatState();

  // ── Boucle souls (M2) : âmes, potion de vie, niveaux, bloodstain ───
  const progress = createProgress();
  const quest = createQuest();           // clé, coffre, portail, feux allumés
  let respawnFire = BONFIRES[0];         // dernier feu de repos
  const portalAnim = { running: false, t: 0 };
  let toastText = '';
  let toastT = 0;
  const toast = (text) => { toastText = text; toastT = 2.6; };
  const syncStats = () => {
    combat.maxHp = maxHp(progress);
    combat.staminaMax = staminaMax(progress);
    combat.strMult = strMult(progress);
    if (combat.hp > combat.maxHp) combat.hp = combat.maxHp;
  };
  syncStats();
  const queue = { light: false, heavy: false, dodge: false, lock: false, flask: false, rest: false, vit: false, end: false, str: false };
  let prevYaw = 0;
  let blinkT = 0;
  let nextBlink = 2.2;
  let blinkLeft = 0;
  // ── Mort : le monde se fige, l'écran « VOUS ÊTES MORT » prend la main.
  // Le respawn n'arrive QUE via la poignée `revive()` (bouton « revenir
  // à la vie ») — plus de téléportation instantanée au feu.
  let dead = false;
  let deathT = 0;
  let deathDrop = 0;

  const headVec = new THREE.Vector3();
  const desiredVec = new THREE.Vector3();
  const dirVec = new THREE.Vector3();
  const lookVec = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  const applyLook = (dx, dy) => {
    camYaw -= dx * CAMERA.sensitivity;
    camPitch = clampPitch(camPitch - dy * CAMERA.sensitivity);
  };

  const requestLock = () => {
    // Sur écran tactile, il n'y a pas de souris à capturer : la caméra se
    // pilote au doigt (`attachLookPad`) et le stick gère le déplacement.
    if (touchDevice || locked || lockPending) return;
    lockPending = true;
    const done = () => { lockPending = false; };
    try {
      const result = renderer.domElement.requestPointerLock?.();
      if (result && typeof result.then === 'function') result.then(done).catch(done);
      else window.setTimeout(done, 400);
    } catch {
      // Repli drag-to-look disponible, la pastille reste affichée.
      done();
    }
  };

  const readInput = () => {
    if (dead) {
      return { x: 0, y: 0, run: false, cameraYaw: camYaw, speedScale: 0 };
    }
    const forward = keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp') ? 1 : 0;
    const back = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const left = keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0;
    const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
    // Le clavier prime quand une touche est enfoncée (clavier physique sur
    // téléphone) ; sinon c'est le stick. La poussée partielle du stick ralentit
    // le pas (`stickSpeedScale`), la poussée à fond fait courir.
    const keyX = right - left;
    const keyY = forward - back;
    const usingStick = keyX === 0 && keyY === 0 && touch.magnitude > 0;
    return {
      x: usingStick ? touch.x : keyX,
      y: usingStick ? touch.y : keyY,
      run: keys.has('ShiftLeft') || keys.has('ShiftRight') || (usingStick && touch.run),
      cameraYaw: camYaw,
      speedScale: moveSpeedMult(combat) * (usingStick ? stickSpeedScale(touch.magnitude) : 1),
    };
  };

  // ── Listeners ─────────────────────────────────────────────────────
  const onKeyDown = (event) => {
    if (event.code === 'KeyP' && !event.repeat) {
      callbacks.pauseKey?.();
      return;
    }
    keys.add(event.code);
    if (active && GAME_KEYS.has(event.code)) event.preventDefault();
    if (active && !event.repeat) {
      if (event.code === 'Space') queue.dodge = true;
      else if (event.code === 'Tab') queue.lock = true;
      else if (event.code === 'KeyJ') queue.light = true;
      else if (event.code === 'KeyK') queue.heavy = true;
      else if (event.code === 'KeyF') queue.flask = true;
      else if (event.code === 'KeyE') queue.rest = true;
      else if (event.code === 'KeyU') queue.vit = true;
      else if (event.code === 'KeyI') queue.end = true;
      else if (event.code === 'KeyO') queue.str = true;
    }
  };
  const onKeyUp = (event) => keys.delete(event.code);
  const onBlur = () => keys.clear();

  const onMouseMove = (event) => {
    if (!active) return;
    if (locked) {
      applyLook(event.movementX || 0, event.movementY || 0);
    } else if (dragging) {
      const dx = event.clientX - lastMouse.x;
      const dy = event.clientY - lastMouse.y;
      lastMouse.x = event.clientX;
      lastMouse.y = event.clientY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      applyLook(dx, dy);
    }
  };
  const onMouseDown = (event) => {
    if (!active) return;
    if (locked) {
      if (event.button === 0) queue.light = true;
      else if (event.button === 2) queue.heavy = true;
      return;
    }
    if (event.button !== 0) return;
    dragging = true;
    dragDistance = 0;
    lastMouse.x = event.clientX;
    lastMouse.y = event.clientY;
  };
  const onMouseUp = () => { dragging = false; };
  const onCanvasClick = () => {
    if (!active || locked) return;
    if (dragDistance < 7) requestLock();
  };
  const onContextMenu = (event) => { if (active) event.preventDefault(); };

  const onLockChange = () => {
    locked = document.pointerLockElement === renderer.domElement;
    lockPending = false;
    callbacks.lockChange?.(locked);
  };
  const onLockError = () => {
    locked = false;
    lockPending = false;
    callbacks.lockChange?.(false);
  };
  const onVisibility = () => {
    if (document.hidden && active) callbacks.autoPause?.();
  };

  // Caméra au doigt : glisser sur le canvas (hors stick et boutons, qui sont
  // au-dessus dans le DOM) fait tourner la caméra, comme la souris capturée.
  const detachLookPad = attachLookPad(renderer.domElement, (dx, dy) => {
    if (!active || dead) return;
    applyLook(dx * TOUCH_LOOK_SENSITIVITY, dy * TOUCH_LOOK_SENSITIVITY);
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerlockchange', onLockChange);
  document.addEventListener('pointerlockerror', onLockError);
  document.addEventListener('visibilitychange', onVisibility);

  // ── Resize ────────────────────────────────────────────────────────
  let post = null;
  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width || mount.clientWidth || 1));
    const height = Math.max(1, Math.floor(bounds.height || mount.clientHeight || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Conserve le champ horizontal : la scène ne « rétrécit » pas sur portrait.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2) / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
    post?.resize(width, height, renderer.getPixelRatio());
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(mount);
  window.addEventListener('resize', resize);
  resize();
  const initialResizeFrame = requestAnimationFrame(resize);

  // Position de départ de la caméra (évite un lerp depuis l'origine).
  {
    const head = { x: state.x, y: CAMERA.headHeight + groundY, z: state.z };
    const p = cameraPosition(head, camYaw, camPitch, CAMERA.distance);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(head.x, head.y, head.z);
  }

  // ── Chaîne de post-traitement (bloom, étalonnage, FXAA) ──────────
  post = createPost(renderer, scene, camera);
  resize();

  // ── Boucle ────────────────────────────────────────────────────────
  let lastHud = 0;
  let lastFrame = performance.now();
  let raf = 0;
  let ready = false;
  let currentSpeed = 0;

  const emitHud = (force = false) => {
    const now = performance.now();
    if (!force && now - lastHud < 125) return;
    lastHud = now;
    // Barre d'ennemi : cible verrouillée, sinon l'engagé le plus proche.
    let barFoe = null;
    if (lockTarget && !lockTarget.dead) barFoe = foes.find((f) => f.e === lockTarget) || null;
    if (!barFoe) {
      let bestD = Infinity;
      for (const f of foes) {
        if (f.e.dead || f.e.phase === 'idle' || f.e.phase === 'seated') continue;
        const d = Math.hypot(f.e.x - state.x, f.e.z - state.z);
        if (d < bestD) { bestD = d; barFoe = f; }
      }
    }
    callbacks.hud?.({
      locked,
      moving: currentSpeed > 0.15,
      run: currentSpeed > 3.4,
      x: Math.round(state.x * 10) / 10,
      z: Math.round(state.z * 10) / 10,
      hp: Math.round(combat.hp),
      maxHp: combat.maxHp,
      stamina: Math.round(combat.stamina),
      maxStamina: combat.staminaMax,
      lockOn: !!lockTarget,
      targetHp: barFoe ? Math.round(barFoe.e.hp) : null,
      targetMaxHp: barFoe ? barFoe.e.spec.maxHp : ENEMY.maxHp,
      targetAlive: !!barFoe,
      targetName: barFoe ? barFoe.e.name : null,
      action: combat.action,
      hurt: combat.flash > 0.35,
      souls: progress.souls,
      flask: progress.flask,
      maxFlask: PROGRESS.flaskMax,
      drinking: isDrinking(combat),
      drinkProgress: isDrinking(combat)
        ? Math.min(1, combat.actionT / DRINK.duration) : 0,
      dead,
      deathSouls: deathDrop,
      level: progress.level,
      hasKey: quest.hasKey,
      zone: ZONE_LABELS[zoneAt(state.x, state.z)],
      // Les invites parlent au périphérique : lettres du clavier, ou noms des
      // boutons de la manette tactile (✦ AGIR, ⚗ POTION, ❚❚ PAUSE).
      prompt: (() => {
        const ip = interactionPrompt(quest, state.x, state.z);
        if (ip) return touchDevice ? ip.text.replace(/^E · /, '✦ AGIR · ') : ip.text;
        const f = nearestBonfire(state.x, state.z);
        if (f && quest.lit[f.id]) {
          return touchDevice
            ? '✦ AGIR · se reposer — ⚗ POTION · boire — ❚❚ PAUSE · niveaux'
            : 'E · se reposer — F · potion de vie — U/I/O · niveau';
        }
        return stain.visible ? 'Marchez sur vos âmes pour les reprendre' : null;
      })(),
      toast: toastT > 0 ? toastText : null,
    });
  };

  // ── Mort & résurrection ───────────────────────────────────────────
  /** Le Gardien Chitine tombe : le monde se fige, l'écran de mort s'affiche. */
  const onDeath = () => {
    dead = true;
    deathT = 0;
    deathDrop = die(progress, state.x, state.z);
    if (progress.bloodstain) {
      stain.position.set(progress.bloodstain.x, stageHeight(progress.bloodstain.x, progress.bloodstain.z) + 0.14, progress.bloodstain.z);
      stain.visible = true;
    } else {
      stain.visible = false;
    }
    combat.action = 'none';
    combat.actionT = 0;
    combat.drank = false;
    combat.hitstop = 0;
    combat.shake = 0;
    lockTarget = null;
    combat.lockOn = false;
    parts.potion.visible = false;
    setWeaponDrawn(false);
    releaseLock();
    playSouls('lost');
    toast('');
    emitHud(true);
    callbacks.death?.({ souls: deathDrop, x: state.x, z: state.z });
  };

  /** Bouton « revenir à la vie » : respawn au dernier feu de repos. */
  const revive = () => {
    if (!dead) return false;
    dead = false;
    deathT = 0;
    Object.assign(combat, createCombatState());
    syncStats();
    combat.hp = combat.maxHp;
    combat.stamina = combat.staminaMax;
    Object.assign(state, createRunState(respawnFire.respawn)); // au pied du dernier feu
    groundY = stageHeight(state.x, state.z);
    warrior.position.set(state.x, groundY, state.z);
    warrior.rotation.set(0, state.yaw, 0);
    parts.body.rotation.set(0, 0, 0);
    parts.body.position.set(0, 0, 0);
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.kneeL.rotation.x = -0.05;
    parts.kneeR.rotation.x = -0.05;
    resetSquad();
    setWeaponDrawn(true);
    // Récupération immédiate si le feu de respawn est sur le bloodstain.
    const got = stainNear(progress, state.x, state.z);
    if (got > 0) {
      stain.visible = false;
      playSouls('souls');
      toast(`+${got} âmes retrouvées`);
    } else {
      toast(deathDrop > 0 ? `${deathDrop} âmes gisent là où vous êtes tombé` : 'La braise vous rappelle');
    }
    deathDrop = 0;
    playSouls('rest');
    emitHud(true);
    callbacks.revive?.();
    return true;
  };

  const animate = (time) => {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.04, (time - lastFrame) / 1000);
    lastFrame = time;

    // ── Hitstop : tout est figé (freeze frame de combat) ────────────
    if (combat.hitstop > 0) {
      combat.hitstop = Math.max(0, combat.hitstop - dt);
      post.render(dt);
      emitHud();
      if (!ready) {
        ready = true;
        callbacks.ready?.();
      }
      return;
    }

    // ── Combat M1 : file d'actions, endurance, IA, dégâts ──────────
    const input = readInput();
    stepCombat(combat, dt);
    // Mort : plus aucune entrée n'est traitée (le monde attend le bouton).
    if (dead) {
      queue.light = queue.heavy = queue.dodge = queue.lock = false;
      queue.flask = queue.rest = queue.vit = queue.end = queue.str = false;
      clearTouch();
    }

    if (queue.lock) {
      if (lockTarget) {
        lockTarget = null;
        combat.lockOn = false;
      } else {
        const target = pickLockTarget(state.x, state.z, state.yaw, foes.map((f) => f.e));
        if (target) {
          lockTarget = target;
          combat.lockOn = true;
          playSouls('lock');
        }
      }
    }
    if (queue.light && tryLight(combat)) playSouls('swing');
    if (queue.heavy && tryHeavy(combat)) playSouls('swingHeavy');
    if (queue.dodge) {
      const basis = cameraBasis(camYaw);
      let dx = basis.right.x * input.x + basis.forward.x * input.y;
      let dz = basis.right.z * input.x + basis.forward.z * input.y;
      if (Math.hypot(dx, dz) < 1e-4) { dx = -basis.forward.x; dz = -basis.forward.z; }
      if (tryDodge(combat, dx, dz)) {
        const fx = -Math.sin(state.yaw);
        const fz = -Math.cos(state.yaw);
        rollSign = fx * combat.dodgeDir.x + fz * combat.dodgeDir.z >= 0 ? -1 : 1;
        playSouls('roll');
      }
    }
    const actionStarted = queue.light || queue.heavy || queue.dodge;
    queue.light = false;
    queue.heavy = false;
    queue.dodge = false;
    queue.lock = false;
    if (actionStarted) emitHud(true);

    // ── Boucle souls : potion (F), repos au feu (E), niveaux (U/I/O)
    const fireHere = nearestBonfire(state.x, state.z);
    const nearFire = !!(fireHere && quest.lit[fireHere.id]);
    if (queue.flask) {
      queue.flask = false;
      if (progress.flask <= 0) {
        toast(`${POTION_LABEL} vide — rechargez-vous au feu`);
        playSouls('whiff');
      } else if (combat.hp >= combat.maxHp) {
        toast('Vitalité pleine');
        playSouls('whiff');
      } else if (tryDrink(combat, progress.flask > 0)) {
        // Le geste démarre : ni attaque ni roulade ne passent tant qu'il dure.
        playSouls('flask');
        emitHud(true);
      }
    }
    // La gorgée soigne à mi-geste, une seule fois (un coup encaissé
    // interrompt le geste et la potion n'est pas consommée).
    if (isDrinking(combat) && drinkHealDue(combat)) {
      const heal = drinkFlask(progress);
      combat.hp = Math.min(combat.maxHp, combat.hp + heal);
      healMotes.burst(state.x, groundY + 0.8, state.z);
      playSouls('heal');
      toast(`${POTION_LABEL} +${heal} PV`);
      emitHud(true);
    }
    const restAt = (fire) => {
      respawnFire = fire;
      rest(progress);
      combat.hp = combat.maxHp;
      combat.stamina = combat.staminaMax;
      resetSquad();
      lockTarget = null;
      combat.lockOn = false;
      playSouls('rest');
      toast('Repos — potion remplie, ennemis relevés');
      emitHud(true);
    };
    if (queue.rest) {
      const act = combat.action === 'none' ? interact(quest, state.x, state.z) : null;
      if (act) {
        if (act.kind === 'chest') {
          chest.open();
          playSouls('chest');
        } else if (act.kind === 'portal') {
          if (act.ok) {
            portalAnim.running = true;
            portalAnim.t = 0;
            playSouls('gate');
          } else {
            playSouls('whiff');
          }
        } else if (act.kind === 'light') {
          setFireLit(fireHere.id, true);
          playSouls('aggro');
        }
        if (act.kind === 'light') restAt(fireHere);
        toast(act.message);
        emitHud(true);
      } else if (nearFire && combat.action === 'none') {
        restAt(fireHere);
      }
      queue.rest = false;
    }
    for (const [flag, stat] of [[queue.vit, 'vit'], [queue.end, 'end'], [queue.str, 'str']]) {
      if (!flag) continue;
      if (!nearFire) {
        toast('Seul un feu de camp permet de monter');
      } else {
        const res = tryLevelUp(progress, stat);
        if (res.ok) {
          const beforeHp = combat.maxHp;
          syncStats();
          if (combat.maxHp > beforeHp) combat.hp += combat.maxHp - beforeHp;
          playSouls('souls');
          toast(`${STAT_LABELS[stat]} ${progress[stat]} — ${res.cost} âmes`);
          emitHud(true);
        } else {
          toast(`Il manque ${Math.max(0, res.cost - progress.souls)} âmes`);
        }
      }
    }
    queue.vit = false;
    queue.end = false;
    queue.str = false;
    if (toastT > 0) toastT = Math.max(0, toastT - dt);

    if (combat.action === 'dodge') {
      state.vx = combat.dodgeDir.x * DODGE.speed;
      state.vz = combat.dodgeDir.z * DODGE.speed;
      state.x += state.vx * dt;
      state.z += state.vz * dt;
      resolveCollisions(state, PLAYER_RADIUS, colliders);
      currentSpeed = speedOf(state);
      state.yaw = stepYaw(state.yaw, yawToward(0, 0, state.vx, state.vz), 16, dt);
    } else if (active) {
      if (combat.action === 'hitstun') {
        // Choc : le pilotage est coupé, l'élan s'éteint (rafraîchissement).
        state.vx *= Math.exp(-7 * dt);
        state.vz *= Math.exp(-7 * dt);
        state.x += state.vx * dt;
        state.z += state.vz * dt;
        resolveCollisions(state, PLAYER_RADIUS, colliders);
        currentSpeed = speedOf(state);
      } else {
        stepMovement(state, input, dt);
        resolveCollisions(state, PLAYER_RADIUS, colliders);
        currentSpeed = speedOf(state);
      }
      if (lockTarget) {
        state.yaw = stepYaw(state.yaw, yawToward(state.x, state.z, lockTarget.x, lockTarget.z), TURN_RATE, dt);
      } else if (currentSpeed > 0.15 && combat.action !== 'hitstun') {
        state.yaw = stepYaw(state.yaw, yawToward(0, 0, state.vx, state.vz), TURN_RATE, dt);
      }
    } else {
      currentSpeed = 0;
      state.vx = 0;
      state.vz = 0;
    }

    // ── IA de l'ennemi + fenêtre de frappe adverse ──────────────────
    for (const F of dead ? [] : foes) {
      const enemy = F.e;
      const enemyCollider = F.col;
      if (!enemy.dead) {
      // Chacun n'entend que sa zone : chapelle, route, camp, salle du trône.
      const blockAggro = stageBlockAggro(F.spawn, state);
      const enemyEvent = stepEnemy(enemy, state, dt, { blockAggro });
      if (enemyEvent === 'strike') playSouls('swing');
      else if (enemyEvent === 'rise') {
        // Le Roi quitte son trône.
        playSouls('roar');
        toast(`${enemy.name} SE LÈVE`);
        combat.shake = Math.max(combat.shake, 0.4);
        emitHud(true);
      } else if (enemyEvent === 'risen') {
        playSouls('swingHeavy');
        sparks.burst(enemy.x, stageHeight(enemy.x, enemy.z) + 1.4, enemy.z);
        combat.shake = Math.max(combat.shake, 0.85);
      }
      else if (enemyEvent === 'slam') {
        // Impact du bond : la lame plonge dans la cendre.
        playSouls('swingHeavy');
        sparks.burst(enemy.x, stageHeight(enemy.x, enemy.z) + 0.35, enemy.z);
        const slamD = Math.hypot(state.x - enemy.x, state.z - enemy.z);
        if (slamD < 9) combat.shake = Math.max(combat.shake, 0.7 * (1 - slamD / 9));
      }
      if (enemy.phase === 'rise') {
        // Le sol tremble pendant qu'il se dresse.
        const ru = Math.min(1, enemy.t / (enemy.spec.riseDur ?? 2.4));
        combat.shake = Math.max(combat.shake, 0.22 * Math.sin(Math.PI * ru));
      }
      if (enemy.phase === 'chase' && !enemy.aggroAnnounced) {
        enemy.aggroAnnounced = true;
        playSouls('aggro');
      }
      if (enemy.leftThrone) {
        // Debout, le Roi ne repasse plus à travers le trône.
        for (const c of colliders) {
          if (c === enemyCollider || !c.throneBlock) continue;
          resolveCollisions(enemy, enemy.spec.radius, [c]);
        }
      }
      enemyCollider.x = enemy.x;
      enemyCollider.z = enemy.z;
      for (const c of colliders) {
        if (c === enemyCollider || c.playerOnly) continue;
        resolveCollisions(enemy, enemy.spec.radius, [c]);
      }
      const isSlam = enemy.phase === 'strike2';
      if ((enemy.phase === 'strike' || isSlam) && !enemy.strikeDone) {
        const reach = (isSlam ? (enemy.spec.jumpReach ?? 3.2) : enemy.spec.attackRange) + PLAYER_RADIUS;
        const arc = isSlam ? (enemy.spec.jumpArcCos ?? -0.35) : enemy.spec.strikeArcCos;
        if (inArc(enemy.x, enemy.z, enemy.yaw, state.x, state.z, reach, arc)) {
          enemy.strikeDone = true;
          const eDmg = Math.round(enemy.spec.damage * (isSlam ? 1.25 : 1));
          if (damagePlayer(combat, eDmg)) {
            playSouls('hurt');
            emitHud(true);
          } else {
            playSouls('whiff'); // esquive parfaite (i-frames)
          }
        }
      }
    } else {
      // Mort : on fait tourner le chronomètre de chute (stepEnemy ne
      // tourne plus) et on nettoie UNE seule fois à la première frame.
      const firstDeadFrame = enemy.deathT === 0;
      enemy.deathT += dt;
      if (firstDeadFrame) {
        if (lockTarget === enemy) {
          lockTarget = null;
          combat.lockOn = false;
        }
        enemyCollider.solid = false;
        enemyCollider.x = 999;
        enemyCollider.z = 999;
        playSouls('death');
        emitHud(true);
      }
    }
    }

    // ── Touche du joueur (fenêtre active, une seule fois) ───────────
    if (!dead && playerStrikeReady(combat)) {
      const spec = ATTACKS[combat.action];
      for (const F of foes) {
        const enemy = F.e;
        if (enemy.dead) continue;
        if (!inArc(state.x, state.z, state.yaw, enemy.x, enemy.z, spec.range + enemy.spec.radius, spec.arcCos)) continue;
        const dmg = markSwingHit(combat, combat.action);
        const result = damageEnemy(enemy, dmg);
        sparks.burst((state.x + enemy.x) / 2,
        (stageHeight(state.x, state.z) + stageHeight(enemy.x, enemy.z)) / 2 + 1.1,
        (state.z + enemy.z) / 2);
        playSouls(result === 'riposte' ? 'riposte' : 'hit');
        if (result === 'dead') {
          const g = gainSouls(progress, enemy.spec.souls);
          playSouls('souls');
          toast(`+${g} âmes`);
        } else if (enemy.phase2 && enemy.phase2Shown !== true) {
          enemy.phase2Shown = true;
          playSouls('aggro');
          toast(`${enemy.name} S'ÉVEILLE`);
          sparks.burst(enemy.x, stageHeight(enemy.x, enemy.z) + 1.6, enemy.z);
        }
        emitHud(true);
        break; // un seul ennemi par coup
      }
    }

    setWeaponDrawn(true); // M1 : l'épée ne quitte jamais la main

    // ── Mort (M2) : les âmes tombent en bloodstain, puis l'écran de
    // mort prend la main — le respawn attend le bouton « revenir à la vie ».
    if (combat.hp <= 0 && !dead) onDeath();

    // Récupération du bloodstain en marchant dessus
    if (!dead && stain.visible) {
      const got = stainNear(progress, state.x, state.z);
      if (got > 0) {
        stain.visible = false;
        playSouls('souls');
        toast(`+${got} âmes retrouvées`);
        emitHud(true);
      }
    }

    // ── Animation articulée : cycle de marche/course ample ──────────
    // Cinématique réaliste : balancier généreux, genoux élastiques
    // (talon-fesse en levée, amorti à l'appui), pieds articulés
    // (attaque talon → poussée orteils), contre-rotations bassin/torse,
    // tête stabilisée, banc dans les virages, secondarité (cape,
    // cheveux, lame) et micro-mouvements au repos (respiration,
    // transfert de poids, clignement).
    const runFactor = Math.min(1, Math.max(0,
      (currentSpeed - WALK_SPEED * 0.85) / (RUN_SPEED - WALK_SPEED * 0.85)));
    const walkIn = Math.min(1, currentSpeed / 1.3);
    const moving = currentSpeed > 0.15;
    groundY += (stageHeight(state.x, state.z) - groundY) * Math.min(1, 11 * dt);
    warrior.position.set(state.x, groundY, state.z);
    // ── Gros coup : vrille complète du personnage (smooth ease-in-out),
    // se pose face à la cible pile à l'instant de l'impact (55 %).
    let spinTheta = 0;
    if (combat.action === 'heavy') {
      const h = ATTACKS.heavy;
      const s1 = h.windup + h.active * 0.55; // fin de vrille = impact
      const su = Math.min(1, Math.max(0, combat.actionT / Math.max(0.01, s1)));
      spinTheta = (su * su * (3 - 2 * su)) * Math.PI * 2;
    }
    warrior.rotation.y = state.yaw + spinTheta;
    if (moving) gaitPhase += dt * Math.PI * 2 * (0.85 + 0.22 * currentSpeed);

    const sL = Math.sin(gaitPhase);   // +1 : jambe gauche en avant
    const cL = Math.cos(gaitPhase);
    const amp = (0.54 + 0.44 * runFactor) * walkIn;
    const kneeAmp = 0.9 + 0.7 * runFactor;
    const elbowAmp = 0.42 + 0.55 * runFactor;
    const aim = (joint, prop, target, rate = 15) => {
      joint[prop] += (target - joint[prop]) * (1 - Math.exp(-rate * dt));
    };
    const kneeCurve = (ph) => Math.pow(Math.max(0, Math.cos(ph + 0.9)), 1.5);
    const stanceBend = (ph) => Math.max(0, -Math.cos(ph + 0.4));

    let tLegL = sL * amp;
    let tLegR = -sL * amp;
    let tKneeL = -(0.06 + walkIn * (kneeAmp * kneeCurve(gaitPhase)
      + 0.16 * stanceBend(gaitPhase)));
    let tKneeR = -(0.06 + walkIn * (kneeAmp * kneeCurve(gaitPhase + Math.PI)
      + 0.16 * stanceBend(gaitPhase + Math.PI)));
    // Pied : talon en avant à l'attaque, orteils à la poussée.
    const tFootL = walkIn * 0.3 * Math.sin(gaitPhase + 0.4);
    const tFootR = walkIn * 0.3 * Math.sin(gaitPhase + Math.PI + 0.4);

    // Bras contralatéraux (amplitude généreuse) + pompe de coudes.
    let tArmL = moving ? -sL * amp * 0.8 : 0.05;
    let tArmR = moving ? sL * amp * 0.8 : -0.05;
    let tArmLz = -(0.07 - 0.035 * runFactor);
    let tArmRz = 0.07 - 0.035 * runFactor;
    let tElbowL = 0.26 + 0.3 * runFactor
      + walkIn * (elbowAmp * Math.max(0, -sL) - 0.08 * Math.max(0, sL));
    let tElbowR = 0.26 + 0.3 * runFactor
      + walkIn * (elbowAmp * Math.max(0, sL) - 0.08 * Math.max(0, -sL));

    // Bassin : yaw contre le torse, roulis (côté jambe en l'air plus
    // bas), glissement sur la jambe d'appui ; torse en contre-rotation.
    let tHipsYaw = moving ? -sL * (0.11 + 0.06 * runFactor) : 0;
    const tHipsRoll = moving ? cL * 0.05 : Math.sin(time * 0.0009) * 0.025;
    const tHipsX = moving ? -sL * 0.026 : Math.sin(time * 0.00042) * 0.017;
    let tTorsoYaw = moving ? sL * (0.14 + 0.07 * runFactor)
      : Math.sin(time * 0.0013) * 0.018;
    const tTorsoRoll = moving ? -cL * 0.035 : Math.sin(time * 0.0021) * 0.014;

    // Penchant avant (course) + banc dans les virages.
    let tLean = -(0.045 * walkIn + 0.21 * runFactor);
    let yawDelta = state.yaw - prevYaw;
    if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    else if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    prevYaw = state.yaw;
    const bank = Math.max(-0.14, Math.min(0.14,
      (yawDelta / Math.max(dt, 1e-4)) * 0.045)) * walkIn;

    // Tête : contre-vision lisse + contre-bob ; balade au repos.
    let tHeadYaw = moving ? -(tHipsYaw + tTorsoYaw) * 0.85
      : Math.sin(time * 0.00061) * 0.22 + Math.sin(time * 0.00023) * 0.1;
    let tHeadPitch = moving ? -tLean * 0.55 - 0.02 * Math.abs(sL) * runFactor : 0;

    // Bob vertical : creux à chaque attaque, haut en appui unique.
    let tBob = moving
      ? (0.014 + 0.04 * runFactor) * 0.55 * Math.cos(2 * gaitPhase)
      : Math.sin(time * 0.0021) * 0.013;

    // Cape : souffle en course + oscillation de foulée ; flot au repos.
    const tCape = -(0.05 + runFactor * 0.62)
      + (moving
        ? Math.sin(gaitPhase + 2.1) * (0.05 + 0.05 * runFactor)
          + Math.sin(time * 0.007) * 0.03 * runFactor
        : Math.sin(time * 0.0021) * 0.035);
    const tCapeZ = moving ? Math.sin(gaitPhase + 1.3) * 0.06 * walkIn
      : Math.sin(time * 0.0017) * 0.025;
    // Glaive central et levé : la lame demeure devant le torse, avec une
    // respiration discrète qui ne casse pas l'alignement des deux poignées.
    const raisedWeaponZ = Math.PI + 0.04;
    let tWeaponZ = parts.weaponMount
      ? raisedWeaponZ + (moving
        ? Math.sin(gaitPhase + 1.6) * 0.024 * walkIn
        : Math.sin(time * 0.0013) * 0.008)
      : -0.35 + (moving
        ? Math.sin(gaitPhase + 1.6) * 0.035 * walkIn
        : Math.sin(time * 0.0013) * 0.01);
    let tWeaponX = parts.weaponMount
      ? 0.06 + runFactor * 0.025 + (moving ? Math.abs(sL) * 0.014 * runFactor : 0)
      : 0.1 + runFactor * 0.08 + (moving ? Math.abs(sL) * 0.03 * runFactor : 0);
    // Le pivot translate la garde pendant la frappe : c'est ce déplacement
    // poitrine-haute → hanche-opposée qui rend le diagonal ample, au lieu
    // d'une simple petite rotation sur place.
    let tWeaponMountX = glaiveMountRest?.x ?? 0;
    let tWeaponMountY = glaiveMountRest?.y ?? 0;
    let tWeaponMountZ = glaiveMountRest?.z ?? 0;

    // ── Poses de combat M1 (réécrivent les cibles du cycle de foulée) ─
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const mix = (a, b, u) => a + (b - a) * u;
    const easeOut2 = (u) => 1 - (1 - u) * (1 - u);
    const smooth = (u) => u * u * (3 - 2 * u);
    // Pendant une action, les articulations suivent plus vite : le geste
    // arrive à l'instant de l'impact au lieu de traîner (lag de lerp).
    const poseRate = (base) => base * (combat.action === 'dodge' ? 2.4
      : combat.action === 'none' ? 1 : 1.85);
    let rollTheta = 0;
    let rollBob = 0;
    if (prevCombatAction === 'dodge' && combat.action !== 'dodge') {
      parts.body.rotation.x = 0;       // 2π ≡ 0 : fin de rouleau invisible
      parts.body.position.y = 0;
      parts.torso.rotation.x = 0;      // voûte du buste remise à plat
    }
    if (prevCombatAction === 'light' || prevCombatAction === 'heavy') {
      // L'arc est passé par −2π : ramène l'épaule à l'équivalent visible
      // (saut invisible, même angle modulo 2π).
      parts.armR.rotation.x = Math.atan2(
        Math.sin(parts.armR.rotation.x), Math.cos(parts.armR.rotation.x));
    }
    const atkPose = combat.action === 'light' || combat.action === 'heavy';
    if (atkPose && !atkStart) {
      // L'élan part de l'angle RÉEL du bras (pas de saut à la première frame).
      atkStart = {
        x: parts.armR.rotation.x, z: parts.armR.rotation.z, e: parts.elbowR.rotation.x,
        ty: parts.torso.rotation.y, hy: parts.hips.rotation.y,
        ln: parts.body.rotation.x, al: parts.armL.rotation.x,
      };
    } else if (!atkPose) {
      atkStart = null;
    }
    if (combat.action === 'hitstun') {
      const u = clamp01(combat.actionT / 0.45);
      const k = 1 - u * u;
      tLean = 0.26 * k;
      tTorsoYaw += 0.16 * k;
      tHeadPitch = -0.16 * k;
      tArmL = mix(tArmL, -0.55, k);
      tArmR = mix(tArmR, 0.55, k);
      tElbowL = mix(tElbowL, 0.9, k);
      tElbowR = mix(tElbowR, 0.9, k);
      tBob = -0.03 * k;
      tHeadYaw = -(tHipsYaw + tTorsoYaw) * 0.85; // le crâne suit en sens inverse
    } else if (combat.action === 'light' || combat.action === 'heavy') {
      const spec = ATTACKS[combat.action];
      const t = combat.actionT;
      const over = combat.action === 'heavy';
      const rawW = clamp01(t / spec.windup);
      const rawS = clamp01((t - spec.windup) / spec.active);
      const rawR = clamp01((t - spec.windup - spec.active) / spec.recover);
      const uW = over ? smooth(rawW) : easeOut2(rawW);
      // Chaîne cinétique : bassin et torse partent les premiers, l'épaule
      // suit avec ~35 ms de retard → le geste « fouette » au lieu de
      // bouger toutes les articulations d'un seul bloc.
      const uBody = smooth(clamp01(rawS / 0.45)); // le corps mène (fouet)
      const uArm = smooth(clamp01(rawS / 0.6));   // l'épaule finit à 60 % (impact 55 %)
      const uR = smooth(rawR);
      const uRArm = smooth(clamp01((t - spec.windup - spec.active - 0.03)
        / Math.max(0.05, spec.recover * 0.85)));
      // Grand diagonal : la lame se charge haut à droite puis traverse
      // franchement vers la hanche gauche. Le pivot suit lui aussi cette
      // diagonale (pas une rotation décorative sur place), tandis que les deux
      // repères de prise restent solidaires de la même hampe.
      if (parts.weaponMount && glaiveMountRest) {
        const windup = {
          x: glaiveMountRest.x + (over ? 0.16 : 0.12),
          y: glaiveMountRest.y + (over ? 0.23 : 0.20),
          z: glaiveMountRest.z - (over ? 0.07 : 0.05),
          roll: raisedWeaponZ - (over ? 0.90 : 0.72),
          pitch: over ? 0.28 : 0.22,
        };
        const strike = {
          x: glaiveMountRest.x - (over ? 0.17 : 0.14),
          y: glaiveMountRest.y - (over ? 0.20 : 0.18),
          z: glaiveMountRest.z - (over ? 0.06 : 0.04),
          roll: raisedWeaponZ + (over ? 1.00 : 0.78),
          pitch: over ? -0.22 : -0.15,
        };
        if (t < spec.windup) {
          tWeaponMountX = mix(glaiveMountRest.x, windup.x, uW);
          tWeaponMountY = mix(glaiveMountRest.y, windup.y, uW);
          tWeaponMountZ = mix(glaiveMountRest.z, windup.z, uW);
          tWeaponZ = mix(tWeaponZ, windup.roll, uW);
          tWeaponX = mix(tWeaponX, windup.pitch, uW);
        } else if (t < spec.windup + spec.active) {
          tWeaponMountX = mix(windup.x, strike.x, uArm);
          tWeaponMountY = mix(windup.y, strike.y, uArm);
          tWeaponMountZ = mix(windup.z, strike.z, uArm);
          tWeaponZ = mix(windup.roll, strike.roll, uArm);
          tWeaponX = mix(windup.pitch, strike.pitch, uArm);
        } else {
          tWeaponMountX = mix(strike.x, glaiveMountRest.x, uR);
          tWeaponMountY = mix(strike.y, glaiveMountRest.y, uR);
          tWeaponMountZ = mix(strike.z, glaiveMountRest.z, uR);
          tWeaponZ = mix(strike.roll, tWeaponZ, uR);
          tWeaponX = mix(strike.pitch, tWeaponX, uR);
        }
      }
      if (t < spec.windup) {
        if (over) {
          // Lame au-dessus de la tête, poids en arrière (élan sagittal).
          tArmR = mix(atkStart.x, -0.4, uW);    // lame chargée EN BAS à droite
          tArmRz = mix(atkStart.z, 0.9, uW);
          tElbowR = mix(atkStart.e, 0.6, uW);
          tTorsoYaw = mix(atkStart.ty, -0.6, uW); // buste vrillé à droite
          tHipsYaw = mix(atkStart.hy, -0.3, uW);
          tLean = mix(atkStart.ln, 0.14, uW);
          tArmL = mix(atkStart.al, 0.3, uW * 0.7);
          tBob = mix(tBob, -0.14, uW);            // on s'accroupit dans l'élan
        } else {
          // Coup diagonal : lame montée à droite, torse chargé à droite.
          tArmR = mix(atkStart.x, -2.2, uW);  // bras levé en arrière-haut
          tArmRz = mix(atkStart.z, 0.7, uW);
          tElbowR = mix(atkStart.e, 0.15, uW); // lame tendue vers le ciel (garde)
          tTorsoYaw = mix(atkStart.ty, -0.5, uW);
          tHipsYaw = mix(atkStart.hy, -0.22, uW);
          tLean = mix(atkStart.ln, 0.06, uW);
          tArmL = mix(atkStart.al, 0.35, uW * 0.8);
        }
      } else if (t < spec.windup + spec.active) {
        if (over) {
          tArmR = mix(-0.4, 2.4, uArm);    // UPPERCUT : balayage bas → haut
          tArmRz = mix(0.9, -0.4, uArm);    // (strictement montant, vérifié)
          tElbowR = mix(0.6, 0.35, uArm);
          tTorsoYaw = mix(-0.6, 0.4, uBody); // le buste se dévrille avec la lame
          tHipsYaw = mix(-0.3, 0.3, uBody);
          tLean = mix(0.14, -0.3, uBody);
          tArmL = mix(0.3, -0.45, uBody);
          tBob = mix(tBob, -0.02, uBody);   // le corps se relève dans le coup
        } else {
          tArmR = mix(-2.2, 1.35 - Math.PI * 2, uArm); // arc par le dessus (diagonale)
          tArmRz = mix(0.7, -0.65, uArm);    // fin : lame à plat dans la cible
          tElbowR = mix(0.15, 0.12, uArm);
          tTorsoYaw = mix(-0.5, 0.6, uBody);
          tHipsYaw = mix(-0.22, 0.34, uBody);
          tLean = mix(0.06, -0.12, uBody);
          tArmL = mix(0.35, -0.4, uBody);
          tBob = mix(tBob, -0.05, uBody);
        }
      } else {
        if (over) {
          tArmR = mix(2.4, tArmR, uRArm);  // redescend depuis la garde haute
          tArmRz = mix(-0.4, tArmRz, uRArm);
          tElbowR = mix(0.35, tElbowR, uRArm);
          tTorsoYaw = mix(0.4, tTorsoYaw, uR);
          tHipsYaw = mix(0.3, tHipsYaw, uR);
          tLean = mix(-0.3, tLean, uR);
        } else {
          tArmR = mix(1.35 - Math.PI * 2, tArmR - Math.PI * 2, uRArm);
          tArmRz = mix(-0.65, tArmRz, uRArm);
          tElbowR = mix(0.12, tElbowR, uRArm);
          tTorsoYaw = mix(0.6, tTorsoYaw, uR);
          tHipsYaw = mix(0.34, tHipsYaw, uR);
          tLean = mix(-0.12, tLean, uR);
        }
        tArmL = mix(-0.4, tArmL, uR);
      }
      tHeadYaw = -(tHipsYaw + tTorsoYaw) * 0.85; // les yeux restent sur la cible
    } else if (combat.action === 'dodge') {
      const u = clamp01(combat.actionT / DODGE.duration);
      const tuck = Math.sin(Math.PI * clamp01(u * 1.05));
      // Rouleau anti-sol : pivot calé sur le centre de la boule formée
      // par le buste voûté — le corps passe au-dessus du sol, jamais
      // à travers lui (l'ancien pivot aux pieds enterrait la silhouette).
      rollTheta = rollSign * smooth(u) * Math.PI * 2;
      // Garantie anti-sol par construction : le pivot est au moins aussi
      // haut que le point du corps qui passerait sous le sol (8 points
      // clés, debout → boule voûtée). Aucune formule « au feeling ».
      const cosT = Math.cos(rollTheta);
      const sinT = Math.sin(rollTheta);
      const curlT = 0.95 * tuck;
      const headT = curlT + 0.55 * tuck;
      const rollPts = [
        [mix(0, 0.66, tuck), mix(0, -0.12, tuck)],
        [mix(0.45, 0.92, tuck), mix(0, -0.45, tuck)],
        [mix(0.9, 0.85, tuck), mix(0, 0.15, tuck)],
        [mix(0.9, 0.85, tuck), mix(0, 0.18, tuck)],
        [0.9 + 0.45 * Math.cos(curlT), -0.45 * Math.sin(curlT)],
        [0.9 + 0.75 * Math.cos(headT), -0.75 * Math.sin(headT)],
        [mix(0.6, 1.0, tuck), mix(0, -0.5, tuck)],
        [mix(0.5, 0.7, tuck), mix(0.2, 0.3, tuck)],
      ];
      let floorNeed = -Infinity; // peut être négatif : le pivot passe sous terre,
      // c'est la géométrie qui doit rester au-dessus du sol.
      for (let pi = 0; pi < rollPts.length; pi++) {
        const py = rollPts[pi][0];
        const pz = rollPts[pi][1];
        floorNeed = Math.max(floorNeed, -(py * cosT - pz * sinT));
      }
      const ballCy = 0.95 * cosT + 0.15 * sinT;
      const ballH = 0.95 - 0.53 * Math.pow(Math.sin(Math.PI * u), 1.5);
      // contact permanent : ni sous le sol, ni plus de 13 cm dans les airs
      rollBob = Math.min(
        Math.max(ballH - ballCy, floorNeed + 0.015 * Math.sin(Math.PI * u)),
        floorNeed + 0.13,
      );
      tKneeL = -(0.1 + 1.85 * tuck);
      tKneeR = -(0.1 + 1.85 * tuck);
      tLegL = 0.9 * tuck;
      tLegR = 0.9 * tuck;
      tArmL = mix(tArmL, 0.75, tuck);
      tArmR = mix(tArmR, 0.75, tuck);
      tElbowL = 0.4 + 1.3 * tuck;
      tElbowR = 0.4 + 1.3 * tuck;
      tHeadPitch = -0.55 * tuck;             // menton sur la poitrine
      tLean = 0;
      parts.torso.rotation.x = -0.95 * tuck; // buste voûté → boule compacte
    }

    // ── Potion de vie : le flacon monte aux lèvres, la tête part en
    // arrière, le pas ralentit. Ni attaque ni roulade pendant le geste.
    let drinkHold = 0;
    if (combat.action === 'drink') {
      const du = clamp01(combat.actionT / DRINK.duration);
      const liftUp = smooth(clamp01(du / 0.3));
      const putDown = smooth(clamp01((du - 0.8) / 0.2));
      drinkHold = liftUp * (1 - putDown);
      const sip = du > 0.42 && du < 0.86 ? Math.sin(Math.PI * ((du - 0.42) / 0.44)) : 0;
      // Pose mesurée sur le rig (see check:souls-smoke) : le poing arrive à
      // ~21 cm de la bouche, fiole en main, tête renversée.
      tArmL = mix(tArmL, 1.15, drinkHold);         // bras gauche levé au visage
      tArmLz = mix(tArmLz, 0, drinkHold);
      tElbowL = mix(tElbowL, 2.6, drinkHold);      // avant-bras replié
      tArmR = mix(tArmR, 0.16, drinkHold * 0.7);   // l'épée s'écarte, pointe basse
      tElbowR = mix(tElbowR, 0.55, drinkHold * 0.7);
      tHeadPitch = mix(tHeadPitch, 0.3 + 0.08 * sip, drinkHold); // tête en arrière
      tHeadYaw = mix(tHeadYaw, 0.06, drinkHold);
      tLean = mix(tLean, 0.07 * drinkHold, 1);
      tTorsoYaw = mix(tTorsoYaw, 0.1 * drinkHold, 1);
      tBob = mix(tBob, -0.025 * drinkHold, 1);
      tLegL = mix(tLegL, 0.04, drinkHold * 0.6);   // appui stable
      tLegR = mix(tLegR, -0.08, drinkHold * 0.6);
      tKneeL = mix(tKneeL, -0.14, drinkHold * 0.6);
      tKneeR = mix(tKneeR, -0.12, drinkHold * 0.6);
    }
    // Fiole : le goulot bascule vers les lèvres, le liquide descend.
    if (parts.potion) {
      const visible = combat.action === 'drink';
      parts.potion.visible = visible;
      if (visible) {
        parts.potion.rotation.x = mix(0.1, 1.15, drinkHold);
        const liq = parts.potion.userData.liquid;
        const h = parts.potion.userData.liquidHeight * (1 - 0.85 * clamp01((combat.actionT - 0.35) / 0.6));
        liq.scale.y = Math.max(0.004, h);
        liq.position.y = -0.062 + (h - parts.potion.userData.liquidHeight) * 0.5;
      }
    }

    // Garde plantée : pas de jambes bâtons pendant les coups — appui en
    // échiquier, genoux souples, centre de gravité baissé.
    if (combat.action === 'light' || combat.action === 'heavy' || combat.action === 'hitstun') {
      const strike = combat.action !== 'hitstun';
      const p = (strike ? 1 : 0.7) * (1 - walkIn * 0.6);
      tLegL = mix(tLegL, 0.15, p);
      tLegR = mix(tLegR, -0.22, p);
      tKneeL = mix(tKneeL, -0.36, p);
      tKneeR = mix(tKneeR, -0.3, p);
      tBob = Math.min(tBob, mix(tBob, -0.05, p)); // garde le creux le plus bas
      if (strike) tLean = mix(tLean, -0.05, p * 0.5);
    }

    if (atkPose && atkStart) {
      // KEYFRAMES DIRECTS : pendant l'attaque, la courbe EST l'animation.
      // Le lerp exponentiel traînait l'épaule (lag ≈ v·τ ≈ 1,2 rad sur un
      // arc de ~100 ms) puis la fouettait après l'impact — ça se voyait
      // comme un geste désynchronisé / « bugué ».
      parts.armR.rotation.x = tArmR;
      parts.armR.rotation.z = tArmRz;
      parts.elbowR.rotation.x = tElbowR;
      parts.torso.rotation.y = tTorsoYaw;
      parts.hips.rotation.y = tHipsYaw;
      parts.body.rotation.x = tLean;
      parts.armL.rotation.x = tArmL;
    }

    aim(parts.legL.rotation, 'x', tLegL, poseRate(17));
    aim(parts.legR.rotation, 'x', tLegR, poseRate(17));
    aim(parts.kneeL.rotation, 'x', tKneeL, poseRate(18));
    aim(parts.kneeR.rotation, 'x', tKneeR, poseRate(18));
    aim(parts.footL.rotation, 'x', tFootL, 16);
    aim(parts.footR.rotation, 'x', tFootR, 16);
    if (!atkPose) aim(parts.armL.rotation, 'x', tArmL, poseRate(15));
    if (!atkPose) aim(parts.armR.rotation, 'x', tArmR, poseRate(15));
    aim(parts.armL.rotation, 'z', tArmLz, 8);
    if (!atkPose) aim(parts.armR.rotation, 'z', tArmRz, 8);
    aim(parts.elbowL.rotation, 'x', tElbowL, poseRate(17));
    if (!atkPose) aim(parts.elbowR.rotation, 'x', tElbowR, poseRate(17));
    if (!atkPose) aim(parts.hips.rotation, 'y', tHipsYaw, poseRate(12));
    aim(parts.hips.rotation, 'z', tHipsRoll, 12);
    aim(parts.hips.position, 'x', tHipsX, 10);
    if (!atkPose) aim(parts.torso.rotation, 'y', tTorsoYaw, poseRate(11));
    aim(parts.torso.rotation, 'z', tTorsoRoll, 11);
    if (combat.action === 'dodge') {
      parts.body.rotation.x = rollTheta;
    } else if (!atkPose) {
      aim(parts.body.rotation, 'x', tLean, poseRate(10));
    }
    aim(parts.body.rotation, 'z', bank, 9);
    if (combat.action === 'dodge') {
      parts.body.position.y = rollBob; // suivi de sol exact (sans lerp)
    } else {
      aim(parts.body.position, 'y', tBob, poseRate(13));
    }
    aim(parts.head.rotation, 'y', tHeadYaw, poseRate(9));
    aim(parts.head.rotation, 'x', tHeadPitch, poseRate(9));
    aim(parts.cape.rotation, 'x', tCape, 7);
    aim(parts.cape.rotation, 'z', tCapeZ, 6);
    if (parts.weaponMount && glaiveMountRest) {
      if (atkPose) {
        // Les keyframes sont déjà lissées par `smooth` : les appliquer
        // directement préserve l'ampleur du trait à l'instant de l'impact.
        parts.weaponMount.position.set(tWeaponMountX, tWeaponMountY, tWeaponMountZ);
        parts.weapon.rotation.z = tWeaponZ;
        parts.weapon.rotation.x = tWeaponX;
      } else {
        aim(parts.weaponMount.position, 'x', tWeaponMountX, poseRate(13));
        aim(parts.weaponMount.position, 'y', tWeaponMountY, poseRate(13));
        aim(parts.weaponMount.position, 'z', tWeaponMountZ, poseRate(13));
        aim(parts.weapon.rotation, 'z', tWeaponZ, poseRate(13));
        aim(parts.weapon.rotation, 'x', tWeaponX, poseRate(13));
      }
    } else {
      aim(parts.weapon.rotation, 'z', tWeaponZ, 9);
      aim(parts.weapon.rotation, 'x', tWeaponX, 9);
    }

    // ── Chute du Gardien Chitine : il s'effondre en arrière, puis l'écran de
    // mort prend la main (le monde reste rendu derrière, figé).
    if (dead) {
      deathT += dt;
      const fallU = clamp01(deathT / 1.15);
      const k = fallU * fallU * (3 - 2 * fallU);
      const settle = Math.sin(Math.PI * clamp01((deathT - 1.0) / 0.5)) * 0.05;
      parts.body.rotation.x = 1.18 * k;
      parts.body.position.y = -0.3 * k;
      parts.legL.rotation.x = 0.5 * k;
      parts.legR.rotation.x = 0.28 * k;
      parts.kneeL.rotation.x = -(0.05 + 0.85 * k);
      parts.kneeR.rotation.x = -(0.05 + 0.6 * k);
      parts.armL.rotation.x = 0.72 * k + settle;
      parts.armR.rotation.x = 0.55 * k - settle;
      parts.armL.rotation.z = -0.42 * k;
      parts.armR.rotation.z = 0.42 * k;
      parts.elbowL.rotation.x = 0.35 * k;
      parts.elbowR.rotation.x = 0.3 * k;
      parts.head.rotation.x = -0.3 * k;
      parts.cape.rotation.x = -0.5 * k;
      currentSpeed = 0;
    }

    // Cheveux : balan de foulée + traînée en course (secondarité).
    if (parts.strands) {
      for (let i = 0; i < parts.strands.length; i++) {
        const sway = moving
          ? Math.sin(gaitPhase + 2.4 + i * 0.6) * (0.05 + 0.09 * runFactor)
          : Math.sin(time * 0.0019 + i) * 0.02;
        aim(parts.strands[i].rotation, 'x', 0.12 - runFactor * 0.18 + sway, 8);
      }
    }
    // Ailes irisées : petite respiration au repos, battement plus franc à la course.
    if (parts.wings) {
      const beat = moving ? 0.09 + runFactor * 0.13 : 0.026;
      const flutter = Math.sin(time * (moving ? 0.015 : 0.0032)) * beat;
      aim(parts.wings[0].rotation, 'z', -0.08 - flutter, 7);
      aim(parts.wings[1].rotation, 'z', 0.08 + flutter, 7);
    }
    // Boire et rouler demandent de lâcher les deux poignées ; dans tous les
    // autres états, les deux vraies paumes serrent la hampe frontale.
    const holdingGlaiveWithBothHands = !dead && combat.action !== 'drink' && combat.action !== 'dodge'
      && lockTwoHandedGlaive(parts);
    if (!holdingGlaiveWithBothHands) {
      // Le solveur écrit des quaternions complets. Hors prise, les deux bras
      // retrouvent leurs axes historiques pour la potion, le roulé et la mort.
      parts.armL.rotation.y = 0;
      parts.armR.rotation.y = 0;
      parts.elbowL.rotation.y = 0;
      parts.elbowL.rotation.z = 0;
      parts.elbowR.rotation.y = 0;
      parts.elbowR.rotation.z = 0;
    }

    // ── Ennemi : bipède + télégraphes (windup lisible) ──────────────
    for (const F of foes) {
      const enemy = F.e;
      const enemyK = F.K;
      const enemyParts = F.parts;
      let enemyPhasePrev = F.phasePrev;
      let eFrom = F.from;
    const leapY = enemy.phase === 'leap' ? (enemy.leapY || 0) : 0;
    // Le sol est suivi en douceur (comme le joueur) : descendre de
    // l'estrade ne « clipse » plus le guerrier insecte dans la marche.
    const floorY = stageHeight(enemy.x, enemy.z);
    F.groundY = F.groundY === undefined
      ? floorY
      : F.groundY + (floorY - F.groundY) * Math.min(1, 11 * dt);
    if (Math.abs(F.groundY - floorY) < 0.004) F.groundY = floorY;
    const eY = Math.max(F.groundY, floorY - 0.001) + leapY;
    enemyK.position.set(enemy.x, eY, enemy.z);
    if (enemyK.userData.shadow) enemyK.userData.shadow.position.y = 0.02 - leapY;
    enemyK.rotation.y = enemy.yaw;
    if (!enemy.dead) {
      const homing = enemy.phase === 'idle' && Math.hypot(enemy.vx, enemy.vz) > 0.4;
      const chase = enemy.phase === 'chase' || homing;
      if (chase) enemy.gaitPhase = (enemy.gaitPhase || 0) + dt * Math.PI * 2 * 1.35;
      else enemy.gaitPhase = 0;
      const sE = Math.sin(enemy.gaitPhase || 0);
      const kE = 1 - Math.exp(-14 * dt);
      const eLerp = (joint, prop, target) => {
        joint[prop] += (target - joint[prop]) * kE;
      };
      // Phases d'attaque : application DIRECTE de la courbe (sinon le lerp
      // traîne l'arme puis la fouette après la frappe — même bug joueur).
      const eArm = (joint, prop, target) => {
        if (enemy.phase === 'windup' || enemy.phase === 'strike'
          || enemy.phase === 'windup2' || enemy.phase === 'leap'
          || enemy.phase === 'strike2') joint[prop] = target;
        else joint[prop] += (target - joint[prop]) * kE;
      };
      if (enemy.phase !== enemyPhasePrev) {
        // Pose source figée à chaque changement de phase. L'angle du bras
        // est normalisé dans (−π, π] : la frappe finit au-delà de −π, le
        // snap est une identité visuelle (même mécanique que le joueur).
        const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
        eFrom = {
          from: enemyPhasePrev,
          arm: norm(enemyParts.armR.rotation.x), armL: enemyParts.armL.rotation.x,
          azR: enemyParts.armR.rotation.z,
          elb: enemyParts.elbowR.rotation.x, elbL: enemyParts.elbowL.rotation.x,
          tor: enemyParts.torso.rotation.y, bow: enemyParts.torso.rotation.x,
          hips: enemyParts.hips.rotation.y,
          lean: enemyParts.body.rotation.x,
        };
        if (enemy.phase === 'recover') enemyParts.armR.rotation.x = eFrom.arm;
        enemyPhasePrev = enemy.phase;
      }
      const eAmp = chase ? 0.52 : 0;
      eLerp(enemyParts.legL.rotation, 'x', sE * eAmp);
      eLerp(enemyParts.legR.rotation, 'x', -sE * eAmp);
      eLerp(enemyParts.kneeL.rotation, 'x',
        -(0.07 + (chase ? Math.max(0, Math.sin((enemy.gaitPhase || 0) + 1.2)) * 0.8 : 0)));
      eLerp(enemyParts.kneeR.rotation, 'x',
        -(0.07 + (chase ? Math.max(0, Math.sin((enemy.gaitPhase || 0) + Math.PI + 1.2)) * 0.8 : 0)));
      eLerp(enemyParts.footL.rotation, 'x', chase ? 0.26 * Math.sin((enemy.gaitPhase || 0) + 0.4) : 0);
      eLerp(enemyParts.footR.rotation, 'x', chase ? 0.26 * Math.sin((enemy.gaitPhase || 0) + Math.PI + 0.4) : 0);

      let armR2 = 0.06;
      let armL2 = 0.06;
      let azR2 = 0.07;         // abduction épaule droite (repos)
      let elbowR2 = 0.3;
      let elbowL2 = 0.3;
      let torso2 = 0;
      let torsoX2 = 0;         // cambrure / crunch du buste
      let hips2 = 0;
      let lean2 = 0;
      let bob2 = 0;            // poids : le corps s'affaisse dans le coup
      let atkKnee = 0;         // flexion d'attaque ajoutée aux genoux
      if (chase) {
        // Marche vivante : bras opposés aux jambes, coudes qui balancent,
        // bassis et torse en contre-rotation, tête amortie.
        armR2 += sE * 0.42;
        armL2 += -sE * 0.42;
        elbowR2 += Math.max(0, -sE) * 0.2;
        elbowL2 += Math.max(0, sE) * 0.2;
        torso2 = -sE * 0.14;
        hips2 = sE * 0.1;
      } else {
        // Repos : respiration lente (le buste vit un peu).
        torso2 = 0.035 * Math.sin(time * 1.6);
        hips2 = 0.02 * Math.sin(time * 1.6 + 1.2);
      }
      if (enemy.phase === 'windup') {
        // ÉLAN : courbe en S (on se cale), bras en HAUT-arrière, épaule
        // dégagée, vrille profonde, poids sur la jambe arrière.
        const u = smooth(clamp01(enemy.t / enemy.spec.windup));
        armR2 = mix(eFrom.arm, -2.15, u);
        azR2 = mix(eFrom.azR, 0.34, u);
        armL2 = mix(eFrom.armL, 0.6, u);
        elbowR2 = mix(eFrom.elb, 0.42, u);
        elbowL2 = mix(eFrom.elbL, 0.9, u);
        torso2 = mix(eFrom.tor, -0.62, u);
        torsoX2 = mix(eFrom.bow, -0.06, u);
        hips2 = mix(eFrom.hips, -0.28, u);
        lean2 = mix(eFrom.lean, 0.2, u);
        bob2 = mix(0, -0.05, u);
        atkKnee = 0.14 * u;
      } else if (enemy.phase === 'strike') {
        // FRAPPE : par le DESSUS (1.32 − 2π — simu : pointe ≥ 1,10 m,
        // jamais le sol), coude mené par un snap, tranchant qui traverse
        // le corps, buste qui s'écrase et poids qui plonge.
        const u = easeOut2(clamp01(enemy.t / enemy.spec.active));
        const mid = Math.sin(Math.PI * u);
        armR2 = mix(-2.15, 1.32 - Math.PI * 2, u);
        azR2 = mix(0.34, -0.32, u);
        armL2 = mix(0.6, -0.34, u);
        elbowR2 = mix(0.42, 0.16, u) + 0.5 * mid;
        elbowL2 = mix(0.9, 0.3, u);
        torso2 = mix(-0.62, 0.48, u);
        torsoX2 = mix(-0.06, 0.2, u);
        hips2 = mix(-0.28, 0.34, u);
        lean2 = mix(0.2, -0.28, u);
        bob2 = mix(-0.05, -0.1, u);
        atkKnee = 0.14 + 0.2 * u;
      } else if (enemy.phase === 'windup2') {
        // BOND (télégraphe) : accroupissement profond, épée à deux
        // mains derrière la tête, poids chargé sur les jambes.
        const u = smooth(clamp01(enemy.t / (enemy.spec.windup2 ?? 0.55)));
        armR2 = mix(eFrom.arm, -2.55, u);
        azR2 = mix(eFrom.azR, 0.18, u);
        armL2 = mix(eFrom.armL, -2.2, u);
        elbowR2 = mix(eFrom.elb, 0.55, u);
        elbowL2 = mix(eFrom.elbL, 0.4, u);
        torso2 = mix(eFrom.tor, -0.3, u);
        torsoX2 = mix(eFrom.bow, 0.25, u);
        hips2 = mix(eFrom.hips, -0.15, u);
        lean2 = mix(eFrom.lean, -0.12, u);
        bob2 = mix(0, -0.18, u);
        atkKnee = 0.6 * u;
      } else if (enemy.phase === 'leap') {
        // VOL : parabole pilotée par e.leapY, lame en l'air,
        // jambes repliées, corps lancé vers la cible.
        const u = clamp01(enemy.t / (enemy.spec.leapDur ?? 0.55));
        armR2 = mix(-2.55, -2.7, u);
        azR2 = 0.18;
        armL2 = -2.2;
        elbowR2 = 0.55;
        elbowL2 = 0.4;
        torso2 = -0.3 + 0.15 * u;
        torsoX2 = 0.25 - 0.2 * u;
        hips2 = -0.15;
        lean2 = -0.12 - 0.2 * u;
        bob2 = 0.02;
        atkKnee = 0.9;
      } else if (enemy.phase === 'strike2') {
        // IMPACT : la lame plonge dans la cendre, réception écrasée.
        const u = easeOut2(clamp01(enemy.t / (enemy.spec.active2 ?? 0.3)));
        armR2 = mix(-2.7, 0.45, u);
        azR2 = mix(0.18, 0.05, u);
        armL2 = mix(-2.2, 0.4, u);
        elbowR2 = mix(0.55, 0.05, u);
        elbowL2 = mix(0.4, 0.3, u);
        torso2 = mix(-0.15, 0.3, u);
        torsoX2 = mix(0.05, 0.5, u);
        hips2 = mix(-0.15, 0.2, u);
        lean2 = mix(-0.32, -0.45, u);
        bob2 = mix(0.02, -0.2, u);
        atkKnee = 0.75;
      } else if (enemy.phase === 'recover') {
        // REPRISE : repart de la pose réelle (snap d'angle inclus) —
        // plus de sursaut quand un coup arrive depuis la garde.
        const u = smooth(clamp01(enemy.t / 0.55));
        const fromStrike = eFrom.from === 'strike' || eFrom.from === 'strike2';
        armR2 = mix(eFrom.arm, 0.06, u);
        azR2 = mix(eFrom.azR, 0.07, u);
        armL2 = mix(eFrom.armL, 0.06, u);
        elbowR2 = mix(eFrom.elb, 0.3, u);
        elbowL2 = mix(eFrom.elbL, 0.3, u);
        torso2 = mix(eFrom.tor, 0, u);
        torsoX2 = mix(eFrom.bow, 0, u);
        hips2 = mix(eFrom.hips, 0, u);
        lean2 = mix(eFrom.lean, 0, u);
        bob2 = mix(eFrom.from === 'strike2' ? -0.2 : fromStrike ? -0.1 : 0, 0, u);
        atkKnee = (fromStrike ? 0.34 : 0.14) * (1 - u);
      }
      if (enemy.stagger > 0) {
        const k = Math.min(1.2, enemy.stagger / enemy.spec.staggerTime);
        lean2 = 0.32 * k;
        torso2 = 0.28 * k;
        armR2 += 0.45 * k;
        armL2 += 0.3 * k;
      }
      eArm(enemyParts.armR.rotation, 'x', armR2);
      eArm(enemyParts.armR.rotation, 'z', azR2);
      eArm(enemyParts.armL.rotation, 'x', armL2);
      eArm(enemyParts.elbowR.rotation, 'x', elbowR2);
      eArm(enemyParts.elbowL.rotation, 'x', elbowL2);
      eArm(enemyParts.torso.rotation, 'y', torso2);
      eLerp(enemyParts.torso.rotation, 'x', enemy.phase === 'chase' ? 0.06 : torsoX2);
      eArm(enemyParts.hips.rotation, 'y', hips2);
      eArm(enemyParts.body.rotation, 'x', lean2);
      eLerp(enemyParts.body.position, 'y',
        chase ? -(0.012 + 0.022 * Math.abs(sE)) : bob2);
      eLerp(enemyParts.head.rotation, 'x', -lean2 * 0.4);
      // Garde d'attaque : les genoux fléchissent sous le poids.
      if (atkKnee !== 0) {
        const kneeT = -(0.07 + atkKnee);
        enemyParts.kneeL.rotation.x += (kneeT - enemyParts.kneeL.rotation.x) * kE;
        enemyParts.kneeR.rotation.x += (kneeT - enemyParts.kneeR.rotation.x) * kE;
      }
      // Regard qui balaye au repos — le guerrier insecte n'est pas une statue.
      eLerp(enemyParts.head.rotation, 'y',
        enemy.phase === 'idle' ? 0.12 * Math.sin(time * 0.55) : 0);
      // Le petit essaim vit même à l'arrêt : antennes et ailes signalent
      // immédiatement la nature insecte des ennemis dans l'obscurité.
      if (enemyParts.strands) {
        enemyParts.strands.forEach((antenna, index) => {
          eLerp(antenna.rotation, 'x', 0.08 + Math.sin(time * 0.002 + index) * 0.04, 7);
        });
      }
      if (enemyParts.wings) {
        const flutter = (chase ? 0.13 : 0.035) * Math.sin(time * (chase ? 0.017 : 0.003) + (enemy.gaitPhase || 0));
        eLerp(enemyParts.wings[0].rotation, 'z', -0.08 - flutter, 7);
        eLerp(enemyParts.wings[1].rotation, 'z', 0.08 + flutter, 7);
      }
      if (enemy.phase === 'seated' || enemy.phase === 'rise') {
        // TRÔNE — assis : cuisses à l'horizontale, genoux pliés, buste droit,
        // tête penchée, épée plantée devant lui. Debout : il pousse sur les
        // accoudoirs (buste en avant), tire l'épée, la dresse et rugit, puis
        // retombe en garde (valeurs finales = repos de la chasse).
        const riseU = enemy.phase === 'seated' ? 0 : clamp01(enemy.t / (enemy.spec.riseDur ?? 2.4));
        const seat = enemy.phase === 'seated' ? 1 : 1 - smooth(clamp01((riseU - 0.12) / 0.55));
        const push = enemy.phase === 'rise' ? Math.sin(Math.PI * clamp01((riseU - 0.05) / 0.6)) : 0;
        const raise = enemy.phase === 'rise'
          ? smooth(clamp01((riseU - 0.58) / 0.28)) * (1 - smooth(clamp01((riseU - 0.88) / 0.12)))
          : 0;
        const pull = smooth(clamp01((riseU - 0.1) / 0.5));
        enemyParts.legL.rotation.x = SEAT.thigh * seat;
        enemyParts.legR.rotation.x = SEAT.thigh * seat;
        enemyParts.kneeL.rotation.x = -(0.07 + SEAT.knee * seat);
        enemyParts.kneeR.rotation.x = -(0.07 + SEAT.knee * seat);
        enemyParts.footL.rotation.x = 0;
        enemyParts.footR.rotation.x = 0;
        enemyParts.body.position.y = seatDrop(seat); // pieds posés tout du long
        // Le bassin ne pivote JAMAIS : toute inclinaison est portée par le
        // torse. Un `body.rotation.x` non nul bascule les cuisses et enfonce
        // les bottes de ~12 cm dans l'estrade pendant qu'il se dresse.
        enemyParts.body.rotation.x = 0;
        enemyParts.hips.rotation.y = 0;
        enemyParts.torso.rotation.y = 0;
        // Poussée sur les accoudoirs (buste qui part en avant) puis dressage.
        const bow = -0.42 * push + 0.36 * raise;
        enemyParts.torso.rotation.x = bow
          + (SEAT.lean ?? 0) * seat + 0.03 * Math.sin(time * 1.2) * seat;
        enemyParts.head.rotation.x = -0.42 * (1 - smooth(clamp01(riseU / 0.3))) * seat
          + 0.36 * raise;
        enemyParts.head.rotation.y = 0;
        // `- bow` : le bras compense l'inclinaison du buste, sinon la lame
        // plantée suit le torse et ressort sous le dallage de la nef.
        enemyParts.armR.rotation.x = mix(mix(SEAT.armR, 0.06, pull), -2.3, raise) - bow;
        enemyParts.armR.rotation.z = mix(0.07, 0.18, raise);
        enemyParts.elbowR.rotation.x = mix(mix(SEAT.elbowR, 0.3, pull), 0.5, raise);
        enemyParts.armL.rotation.x = mix(mix(SEAT.armL, 0.06, pull), -0.7, raise)
          - 0.45 * push * (1 - pull);
        enemyParts.elbowL.rotation.x = mix(mix(SEAT.elbowL, 0.3, pull), 0.6, raise);
        // Respiration lente, buste qui vit même assis. L'offset du torse
        // (TORSO_Y) est préservé : le remettre à 0 enfonçait tout le buste
        // de 0.9 × échelle, soit le Roi sous son trône et sous le sol.
        enemyParts.torso.position.y = TORSO_Y + 0.012 * Math.sin(time * 1.2);
      }
      enemyK.visible = true;   // le cadavre réapparaît au respawn
      enemyK.rotation.x = 0;   // annule la chute
      enemyK.rotation.z = 0;
    } else if (enemyK.visible) {
      // Chute : le guerrier insecte bascule sur le dos (pivot aux pieds),
      // reste allongé au sol — le respawn le relèvera.
      const dT = enemy.deathT;
      const u = Math.min(1, dT / 0.75);
      const t = u - 1;
      const e = 1 + 2.2 * t * t * t + 1.2 * t * t; // ease-out avec léger clap
      enemyK.rotation.x = e * (Math.PI / 2);
      const liftU = Math.min(1, Math.max(0, (u - 0.55) / 0.45));
      enemyK.position.y = liftU * liftU * (3 - 2 * liftU) * 0.17; // le dos se pose
    }
      F.phasePrev = enemyPhasePrev;
      F.from = eFrom;
    }
    prevCombatAction = combat.action;

    // Clignement des yeux (naturel, plus fréquent au calme).
    if (parts.visor) {
      blinkT += dt;
      if (blinkT >= nextBlink) {
        blinkT = 0;
        nextBlink = 2.4 + Math.random() * 2.6;
        blinkLeft = 0.17;
      }
      if (blinkLeft > 0) blinkLeft = Math.max(0, blinkLeft - dt);
      const close = blinkLeft > 0 ? Math.sin(Math.PI * (blinkLeft / 0.17)) : 0;
      for (const eye of parts.visor.children) {
        eye.scale.y = 0.9 * (1 - 0.94 * close);
      }
    }

    // ── Bloodstain : flottement + rotation tant qu'il existe
    if (stain.visible) {
      stain.rotation.y += dt * 2.2;
      stain.position.y = stageHeight(stain.position.x, stain.position.z)
        + 0.14 + Math.sin(time * 0.004) * 0.05;
    }
    // ── Vacillement des flammes + braises flottantes
    ashField.update(time);
    levelAsh.update(time);
    sparks.update(dt);
    healMotes.update(dt);
    hall.dust?.update(time);
    // Coffre (couvercle, lueur, clé) et grand portail (vantaux + tremblement).
    chest.update(dt, time);
    if (portalAnim.running) {
      portalAnim.t = Math.min(1, portalAnim.t + dt / 2.8);
      castle.setOpen(portalAnim.t);
      if (portalAnim.t > 0.55) portalBlock.solid = false; // la voie est libre
      combat.shake = Math.max(combat.shake, 0.34 * Math.sin(Math.PI * portalAnim.t));
      if (portalAnim.t >= 1) portalAnim.running = false;
    }
    // Ciel et lune suivent le joueur ; l'ombre de la lune aussi (par pas de 0,5 m).
    skyRig.position.set(state.x, 0, state.z);
    {
      const mx = Math.round(state.x * 2) / 2;
      const mz = Math.round(state.z * 2) / 2;
      moonLight.target.position.set(mx, 0, mz);
      moonLight.position.set(mx - 16, 24, mz - 13);
    }
    for (const f of flickerables) {
      const s = f.flickerSeed;
      const n = Math.sin(time * 0.011 + s * 7) * 0.5
        + Math.sin(time * 0.023 + s * 3) * 0.3
        + Math.sin(time * 0.005 + s) * 0.2;
      if (f.light) f.light.intensity = f.lightBase * (0.86 + 0.17 * n);
      if (f.flame) {
        f.flame.scale.y = 0.88 + 0.22 * (n * 0.5 + 0.5);
        f.flame.rotation.y = time * 0.0022 + s;
      }
    }
    // Faisceaux volumétriques : même vacillement que les flammes.
    for (let i = 0; i < shafts.length; i++) {
      const shaft = shafts[i];
      const ph = shaft === bonfireShaft ? 3.7 : i * 2.13;
      const n = Math.sin(time * 0.009 + ph) * 0.6 + Math.sin(time * 0.021 + ph * 1.7) * 0.4;
      shaft.material.opacity = shaft.userData.baseOpacity * (0.82 + 0.3 * n);
      shaft.rotation.y = time * 0.0003 + ph;
    }
    // Brumes au sol : dérive lente + respiration de l'opacité.
    for (const sprite of mist.children) {
      const phase = sprite.userData.phase;
      sprite.position.x = sprite.userData.baseX + Math.sin(time * 0.00011 + phase) * 1.8;
      sprite.position.z = sprite.userData.baseZ + Math.cos(time * 0.00009 + phase) * 1.4;
      sprite.material.opacity = sprite.userData.baseOpacity * (0.8 + 0.25 * Math.sin(time * 0.0004 + phase));
    }

    // ── Lock-on : cible validée, caméra suivie derrière l'épaule ────
    if (lockTarget) {
      if (!lockStillValid(lockTarget, state.x, state.z)) {
        lockTarget = null;
        combat.lockOn = false;
      } else {
        camYaw = stepYaw(camYaw, state.yaw, 2.4, dt);
      }
    }

    // ── Caméra de poursuite + anti-mur
    headVec.set(state.x, CAMERA.headHeight + groundY, state.z);
    const desired = cameraPosition(headVec, camYaw, camPitch, CAMERA.distance);
    desiredVec.set(desired.x, desired.y, desired.z);
    dirVec.subVectors(desiredVec, headVec);
    const fullDistance = dirVec.length();
    dirVec.normalize();
    raycaster.set(headVec, dirVec);
    raycaster.far = fullDistance;
    const hits = raycaster.intersectObjects(cameraBlockers, false);
    let clear = fullDistance;
    if (hits.length) clear = Math.max(CAMERA.minClearance, hits[0].distance - 0.3);
    desiredVec.copy(headVec).addScaledVector(dirVec, clear);
    // Garde-fou : la caméra reste AU-DESSUS du sol local (+ 22 cm) — plus
    // jamais de vue « sous le plancher » pendant le duel du trône.
    const camFloor = Math.max(stageHeight(state.x, state.z), stageHeight(desiredVec.x, desiredVec.z));
    desiredVec.y = Math.max(camFloor + 0.22, desiredVec.y);
    camera.position.lerp(desiredVec, 1 - Math.exp(-CAMERA.followSmoothing * dt));
    lookVec.set(headVec.x, headVec.y + 0.06, headVec.z);
    camera.lookAt(lookVec);

    // Focal DOF : netteté sur le Gardien Chitine, flou sur le décor lointain.
    post.setFocus(camera.position.distanceTo(lookVec));
    post.render(dt);
    emitHud();

    if (!ready) {
      ready = true;
      callbacks.ready?.();
    }
  };
  raf = requestAnimationFrame(animate);

  // ── API publique (mirage : start/pause/destroy + actions) ─────────
  const releaseLock = () => {
    if (document.pointerLockElement === renderer.domElement) {
      try { document.exitPointerLock?.(); } catch { /* déjà libéré */ }
    }
  };

  return {
    /** Le monde écoute-t-il un doigt plutôt qu'une souris ? (page : commandes) */
    isTouch: () => touchDevice,
    // Poignée de debug (build dev uniquement) : téléportation + lecture
    // d'état pour les vérifications visuelles automatisées.
    debug: {
      state,
      combat,
      progress,
      quest,
      warrior,
      foes,
      colliders,
      scene,
      camera,
      teleport(x, z) {
        Object.assign(state, createRunState({ x, z }));
        groundY = stageHeight(x, z);
        warrior.position.set(x, groundY, z);
        const head = { x, y: CAMERA.headHeight + groundY, z };
        const p = cameraPosition(head, camYaw, camPitch, CAMERA.distance);
        camera.position.set(p.x, p.y, p.z);
        camera.lookAt(head.x, head.y, head.z);
        emitHud(true);
      },
      look(yaw, pitch = camPitch) {
        camYaw = yaw;
        camPitch = clampPitch(pitch);
      },
    },
    start() {
      active = true;
      keys.clear();
      clearTouch();
      lastFrame = performance.now();
      requestLock();
    },
    pause() {
      active = false;
      keys.clear();
      clearTouch();
      releaseLock();
    },
    /**
     * Actions de la page et de la manette tactile.
     *
     *   - `'launch' | 'lock' | 'pause' | 'revive'` : cycle de vie (comme Mirage) ;
     *   - `('touchMove', { x, y, magnitude, run })` : poussée du stick ;
     *   - `('touchAction', 'light' | 'heavy' | 'dodge' | 'lock' | 'flask' | 'rest')` :
     *     un bouton du pavé droit — il remplit la **même file** que le clavier
     *     (`TOUCH_QUEUE` → `queue`), la suite est l'affaire de la boucle ;
     *   - `('level', 'vit' | 'end' | 'str')` : montée de niveau depuis l'écran
     *     de pause (le feu de camp seul l'autorise, la boucle le dit au joueur) ;
     *   - `('touchReset')` : stick relâché (le Gardien Chitine s'arrête).
     */
    action(name, payload) {
      if (name === 'launch') {
        active = true;
        keys.clear();
        clearTouch();
        lastFrame = performance.now();
        requestLock();
      } else if (name === 'lock') {
        requestLock();
      } else if (name === 'pause') {
        active = false;
        keys.clear();
        clearTouch();
        releaseLock();
      } else if (name === 'revive') {
        revive();
      } else if (name === 'touchMove') {
        touch.x = Number(payload?.x) || 0;
        touch.y = Number(payload?.y) || 0;
        touch.magnitude = Math.min(1, Math.max(0, Number(payload?.magnitude) || 0));
        touch.run = Boolean(payload?.run);
      } else if (name === 'touchAction') {
        const flag = TOUCH_QUEUE[payload];
        if (active && !dead && flag) queue[flag] = true;
      } else if (name === 'level') {
        // La pause ne coupe pas la boucle (le monde vit derrière l'écran) :
        // une montée demandée depuis l'écran de pause doit passer aussi.
        if (!dead && Object.prototype.hasOwnProperty.call(queue, payload)) queue[payload] = true;
      } else if (name === 'touchReset') {
        clearTouch();
      }
    },
    revive,
    isDead: () => dead,
    isLocked: () => locked,
    destroy() {
      active = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(initialResizeFrame);
      observer?.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      detachLookPad();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror', onLockError);
      document.removeEventListener('visibilitychange', onVisibility);
      releaseLock();
      post?.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
          else {
            object.material.map?.dispose();
            object.material.bumpMap?.dispose();
            object.material.alphaMap?.dispose();
            object.material.dispose();
          }
        }
      });
      scene.environment?.dispose?.();
      disposeAnimeMaps();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function SoulsWorld({
  active, epoch = 0, onReady, onHud, onLockChange, onPauseKey, onAutoPause,
  onDeath, onRevive, onError, actionsRef,
}) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbackRef = useRef({});
  callbackRef.current = { onReady, onHud, onLockChange, onPauseKey, onAutoPause, onDeath, onRevive, onError };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const mount = mountRef.current;
    let disposed = false;
    let world;
    // Les assets CC0 se préchargent avant la construction du monde ;
    // en cas d'échec, makeWorld bascule tout seul sur le procédural.
    (async () => {
      try {
        await preloadGameAssets();
      } catch (error) {
        console.warn('[la-cendre] preload assets échoué :', error);
      }
      if (disposed) return;
      try {
        world = makeWorld(mount, {
          ready: () => callbackRef.current.onReady?.(),
          hud: (data) => callbackRef.current.onHud?.(data),
          lockChange: (value) => callbackRef.current.onLockChange?.(value),
          pauseKey: () => callbackRef.current.onPauseKey?.(),
          autoPause: () => callbackRef.current.onAutoPause?.(),
          death: (info) => callbackRef.current.onDeath?.(info),
          revive: () => callbackRef.current.onRevive?.(),
        });
      } catch (error) {
        callbackRef.current.onError?.(error instanceof Error ? error.message : String(error));
        return;
      }
      worldRef.current = world;
      if (actionsRef) actionsRef.current = (name, payload) => world.action(name, payload);
      // Poignée de debug (dev uniquement) : captures d'écran et QA visuel.
      if (import.meta.env.DEV) window.__laCendre = world;
    })();
    return () => {
      disposed = true;
      if (window.__laCendre) delete window.__laCendre;
      if (world) {
        world.destroy();
        worldRef.current = null;
        if (actionsRef) actionsRef.current = null;
      }
    };
  }, [actionsRef, epoch]);

  useEffect(() => {
    if (!worldRef.current) return;
    if (active) worldRef.current.start();
    else worldRef.current.pause();
  }, [active, epoch]);

  return <div className="souls-world" ref={mountRef} />;
}
