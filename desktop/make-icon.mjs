#!/usr/bin/env node
/**
 * Icône de l'app PC — desktop/make-icon.mjs
 * -----------------------------------------
 * Dessine l'icône du Sablier de Bab El (un sablier d'or sur fond de nuit) et
 * écrit les deux formats dont `electron-builder` a besoin :
 *
 *   - `desktop/app-icons/icon.png`  (512 × 512, Linux + source des autres) ;
 *   - `desktop/app-icons/icon.ico`  (16, 24, 32, 48, 64, 128 en BMP 32 bits +
 *                                256 en PNG compressé — le format attendu par
 *                                l'explorateur et la barre des tâches Windows).
 *
 * **Aucune dépendance** : le rendu est fait pixel par pixel, l'encodage PNG avec
 * `node:zlib`. Le logo du site (`public/lets-play-logo.png`, 1248 × 905) n'est
 * ni carré ni lisible en 32 pixels ; un sablier dessiné reste net à toutes les
 * tailles et ne demande ni `sharp` ni outil système sur le runner Windows.
 *
 * Le rendu est fait en 2048 × 2048 puis réduit par moyenne de blocs : c'est ce
 * qui donne des bords réguliers (anti-aliasing) sans tracer de courbes de Bézier.
 *
 * Usage : `node desktop/make-icon.mjs` (régénère les deux fichiers).
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, 'app-icons');

const SUPER = 2048;        // taille du rendu
const BASE = 1024;         // taille maîtresse après réduction
const TAILLES_ICO = [16, 24, 32, 48, 64, 128];  // BMP
const TAILLE_ICO_PNG = 256;                     // PNG dans l'ICO

// ---------------------------------------------------------------------------
// Couleur
// ---------------------------------------------------------------------------
const hex = (v) => [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
const NUIT_HAUT = hex('#1b2150');
const NUIT_BAS = hex('#070814');
const OR = hex('#e8b75c');
const OR_CLAIR = hex('#fbe6b4');
const OR_SOMBRE = hex('#a97a2c');
const SABLE = hex('#e0ad52');
const VERRE = [188, 214, 255];

const melanger = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------------------
// Géométrie (coordonnées 0..1, y vers le bas)
// ---------------------------------------------------------------------------
/** Point dans un polygone convexe ou non (lancer de rayon). */
function dansPolygone(x, y, points) {
  let dedans = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Réduit un polygone vers son centre (pour dessiner un contour : extérieur
 * plein, intérieur évidé). */
function retrecir(points, facteur) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map(([x, y]) => [cx + (x - cx) * facteur, cy + (y - cy) * facteur]);
}

const BULBE_HAUT = [[0.295, 0.235], [0.705, 0.235], [0.525, 0.487], [0.475, 0.487]];
const BULBE_BAS = [[0.475, 0.513], [0.525, 0.513], [0.705, 0.765], [0.295, 0.765]];
const CAPS = [[0.25, 0.185, 0.75, 0.235], [0.25, 0.765, 0.75, 0.815]];

/** Générateur pseudo-aléatoire à graine fixe : les étoiles sont les mêmes à
 * chaque génération, donc l'icône committée ne « scintille » pas entre deux runs. */
function mulberry32(graine) {
  let a = graine >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 46 étoiles discrètes dans la nuit du badge. */
const ETOILES = (() => {
  const aleatoire = mulberry32(20261020);
  return Array.from({ length: 46 }, () => ({
    x: 0.06 + aleatoire() * 0.88,
    y: 0.05 + aleatoire() * 0.9,
    r: 0.0035 + aleatoire() * 0.0055,
    a: 0.18 + aleatoire() * 0.5,
  }));
})();

/** Distance au bord d'un rectangle arrondi, négative à l'intérieur. */
function distanceRectangleArrondi(x, y, { x0, y0, x1, y1, r }) {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return Math.hypot(dx, dy) - r;
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
function rendre(taille) {
  const pixels = new Uint8ClampedArray(taille * taille * 4);
  const inset = 0.018 * taille;
  const rayon = 0.185 * taille;
  const badge = { x0: inset, y0: inset, x1: taille - inset, y1: taille - inset, r: rayon };

  for (let py = 0; py < taille; py++) {
    const y = py / taille;
    for (let px = 0; px < taille; px++) {
      const x = px / taille;
      const i = (py * taille + px) * 4;

      // 1) Badge arrondi, avec un lissage d'un pixel sur le bord.
      const d = distanceRectangleArrondi(px, py, badge);
      const couverture = Math.min(1, Math.max(0, 0.5 - d));
      if (couverture <= 0) continue;

      // 2) Fond : dégradé vertical + léger halo au centre.
      const halo = Math.exp(-((x - 0.5) ** 2 + (y - 0.46) ** 2) * 9);
      let couleur = melanger(NUIT_HAUT, NUIT_BAS, Math.min(1, y * 1.15));
      couleur = melanger(couleur, hex('#2c3576'), halo * 0.55);

      // 3) Halo doré derrière le sablier.
      const haloOr = Math.exp(-((x - 0.5) ** 2 * 26 + (y - 0.5) ** 2 * 15));
      couleur = melanger(couleur, OR_SOMBRE, haloOr * 0.45);

      // 3 bis) Étoiles : points lumineux à décroissance gaussienne.
      for (const etoile of ETOILES) {
        const dx = x - etoile.x;
        const dy = y - etoile.y;
        const portee = etoile.r * 3;
        if (dx < -portee || dx > portee || dy < -portee || dy > portee) continue;
        const chute = Math.exp(-(dx * dx + dy * dy) / (etoile.r * etoile.r * 2));
        if (chute > 0.02) couleur = melanger(couleur, [235, 240, 255], chute * etoile.a);
      }

      // 4) Caps (barres haute et basse), en or brossé.
      let dansCap = false;
      for (const [cx0, cy0, cx1, cy1] of CAPS) {
        if (x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1) {
          dansCap = true;
          const t = (y - cy0) / (cy1 - cy0);
          couleur = melanger(OR_CLAIR, OR_SOMBRE, Math.abs(t - 0.45) * 1.9);
        }
      }

      // 5) Bulbes : contour or, verre translucide à l'intérieur, sable.
      if (!dansCap) {
        for (const [polygone, estHaut] of [[BULBE_HAUT, true], [BULBE_BAS, false]]) {
          if (!dansPolygone(x, y, polygone)) continue;
          const interieur = dansPolygone(x, y, retrecir(polygone, 0.945));
          if (!interieur) {
            // Le verre : trait lumineux sur le bord gauche, ombre à droite.
            couleur = melanger(OR_SOMBRE, OR_CLAIR, Math.max(0, 1 - Math.abs(x - 0.42) * 6));
            break;
          }
          // Verre.
          couleur = melanger(couleur, VERRE, 0.14);

          // Sable du bulbe haut : il ne reste que près du col.
          const niveauHaut = 0.36;
          if (estHaut && y > niveauHaut) {
            const t = (y - niveauHaut) / (0.487 - niveauHaut);
            couleur = melanger(couleur, SABLE, Math.min(1, 0.35 + t * 0.6));
          }
          // Sable du bulbe bas : le tas monte depuis le fond.
          if (!estHaut) {
            const fond = 0.765;
            const hautDuTas = 0.615 + Math.abs(x - 0.5) * 0.16;   // léger dôme
            if (y > hautDuTas) {
              const t = (fond - y) / (fond - hautDuTas);
              couleur = melanger(SABLE, OR_CLAIR, Math.max(0, Math.min(0.55, t * 0.6)));
            }
          }
          // Filet de sable entre les deux bulbes.
          if (!estHaut && Math.abs(x - 0.5) < 0.006 && y < 0.66) couleur = melanger(couleur, OR_CLAIR, 0.75);
          if (estHaut && Math.abs(x - 0.5) < 0.006 && y > 0.44) couleur = melanger(couleur, OR_CLAIR, 0.75);
          break;
        }
      }

      // 6) Reflet diagonal discret sur tout le badge.
      const reflet = Math.max(0, 1 - Math.abs((x + y) * 0.5 - 0.22) * 7) * 0.07;
      couleur = melanger(couleur, [255, 255, 255], reflet);

      pixels[i] = couleur[0];
      pixels[i + 1] = couleur[1];
      pixels[i + 2] = couleur[2];
      pixels[i + 3] = 255 * couverture;
    }
  }
  return pixels;
}

/**
 * Réduction par moyenne de surface (box filter), en alpha prémultiplié.
 * Accepte n'importe quel rapport de tailles — 2048 → 1024 comme 1024 → 48 ou
 * 1024 → 16 — et chaque pixel de sortie pèse ses pixels sources par la surface
 * réellement couverte : les bords du badge restent nets à 16 px.
 */
function reduire(source, depuis, vers) {
  if (depuis === vers) return source.slice();
  const sortie = new Uint8ClampedArray(vers * vers * 4);
  const echelle = depuis / vers;

  for (let y = 0; y < vers; y++) {
    const y0 = y * echelle;
    const y1 = (y + 1) * echelle;
    const iy0 = Math.floor(y0);
    const iy1 = Math.min(depuis - 1, Math.ceil(y1) - 1);

    for (let x = 0; x < vers; x++) {
      const x0 = x * echelle;
      const x1 = (x + 1) * echelle;
      const ix0 = Math.floor(x0);
      const ix1 = Math.min(depuis - 1, Math.ceil(x1) - 1);

      let sr = 0; let sg = 0; let sb = 0; let sa = 0; let surface = 0;
      for (let sy = iy0; sy <= iy1; sy++) {
        const cy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        if (cy <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx++) {
          const cx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          if (cx <= 0) continue;
          const poids = cx * cy;
          const i = (sy * depuis + sx) * 4;
          const alpha = source[i + 3] / 255;
          sr += source[i] * alpha * poids;
          sg += source[i + 1] * alpha * poids;
          sb += source[i + 2] * alpha * poids;
          sa += alpha * poids;
          surface += poids;
        }
      }
      if (surface <= 0) continue;

      const j = (y * vers + x) * 4;
      const alphaSortie = sa / surface;                 // 0..1
      sortie[j + 3] = Math.round(alphaSortie * 255);
      if (alphaSortie > 0) {
        sortie[j] = Math.round(sr / surface / alphaSortie);
        sortie[j + 1] = Math.round(sg / surface / alphaSortie);
        sortie[j + 2] = Math.round(sb / surface / alphaSortie);
      }
    }
  }
  return sortie;
}

// ---------------------------------------------------------------------------
// Encodage PNG (signature + IHDR + IDAT zlib + IEND, filtre 0 par ligne)
// ---------------------------------------------------------------------------
const TABLE_CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function morceau(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, crc]);
}

export function encoderPng(pixels, taille) {
  const brut = Buffer.alloc((taille * 4 + 1) * taille);
  for (let y = 0; y < taille; y++) {
    brut[y * (taille * 4 + 1)] = 0;                 // filtre « aucun »
    Buffer.from(pixels.buffer, pixels.byteOffset + y * taille * 4, taille * 4)
      .copy(brut, y * (taille * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(taille, 0);
  ihdr.writeUInt32BE(taille, 4);
  ihdr[8] = 8;    // profondeur
  ihdr[9] = 6;    // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Encodage ICO (entrées BMP 32 bits + une entrée PNG 256)
// ---------------------------------------------------------------------------
/** Image BMP/DIB d'une entrée ICO : en-tête (hauteur doublée) + pixels BGRA de
 * bas en haut + masque AND (1 bit, lignes alignées sur 4 octets). */
function bmpPourIco(pixels, taille) {
  const entete = Buffer.alloc(40);
  entete.writeUInt32LE(40, 0);
  entete.writeInt32LE(taille, 4);
  entete.writeInt32LE(taille * 2, 8);      // XOR + AND
  entete.writeUInt16LE(1, 12);
  entete.writeUInt16LE(32, 14);
  entete.writeUInt32LE(0, 16);             // BI_RGB
  entete.writeUInt32LE(taille * taille * 4, 20);

  const xor = Buffer.alloc(taille * taille * 4);
  for (let y = 0; y < taille; y++) {
    const ligneCible = taille - 1 - y;     // BMP : de bas en haut
    for (let x = 0; x < taille; x++) {
      const src = (y * taille + x) * 4;
      const dst = (ligneCible * taille + x) * 4;
      xor[dst] = pixels[src + 2];          // B
      xor[dst + 1] = pixels[src + 1];      // G
      xor[dst + 2] = pixels[src];          // R
      xor[dst + 3] = pixels[src + 3];      // A
    }
  }

  const octetsParLigne = Math.ceil(taille / 32) * 4;
  const and = Buffer.alloc(octetsParLigne * taille);
  for (let y = 0; y < taille; y++) {
    const ligneCible = taille - 1 - y;
    for (let x = 0; x < taille; x++) {
      const alpha = pixels[(y * taille + x) * 4 + 3];
      if (alpha < 128) and[ligneCible * octetsParLigne + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([entete, xor, and]);
}

export function encoderIco(entrees) {
  const entete = Buffer.alloc(6);
  entete.writeUInt16LE(0, 0);
  entete.writeUInt16LE(1, 2);              // type icône
  entete.writeUInt16LE(entrees.length, 4);

  const repertoires = [];
  const images = [];
  let decalage = 6 + entrees.length * 16;
  for (const { taille, donnees } of entrees) {
    const dir = Buffer.alloc(16);
    dir[0] = taille >= 256 ? 0 : taille;   // 0 signifie 256
    dir[1] = taille >= 256 ? 0 : taille;
    dir[2] = 0; dir[3] = 0;
    dir.writeUInt16LE(1, 4);               // plans
    dir.writeUInt16LE(32, 6);              // bits par pixel
    dir.writeUInt32LE(donnees.length, 8);
    dir.writeUInt32LE(decalage, 12);
    repertoires.push(dir);
    images.push(donnees);
    decalage += donnees.length;
  }
  return Buffer.concat([entete, ...repertoires, ...images]);
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------
console.log(`[icône] rendu ${SUPER} × ${SUPER}…`);
const renduSuper = rendre(SUPER);
console.log('[icône] réduction…');
const maitre = reduire(renduSuper, SUPER, BASE);

mkdirSync(SORTIE, { recursive: true });

const png512 = encoderPng(reduire(maitre, BASE, 512), 512);
writeFileSync(join(SORTIE, 'icon.png'), png512);
console.log(`[icône] build/icon.png — ${(png512.length / 1024).toFixed(1)} Ko`);

// PNG 1024 conservé pour les visuels (README, store, réseaux).
const png1024 = encoderPng(maitre, BASE);
writeFileSync(join(SORTIE, 'icon-1024.png'), png1024);
console.log(`[icône] build/icon-1024.png — ${(png1024.length / 1024).toFixed(1)} Ko`);

const entrees = TAILLES_ICO.map((taille) => ({
  taille,
  donnees: bmpPourIco(reduire(maitre, BASE, taille), taille),
}));
entrees.push({
  taille: TAILLE_ICO_PNG,
  donnees: encoderPng(reduire(maitre, BASE, TAILLE_ICO_PNG), TAILLE_ICO_PNG),
});

const ico = encoderIco(entrees);
writeFileSync(join(SORTIE, 'icon.ico'), ico);
console.log(`[icône] build/icon.ico — ${(ico.length / 1024).toFixed(1)} Ko (${entrees.map((e) => e.taille).join(', ')} px)`);
