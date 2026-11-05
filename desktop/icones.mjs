/**
 * Dessins des icônes — `desktop/icones.mjs`
 * -----------------------------------------
 * Les deux visuels de la maison, dessinés pixel par pixel en JavaScript pur :
 *
 *   - `rendre`        → Le Sablier de Bab El (nuit étoilée, sablier d'or) ;
 *   - `rendreViceCity`→ Vice City Rush (coucher de soleil 1986, palmiers, route).
 *
 * **Aucune dépendance, aucun effet de bord à l'import** : ce module ne dessine
 * que ce qu'on lui demande. C'est ce qui permet de le réutiliser ailleurs —
 * `desktop/make-icon.mjs` pour les `.ico`/`.png` du PC, et
 * `scripts/android-icons.mjs` pour les `mipmap-*` des APK.
 *
 * Les dessins sont rendus en grand (2048 × 2048) puis réduits par moyenne de
 * surface : c'est ce qui donne des bords nets à 16 pixels sans tracer de
 * courbes de Bézier.
 */

import { deflateSync } from 'node:zlib';

/** Taille du rendu maître, commune aux deux dessins. */
export const SUPER = 2048;
/** Taille maîtresse après réduction (source des déclinaisons). */
export const BASE = 1024;


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

export function rendre(taille) {
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
export function reduire(source, depuis, vers) {
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
// Vice City Rush — coucher de soleil 1986, palmier, route vers l'horizon
// ---------------------------------------------------------------------------
/**
 * La palette, choisie pour rester lisible à **16 pixels** : un ciel magenta
 * chaud, un soleil crème, une route sombre qui tranche. Les détails fins (les
 * stries du soleil, les palmes) disparaissent à cette taille — c'est voulu :
 * l'icône doit d'abord se reconnaître comme « coucher de soleil + route ».
 */
const VC_CIEL_HAUT = hex('#2a1046');
const VC_CIEL_MILIEU = hex('#a3246b');
const VC_CIEL_BAS = hex('#ff8a4c');
const VC_SOLEIL = hex('#ffe6a8');
const VC_SOLEIL_BAS = hex('#ff5f8d');
const VC_ROUTE = hex('#241a33');
const VC_BORD = hex('#ffd9a0');
const VC_PALME = hex('#170f22');

/** Disque du soleil : position, rayon, et la coupure des stries horizontales. */
const VC_SOLEIL_CENTRE = [0.5, 0.455];
const VC_SOLEIL_RAYON = 0.205;

export function rendreViceCity(taille) {
  const pixels = new Uint8ClampedArray(taille * taille * 4);
  const inset = 0.018 * taille;
  const rayon = 0.185 * taille;
  const badge = { x0: inset, y0: inset, x1: taille - inset, y1: taille - inset, r: rayon };
  const horizon = 0.605;
  const [sx, sy] = VC_SOLEIL_CENTRE;

  for (let py = 0; py < taille; py++) {
    const y = py / taille;
    for (let px = 0; px < taille; px++) {
      const x = px / taille;
      const i = (py * taille + px) * 4;

      // 1) Badge arrondi, lissé d'un pixel sur le bord.
      const d = distanceRectangleArrondi(px, py, badge);
      const couverture = Math.min(1, Math.max(0, 0.5 - d));
      if (couverture <= 0) continue;

      // 2) Ciel : trois bandes fondues, du violet de nuit au orange de braise.
      let couleur;
      if (y < 0.42) couleur = melanger(VC_CIEL_HAUT, VC_CIEL_MILIEU, Math.min(1, y / 0.42));
      else couleur = melanger(VC_CIEL_MILIEU, VC_CIEL_BAS, Math.min(1, (y - 0.42) / (horizon - 0.42)));

      // 3) Halo chaud autour du soleil, avant le disque.
      const distanceSoleil = Math.hypot(x - sx, y - sy);
      const halo = Math.exp(-((distanceSoleil / 0.34) ** 2));
      couleur = melanger(couleur, VC_SOLEIL_BAS, halo * 0.35);

      // 4) Le disque, avec ses stries horizontales (l'imagerie des années 80) :
      //    des bandes de plus en plus larges vers le bas, qui laissent voir le
      //    ciel. Sous l'horizon, le soleil est mangé par la route.
      if (distanceSoleil < VC_SOLEIL_RAYON && y < horizon) {
        const depuisHaut = (y - (sy - VC_SOLEIL_RAYON)) / (2 * VC_SOLEIL_RAYON);
        const stripe = depuisHaut * 9 - Math.floor(depuisHaut * 9);
        const largeurStrie = 0.06 + depuisHaut * 0.34;
        const trou = depuisHaut > 0.45 && stripe < largeurStrie;
        if (!trou) {
          couleur = melanger(VC_SOLEIL_BAS, VC_SOLEIL, Math.min(1, Math.max(0, (y - sy) / VC_SOLEIL_RAYON * 0.5 + 0.6)));
        }
      }

      // 5) Sol et route : la bande sombre sous l'horizon, en trapèze qui
      //    s'ouvre vers le bas — la perspective d'une avenue qui fuit.
      if (y >= horizon) {
        const t = (y - horizon) / (1 - horizon);           // 0 en haut, 1 en bas
        const demiLargeur = 0.055 + t * 0.62;
        const dansRoute = Math.abs(x - 0.5) < demiLargeur;
        const couleurSol = melanger(hex('#1a1030'), VC_ROUTE, Math.min(1, t * 0.8));
        couleur = couleurSol;
        if (dansRoute) {
          // Asphalte : un peu plus sombre au centre de la chaussée.
          couleur = melanger(VC_ROUTE, hex('#120c1e'), 0.55);
          // Ligne médiane discontinue, plus serrée vers l'horizon.
          const segments = 6;
          const phase = (t * segments) % 1;
          if (Math.abs(x - 0.5) < 0.012 + t * 0.02 && phase < 0.55) {
            couleur = melanger(couleur, VC_BORD, 0.85);
          }
          // Bords de la route, éclairés par le couchant.
          if (Math.abs(Math.abs(x - 0.5) - demiLargeur) < 0.012) {
            couleur = melanger(couleur, VC_BORD, 0.55 * t);
          }
        }
      }

      // 6) Deux palmiers, silhouettes à gauche et à droite : tronc courbé et
      //    palmes en éventail. Assez gros pour survivre à la réduction.
      for (const [baseX, hauteur, sens] of [[0.235, 0.235, 1], [0.775, 0.205, -1]]) {
        const baseY = horizon + 0.03;
        const t = (baseY - y) / hauteur;
        if (t >= 0 && t <= 1.15) {
          // Tronc : courbe douce, large à la base, fin au sommet.
          const tt = Math.min(1, t);
          const courbure = baseX + sens * 0.055 * tt * tt;
          const epaisseur = 0.028 * (1 - tt * 0.5);
          if (t <= 1 && Math.abs(x - courbure) < epaisseur) couleur = VC_PALME;

          // Palmes : huit feuilles qui partent du sommet puis **retombent**.
          // Une palme se dessine comme un arc : elle monte d'abord, s'incline,
          // et son bout descend sous le sommet — sans quoi elle ressemble à
          // une antenne (la première version avait ce défaut).
          const sommetX = baseX + sens * 0.055;
          const sommetY = baseY - hauteur;
          for (let k = 0; k < 8; k++) {
            const ouverture = (k - 3.5) / 3.5;                 // -1 … 1
            const portee = 0.155 - Math.abs(ouverture) * 0.035;
            const montee = 0.085;
            // Pas très fin (0,006) : le trait doit être **continu**. À 0,04, les
            // pastilles ne se touchaient plus après réduction et la palme
            // ressemblait à un collier de perles (vu sur la première version).
            for (let pas = 0.02; pas <= 1; pas += 0.006) {
              // Arc : la feuille s'écarte en montant, puis plonge.
              const fx = sommetX + ouverture * portee * pas + sens * 0.02 * pas;
              const fy = sommetY - Math.sin(pas * Math.PI * 0.85) * montee + pas * pas * 0.115;
              const epaisseurFeuille = 0.022 * (1 - pas * 0.62);
              if (Math.hypot(x - fx, y - fy) < epaisseurFeuille) { couleur = VC_PALME; break; }
            }
          }
        }
      }

      // 7) Reflet diagonal discret, comme sur l'icône du Sablier.
      const reflet = Math.max(0, 1 - Math.abs((x + y) * 0.5 - 0.22) * 7) * 0.06;
      couleur = melanger(couleur, [255, 255, 255], reflet);

      pixels[i] = couleur[0];
      pixels[i + 1] = couleur[1];
      pixels[i + 2] = couleur[2];
      pixels[i + 3] = 255 * couverture;
    }
  }
  return pixels;
}
