/**
 * Capture d'écran d'une ROM NES, sans navigateur — `node scripts/nes-screenshot.mjs`.
 *
 *   node scripts/nes-screenshot.mjs <rom.nes> <sortie.png> [script] [échelle]
 *
 * `script` décrit la partie à rejouer avant la capture, séparé par des
 * virgules : `120` = attendre 120 images, `start` / `a` / `b` / `select` /
 * `up` / `down` / `left` / `right` = appuyer puis relâcher (6 images),
 * `hold:right:90` = maintenir 90 images. Exemple : `90,start,60,a,240`.
 *
 * Sert à fabriquer les captures des jaquettes de la borne rétro
 * (public/roms/<jeu>/) à partir de la vraie ROM, dans l'émulateur du site.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { NES, Controller } from 'jsnes';

const [romPath, outPath, script = '180', scaleArg = '2'] = process.argv.slice(2);
if (!romPath || !outPath) {
  console.error('usage: node scripts/nes-screenshot.mjs <rom.nes> <sortie.png> [script] [échelle]');
  process.exit(1);
}

const W = 256;
const H = 240;
let frame = new Uint32Array(W * H);
const nes = new NES({ onFrame: (buf) => { frame = Uint32Array.from(buf); }, emulateSound: false });
nes.loadROM(new Uint8Array(fs.readFileSync(romPath)));

const BUTTONS = {
  a: Controller.BUTTON_A, b: Controller.BUTTON_B, select: Controller.BUTTON_SELECT, start: Controller.BUTTON_START,
  up: Controller.BUTTON_UP, down: Controller.BUTTON_DOWN, left: Controller.BUTTON_LEFT, right: Controller.BUTTON_RIGHT,
};
const run = (n) => { for (let i = 0; i < n; i += 1) nes.frame(); };
for (const step of script.split(',').map((s) => s.trim()).filter(Boolean)) {
  if (/^\d+$/.test(step)) { run(Number(step)); continue; }
  const [first, second, third] = step.split(':');
  const hold = first === 'hold';
  const name = hold ? second : first;
  const frames = hold ? Number(third || 30) : 6;
  const button = BUTTONS[name];
  if (button === undefined) throw new Error(`étape inconnue : ${step}`);
  nes.buttonDown(1, button);
  run(frames);
  nes.buttonUp(1, button);
  run(2);
}

// PNG RGB minimal (zlib natif), mise à l'échelle au plus proche voisin.
const scale = Math.max(1, Number(scaleArg) || 1);
const ow = W * scale;
const oh = H * scale;
const raw = Buffer.alloc((ow * 3 + 1) * oh);
for (let y = 0; y < oh; y += 1) {
  const row = y * (ow * 3 + 1);
  raw[row] = 0;
  for (let x = 0; x < ow; x += 1) {
    const p = frame[Math.floor(y / scale) * W + Math.floor(x / scale)]; // 0xBBGGRR
    const o = row + 1 + x * 3;
    raw[o] = p & 0xff;
    raw[o + 1] = (p >> 8) & 0xff;
    raw[o + 2] = (p >> 16) & 0xff;
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4); ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync(outPath, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log(`${outPath} (${ow}×${oh})`);
