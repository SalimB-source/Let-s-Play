/**
 * Scène 3D du combat — « Le Sablier de Bab El ».
 *
 * L'équipe fait face aux ennemis sur un escalier de trois étages, comme la
 * maquette de combat du dossier DA. Les figurines sont procédurales (boîtes,
 * cylindres : le vocabulaire voxel du site), chacune reconnaissable à sa
 * silhouette et son accessoire : la perche de Salem, la montre de Yamina, la
 * capuche et la fourche de Boualem, la canne lumineuse de Fériel, la caisse de
 * Tarek ; côté ennemis le gris administratif, et le Prototype de laiton avec
 * son fourneau.
 *
 * La scène ne calcule aucune règle : elle lit `battleRef` (état courant),
 * `currentRef` (acteur qui joue) et consomme `queueRef` (événements éphémères
 * poussés par la page : frappes, zones, soins, souffles). Tout le reste —
 * étages, chutes, sable au sol, Astrolabe — est dérivé de l'état à chaque frame.
 *
 * Sans WebGL (jsdom des checks, machine sans GPU), on bascule sur un encart
 * sobre : la page reste jouable, seule la vitrine 3D manque.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { rpgCurrentActor } from './rpgCombat.js';

const TIER_H = 0.62;
const TEAM_X = -2.9;
const FOE_X = 2.9;

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

/** Une figurine = un pivot (tomber, secousses) dans un groupe (position, orientation). */
function buildFigure(id) {
  const look = LOOK[id] ?? { coat: 0x888888, skin: 0x888888 };
  const big = id === 'prototype';
  const s = big ? 1.4 : 1;
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  // Jambes, buste, tête — le socle commun.
  box(pivot, 0.16 * s, 0.42, 0.16 * s, 0x2b2620, -0.11 * s, 0.21, 0);
  box(pivot, 0.16 * s, 0.42, 0.16 * s, 0x2b2620, 0.11 * s, 0.21, 0);
  box(pivot, 0.42 * s, 0.5, 0.26 * s, look.coat, 0, 0.66, 0);
  box(pivot, 0.26 * s, 0.26 * s, 0.26 * s, look.skin, 0, 1.06, 0);

  // L'accessoire qui fait la silhouette.
  if (id === 'salem') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), mat(0x6b4a2a));
    pole.position.set(0.3, 0.8, 0.05);
    pole.rotation.z = 0.25;
    pivot.add(pole);
  }
  if (id === 'yamina') {
    box(pivot, 0.5, 0.42, 0.34, 0x1d3a75, 0, 0.42, 0); // robe de bureau
    const watch = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd619, emissive: 0xffb400, emissiveIntensity: 1.4 }),
    );
    watch.position.set(0.24, 0.78, 0.16);
    pivot.add(watch);
  }
  if (id === 'boualem') {
    box(pivot, 0.34, 0.2, 0.34, 0xd8c9a8, 0, 1.24, 0); // capuche
    box(pivot, 0.2, 0.16, 0.1, 0xe8e2d8, 0, 0.98, 0.16); // barbe blanche
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
  if (id === 'tarek') box(pivot, 0.4, 0.44, 0.3, 0x8a6a3a, 0, 0.8, -0.28); // caisse portée
  if (id === 'balayeur') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), mat(0x565b64));
    hat.position.set(0, 1.22, 0);
    pivot.add(hat);
    const blade = box(pivot, 0.06, 0.9, 0.3, 0x9aa0aa, 0.32, 0.7, 0);
    blade.rotation.z = 0.2;
  }
  if (id === 'greffier') {
    box(pivot, 0.26, 0.34, 0.06, 0x30343e, 0.26, 0.72, 0.14); // registre
    box(pivot, 0.05, 0.3, 0.02, 0x7c5cff, 0.26, 0.72, 0.18); // ruban d'encre
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

  // Boucliers visuels : garde (disque) et barrage (bulle).
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

  root.userData = { id, pivot, guard, bubble, flashUntil: 0, shakeUntil: 0, glowUntil: 0, fallen: 0 };
  return root;
}

export default function RpgBattleScene({ battleRef, queueRef }) {
  const mountRef = useRef(null);
  const [fallback, setFallback] = useState(false);

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
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a16);
    scene.fog = new THREE.Fog(0x0a0a16, 12, 26);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 60);
    camera.position.set(0, 4.6, 11.2);
    camera.lookAt(0, 1.4, 0);

    scene.add(new THREE.HemisphereLight(0x8899ff, 0x3a2a10, 0.85));
    const light = new THREE.DirectionalLight(0xffc060, 1.6);
    light.position.set(5, 8, 4);
    scene.add(light);

    // L'Astrolabe, toujours visible dans le ciel.
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

    // Le sol de la halle + les deux escaliers d'étages.
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 9), mat(0x1a1626));
    floor.position.set(0, -0.15, 0);
    scene.add(floor);

    const stepMat = mat(0x2b2436);
    for (const sideX of [TEAM_X, FOE_X]) {
      for (let t = 1; t <= 3; t += 1) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.3, TIER_H, 6.4), stepMat);
        step.position.set(sideX, (t - 0.5) * TIER_H, 0);
        scene.add(step);
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 0.04, 6.4),
          new THREE.MeshStandardMaterial({ color: 0xd8a531, emissive: 0x8a5a10, emissiveIntensity: 0.35 }),
        );
        edge.position.set(sideX, t * TIER_H + 0.02, 0);
        scene.add(edge);
      }
    }

    // Deux dômes de sable : ils gonflent avec le sable tombé au sol.
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

    // Halo doré sous l'acteur qui joue.
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.66, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd619, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.visible = false;
    scene.add(halo);

    const figures = new Map(); // id acteur → groupe
    const anims = []; // événements éphémères en cours

    const slotZ = (index, count) => (index - (count - 1) / 2) * 1.35;

    const sync = (now) => {
      const battle = battleRef.current;
      if (!battle) return;

      while (queueRef.current.length) anims.push({ ...queueRef.current.shift(), start: now });

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
          scene.add(fig);
          figures.set(actor.id, fig);
        }
        seen.add(actor.id);
        const ud = fig.userData;
        ud.z = slotZ(mates.indexOf(actor), mates.length);

        const baseX = actor.side === 'equipe' ? TEAM_X : FOE_X;
        fig.position.x += (baseX - fig.position.x) * 0.12;
        fig.position.z += (ud.z - fig.position.z) * 0.12;
        fig.position.y += (actor.tier * TIER_H - fig.position.y) * 0.14;

        // Tombe à terre : bascule en arrière dans le pivot.
        ud.fallen += ((actor.alive ? 0 : -Math.PI / 2) - ud.fallen) * 0.1;
        ud.pivot.rotation.x = ud.fallen;

        ud.guard.visible = Boolean(actor.guarding) && actor.alive;
        ud.bubble.visible = actor.shield > 0 && actor.alive;

        // Flash d'impact rouge, lueur de soin dorée, secousse.
        const flashing = now < ud.flashUntil;
        const glowing = now < ud.glowUntil;
        ud.pivot.traverse((node) => {
          if (!node.isMesh || !node.material.emissive) return;
          node.userData.baseEmissive ??= node.material.emissive.getHex();
          if (flashing) node.material.emissive.setHex(0xff2a1a);
          else if (glowing) node.material.emissive.setHex(0xffc02a);
          else node.material.emissive.setHex(node.userData.baseEmissive);
        });
        ud.pivot.position.x = now < ud.shakeUntil ? (Math.random() - 0.5) * 0.12 : 0;
      });

      // Les acteurs disparus (vague suivante) quittent la scène.
      for (const [id, fig] of [...figures]) {
        if (!seen.has(id)) {
          scene.remove(fig);
          figures.delete(id);
        }
      }

      // Ruées, zones, soins, souffles.
      for (let i = anims.length - 1; i >= 0; i -= 1) {
        const anim = anims[i];
        const t = (now - anim.start) / 0.55;
        if (t >= 1) {
          anims.splice(i, 1);
          continue;
        }
        const fig = figures.get(anim.from);
        if (!fig) continue;
        const dir = fig.userData.side === 'equipe' ? 1 : -1;
        const out = Math.sin(Math.min(t, 1) * Math.PI);

        if (anim.t === 'strike') {
          fig.position.x += dir * out * 1.5;
          if (t > 0.42 && !anim.hitDone) {
            anim.hitDone = true;
            const target = anim.to ? figures.get(anim.to) : null;
            if (target) {
              target.userData.flashUntil = now + 0.35;
              target.userData.shakeUntil = now + 0.4;
            }
          }
        }
        if (anim.t === 'zone') {
          fig.position.y += out * 0.35;
          if (t > 0.42 && !anim.hitDone) {
            anim.hitDone = true;
            for (const other of figures.values()) {
              if (other.userData.side !== fig.userData.side) {
                other.userData.flashUntil = now + 0.35;
                other.userData.shakeUntil = now + 0.4;
              }
            }
          }
        }
        if (anim.t === 'soin') {
          const target = figures.get(anim.to ?? anim.from);
          if (target && t > 0.3) target.userData.glowUntil = now + 0.4;
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

      // Halo sous l'acteur courant.
      const current = rpgCurrentActor(battle);
      const currentFig = current && figures.get(current.id);
      halo.visible = Boolean(currentFig && current.alive);
      if (currentFig) {
        halo.position.set(currentFig.position.x, currentFig.position.y + 0.05, currentFig.position.z);
        const pulse = 1 + Math.sin(now * 6) * 0.08;
        halo.scale.set(pulse, pulse, 1);
      }

      // Le sable au sol gonfle les dômes ; l'Astrolabe tourne, et sonne.
      const duneScale = (value) => 0.3 + (Math.min(value, 200) / 200) * 1.1;
      duneTeam.scale.y += (duneScale(battle.ground.equipe) - duneTeam.scale.y) * 0.08;
      duneFoe.scale.y += (duneScale(battle.ground.ennemi) - duneFoe.scale.y) * 0.08;

      astro.rotation.z += 0.0016;
      ring2.rotation.y += 0.004;
      ringMat.emissiveIntensity = battle.clockStrike > 0 ? 1.6 + Math.sin(now * 10) * 0.6 : 0.7;
      const astroScale = battle.clockStrike > 0 ? 1.06 : 1;
      astro.scale.setScalar(astro.scale.x + (astroScale - astro.scale.x) * 0.1);
    };

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      sync(clock.getElapsedTime());
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
      {fallback && (
        <p className="rpg-scene__fallback">
          La vitrine 3D n’est pas disponible ici — le combat se joue ci-dessous.
        </p>
      )}
    </div>
  );
}
