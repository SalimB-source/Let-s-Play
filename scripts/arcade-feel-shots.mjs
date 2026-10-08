/**
 * Captures du prototype « feel » — `npm run shots:arcade`.
 * =========================================================
 * Peint de vraies images du jeu, sans navigateur, et écrit :
 *
 *   - `mockups/05-prototype-feel-captures.png` — la planche de six vues
 *     (entrée du puits, sable, grand trou, coup porté, mode mesures, corniches) ;
 *   - `public/arcade-eternelle-thumb.png` — la vignette de la page « Jeux » ;
 *   - `/tmp/pose-sheet.png` — la planche de poses du héros, pour juger
 *     l'animation image par image (repos, course, saut, coups, dash).
 *
 * Dépendance : un canvas natif, volontairement **hors du dépôt** (il n'est utile
 * qu'à ce script, pas au jeu) :
 *
 *     npm i --no-save @napi-rs/canvas
 *
 * Rien ici ne fait partie de la vérification (`check:arcade-feel-ui`) : ce script
 * sert à **regarder** le résultat, pas à le valider.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let createCanvas;
try {
  ({ createCanvas } = await import('@napi-rs/canvas'));
} catch {
  console.error('Canvas natif absent. Installe-le, il n’est pas une dépendance du jeu :');
  console.error('    npm i --no-save @napi-rs/canvas');
  process.exit(1);
}

// `arcadeFeelArt.js` croit qu'un navigateur est là : on lui en donne un minimal.
globalThis.document = { createElement: () => createCanvas(1, 1) };

const { ROOMS, createState, step, heldInput } = await import('../src/games/arcadeFeel.js');
const { createPainter, VIEW_W, VIEW_H } = await import('../src/games/arcadeFeelArt.js');

const room = ROOMS['feel-01'];
const painter = createPainter(room);
const canvas = createCanvas(VIEW_W, VIEW_H);
const ctx = canvas.getContext('2d');
const shotDir = '/tmp/arcade-feel-shots';
mkdirSync(shotDir, { recursive: true });

/** Peint l'état demandé et renvoie le chemin du PNG. */
function shot(name, x, y, opts = {}) {
  const state = createState('feel-01');
  state.hero.x = x;
  state.hero.y = y;
  state.hero.vx = opts.vx ?? 0;
  state.hero.vy = opts.vy ?? 0;
  state.hero.facing = opts.facing ?? 1;
  if (opts.sand) state.hero.sandDepth = opts.sand;
  if (opts.enemies) state.enemies = state.enemies.filter(opts.enemies);
  for (let i = 0; i < (opts.warm ?? 24); i += 1) {
    painter.paint(ctx, state, { dt: 1 / 60, fps: 60, debug: !!opts.debug });
  }
  const file = path.join(shotDir, `${name}.png`);
  writeFileSync(file, canvas.toBuffer('image/png'));
  return file;
}

// --- la planche de six vues -------------------------------------------------
const views = [
  shot('spawn', 3.6, 15),
  shot('sable', 24.4, 15, { sand: 0.5 }),
  shot('trou', 36.2, 19.6, { warm: 40 }),
  (() => {
    // un coup porté : le scarabée encaisse, l'onomatopée se pose au-dessus
    const s = createState('feel-01');
    const beetle = s.enemies.find((e) => e.kind === 'beetle' && e.x < 15);
    s.enemies = [beetle];
    beetle.x = 11.9;
    beetle.dir = -1;
    s.hero.x = 10.35;
    s.hero.y = 15;
    s.hero.facing = 1;
    for (let i = 0; i < 30; i += 1) painter.paint(ctx, s, { dt: 1 / 60, fps: 60 });
    step(s, heldInput({ attackPressed: true, attack: true }));
    for (let i = 0; i < 5; i += 1) {
      painter.paint(ctx, s, { dt: 1 / 60, fps: 60 });
      step(s, heldInput({ attack: true }));
    }
    const file = path.join(shotDir, 'coup.png');
    writeFileSync(file, canvas.toBuffer('image/png'));
    return file;
  })(),
  shot('mesures', 15.5, 15, { warm: 30, debug: true }),
  shot('corniche', 40.6, 17, { warm: 30 }),
];

execFileSync('montage', [...views, '-tile', '3x2', '-geometry', '+5+5', '-background', '#0B0D1B', path.join(shotDir, 'planche.png')]);
execFileSync('convert', [path.join(shotDir, 'planche.png'), '-resize', '1800x', path.join(root, 'mockups/05-prototype-feel-captures.png')]);

// --- la vignette de la page « Jeux » ---------------------------------------
const thumb = shot('vignette', 24.4, 15, { sand: 0.5, warm: 30, vx: 6.2 });
execFileSync('cp', [thumb, path.join(root, 'public/arcade-eternelle-thumb.png')]);

// --- la planche de poses (animation) ---------------------------------------
const W = 92;
const H = 100;
const Z = 4;
const poses = [
  { tag: 'repos', warm: 40 },
  { tag: 'repos 2', warm: 70 },
  { tag: 'course a', warm: 60, move: { right: true }, hold: { right: true } },
  { tag: 'course b', warm: 70, move: { right: true }, hold: { right: true } },
  { tag: 'course c', warm: 80, move: { right: true }, hold: { right: true } },
  { tag: 'course d', warm: 90, move: { right: true }, hold: { right: true } },
  { tag: 'saut', warm: 10, press: { jumpPressed: true, jump: true }, hold: { jump: true } },
  { tag: 'chute', warm: 100, press: { jumpPressed: true, jump: true }, hold: {} },
  { tag: 'coup côté', warm: 20, press: { attackPressed: true, attack: true }, hold: { attack: true } },
  { tag: 'coup côté 2', warm: 20, press: { attackPressed: true, attack: true }, hold: { attack: true }, skip: 5 },
  { tag: 'coup plongeant', warm: 20, press: { attackPressed: true, attack: true, down: true }, hold: { attack: true, down: true }, skip: 6 },
  { tag: 'dash', warm: 40, move: { right: true }, press: { dashPressed: true }, hold: { right: true } },
];
const cols = 6;
const out = createCanvas(cols * W * Z, Math.ceil(poses.length / cols) * H * Z);
const octx = out.getContext('2d');
octx.fillStyle = '#d8ebee';
octx.fillRect(0, 0, out.width, out.height);
poses.forEach((row, idx) => {
  const s = createState('feel-01');
  s.room = { ...s.room, goal: { x: -50, y: -50, w: 1, h: 1 } };
  s.enemies = [];
  s.hero.x = 55.5;
  s.hero.y = 15;
  s.hero.facing = 1;
  for (let w = 0; w < (row.warm ?? 0); w += 1) {
    step(s, heldInput(row.move || {}));
    painter.paint(ctx, s, { dt: 1 / 60, fps: 60 });
  }
  if (row.press) {
    step(s, heldInput({ ...(row.move || {}), ...row.press }));
    for (let k = 0; k < (row.skip || 0); k += 1) step(s, heldInput({ ...(row.move || {}), ...(row.hold || {}) }));
  }
  for (let i = 0; i < 3; i += 1) {
    painter.paint(ctx, s, { dt: 1 / 60, fps: 60 });
    step(s, heldInput({ ...(row.move || {}), ...(row.hold || {}) }));
  }
  const hx = Math.round(s.hero.x * 32) - Math.round(painter.cam.x * 32);
  const hy = Math.round(s.hero.y * 32) - Math.round(painter.cam.y * 32);
  const cx = (idx % cols) * W * Z;
  const cy = Math.floor(idx / cols) * H * Z;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(
    canvas,
    Math.max(0, Math.min(VIEW_W - W, hx - W / 2)),
    Math.max(0, Math.min(VIEW_H - H, hy - H + 6)),
    W,
    H,
    cx,
    cy,
    W * Z,
    H * Z,
  );
  octx.fillStyle = '#2b2721';
  octx.font = '700 16px monospace';
  octx.fillText(row.tag, cx + 8, cy + 20);
});
writeFileSync(path.join(shotDir, 'poses-heros.png'), out.toBuffer('image/png'));

console.log('écrit :');
console.log('  mockups/05-prototype-feel-captures.png');
console.log('  public/arcade-eternelle-thumb.png');
console.log(`  ${shotDir}/poses-heros.png (planche de poses, hors dépôt)`);
