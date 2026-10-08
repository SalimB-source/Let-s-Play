/**
 * L'ARCADE ÉTERNELLE — rendu du prototype « feel ».
 * ==================================================
 * Le rendu ne connaît **rien** à la physique : il lit un état produit par
 * `arcadeFeel.js` et le peint. Deux principes, tirés de la charte
 * (`mockups/CHARTE-ARTISTIQUE.md`) :
 *
 *   1. **Le décor est cuit une fois** dans un canvas hors écran (ciel, dunes,
 *      ruines, blocs, plateformes fines, sable, socle d'or). Peindre la salle à
 *      chaque image = un seul `drawImage` recadré sur la caméra.
 *   2. **Les personnages sont dessinés image par image**, en aplats + contour
 *      d'encre. Le héros change de dessin **toutes les 5 images de simulation**
 *      (12 img/s) : c'est ce « stop » qui fait dessin animé, alors que la caméra,
 *      les particules et les effets restent à 60 ips.
 *
 * Aucune image externe : tout est tracé par le code, donc modifiable et
 * vérifiable sans navigateur (voir `scripts/arcade-feel-ui-check.mjs`).
 */

import { ATTACK_STRIKE_FROM, ATTACK_STRIKE_TO, TILE, TUNE, attackBox } from './arcadeFeel.js';

export const VIEW_W = 640;
export const VIEW_H = 360;

/** Palette mesurée sur les maquettes (charte §2). */
export const ART = {
  sky: '#4CB7D9',
  skyLight: '#68C8E0',
  cloud: '#DCEFF3',
  sandLight: '#ECD197',
  sand: '#D1A667',
  sandDark: '#B98A4E',
  rock: '#8C6C4C',
  rockDark: '#6E5238',
  haze: '#B3D7D8',
  shadow: '#5A8B99',
  ink: '#50493D',
  inkHard: '#2B2721',
  gold: '#DDB869',
  goldDeep: '#A9793A',
  heroJacket: '#2B2C31',
  heroJacketLight: '#43454C',
  heroScarf: '#9C4E2E', // brique franche : celle de la charte (#885A3B) se
  // fondait dans le sable du désert, on ne voyait plus l'écharpe bouger
  heroBoot: '#634635',
  heroSkin: '#CCB8A1',
  heroShirt: '#EDE2D2',
  heroHair: '#1A1613',
  heart: '#D34B3E',
  paper: '#F2E7D5',
  blood: '#8E2B22',
};

const FONT = '"Trebuchet MS", system-ui, sans-serif';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Briques de tracé
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Aplat puis contour d'encre : la brique du cel-shadé. */
function inked(ctx, fill, stroke = ART.ink, width = 2) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && width > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function ellipseFill(ctx, x, y, rx, ry, fill, stroke = ART.ink, width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  inked(ctx, fill, stroke, width);
}

/** Trame de manga : points réguliers. Jamais sur un personnage à l'écran. */
function screentone(ctx, x, y, w, h, step = 7, color = 'rgba(43,39,33,0.2)') {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  for (let py = y; py < y + h; py += step) {
    for (let px = x + ((Math.round(py / step) % 2) * step) / 2; px < x + w; px += step) {
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function makeCanvas(w, h) {
  const canvas = typeof document !== 'undefined'
    ? document.createElement('canvas')
    : { width: w, height: h, getContext: () => null };
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// ---------------------------------------------------------------------------
// Décor cuit hors écran
// ---------------------------------------------------------------------------

/** Peint toute la salle une fois pour toutes et renvoie le canvas du décor. */
export function bakeRoom(room) {
  const canvas = makeCanvas(room.width * TILE, room.height * TILE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const W = canvas.width;
  const H = canvas.height;

  // --- ciel : aplats francs, jamais de dégradé ---
  ctx.fillStyle = ART.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ART.skyLight;
  ctx.fillRect(0, 0, W, 5 * TILE);
  for (const [cx, cy, r] of [[6, 2.6, 1.5], [7.8, 2.2, 1.1], [21, 1.9, 1.3], [22.6, 2.4, 0.9], [41, 3.1, 1.2], [57, 2.3, 1.4]]) {
    for (let i = 0; i < 3; i += 1) {
      ellipseFill(ctx, (cx + i * r * 0.7) * TILE, cy * TILE, r * TILE, r * 0.55 * TILE, ART.cloud, null, 0);
    }
  }

  // --- dunes lointaines, puis brume ---
  ctx.fillStyle = ART.haze;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 8.5 * TILE + 4.2 * TILE, 12.6 * TILE, 5.4 * TILE, 3.1 * TILE, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = ART.sand;
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 7.6 * TILE - 1.5 * TILE + 3.8 * TILE, 13.6 * TILE, 4.6 * TILE, 2.2 * TILE, 0, Math.PI, 0);
    ctx.fill();
  }

  for (const d of room.decor || []) {
    // --- ruines au fond ---
    if (d.kind === 'ruin-far') {
      const x = d.x * TILE;
      const y = d.y * TILE;
      ctx.fillStyle = ART.rock;
      ctx.fillRect(x, y, 2.6 * TILE, 9 * TILE);
      ctx.fillRect(x + 2.6 * TILE, y + 1.6 * TILE, 1.6 * TILE, 7.4 * TILE);
      ctx.fillStyle = ART.rockDark;
      ctx.fillRect(x + 0.6 * TILE, y + 2.2 * TILE, 0.7 * TILE, 1.1 * TILE);
      ctx.fillRect(x + 0.6 * TILE, y + 4.4 * TILE, 0.7 * TILE, 1.1 * TILE);
      ctx.fillRect(x + 3 * TILE, y + 3.4 * TILE, 0.7 * TILE, 1.1 * TILE);
    }

    // --- mur à glyphes ---
    if (d.kind === 'glyphs') {
      const x = d.x * TILE;
      const y = d.y * TILE;
      roundRect(ctx, x, y, 4.4 * TILE, 11 * TILE, 6);
      inked(ctx, ART.sandLight, ART.ink, 3);
      ctx.strokeStyle = ART.goldDeep;
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i += 1) {
        const gy = y + 1.4 * TILE + i * 1.9 * TILE;
        ctx.beginPath();
        ctx.moveTo(x + TILE, gy);
        ctx.lineTo(x + 3.4 * TILE, gy);
        if (i % 2 === 0) {
          ctx.moveTo(x + 1.8 * TILE, gy);
          ctx.lineTo(x + 1.8 * TILE, gy + 0.8 * TILE);
        } else {
          ctx.moveTo(x + 2.8 * TILE, gy);
          ctx.lineTo(x + 2.8 * TILE, gy - 0.8 * TILE);
        }
        ctx.stroke();
      }
      screentone(ctx, x + 4, y + 4, 4.4 * TILE - 8, 11 * TILE - 8, 8, 'rgba(169,121,58,0.18)');
    }

    // --- fontaine ---
    if (d.kind === 'fountain') {
      const x = d.x * TILE;
      const y = d.y * TILE;
      roundRect(ctx, x - 2 * TILE, y - 0.9 * TILE, 4 * TILE, 0.9 * TILE, 5);
      inked(ctx, ART.sandLight, ART.ink, 3);
      roundRect(ctx, x - 0.5 * TILE, y - 3.1 * TILE, TILE, 2.3 * TILE, 4);
      inked(ctx, ART.sand, ART.ink, 3);
      roundRect(ctx, x - 1.2 * TILE, y - 4.1 * TILE, 2.4 * TILE, 0.7 * TILE, 4);
      inked(ctx, ART.sandLight, ART.ink, 3);
      screentone(ctx, x - 2 * TILE, y - 0.9 * TILE, 4 * TILE, 0.9 * TILE, 6, 'rgba(90,139,153,0.4)');
    }

    // --- poteries ---
    if (d.kind === 'pot') {
      const x = d.x * TILE;
      const y = d.y * TILE;
      ctx.beginPath();
      ctx.moveTo(x - 0.55 * TILE, y - 1.3 * TILE);
      ctx.lineTo(x + 0.55 * TILE, y - 1.3 * TILE);
      ctx.lineTo(x + 0.3 * TILE, y);
      ctx.lineTo(x - 0.3 * TILE, y);
      ctx.closePath();
      inked(ctx, ART.rock, ART.ink, 3);
    }

    // --- bannière ---
    if (d.kind === 'banner') {
      const x = d.x * TILE;
      const y = d.y * TILE;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2.4 * TILE, y);
      ctx.lineTo(x + 2.4 * TILE, y + 3.2 * TILE);
      ctx.lineTo(x + 1.2 * TILE, y + 2.5 * TILE);
      ctx.lineTo(x, y + 3.2 * TILE);
      ctx.closePath();
      inked(ctx, ART.blood, ART.ink, 3);
    }
  }

  // --- profondeur : sous l'horizon, le fond s'assombrit (aplat, pas de dégradé) ---
  // sans ça, le grand trou se lit comme une mare d'eau plate au lieu d'un vide
  ctx.fillStyle = 'rgba(43,39,33,0.22)';
  ctx.fillRect(0, 16.5 * TILE, W, 8 * TILE);

  // --- roche-mère : sans elle, la croûte se lit comme une île suspendue ---
  {
    const bedrockY = 23 * TILE;
    ctx.fillStyle = ART.rockDark;
    ctx.fillRect(0, bedrockY, W, H - bedrockY);
    ctx.fillStyle = ART.rock;
    ctx.fillRect(0, bedrockY, W, 5);
    ctx.fillStyle = 'rgba(43,39,33,0.6)';
    ctx.fillRect(0, bedrockY - 3, W, 3);
    ctx.strokeStyle = 'rgba(43,39,33,0.22)';
    ctx.lineWidth = 2;
    for (let gy = bedrockY + 6.5 * TILE; gy < H; gy += 6.5 * TILE) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
  }

  // --- blocs solides ---
  for (const s of room.solids) {
    const x = s.x * TILE;
    const y = s.y * TILE;
    const w = s.w * TILE;
    const h = s.h * TILE;
    const tall = s.h > 3.2;
    roundRect(ctx, x, y, w, h, tall ? 4 : 6);
    inked(ctx, tall ? ART.rock : ART.sand, ART.inkHard, 3);
    ctx.fillStyle = ART.sandLight;
    ctx.fillRect(x + 3, y + 3, Math.max(0, w - 6), Math.min(8, Math.max(4, h * 0.06)));
    if (tall) {
      ctx.fillStyle = ART.rockDark;
      ctx.fillRect(x + 3, y + h - 10, Math.max(0, w - 6), 7);
      screentone(ctx, x + 3, y + h - 28, Math.max(0, w - 6), 18, 7, 'rgba(43,39,33,0.22)');
    } else {
      screentone(ctx, x + 3, y + h - 17, Math.max(0, w - 6), 14, 7, 'rgba(43,39,33,0.18)');
    }
    // joints de maçonnerie : courts et discrets. Des traits pleine hauteur
    // font lire une croûte de sol comme une rangée de poteaux (constaté sur la
    // première planche cuite) : on ne garde qu'un liseré sous la surface.
    ctx.strokeStyle = 'rgba(80,73,61,0.22)';
    ctx.lineWidth = 1.5;
    for (let sx = x + TILE; sx < x + w - 4; sx += TILE) {
      ctx.beginPath();
      ctx.moveTo(sx, y + 5);
      ctx.lineTo(sx, y + Math.min(h - 6, 2.4 * TILE));
      ctx.stroke();
    }
    if (tall) {
      ctx.strokeStyle = 'rgba(43,39,33,0.14)';
      for (let sx = x + TILE * 2; sx < x + w - 4; sx += TILE * 2) {
        ctx.beginPath();
        ctx.moveTo(sx, y + 3.6 * TILE);
        ctx.lineTo(sx, y + h - 12);
        ctx.stroke();
      }
    }
  }

  // --- plateformes traversables ---
  for (const p of room.oneways) {
    const x = p.x * TILE;
    const y = p.y * TILE;
    const w = p.w * TILE;
    roundRect(ctx, x, y, w, 0.42 * TILE, 5);
    inked(ctx, ART.sandLight, ART.ink, 3);
    ctx.fillStyle = ART.sandDark;
    ctx.fillRect(x + 4, y + 0.42 * TILE - 5, Math.max(0, w - 8), 3);
  }

  // --- sables mouvants : un puits dans le sol, pas une bande posée dessus ---
  for (const s of room.sands) {
    const x = s.x * TILE;
    const y = s.y * TILE;
    const w = s.w * TILE;
    const h = s.h * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 7, w, h + 7);
    ctx.clip();
    // parois du puits : plus sombres, elles donnent la profondeur
    ctx.fillStyle = ART.rockDark;
    ctx.fillRect(x, y, w, h);
    // le sable : une nappe claire au-dessus, qui s'assombrit vers le fond
    ctx.fillStyle = ART.sandDark;
    ctx.fillRect(x, y + 0.55 * TILE, w, h);
    ctx.fillStyle = ART.sand;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5 * TILE);
    for (let px = 0; px <= w; px += 10) ctx.lineTo(x + px, y + 0.5 * TILE + Math.sin(px / 13) * 2.5);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    // grains
    ctx.fillStyle = 'rgba(110,82,56,0.45)';
    for (let gy = y + 14; gy < y + h; gy += 9) {
      for (let gx = x + ((gy / 9) % 2) * 6 + 4; gx < x + w; gx += 12) ctx.fillRect(gx, gy, 2, 2);
    }
    // ombre sous la lèvre : le sol surplombe
    ctx.fillStyle = 'rgba(43,39,33,0.35)';
    ctx.fillRect(x, y, w, 5);
    ctx.restore();
    // lèvre franche + grains suspendus : on lit tout de suite « ça va aspirer »
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 2.5);
    ctx.lineTo(x + w + 2, y + 2.5);
    ctx.stroke();
    ctx.fillStyle = ART.sandLight;
    for (let i = 0; i < 7; i += 1) {
      const gx = x + 6 + i * (w - 12) / 6;
      ctx.fillRect(gx, y - 5 - (i % 3) * 4, 2.5, 2.5);
    }
  }

  // --- socle d'or ---
  {
    const g = room.goal;
    const x = g.x * TILE;
    const y = g.y * TILE;
    const w = g.w * TILE;
    const h = g.h * TILE;
    roundRect(ctx, x, y + h * 0.45, w, h * 0.55, 4);
    inked(ctx, ART.rock, ART.ink, 3);
    roundRect(ctx, x + 4, y + h * 0.28, w - 8, h * 0.28, 5);
    inked(ctx, ART.gold, ART.goldDeep, 3);
    roundRect(ctx, x + 8, y + h * 0.14, w - 16, h * 0.16, 6);
    inked(ctx, ART.paper, ART.goldDeep, 2);
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Le peintre
// ---------------------------------------------------------------------------

export function createPainter(room) {
  const painter = {
    bake: bakeRoom(room),
    cam: { x: clamp(room.spawn.x - VIEW_W / TILE / 2, 0, room.width), y: clamp(room.spawn.y - 6, 0, room.height) },
    particles: [],
    pops: [],
    paint(ctx, state, opts = {}) {
      const cam = updateCamera(painter, state, room);
      drawWorld(ctx, room, state, cam, painter);
      drawGoalGlow(ctx, room, state, cam);
      drawEnemies(ctx, state, cam);
      drawHero(ctx, state, painter, cam);
      drawProjectiles(ctx, state, cam);
      collectEvents(painter, state);
      stepParticles(painter, opts.dt ?? 1 / 60);
      drawParticles(ctx, painter);
      drawPops(ctx, painter);
      drawHud(ctx, state, opts);
      drawPhaseOverlay(ctx, state);
      if (opts.debug) drawDebug(ctx, state, room, cam);
    },
  };
  return painter;
}

/** Caméra : suit le héros, anticipe dans le sens de la course, bornée à la salle. */
function updateCamera(painter, state, room) {
  const cam = painter.cam;
  const hero = state.hero;
  const viewW = VIEW_W / TILE;
  const viewH = VIEW_H / TILE;
  const lookAhead = clamp(hero.vx * 0.32, -3, 3);
  const targetX = clamp(hero.x + lookAhead - viewW / 2, 0, Math.max(0, room.width - viewW));
  const targetY = clamp(hero.y - 0.9 - viewH / 2, 0, Math.max(0, room.height - viewH));
  cam.x = lerp(cam.x, targetX, 0.12);
  cam.y = lerp(cam.y, targetY, 0.12);
  const shake = state.shake || 0;
  cam.shakeX = shake > 0 ? Math.sin(state.frame * 2.7) * shake * 0.6 : 0;
  cam.shakeY = shake > 0 ? Math.cos(state.frame * 3.1) * shake * 0.4 : 0;
  return cam;
}

const camX = (cam) => Math.round(cam.x * TILE + (cam.shakeX || 0));
const camY = (cam) => Math.round(cam.y * TILE + (cam.shakeY || 0));

function drawWorld(ctx, room, state, cam, painter) {
  const ox = camX(cam);
  const oy = camY(cam);
  ctx.imageSmoothingEnabled = false;
  if (typeof ctx.drawImage === 'function' && painter.bake) {
    ctx.drawImage(painter.bake, ox, oy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  } else {
    ctx.fillStyle = ART.sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // surface du sable : petits remous animés
  for (const s of room.sands) {
    const x = s.x * TILE - ox;
    const w = s.w * TILE;
    const y = s.y * TILE - oy;
    if (x + w < -40 || x > VIEW_W + 40) continue;
    ctx.strokeStyle = 'rgba(110,82,56,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= w; px += 8) {
      const yy = y + Math.sin((px + state.time * 60) / 18) * 3;
      if (px === 0) ctx.moveTo(x + px, yy);
      else ctx.lineTo(x + px, yy);
    }
    ctx.stroke();
  }
}

function drawGoalGlow(ctx, room, state, cam) {
  const g = room.goal;
  const x = (g.x + g.w / 2) * TILE - camX(cam);
  const y = (g.y + g.h * 0.5) * TILE - camY(cam);
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.4);
  for (let i = 3; i >= 1; i -= 1) {
    ctx.globalAlpha = 0.06 + pulse * 0.05;
    ellipseFill(ctx, x, y, i * 16, i * 11, ART.paper, null, 0);
  }
  ctx.globalAlpha = 1;
}

// --- héros -----------------------------------------------------------------

function heroPose(state) {
  const hero = state.hero;
  if (hero.hurtTimer > 0) return 'hurt';
  if (hero.dodgeTimer > 0) return 'dodge';
  if (hero.dashTimer > 0) return 'dash';
  if (hero.attack) return 'attack';
  if (hero.wallDir !== 0 && !hero.grounded) return 'wall';
  if (!hero.grounded) return hero.vy < 0 ? 'jump' : 'fall';
  if (Math.abs(hero.vx) > 0.4) return 'run';
  return 'idle';
}

// ---------------------------------------------------------------------------
// Le héros — dessiné d'après la planche de production (mockups/02)
// ---------------------------------------------------------------------------
//
// Le personnage est un **squelette d'articulations en pixels** (pieds à 0,0,
// y vers le haut négatif), puis on trace par-dessus : le squelette porte la
// pose, le tracé porte le style. Trois choses viennent de la planche validée :
//
//   - la **veste ouverte sur le tee-shirt clair**, avec la capuche dans le dos
//     (avant, c'était un bloc noir : le héros n'avait plus de silhouette) ;
//   - **les yeux et la bouche** — à cette taille, c'est ce qui fait lire un
//     visage plutôt qu'une tache ;
//   - l'**écharpe** qui flotte dans le dos : sa longueur dit la vitesse.
//
// Le cycle de course est une table de quatre poses-clés (appui, passage,
// poussée, genou relevé) échantillonnée à 12 img/s : les jambes plient, le
// corps rebondit deux fois par cycle et les bras pompent à contretemps.

const LIMB_INK = 2.6;

/**
 * Cycle de course d'une jambe. Repères : origine aux **pieds**, `y` positif vers
 * le bas, hanche à -22. Le genou et la cheville sont donnés **relatifs à la
 * hanche** (donc `ky` ≈ +10 signifie « sous la hanche », `ay` ≈ +11 « sous le
 * genou »). La cheville retombe sur y ≈ 0 quand la jambe porte.
 */
const RUN_LEG = [
  { kx: 3.8, ky: 10.0, ax: 3.4, ay: 10.5 }, // appui avant : le pied touche devant
  { kx: -0.4, ky: 10.6, ax: -0.6, ay: 10.0 }, // passage sous le corps
  { kx: -4.8, ky: 10.0, ax: -7.0, ay: 10.5 }, // poussée arrière
  { kx: 3.0, ky: 8.2, ax: -1.0, ay: 8.2 }, // genou relevé
];/** Échantillonne la table en boucle (`t` en tours de cycle). */
function sampleRun(t) {
  const n = RUN_LEG.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const j = (i + 1) % n;
  const u = f - i;
  const a = RUN_LEG[i];
  const b = RUN_LEG[j];
  return {
    kx: lerp(a.kx, b.kx, u),
    ky: lerp(a.ky, b.ky, u),
    ax: lerp(a.ax, b.ax, u),
    ay: lerp(a.ay, b.ay, u),
  };
}

/**
 * Squelette de la pose. Origine aux pieds, `y` négatif vers le haut :
 * hanche -22, épaule -36, centre de tête -45. Le tronc fait 14 px, la jambe 22
 * (cuisse 10,5 + tibia 11), le bras 11,6 : proportions de la planche.
 *
 * Angulations des bras : **angles absolus** — 0 = vers l'avant (droite de
 * l'écran), +π/2 = vers le bas, −π/2 = vers le haut. `a1` est le bras, `a2`
 * l'avant-bras, et c'est l'angle de l'avant-bras qui décide où pointe le
 * pinceau. Un bras replié de course, c'est `a1` vers le bas (1,4) et `a2`
 * ramené vers l'avant (0,6) — pas un avant-bras qui tombe.
 */
function heroRig(hero, pose, cycle) {
  const speed = Math.abs(hero.vx);
  const rig = {
    lift: 0,
    lean: 0,
    head: 0,
    legFront: { kx: 1.4, ky: 10.2, ax: 0.4, ay: 10.3 },
    legBack: { kx: -1.4, ky: 10.2, ax: -0.4, ay: 10.3 },
    armFront: { a1: 1.3, a2: 2.6 }, // bras pendant, pinceau relevé vers l'arrière
    armBack: { a1: 1.15, a2: 0.85 },
  };

  if (pose === 'run') {
    rig.legFront = sampleRun(cycle);
    rig.legBack = sampleRun(cycle + 0.5);
    rig.lift = -1.6 * Math.cos(cycle * Math.PI * 4); // deux rebonds par cycle
    rig.lean = 0.06 + Math.min(0.06, speed * 0.006);
    const swing = Math.sin(cycle * Math.PI * 2);
    // bras opposés aux jambes, coudes repliés
    rig.armFront = { a1: 1.5 - swing * 0.5, a2: 2.5 - swing * 0.9 };
    rig.armBack = { a1: 1.2 + swing * 0.5, a2: 0.5 + swing * 0.95 };
    rig.head = Math.sin(cycle * Math.PI * 4) * 0.7;
  } else if (pose === 'jump') {
    rig.legFront = { kx: 3.2, ky: 8.6, ax: 2.0, ay: 7.0 };
    rig.legBack = { kx: -3.0, ky: 9.6, ax: -2.0, ay: 9.4 };
    rig.armFront = { a1: -0.55, a2: -1.1 };
    rig.armBack = { a1: -0.35, a2: -1.55 };
    rig.lift = -1.4;
  } else if (pose === 'fall') {
    rig.legFront = { kx: 4.2, ky: 9.2, ax: 2.0, ay: 9.6 };
    rig.legBack = { kx: -4.4, ky: 9.6, ax: -3.0, ay: 10.0 };
    rig.armFront = { a1: 0.5, a2: 0.15 };
    rig.armBack = { a1: 0.3, a2: -0.35 };
  } else if (pose === 'wall') {
    rig.legFront = { kx: 3.4, ky: 9.6, ax: 1.5, ay: 9.4 };
    rig.legBack = { kx: -2.4, ky: 10.2, ax: -1.5, ay: 10.0 };
    rig.armFront = { a1: -0.9, a2: -1.25 };
    rig.armBack = { a1: -0.5, a2: -0.2 };
  } else if (pose === 'dodge') {
    rig.lift = 4.5;
    rig.lean = -0.2;
    rig.legFront = { kx: 5.0, ky: 9.2, ax: 3.0, ay: 9.2 };
    rig.legBack = { kx: -4.2, ky: 9.4, ax: -2.6, ay: 9.2 };
    rig.armFront = { a1: 0.9, a2: 0.1 };
    rig.armBack = { a1: 1.9, a2: 2.4 };
  } else if (pose === 'dash') {
    rig.lean = 0.42;
    rig.lift = 1.4;
    rig.legFront = { kx: 5.0, ky: 8.8, ax: 3.4, ay: 10.0 };
    rig.legBack = { kx: -6.0, ky: 9.2, ax: -4.0, ay: 10.0 };
    rig.armFront = { a1: 0.15, a2: 0.05 };
    rig.armBack = { a1: 0.4, a2: 2.9 };
  } else if (pose === 'hurt') {
    rig.lean = -0.3;
    rig.lift = 1.6;
    rig.legFront = { kx: 3.4, ky: 9.8, ax: 2.0, ay: 10.0 };
    rig.legBack = { kx: -4.0, ky: 9.8, ax: -2.4, ay: 10.2 };
    rig.armFront = { a1: -0.6, a2: -1.5 };
    rig.armBack = { a1: -0.3, a2: -2.2 };
  }
  return rig;
}

/** Trace un membre en deux segments : contour d'encre épais, puis aplat. */
function limb(ctx, x0, y0, x1, y1, x2, y2, width, color) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pass of [
    [width + LIMB_INK, ART.ink],
    [width, color],
  ]) {
    ctx.lineWidth = pass[0];
    ctx.strokeStyle = pass[1];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// Proportions de la planche (mockups/02) ramenées à la boîte de collision de
// 1,6 tuile : **trois têtes et demie** de haut. La version précédente était un
// chibi de 2,6 têtes — c'est ce qui donnait l'air pataud, pas l'animation.
const HIP_Y = -20.5;
const SHOULDER_Y = -35.5;
const HEAD_Y = -44.5;
const HEAD_SCALE = 0.75;

function drawHero(ctx, state, painter, cam) {
  const hero = state.hero;
  if (hero.invuln > 0 && state.phase === 'play' && Math.floor(state.frame / 4) % 2 === 0) return;
  const px = Math.round(hero.x * TILE) - camX(cam);
  const py = Math.round(hero.y * TILE) - camY(cam);
  if (px < -90 || px > VIEW_W + 90) return;

  const pose = heroPose(state);
  const anim = Math.floor(state.frame / 5); // 12 img/s
  const cycle = (anim * 0.9) / (Math.PI * 2);
  const face = hero.facing >= 0 ? 1 : -1;
  const sink = (hero.sandDepth || 0) * 16;

  const rig = heroRig(hero, pose, cycle);
  const squash = hero.landed > 0 ? -0.12 : 0;
  const stretch = pose === 'jump' ? 0.09 : pose === 'fall' ? 0.05 : 0;
  const sy = 1 + squash + stretch;

  const hipY = HIP_Y + rig.lift;
  const shoulderY = SHOULDER_Y + rig.lift;
  const headY = HEAD_Y + rig.lift + rig.head;

  // --- jambes (hors de l'inclinaison du buste : elles restent sous la hanche)
  const drawLeg = (leg, back) => {
    const kx = leg.kx + (back ? -1.6 : 1.6);
    const kneeX = kx;
    const kneeY = hipY + leg.ky;
    const ankleX = kneeX + leg.ax;
    const ankleY = kneeY + leg.ay;
    limb(ctx, back ? -2.4 : 2.4, hipY, kneeX, kneeY, ankleX, ankleY, back ? 4.2 : 4.6, back ? ART.heroJacketLight : ART.heroJacket);
    // botte
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ankleX - 3.6, ankleY - 5.6);
    ctx.lineTo(ankleX + 2.4, ankleY - 5.6);
    ctx.quadraticCurveTo(ankleX + 6.6, ankleY - 3.6, ankleX + 5.8, ankleY - 0.2);
    ctx.lineTo(ankleX - 3.8, ankleY - 0.2);
    ctx.closePath();
    inked(ctx, ART.heroBoot, ART.ink, 2);
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ankleX - 3.4, ankleY - 1.8);
    ctx.lineTo(ankleX + 5.6, ankleY - 1.8);
    ctx.stroke();
    ctx.restore();
  };

  const drawArm = (arm, back) => {
    const ax = back ? -4 : 4.6;
    const ay = shoulderY + 1;
    const ex = ax + Math.cos(arm.a1) * 5.6;
    const ey = ay + Math.sin(arm.a1) * 5.6;
    const hx = ex + Math.cos(arm.a2) * 6;
    const hy = ey + Math.sin(arm.a2) * 6;
    limb(ctx, ax, ay, ex, ey, hx, hy, back ? 3.6 : 4, back ? ART.heroJacketLight : ART.heroJacket);
    ellipseFill(ctx, hx, hy, 2.7, 2.7, ART.heroBoot, ART.ink, 1.8); // gant
    return { hx, hy };
  };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(px, py + sink);
  ctx.scale(face / sy, sy);

  // jambe + bras arrière
  drawLeg(rig.legBack, true);
  drawArm(rig.armBack, true);

  // --- buste incliné (rotation autour de la hanche) ---
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(-rig.lean);
  ctx.translate(0, -hipY);

  // écharpe : deux rubans effilés. Le point clé, c'est la **flèche** : au repos
  // le bout pend (drop positif), en course il se relève et flotte derrière.
  // Un tracé droit donnait un bâton brun en travers du dos.
  const ribbon = (len, rootY, phase, width) => {
    const v = Math.abs(hero.vx);
    // Presque à plat : c'est ce qui distingue une écharpe qui traîne d'une faux
    // plantée au-dessus de la tête (deux essais ratés avant celui-ci).
    const rise = 1.5 + Math.min(2.5, v * 0.35); // elle se tend avec la vitesse
    const sag = Math.max(0, 4 - v * 0.9); // et retombe quand on s'arrête
    const amp = 1.1 + Math.min(2, v * 0.35); // ondulation
    const N = 7;
    const pts = [];
    for (let i = 0; i <= N; i += 1) {
      const u = i / N;
      const x = -3 - len * u;
      const y =
        rootY
        - rise * Math.sin(u * Math.PI * 0.85)
        + sag * u * u
        + Math.sin(u * 6 - cycle * Math.PI * 4 + phase) * amp * u;
      pts.push([x, y]);
    }
    // contour : bord supérieur, pointe **fourchue** (deux dents, comme une
    // écharpe déchirée), puis bord inférieur. À 12 img/s, c'est la fourche qui
    // fait lire du tissu — une pointe unique donnait une faux.
    const tip = pts[N];
    const prev = pts[N - 1];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1] - width * 0.5);
    for (let i = 1; i <= N; i += 1) {
      const w = width * 0.5 * (1 - 0.55 * (i / N));
      ctx.lineTo(pts[i][0], pts[i][1] - w);
    }
    const dx = tip[0] - prev[0];
    const dy = tip[1] - prev[1];
    const dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl;
    const ny = dx / dl;
    ctx.lineTo(tip[0] + dx * 1.6, tip[1] + dy * 1.6); // dent centrale
    ctx.lineTo(tip[0] + nx * width * 0.35, tip[1] + ny * width * 0.35);
    ctx.lineTo(tip[0] - nx * width * 0.3 - dx * 0.6, tip[1] - ny * width * 0.3 - dy * 0.6);
    for (let i = N; i >= 0; i -= 1) {
      const w = width * 0.5 * (1 - 0.55 * (i / N));
      ctx.lineTo(pts[i][0], pts[i][1] + w);
    }
    ctx.closePath();
    inked(ctx, ART.heroScarf, ART.ink, 1.7);
  };
  // court et épais : une écharpe de la planche fait à peine un tiers du corps
  const scarfLen = 11 + Math.min(6, Math.abs(hero.vx) * 1.2);
  ribbon(scarfLen, shoulderY - 0.5, 0, 6.4);
  ribbon(scarfLen * 0.7, shoulderY + 3.6, 2.1, 5.2);

  // capuche dans le dos
  ctx.beginPath();
  ctx.moveTo(-6.2, shoulderY - 0.6);
  ctx.quadraticCurveTo(-11.6, shoulderY + 2.6, -8.6, shoulderY + 7.4);
  ctx.quadraticCurveTo(-7.2, shoulderY + 4.4, -5.4, shoulderY + 2.8);
  ctx.closePath();
  inked(ctx, ART.heroJacketLight, ART.ink, 2);

  // torse : veste ouverte sur le tee-shirt clair
  ctx.beginPath();
  ctx.moveTo(-7.6, shoulderY - 0.5);
  ctx.quadraticCurveTo(-8.6, hipY - 8, -6.8, hipY - 1);
  ctx.lineTo(6.6, hipY - 1);
  ctx.quadraticCurveTo(8.4, hipY - 8, 7.6, shoulderY - 0.5);
  ctx.quadraticCurveTo(0, shoulderY - 3.6, -7.6, shoulderY - 0.5);
  ctx.closePath();
  inked(ctx, ART.heroJacket, ART.ink, 2);
  // le tee-shirt : panneau clair, c'est lui qui donne la silhouette
  ctx.beginPath();
  ctx.moveTo(-3.4, shoulderY - 2.4);
  ctx.lineTo(-2.4, hipY - 1.6);
  ctx.lineTo(3.6, hipY - 1.6);
  ctx.lineTo(5, shoulderY - 2.4);
  ctx.closePath();
  inked(ctx, ART.heroShirt, null, 0);
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2.6, shoulderY - 1.8);
  ctx.lineTo(-1.9, hipY - 2);
  ctx.moveTo(4, shoulderY - 1.8);
  ctx.lineTo(3.1, hipY - 2);
  ctx.stroke();
  // ceinture
  ctx.fillStyle = ART.heroBoot;
  ctx.fillRect(-6.6, hipY - 3.6, 13.2, 3.4);
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-6.6, hipY - 3.6, 13.2, 3.4);

  // --- tête ---
  ctx.save();
  ctx.translate(0, headY - 0);
  ctx.scale(HEAD_SCALE, HEAD_SCALE);
  ellipseFill(ctx, -3.2, -5.6, 8.4, 6.6, ART.heroHair, ART.ink, 2); // masse arrière
  ctx.beginPath(); // visage, menton resserré
  ctx.moveTo(-7.6, -4.6);
  ctx.quadraticCurveTo(-7.8, 3.2, -1.4, 4.4);
  ctx.quadraticCurveTo(6, 4, 7.6, -3.6);
  ctx.quadraticCurveTo(8, -8.4, 0, -8.6);
  ctx.quadraticCurveTo(-7.8, -8.4, -7.6, -4.6);
  ctx.closePath();
  inked(ctx, ART.heroSkin, ART.ink, 2);
  ellipseFill(ctx, -6, -2.4, 1.7, 2.3, ART.heroSkin, ART.ink, 1.4); // oreille
  // yeux : grands, avec un blanc franc — c'est ce qui fait lire un visage à
  // 32 px de haut ; les iris regardent devant
  for (const ex of [2.4, 6.4]) {
    ellipseFill(ctx, ex, -2.6, 1.7, 2.1, ART.paper, ART.ink, 1.3);
    ctx.fillStyle = ART.inkHard;
    ctx.beginPath();
    ctx.ellipse(ex + 0.7, -2.4, 0.9, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ART.inkHard;
  ctx.lineWidth = 1.6; // sourcils
  ctx.beginPath();
  ctx.moveTo(0.8, -6.4);
  ctx.lineTo(4.2, -6.8);
  ctx.moveTo(5.4, -6);
  ctx.lineTo(8.2, -5.4);
  ctx.stroke();
  ctx.strokeStyle = ART.heroHair; // bouche
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4.2, 2.2);
  ctx.lineTo(7, 1.6);
  ctx.stroke();
  ctx.fillStyle = ART.inkHard; // joue marquée d'un point de la planche
  ctx.fillRect(-0.6, 0.6, 1.6, 1.6);
  // cheveux : calotte + pointes (comme la planche, sans dépasser la boîte)
  // frange : elle s'arrête au-dessus des yeux, sinon le visage disparaît
  ctx.beginPath();
  ctx.moveTo(-9.2, -5.4);
  ctx.lineTo(-11.4, -8.6);
  ctx.lineTo(-7, -8.2);
  ctx.lineTo(-5.4, -11.4);
  ctx.lineTo(-1.8, -8.6);
  ctx.lineTo(1.2, -11.8);
  ctx.lineTo(4, -8.4);
  ctx.lineTo(7.8, -10.6);
  ctx.lineTo(8.4, -7.6);
  ctx.lineTo(9.6, -5.8);
  ctx.lineTo(6.4, -6.8);
  ctx.lineTo(3.4, -6);
  ctx.lineTo(0.4, -7.4);
  ctx.lineTo(-3, -6.2);
  ctx.lineTo(-6, -7.2);
  ctx.closePath();
  inked(ctx, ART.heroHair, ART.ink, 2);
  ctx.restore(); // tête

  // bras avant + pinceau
  const swing = hero.attack ? 1 - hero.attack.timer / TUNE.attackTime : 0;
  const s = clamp((swing - ATTACK_STRIKE_FROM) / (ATTACK_STRIKE_TO - ATTACK_STRIKE_FROM), 0, 1);
  const strike = s * s * (3 - 2 * s);
  let armF = rig.armFront;
  if (pose === 'attack') {
    const kind = hero.attack.kind;
    if (kind === 'up') armF = { a1: lerp(-0.75, -1.5, strike), a2: lerp(-1.1, -1.62, strike) };
    else if (kind === 'down') armF = { a1: lerp(0.75, 1.35, strike), a2: lerp(1.2, 1.55, strike) };
    else armF = { a1: lerp(-1.5, 0.2, strike), a2: lerp(-1.9, 0.35, strike) };
  }
  const hand = drawArm(armF, false);
  if (pose === 'attack') {
    // Le pinceau n'existe que pendant le coup : le porter en permanence le
    // faisait lire comme un fusil au bout du bras (et masquait la jambe au
    // repos). Il « sort » pour peindre, comme dans la planche.
    ctx.save();
    ctx.translate(hand.hx, hand.hy);
    ctx.rotate(armF.a2);
    ctx.fillStyle = ART.rockDark;
    ctx.fillRect(1, -1.6, 12.5, 3.2);
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(1, -1.6, 12.5, 3.2);
    // la soie : goutte allongée, large à la virole et effilée au bout
    ctx.beginPath();
    ctx.moveTo(12.5, -2.8);
    ctx.quadraticCurveTo(18, -5.6, 24.5, -1.6);
    ctx.quadraticCurveTo(27, 0, 24.5, 1.6);
    ctx.quadraticCurveTo(18, 5.6, 12.5, 2.8);
    ctx.closePath();
    inked(ctx, ART.inkHard, ART.ink, 1.8);
    ctx.fillStyle = 'rgba(242,231,213,0.22)';
    ctx.beginPath();
    ctx.moveTo(14, -1.4);
    ctx.quadraticCurveTo(19, -3.4, 23, -0.6);
    ctx.quadraticCurveTo(19, 0.2, 14, 0.4);
    ctx.closePath();
    ctx.fill();
    const swing = 1 - hero.attack.timer / TUNE.attackTime;
    const inStrike = swing >= ATTACK_STRIKE_FROM && swing <= ATTACK_STRIKE_TO + 0.1;
    if (inStrike) {
      const st = clamp((swing - ATTACK_STRIKE_FROM) / (ATTACK_STRIKE_TO - ATTACK_STRIKE_FROM), 0, 1);
      const strike = st * st * (3 - 2 * st);
      const glow = 1 - Math.min(1, Math.abs(swing - (ATTACK_STRIKE_FROM + 0.06)) / 0.34);
      // trait d'encre : plus court et plus fin qu'au premier jet — à 58 px il
      // couvrait la tête du héros au milieu du geste
      ctx.globalAlpha = 0.22 + 0.42 * glow;
      ctx.beginPath();
      ctx.moveTo(19, -1.6);
      ctx.quadraticCurveTo(30, -18 + strike * 16, 40, 4 + strike * 20);
      ctx.quadraticCurveTo(29, 10 + strike * 9, 19, 3);
      ctx.closePath();
      inked(ctx, ART.inkHard, null, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ART.inkHard;
      for (let i = 0; i < 4; i += 1) ctx.fillRect(22 + i * 5, -6 + i * 4, 2.6, 2.6);
    }
    ctx.restore();
  }

  ctx.restore(); // buste incliné

  drawLeg(rig.legFront, false);

  // écharpe nouée devant le cou
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(-rig.lean);
  ctx.translate(0, -hipY);
  // le nœud : petit, collé à la clavicule (au-dessus, il masquait le menton)
  ctx.beginPath();
  ctx.moveTo(-3.4, shoulderY - 1.6);
  ctx.quadraticCurveTo(1, shoulderY + 2.6, 5.2, shoulderY - 1);
  ctx.quadraticCurveTo(1, shoulderY + 0.4, -3.4, shoulderY - 1.6);
  ctx.closePath();
  inked(ctx, ART.heroScarf, ART.ink, 1.6);
  ctx.restore();

  if (pose === 'dash') { // smear
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(-12, -46);
    ctx.lineTo(-50, -30);
    ctx.lineTo(-48, -12);
    ctx.lineTo(-10, -12);
    ctx.closePath();
    inked(ctx, ART.inkHard, null, 0);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (sink > 0.5) { // le sable recouvre les jambes
    ctx.fillStyle = ART.sandDark;
    ctx.fillRect(px - 14, py + sink - 3, 28, 6);
    ctx.fillStyle = 'rgba(110,82,56,0.35)';
    ctx.fillRect(px - 14, py + sink - 9, 28, 6);
  }
}

// --- ennemis ---------------------------------------------------------------

function drawEnemies(ctx, state, cam) {
  for (const e of state.enemies) {
    const x = e.x * TILE - camX(cam);
    const y = e.y * TILE - camY(cam);
    if (x < -90 || x > VIEW_W + 90) continue;
    ctx.save();
    if (e.dead) {
      const k = clamp(e.deathTimer / 0.22, 0, 1);
      ctx.globalAlpha = k;
      ctx.translate(x, y);
      ctx.scale(1 + (1 - k) * 0.5, 0.5 + k * 0.5);
      ctx.translate(-x, -y);
    }
    drawEnemy(ctx, e, x, y);
    ctx.restore();
  }
}

function drawEnemy(ctx, e, x, y) {
  const flash = e.hurt > 0 ? ART.paper : null;
  if (e.kind === 'beetle') {
    // un scarabée doit se lire comme une bête, pas comme un pneu : pattes
    // visibles, carapace brune avec son sillon, tête et œil du côté où il marche
    const w = e.w * TILE;
    const h = e.h * TILE;
    const bw = w * 0.5;
    const bh = h * 0.55;
    const d = e.dir >= 0 ? 1 : -1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 7, y - bh * 0.9);
      ctx.lineTo(x + i * 10 + d * 5, y - 1.5);
      ctx.stroke();
    }
    ellipseFill(ctx, x, y - bh, bw, bh, flash || ART.rockDark, ART.ink, 2.5);
    ctx.fillStyle = flash || ART.rock;
    ctx.beginPath();
    ctx.ellipse(x - d * 1.5, y - bh * 1.15, bw * 0.66, bh * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ART.inkHard;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - d * bw * 0.95, y - bh);
    ctx.lineTo(x + d * bw * 0.75, y - bh * 0.95);
    ctx.stroke();
    ellipseFill(ctx, x + d * bw * 0.92, y - bh * 0.95, 5.5, 5, flash || ART.inkHard, ART.ink, 2);
    ellipseFill(ctx, x + d * (bw * 0.92 + 1.5), y - bh * 1.15, 1.9, 1.9, ART.gold, null, 0);
    return;
  }
  if (e.kind === 'idol') {
    const w = e.w * TILE;
    const h = e.h * TILE;
    roundRect(ctx, x - w * 0.42, y - h, w * 0.84, h, 6);
    inked(ctx, flash || ART.rock, ART.ink, 3);
    ctx.fillStyle = ART.inkHard;
    ctx.fillRect(x - 9, y - h + 14, 6, 5);
    ctx.fillRect(x + 3, y - h + 14, 6, 5);
    const charging = e.state === 'charge';
    ctx.fillStyle = charging ? ART.heart : ART.rockDark;
    ctx.fillRect(x - 6, y - h + 26, 12, 4);
    if (charging) {
      ctx.globalAlpha = 0.45;
      ellipseFill(ctx, x, y - h * 0.55, 17, 17, ART.heart, null, 0);
      ctx.globalAlpha = 1;
    }
    screentone(ctx, x - w * 0.42 + 2, y - h + 2, w * 0.84 - 4, h * 0.45, 7, 'rgba(43,39,33,0.22)');
    return;
  }
  if (e.kind === 'golem') {
    const w = e.w * TILE;
    const h = e.h * TILE;
    roundRect(ctx, x - w * 0.45, y - h * 0.86, w * 0.9, h * 0.86, 8);
    inked(ctx, flash || ART.rock, ART.ink, 3);
    roundRect(ctx, x - w * 0.3, y - h - 3, w * 0.6, h * 0.26, 6);
    inked(ctx, flash || ART.rockDark, ART.ink, 3);
    const cracked = e.hp < e.maxHp;
    ctx.strokeStyle = cracked ? ART.gold : ART.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - h * 0.7);
    ctx.lineTo(x - 2, y - h * 0.5);
    ctx.lineTo(x - 8, y - h * 0.32);
    ctx.moveTo(x + 8, y - h * 0.62);
    ctx.lineTo(x + 2, y - h * 0.42);
    ctx.stroke();
    ctx.fillStyle = ART.heart;
    ctx.fillRect(x - 9, y - h * 0.8, 5, 4);
    ctx.fillRect(x + 5, y - h * 0.8, 5, 4);
    screentone(ctx, x - w * 0.45 + 3, y - h * 0.86 + 3, w * 0.9 - 6, h * 0.32, 8, 'rgba(43,39,33,0.25)');
    return;
  }
  // vautour de pixels
  const h = e.h * TILE;
  const flap = e.state === 'perched' ? 0 : Math.sin(e.timer * 16) * 7;
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - h * 1.05 + flap);
  ctx.lineTo(x - 3, y - h * 0.65);
  ctx.lineTo(x + 16, y - h * 1.05 + flap);
  ctx.stroke();
  ellipseFill(ctx, x, y - h * 0.55, 13, 8, flash || ART.paper, ART.ink, 2.5);
  ctx.fillStyle = ART.inkHard;
  ctx.fillRect(x + (e.dir > 0 ? 7 : -12), y - h * 0.63, 5, 4);
  ctx.beginPath();
  ctx.moveTo(x + (e.dir > 0 ? 12 : -12), y - h * 0.52);
  ctx.lineTo(x + (e.dir > 0 ? 19 : -19), y - h * 0.44);
  ctx.lineTo(x + (e.dir > 0 ? 12 : -12), y - h * 0.36);
  ctx.closePath();
  inked(ctx, ART.gold, ART.ink, 2);
}

// --- projectiles -----------------------------------------------------------

function drawProjectiles(ctx, state, cam) {
  const ox = camX(cam);
  const oy = camY(cam);
  for (const p of state.projectiles) {
    ctx.save();
    ctx.translate(p.x * TILE - ox, p.y * TILE - oy);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(0, -6);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 6);
    ctx.closePath();
    inked(ctx, ART.rockDark, ART.ink, 2);
    ctx.restore();
  }
}

// --- particules et onomatopées ---------------------------------------------

function burst(painter, x, y, n, color, dir = 0, speed = 2) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.PI + (i / n) * Math.PI;
    painter.particles.push({
      x,
      y,
      vx: Math.cos(a) * 40 * speed + dir * 30,
      vy: Math.sin(a) * 40 * speed - 10,
      life: 0.34,
      max: 0.34,
      r: 3,
      color,
    });
  }
}

function pop(painter, text, x, y, rot = 0) {
  painter.pops.push({ text, x, y, rot: (rot * Math.PI) / 180, life: 0.62, max: 0.62 });
}

/** Les événements du moteur deviennent des particules et des onomatopées. */
function collectEvents(painter, state) {
  for (const ev of state.events) {
    const x = ev.x * TILE;
    const y = ev.y * TILE;
    const dir = ev.dir || 1;
    switch (ev.type) {
      case 'jump':
        burst(painter, x, y, 6, ART.sandLight, -0.6, 2.2);
        break;
      case 'dodge':
        burst(painter, x, y, 8, ART.sand, -dir, 2.6);
        break;
      case 'dash':
        for (let i = 0; i < 10; i += 1) {
          painter.particles.push({ x: x - dir * i * 4, y: y + (i % 3 - 1) * 5, vx: -dir * 40, vy: -6, life: 0.32, max: 0.32, r: 3, color: ART.inkHard });
        }
        pop(painter, 'FWOOSH', x, y - 14, -8 * dir);
        break;
      case 'walljump':
        burst(painter, x, y, 8, ART.paper, -dir, 2.6);
        pop(painter, 'TAK', x, y - 22, 4 * dir);
        break;
      case 'hit':
        for (let i = 0; i < 10; i += 1) {
          const a = (Math.PI * 2 * i) / 10;
          painter.particles.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 70, life: 0.28, max: 0.28, r: 3.5, color: i % 3 === 0 ? ART.paper : ART.inkHard });
        }
        // L'onomatopée se pose **au-dessus** de la cible : collée à l'impact, elle
        // cachait l'ennemi touché et son clignotement blanc, donc le coup.
        pop(painter, ev.stage >= 3 ? 'DOON!' : 'ZAN!', x + 10 * dir, y - 30, 5 * dir);
        break;
      case 'ricochet':
        burst(painter, x, y, 6, ART.paper, -dir, 2.2);
        pop(painter, 'TIK!', x, y - 28, -5 * dir);
        break;
      case 'poof':
        for (let i = 0; i < 12; i += 1) {
          const a = (Math.PI * 2 * i) / 12;
          painter.particles.push({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 20, life: 0.45, max: 0.45, r: 4.5, color: ART.rockDark });
        }
        pop(painter, 'POF', x, y - 16, 4);
        break;
      case 'shard':
        pop(painter, 'PIKO', x + 12 * dir, y - 10, 6 * dir);
        break;
      case 'shardBreak':
        burst(painter, x, y, 6, ART.rockDark, -1, 2);
        break;
      case 'hurt':
        burst(painter, x, y, 10, ART.heart, -1, 3);
        pop(painter, 'GWAH!', x, y - 18, -6);
        break;
      case 'ko':
        burst(painter, x, y, 14, ART.heart, -1, 4);
        pop(painter, 'K.O.', x, y - 26, 3);
        break;
      case 'victory':
        for (let i = 0; i < 26; i += 1) {
          painter.particles.push({
            x: x + ((i % 7) - 3) * 12,
            y: y - 20 - (i % 5) * 10,
            vx: (i % 2 ? 1 : -1) * 30,
            vy: -60 - (i % 4) * 20,
            life: 1.1,
            max: 1.1,
            r: 4,
            color: i % 2 ? ART.gold : ART.paper,
          });
        }
        break;
      default:
        break;
    }
  }
  state.events.length = 0;
}

function stepParticles(painter, dt) {
  for (const p of painter.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
  }
  painter.particles = painter.particles.filter((p) => p.life > 0).slice(-260);
  for (const p of painter.pops) {
    p.life -= dt;
    p.y -= 26 * dt;
  }
  painter.pops = painter.pops.filter((p) => p.life > 0).slice(-12);
}

function drawParticles(ctx, painter) {
  const ox = camX(painter.cam);
  const oy = camY(painter.cam);
  for (const p of painter.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - ox, p.y - oy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPops(ctx, painter) {
  const ox = camX(painter.cam);
  const oy = camY(painter.cam);
  for (const p of painter.pops) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.8);
    ctx.translate(p.x - ox, p.y - oy);
    ctx.rotate(p.rot);
    ctx.font = `900 ${p.text.length > 4 ? 22 : 27}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = ART.inkHard;
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = ART.paper;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// --- HUD -------------------------------------------------------------------

/** Plaque d'encre : le fond des groupes du HUD, comme un coup de pinceau. */
function inkPlate(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = ART.inkHard;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 3);
  ctx.quadraticCurveTo(x + w * 0.5, y - 6, x + w + 6, y + 1);
  ctx.quadraticCurveTo(x + w + 2, y + h * 0.6, x + w + 5, y + h);
  ctx.quadraticCurveTo(x + w * 0.4, y + h + 5, x - 5, y + h - 2);
  ctx.quadraticCurveTo(x - 8, y + h * 0.5, x - 4, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx, x, y, s, filled) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.75);
  ctx.quadraticCurveTo(x - s, y + s * 0.1, x - s * 0.5, y - s * 0.35);
  ctx.quadraticCurveTo(x, y - s * 0.7, x, y - s * 0.2);
  ctx.quadraticCurveTo(x, y - s * 0.7, x + s * 0.5, y - s * 0.35);
  ctx.quadraticCurveTo(x + s, y + s * 0.1, x, y + s * 0.75);
  ctx.closePath();
  inked(ctx, filled ? ART.heart : 'rgba(0,0,0,0.35)', ART.inkHard, 2.5);
  if (filled) ellipseFill(ctx, x - s * 0.32, y - s * 0.18, s * 0.22, s * 0.16, 'rgba(242,231,213,0.65)', null, 0);
}

function drawCardSlot(ctx, x, y, w, h, label, cooldown) {
  roundRect(ctx, x, y, w, h, 5);
  inked(ctx, ART.paper, ART.inkHard, 2.5);
  ctx.fillStyle = ART.inkHard;
  ctx.font = `700 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  if (cooldown > 0.02) {
    ctx.fillStyle = `rgba(43,39,33,${0.6 * cooldown})`;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
  }
}

function drawHud(ctx, state, opts) {
  const hero = state.hero;

  // cœurs + jetons
  inkPlate(ctx, 14, 12, 24 * hero.maxHp + 22, 34);
  for (let i = 0; i < hero.maxHp; i += 1) drawHeart(ctx, 32 + i * 26, 30, 11, i < hero.hp);
  inkPlate(ctx, 14, 52, 88, 26);
  for (let i = 0; i < 3; i += 1) {
    ellipseFill(ctx, 32 + i * 24, 65, 8.5, 6.5, ART.gold, ART.inkHard, 2);
    ctx.fillStyle = ART.goldDeep;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 32 + i * 24, 65);
  }

  // le deck du prototype : trois cartes, avec leur recharge
  const slots = [
    ['DASH', hero.dashCd / TUNE.airDashCooldown],
    ['ESQ.', hero.dodgeCd / TUNE.dodgeCooldown],
    ['MUR', hero.wallJumpLockTimer / TUNE.wallJumpLock],
  ];
  for (let i = 0; i < slots.length; i += 1) {
    drawCardSlot(ctx, 150 + i * 46, 14, 42, 30, slots[i][0], clamp(slots[i][1], 0, 1));
  }

  // compteur : ennemis éliminés (le prototype n'a pas encore ses cartes)
  inkPlate(ctx, VIEW_W - 122, 12, 108, 34);
  ctx.fillStyle = ART.paper;
  ctx.font = `900 20px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.stats.kills} / ${state.enemies.length + state.stats.kills}`, VIEW_W - 28, 28);
  ctx.font = `700 9px ${FONT}`;
  ctx.fillText('ENNEMIS ÉLIMINÉS', VIEW_W - 28, 40);

  // titre de la salle : sur plaque, sinon illisible sur le sable clair
  const subtitle = `${state.room.name} · ${state.room.subtitle}`;
  ctx.font = `700 10px ${FONT}`;
  const subtitleW = ctx.measureText(subtitle).width;
  inkPlate(ctx, 14, 82, subtitleW + 22, 19);
  ctx.fillStyle = ART.paper;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(subtitle, 24, 92);

  if (opts.debug) drawDebugPanel(ctx, state, opts);
}

function drawDebugPanel(ctx, state, opts) {
  const h = state.hero;
  inkPlate(ctx, 14, VIEW_H - 104, 258, 92);
  ctx.fillStyle = ART.paper;
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = [
    `fps ${opts.fps ? opts.fps.toFixed(0) : '—'} · image ${state.frame} · t ${state.time.toFixed(2)} s`,
    `x ${h.x.toFixed(2)} y ${h.y.toFixed(2)} · vx ${h.vx.toFixed(2)} vy ${h.vy.toFixed(2)}`,
    `sol ${h.grounded} · mur ${h.wallDir} · coyote ${h.groundTimer.toFixed(3)}`,
    `mémoire de saut ${h.jumpBuffer.toFixed(3)} · air ${state.stats.airTime.toFixed(2)} s`,
    `sauts ${state.stats.jumps} · murs ${state.stats.wallJumps} · dash ${state.stats.airDashes}`,
    `coups ${state.stats.attacks} · touches ${state.stats.hits} · dégâts ${state.stats.damageTaken}`,
  ];
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], 22, VIEW_H - 98 + i * 13);
}

// --- surcouches ------------------------------------------------------------

function drawPhaseOverlay(ctx, state) {
  if (state.phase === 'dead') {
    ctx.fillStyle = `rgba(142,43,34,${0.22 + 0.12 * Math.sin(state.time * 12)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `900 46px ${FONT}`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = ART.inkHard;
    ctx.strokeText('K.O.', VIEW_W / 2, VIEW_H / 2 - 8);
    ctx.fillStyle = ART.paper;
    ctx.fillText('K.O.', VIEW_W / 2, VIEW_H / 2 - 8);
    ctx.font = `700 14px ${FONT}`;
    ctx.strokeText('retour à l’entrée du puits…', VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.fillText('retour à l’entrée du puits…', VIEW_W / 2, VIEW_H / 2 + 30);
    return;
  }
  if (state.phase === 'victory') {
    ctx.fillStyle = 'rgba(43,39,33,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 420;
    const x = (VIEW_W - w) / 2;
    roundRect(ctx, x, 88, w, 178, 8);
    inked(ctx, ART.paper, ART.inkHard, 4);
    ctx.fillStyle = ART.inkHard;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText('LE PUITS SEC', VIEW_W / 2, 128);
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText('SALLE FRANCHIE — PROTOTYPE DU FEEL', VIEW_W / 2, 152);
    const t = state.stats.clearedIn || state.time;
    ctx.fillStyle = ART.blood;
    ctx.font = `900 36px ${FONT}`;
    ctx.fillText(`${t.toFixed(2)} s`, VIEW_W / 2, 196);
    ctx.fillStyle = ART.inkHard;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(
      `cœurs ${state.hero.hp}/${state.hero.maxHp} · coups ${state.stats.hits} · dégâts subis ${state.stats.damageTaken}`,
      VIEW_W / 2,
      226,
    );
    ctx.fillText('R pour rejouer', VIEW_W / 2, 248);
  }
}

// --- débogage géométrique --------------------------------------------------

function drawDebug(ctx, state, room, cam) {
  const ox = camX(cam);
  const oy = camY(cam);
  const box = (b, color, width = 1.5) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(
      Math.round(b.left * TILE - ox),
      Math.round(b.top * TILE - oy),
      Math.round((b.right - b.left) * TILE),
      Math.round((b.bottom - b.top) * TILE),
    );
  };
  const asBox = (r) => ({ left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h });

  ctx.save();
  for (const s of room.solids) box(asBox(s), 'rgba(120,200,255,0.7)');
  for (const p of room.oneways) box({ left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + 0.3 }, 'rgba(120,255,200,0.9)');
  for (const s of room.sands) box(asBox(s), 'rgba(255,220,80,0.8)');
  box(asBox(room.goal), 'rgba(120,255,120,0.9)');
  for (const e of state.enemies) {
    box({ left: e.x - e.w / 2, top: e.y - e.h, right: e.x + e.w / 2, bottom: e.y }, 'rgba(255,80,80,0.9)');
  }
  const h = state.hero;
  box({ left: h.x - h.w / 2, top: h.y - h.h, right: h.x + h.w / 2, bottom: h.y }, 'rgba(255,80,255,0.95)', 2);

  // boîte d'impact de l'attaque en cours — celle du moteur, jamais une copie :
  // la version recopiée ici avait déjà dérivé (ancienne fenêtre d'impact)
  const strike = attackBox(h);
  if (strike) box(strike, 'rgba(255,255,0,0.95)', 2);

  // vecteur vitesse
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(h.x * TILE - ox, h.y * TILE - oy);
  ctx.lineTo((h.x + h.vx * 0.12) * TILE - ox, (h.y + h.vy * 0.12) * TILE - oy);
  ctx.stroke();
  ctx.restore();
}
