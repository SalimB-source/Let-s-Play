/**
 * Scène 3D du combat — « Le Sablier de Bab El », grammaire de Dragon Quest.
 *
 * L'équipe fait face aux ennemis sur un escalier de trois étages, et la mise
 * en scène emprunte au JRPG classique :
 *  - boîte de message noire en bas, texte tapé lettre à lettre, curseur ▼ ;
 *  - bannière « des ennemis apparaissent ! » à chaque vague ;
 *  - la caméra cadre l'attaquant et sa cible pendant la ruée, puis revient ;
 *  - chiffres de dégâts flottants, clignement blanc à l'impact ;
 *  - les ennemis meurent en scintillant puis s'enfoncent, comme des sprites ;
 *  - tout le monde entre en glissant depuis le hors-champ.
 *
 * La scène ne calcule aucune règle : elle lit `battleRef`, consomme
 * `queueRef` (frappes, zones, soins, souffles, deltas de PV) et dérive le
 * reste de l'état à chaque frame. Sans WebGL : repli sobre, la boîte de
 * message (pur DOM) continue de taper son texte.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { rpgCurrentActor } from './rpgCombat.js';

const TIER_H = 0.62;
const TEAM_X = -2.9;
const FOE_X = 2.9;
const WIDE_CAM = [0, 3.9, 9.8];
const WIDE_LOOK = [0, 1.5, 0];

const LOOK = {
  salem: { coat: 0xc8963c, skin: 0x8a5a3b },
  yamina: { coat: 0x274b8f, skin: 0x9c6b45 },
  boualem: { coat: 0xd8c9a8, skin: 0x8a5a3b },
  feriel: { coat: 0x7a4a2a, skin: 0x9c6b45 },
  tarek: { coat: 0xb0793a, skin: 0x7c4a2d },
  balayeur: { coat: 0x6a6f78, skin: 0x40444c },
  greffier: { coat: 0x767b85, skin: 0xc9b8a0 },
  sonnier: { coat: 0x6f747e, skin: 0xbfae94 },
  prototype: { coat: 0xa8823a, skin: 0xa8823a },
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.15, ...opts });
}

function box(group, w, h, d, color, x, y, z, opts) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

/** Chiffre de dégât / soin façon JRPG : gros texte cerclé de noir. */
function makePopupTexture(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 72px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0b0a14';
  ctx.strokeText(text, 128, 68);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 68);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** Une figurine = un pivot (tomber, secousses) dans un groupe (position, orientation). */
function buildFigure(id) {
  const look = LOOK[id] ?? { coat: 0x888888, skin: 0x888888 };
  const big = id === 'prototype';
  const s = big ? 1.4 : 1;
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  box(pivot, 0.16 * s, 0.42, 0.16 * s, 0x2b2620, -0.11 * s, 0.21, 0);
  box(pivot, 0.16 * s, 0.42, 0.16 * s, 0x2b2620, 0.11 * s, 0.21, 0);
  box(pivot, 0.42 * s, 0.5, 0.26 * s, look.coat, 0, 0.66, 0);
  // Bras : la silhouette cesse d'être un frigo.
  box(pivot, 0.1 * s, 0.44, 0.12 * s, look.coat, -0.27 * s, 0.66, 0);
  box(pivot, 0.1 * s, 0.44, 0.12 * s, look.coat, 0.27 * s, 0.66, 0);
  box(pivot, 0.26 * s, 0.26 * s, 0.26 * s, look.skin, 0, 1.06, 0);

  if (id === 'salem') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), mat(0x6b4a2a));
    pole.position.set(0.3, 0.8, 0.05);
    pole.rotation.z = 0.25;
    pivot.add(pole);
  }
  if (id === 'yamina') {
    box(pivot, 0.5, 0.42, 0.34, 0x1d3a75, 0, 0.42, 0);
    const watch = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd619, emissive: 0xffb400, emissiveIntensity: 1.4 }),
    );
    watch.position.set(0.24, 0.78, 0.16);
    pivot.add(watch);
  }
  if (id === 'boualem') {
    box(pivot, 0.34, 0.2, 0.34, 0xd8c9a8, 0, 1.24, 0);
    box(pivot, 0.2, 0.16, 0.1, 0xe8e2d8, 0, 0.98, 0.16);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3), mat(0x5a4630));
    rod.position.set(0.3, 0.7, 0);
    rod.rotation.z = 0.15;
    pivot.add(rod);
  }
  if (id === 'feriel') {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2), mat(0x3a3f46));
    pipe.rotation.z = Math.PI / 2.4;
    pipe.position.set(0.35, 0.8, 0.1);
    pivot.add(pipe);
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff7a29, emissive: 0xff5a00, emissiveIntensity: 1.8 }),
    );
    ember.position.set(0.78, 0.98, 0.1);
    pivot.add(ember);
  }
  if (id === 'tarek') box(pivot, 0.4, 0.44, 0.3, 0x8a6a3a, 0, 0.8, -0.28);
  if (id === 'balayeur') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), mat(0x565b64));
    hat.position.set(0, 1.22, 0);
    pivot.add(hat);
    const blade = box(pivot, 0.06, 0.9, 0.3, 0x9aa0aa, 0.32, 0.7, 0);
    blade.rotation.z = 0.2;
  }
  if (id === 'greffier') {
    box(pivot, 0.26, 0.34, 0.06, 0x30343e, 0.26, 0.72, 0.14);
    box(pivot, 0.05, 0.3, 0.02, 0x7c5cff, 0.26, 0.72, 0.18);
  }
  if (id === 'sonnier') {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 14), mat(0xb08a3a, { metalness: 0.5 }));
    bell.position.set(0, 1.42, -0.1);
    pivot.add(bell);
  }
  if (id === 'prototype') {
    const furnace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8c1a, emissive: 0xff6a00, emissiveIntensity: 2 }),
    );
    furnace.rotation.x = Math.PI / 2;
    furnace.position.set(0, 0.68, 0.15);
    pivot.add(furnace);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(0xa8823a, { metalness: 0.5 }));
    dome.position.set(0, 1.24, 0);
    pivot.add(dome);
  }

  const guard = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  guard.position.set(0, 0.75, 0.42);
  guard.visible = false;
  pivot.add(guard);

  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  bubble.position.set(0, 0.7, 0);
  bubble.visible = false;
  pivot.add(bubble);

  root.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });

  root.userData = {
    id,
    pivot,
    guard,
    bubble,
    blinkUntil: 0,
    shakeUntil: 0,
    glowUntil: 0,
    fallen: 0,
    diedAt: null,
  };
  return root;
}

export default function RpgBattleScene({ battleRef, queueRef, waveTitle }) {
  const mountRef = useRef(null);
  const bannerRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  // ── Bannière de vague : « des ennemis apparaissent ! » ──────────────────
  const prevWaveRef = useRef(null);
  useEffect(() => {
    if (!waveTitle || prevWaveRef.current === waveTitle) return;
    prevWaveRef.current = waveTitle;
    const el = bannerRef.current;
    if (!el) return;
    el.textContent = `${waveTitle} — des ennemis apparaissent !`;
    el.classList.add('is-on');
    const id = window.setTimeout(() => el.classList.remove('is-on'), 2400);
    return () => window.clearTimeout(id);
  }, [waveTitle]);

  // ── La scène WebGL ──────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFallback(true);
      return undefined;
    }
    if (!renderer.getContext()) {
      setFallback(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    // Rendu cinématique : tons filmiques, ombres douces.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a16);
    scene.fog = new THREE.Fog(0x0a0a16, 16, 42);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 60);
    camera.position.set(...WIDE_CAM);
    const lookCur = new THREE.Vector3(...WIDE_LOOK);
    const camGoal = new THREE.Vector3(...WIDE_CAM);
    const lookGoal = new THREE.Vector3(...WIDE_LOOK);
    let shake = 0;

    // Nuit indigo au-dessus, sable chaud dessous ; une lune rousse côté équipe,
    // une braise côté ennemis, pour lire les deux camps d'un coup d'œil.
    scene.add(new THREE.HemisphereLight(0x3550a0, 0x4a2f14, 1.0));
    const light = new THREE.DirectionalLight(0xffc060, 2.4);
    light.position.set(6, 9, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -9;
    light.shadow.camera.right = 9;
    light.shadow.camera.top = 9;
    light.shadow.camera.bottom = -9;
    light.shadow.camera.far = 30;
    scene.add(light);
    const cool = new THREE.PointLight(0x22d3ee, 26, 16);
    cool.position.set(-5, 3.2, 3);
    scene.add(cool);
    const warm = new THREE.PointLight(0xff6a3d, 26, 16);
    warm.position.set(5, 3.2, 3);
    scene.add(warm);

    const astro = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd8a531,
      emissive: 0xc07818,
      emissiveIntensity: 0.7,
      metalness: 0.6,
      roughness: 0.4,
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 10, 48), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 10, 40), ringMat);
    ring2.rotation.x = 0.6;
    astro.add(ring1, ring2);
    astro.position.set(0, 6.4, -8);
    scene.add(astro);

    // ── Le décor : Bab El existe derrière l'arène ─────────────────────────
    // Étoiles (hors brouillard).
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 12;
      starPos[i * 3] = Math.cos(a) * r;
      starPos[i * 3 + 1] = 5 + Math.random() * 22;
      starPos[i * 3 + 2] = Math.sin(a) * r - 8;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.09, transparent: true, opacity: 0.85, fog: false }),
    );
    scene.add(stars);

    // Silhouette de la ville : tours sombres, fenêtres ambrées, deux minarets.
    const city = new THREE.Group();
    const towerMat = mat(0x141228, { roughness: 1 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffb45e, emissive: 0xd97a1e, emissiveIntensity: 1.1 });
    for (let i = 0; i < 11; i += 1) {
      const h = 3 + ((i * 37) % 5);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6 + (i % 3) * 0.7, h, 1.6), towerMat);
      tower.position.set(-11 + i * 2.2, h / 2 - 0.6, -14 - (i % 4));
      city.add(tower);
      if (i % 2 === 0) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.06), windowMat);
        win.position.set(tower.position.x + 0.4, h - 1.2, tower.position.z + 0.85);
        city.add(win);
      }
      if (i === 2 || i === 8) {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xd8a531, emissive: 0x8a5a10, emissiveIntensity: 0.8, metalness: 0.5 }),
        );
        dome.position.set(tower.position.x, h + 0.1, tower.position.z);
        city.add(dome);
      }
    }
    scene.add(city);

    // Dunes à l'horizon.
    for (const [x, z, s] of [[-9, -12, 9], [8, -13, 11], [0, -16, 14]]) {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat(0x6a4a24, { roughness: 1 }));
      dune.position.set(x, -1.4, z);
      dune.scale.set(s, s * 0.28, s * 0.6);
      scene.add(dune);
    }

    // Poussière dorée qui flotte dans l'arène.
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(140 * 3);
    for (let i = 0; i < 140; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 13;
      dustPos[i * 3 + 1] = Math.random() * 4.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0xd8a531, size: 0.035, transparent: true, opacity: 0.5 }),
    );
    scene.add(dust);

    // Deux anneaux au sol, comme un parquet de cérémonie.
    for (const [rIn, rOut, op] of [[2.7, 2.82, 0.28], [4.3, 4.38, 0.14]]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rIn, rOut, 64),
        new THREE.MeshBasicMaterial({ color: 0xd8a531, transparent: true, opacity: op, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      scene.add(ring);
    }

    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 9), mat(0x1a1626));
    floor.position.set(0, -0.15, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const stepMat = mat(0x2b2436);
    for (const sideX of [TEAM_X, FOE_X]) {
      for (let t = 1; t <= 3; t += 1) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.3, TIER_H, 6.4), stepMat);
        step.position.set(sideX, (t - 0.5) * TIER_H, 0);
        step.receiveShadow = true;
        scene.add(step);
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 0.04, 6.4),
          new THREE.MeshStandardMaterial({ color: 0xd8a531, emissive: 0x8a5a10, emissiveIntensity: 0.35 }),
        );
        edge.position.set(sideX, t * TIER_H + 0.02, 0);
        scene.add(edge);
      }
    }

    const sandMat = mat(0xd8a531, { roughness: 1 });
    const makeDune = (x) => {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), sandMat);
      dune.position.set(x, 0, 0.4);
      dune.scale.set(1.15, 0.35, 1.15);
      scene.add(dune);
      return dune;
    };
    const duneTeam = makeDune(-1.25);
    const duneFoe = makeDune(1.25);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.66, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd619, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.visible = false;
    scene.add(halo);

    const figures = new Map();
    const anims = [];
    const popups = [];

    const slotZ = (index, count) => (index - (count - 1) / 2) * 1.35;

    const spawnPopup = (fig, text, color) => {
      const texture = makePopupTexture(text, color);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
      );
      sprite.scale.set(1.7, 0.85, 1);
      sprite.position.set(fig.position.x, fig.position.y + 2, fig.position.z);
      scene.add(sprite);
      popups.push({ sprite, life: 1 });
    };

    const sync = (now, dt) => {
      const battle = battleRef.current;
      if (!battle) return;

      while (queueRef.current.length) anims.push({ ...queueRef.current.shift(), start: now });

      let focusing = false;
      const seen = new Set();
      battle.actors.forEach((actor) => {
        if (actor.side === 'reserve') return;
        const mates = battle.actors.filter((a) => a.side === actor.side);
        let fig = figures.get(actor.id);
        if (!fig) {
          fig = buildFigure(actor.id);
          fig.rotation.y = actor.side === 'equipe' ? Math.PI / 2 : -Math.PI / 2;
          fig.userData.id = actor.id;
          fig.userData.side = actor.side;
          // Entrée en glissant depuis le hors-champ, comme un sprite appelé.
          const off = actor.side === 'equipe' ? -6 : 6;
          fig.position.set((actor.side === 'equipe' ? TEAM_X : FOE_X) + off, actor.tier * TIER_H, 0);
          scene.add(fig);
          figures.set(actor.id, fig);
        }
        seen.add(actor.id);
        const ud = fig.userData;
        ud.z = slotZ(mates.indexOf(actor), mates.length);

        const baseX = actor.side === 'equipe' ? TEAM_X : FOE_X;
        fig.position.x += (baseX - fig.position.x) * 0.08;
        fig.position.z += (ud.z - fig.position.z) * 0.12;

        // L'équipe tombe à terre ; les ennemis, eux, scintillent puis s'enfoncent.
        if (actor.side === 'ennemi' && !actor.alive) {
          ud.diedAt ??= now;
          const d = now - ud.diedAt;
          if (d < 0.7) {
            fig.visible = Math.floor(now * 16) % 2 === 0;
          } else {
            const s = Math.max(0.001, 1 - (d - 0.7) * 1.4);
            fig.visible = true;
            fig.scale.setScalar(s);
            fig.position.y = actor.tier * TIER_H - (1 - s) * 0.9;
            if (s <= 0.02) fig.visible = false;
          }
        } else {
          fig.position.y += (actor.tier * TIER_H - fig.position.y) * 0.14;
          ud.fallen += ((actor.alive ? 0 : -Math.PI / 2) - ud.fallen) * 0.1;
          ud.pivot.rotation.x = ud.fallen;
          if (now < ud.blinkUntil) fig.visible = Math.floor(now * 18) % 2 === 0;
          else fig.visible = true;
        }

        ud.guard.visible = Boolean(actor.guarding) && actor.alive;
        ud.bubble.visible = actor.shield > 0 && actor.alive;

        const glowing = now < ud.glowUntil;
        ud.pivot.traverse((node) => {
          if (!node.isMesh || !node.material.emissive) return;
          node.userData.baseEmissive ??= node.material.emissive.getHex();
          if (glowing) node.material.emissive.setHex(0xffc02a);
          else node.material.emissive.setHex(node.userData.baseEmissive);
        });
        ud.pivot.position.x = now < ud.shakeUntil ? (Math.random() - 0.5) * 0.12 : 0;
      });

      for (const [id, fig] of [...figures]) {
        if (!seen.has(id)) {
          scene.remove(fig);
          figures.delete(id);
        }
      }

      // Cinématique des événements : ruées, cadres caméra, impacts, popups.
      for (let i = anims.length - 1; i >= 0; i -= 1) {
        const anim = anims[i];
        const t = (now - anim.start) / 0.55;
        if (t >= 1) {
          anims.splice(i, 1);
          continue;
        }
        const fig = figures.get(anim.from);
        if (anim.t === 'pop') {
          if (!anim.spawned) {
            anim.spawned = true;
            const target = figures.get(anim.to);
            if (target) {
              spawnPopup(target, anim.amount < 0 ? String(-anim.amount) : `+${anim.amount}`,
                anim.amount < 0 ? '#ffffff' : '#7cfc9a');
              if (anim.amount < 0) target.userData.blinkUntil = now + 0.45;
              else target.userData.glowUntil = now + 0.5;
            }
          }
          continue;
        }
        if (!fig) continue;
        const dir = fig.userData.side === 'equipe' ? 1 : -1;
        const out = Math.sin(Math.min(t, 1) * Math.PI);

        if (anim.t === 'strike') {
          fig.position.x += dir * out * 2.1;
          fig.position.y += out * 0.35; // petit saut de sprite
          focusing = true;
          const target = anim.to ? figures.get(anim.to) : null;
          const mid = target
            ? fig.position.clone().add(target.position).multiplyScalar(0.5)
            : fig.position.clone();
          camGoal.set(mid.x * 0.5, 2.2, 6.6);
          lookGoal.set(mid.x * 0.7, 1.3, mid.z * 0.4);
          if (t > 0.42 && !anim.hitDone) {
            anim.hitDone = true;
            if (target) target.userData.shakeUntil = now + 0.4;
          }
        }
        if (anim.t === 'zone') {
          fig.position.y += out * 0.35;
          if (t > 0.42 && !anim.hitDone) {
            anim.hitDone = true;
            shake = 0.3;
            for (const other of figures.values()) {
              if (other.userData.side !== fig.userData.side) other.userData.shakeUntil = now + 0.4;
            }
          }
        }
        if (anim.t === 'soin' && t > 0.3) {
          const target = figures.get(anim.to ?? anim.from);
          if (target) target.userData.glowUntil = now + 0.4;
        }
        if (anim.t === 'souffle') {
          fig.position.x += dir * out * 0.8;
          if (t > 0.4 && !anim.hitDone) {
            anim.hitDone = true;
            for (const other of figures.values()) {
              if (other.userData.side !== fig.userData.side) other.userData.shakeUntil = now + 0.3;
            }
          }
        }
      }

      const current = rpgCurrentActor(battle);
      const currentFig = current && figures.get(current.id);
      halo.visible = Boolean(currentFig && current.alive);
      if (currentFig) {
        halo.position.set(currentFig.position.x, currentFig.position.y + 0.05, currentFig.position.z);
        const pulse = 1 + Math.sin(now * 6) * 0.08;
        halo.scale.set(pulse, pulse, 1);
      }

      const duneScale = (value) => 0.3 + (Math.min(value, 200) / 200) * 1.1;
      duneTeam.scale.y += (duneScale(battle.ground.equipe) - duneTeam.scale.y) * 0.08;
      duneFoe.scale.y += (duneScale(battle.ground.ennemi) - duneFoe.scale.y) * 0.08;

      astro.rotation.z += 0.0016;
      ring2.rotation.y += 0.004;
      dust.rotation.y = now * 0.02;
      dust.position.y = Math.sin(now * 0.4) * 0.12;
      stars.rotation.y = now * 0.004;
      ringMat.emissiveIntensity = battle.clockStrike > 0 ? 1.6 + Math.sin(now * 10) * 0.6 : 0.7;
      const astroScale = battle.clockStrike > 0 ? 1.06 : 1;
      astro.scale.setScalar(astro.scale.x + (astroScale - astro.scale.x) * 0.1);
      if (battle.clockStrike > 0) shake = Math.max(shake, 0.12);

      // Chiffres flottants.
      for (let i = popups.length - 1; i >= 0; i -= 1) {
        const pop = popups[i];
        pop.life -= dt * 0.8;
        pop.sprite.position.y += dt * 1.2;
        pop.sprite.material.opacity = Math.max(0, pop.life);
        if (pop.life <= 0) {
          scene.remove(pop.sprite);
          pop.sprite.material.map.dispose();
          pop.sprite.material.dispose();
          popups.splice(i, 1);
        }
      }

      // Caméra : cadre l'action, sinon plan large ; tremble quand ça tonne.
      if (!focusing) {
        camGoal.set(...WIDE_CAM);
        lookGoal.set(...WIDE_LOOK);
      }
      camera.position.lerp(camGoal, 0.06);
      lookCur.lerp(lookGoal, 0.08);
      if (shake > 0.002) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        shake *= 0.88;
      }
      camera.lookAt(lookCur);
    };

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      sync(clock.elapsedTime, dt);
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, [battleRef, queueRef]);

  return (
    <div
      className={`rpg-scene ${fallback ? 'rpg-scene--flat' : ''}`}
      ref={mountRef}
      data-scene={fallback ? 'fallback' : 'webgl'}
      aria-label="Scène de combat en trois dimensions : l’équipe fait face aux ennemis sur les étages"
    >
      <p className="rpg-scene__banner" ref={bannerRef} aria-hidden="true" />
      {fallback && (
        <p className="rpg-scene__fallback">
          La vitrine 3D n’est pas disponible ici — le combat se joue ci-dessous.
        </p>
      )}
    </div>
  );
}
