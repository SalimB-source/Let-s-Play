// Textures procédurales de Vice City Rush : façades fenêtrées, boutiques de
// rez-de-chaussée, bitume, trottoirs, silhouette lointaine, damier d'arrivée,
// panneaux du portique et décalcomanies des voitures. Tout est dessiné sur
// canvas au chargement : aucune image externe.
import * as THREE from 'three';
import { makeCanvasTexture, neonText } from './cityRushBuilder.js';

const FACADE_TILE_PX = { width: 256, height: 288 };
// Un carreau de façade couvre 4 unités de large sur 3 étages.
export const FACADE_TILE = { width: 4, floors: 3 };

function hexToRgba(hex, alpha) {
  const color = new THREE.Color(hex);
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
}

/**
 * Façade répétable : la carte de couleur porte le mur (blanc, teinté par les
 * couleurs de sommet), les encadrements et le verre sombre ; la carte émissive
 * n'allume que les fenêtres éclairées. Trois variantes par ville suffisent,
 * décalées aléatoirement par immeuble.
 */
export function makeFacadeTextures(facade, random, variant = 0) {
  const { width, height } = FACADE_TILE_PX;
  const floors = FACADE_TILE.floors;
  const floorPx = height / floors;
  const style = facade.style;
  const columns = style === 'dense' ? 6 : style === 'haussmann' ? 4 : style === 'deco' ? (variant === 1 ? 3 : 4) : 4;
  const columnPx = width / columns;
  const litRatio = facade.litRatio;
  const litColors = facade.litColors;
  // Plein jour (Vice City) : enduit clair, vitres qui renvoient le ciel au lieu
  // du verre nocturne presque noir. Les autres villes gardent leurs valeurs.
  const wall = facade.wall || '#e9e6e2';
  const glass = facade.glass || '#141a2c';
  const sheen = facade.sheen || 'rgba(120, 150, 200, .16)';
  const frame = facade.frame
    || (style === 'georgian' || style === 'haussmann' ? '#f7f3ea' : style === 'deco' ? '#f8f0f4' : '#2b2c38');
  const cells = [];
  for (let row = 0; row < floors; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lit = random() < litRatio;
      const color = litColors[Math.floor(random() * litColors.length)];
      const dim = 0.72 + random() * 0.28;
      cells.push({ row, column, lit, color, dim, blind: random() < 0.18 });
    }
  }

  const windowRect = (row, column) => {
    const x = column * columnPx;
    const y = row * floorPx;
    if (style === 'haussmann') return [x + columnPx * 0.24, y + floorPx * 0.14, columnPx * 0.52, floorPx * 0.7];
    if (style === 'dense') return [x + columnPx * 0.18, y + floorPx * 0.22, columnPx * 0.64, floorPx * 0.5];
    if (style === 'georgian') return [x + columnPx * 0.26, y + floorPx * 0.16, columnPx * 0.48, floorPx * 0.62];
    if (style === 'deco') return [x + columnPx * 0.2, y + floorPx * 0.2, columnPx * 0.6, floorPx * 0.5];
    return [x + columnPx * 0.22, y + floorPx * 0.18, columnPx * 0.56, floorPx * 0.56];
  };

  const map = makeCanvasTexture((ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, width, height);
    // Texture de mur : briques, pierre de taille ou enduit lisse selon le style.
    if (style === 'brick' || style === 'georgian') {
      ctx.strokeStyle = 'rgba(80, 50, 40, .22)';
      ctx.lineWidth = 1.5;
      for (let y = 0; y < height; y += 9) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let y = 0; y < height; y += 18) {
        for (let x = (y / 18) % 2 ? 0 : 11; x < width; x += 22) ctx.fillRect(x, y, 10, 8);
      }
    } else if (style === 'haussmann') {
      ctx.strokeStyle = 'rgba(90, 75, 60, .2)';
      ctx.lineWidth = 2;
      for (let y = 0; y < height; y += floorPx / 3) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
    } else if (style === 'deco') {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      for (let column = 0; column < columns; column += 1) ctx.fillRect(column * columnPx + columnPx * 0.06, 0, 6, height);
    } else if (style === 'dense') {
      ctx.fillStyle = 'rgba(40, 40, 60, .12)';
      for (let x = 0; x < width; x += 14) ctx.fillRect(x, 0, 2, height);
    }
    // Bandeaux d'étage.
    ctx.fillStyle = style === 'haussmann' ? 'rgba(60, 50, 45, .4)' : 'rgba(40, 40, 55, .35)';
    for (let row = 0; row <= floors; row += 1) ctx.fillRect(0, row * floorPx - 2, width, style === 'haussmann' ? 5 : 3);

    for (const cell of cells) {
      const [x, y, w, h] = windowRect(cell.row, cell.column);
      // Encadrement.
      ctx.fillStyle = frame;
      ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
      // Vitre.
      if (cell.lit) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = `rgba(0,0,0,${0.22 - cell.dim * 0.14})`;
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.fillStyle = glass;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = sheen;
        ctx.fillRect(x, y, w * 0.4, h);
      }
      if (cell.blind) {
        ctx.fillStyle = 'rgba(20, 22, 36, .55)';
        ctx.fillRect(x, y, w, h * 0.45);
      }
      // Croisillons.
      ctx.fillStyle = style === 'dense' ? 'rgba(20,22,36,.6)' : 'rgba(240,240,240,.55)';
      if (style === 'georgian' || style === 'haussmann' || style === 'brick') {
        ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
        ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
      } else if (style === 'deco') {
        ctx.fillRect(x, y + h * 0.33, w, 2);
        ctx.fillRect(x, y + h * 0.66, w, 2);
      }
      // Balcons parisiens, appuis de fenêtre et climatiseurs new-yorkais.
      if (style === 'haussmann' && (cell.row === 1 || (cell.row === 2 && variant === 2))) {
        ctx.fillStyle = '#2a2730';
        ctx.fillRect(x - 10, y + h - 2, w + 20, 4);
        for (let bar = x - 8; bar <= x + w + 8; bar += 7) ctx.fillRect(bar, y + h * 0.55, 2, h * 0.45);
      } else if (style === 'deco') {
        ctx.fillStyle = '#f2e6ea';
        ctx.fillRect(x - 8, y - 9, w + 16, 4);
      } else if (style === 'brick' && random() < 0.25) {
        ctx.fillStyle = '#9ea4ad';
        ctx.fillRect(x + w * 0.55, y + h * 0.55, w * 0.4, h * 0.42);
      } else if (style === 'georgian') {
        ctx.fillStyle = '#f0ebe0';
        ctx.fillRect(x - 7, y + h + 4, w + 14, 4);
      }
    }
  }, width, height, { smooth: true, repeat: true });

  const emissiveMap = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    for (const cell of cells) {
      if (!cell.lit) continue;
      const [x, y, w, h] = windowRect(cell.row, cell.column);
      ctx.fillStyle = cell.color;
      ctx.globalAlpha = cell.dim;
      ctx.fillRect(x, y, w, cell.blind ? h * 0.55 : h);
      ctx.globalAlpha = 1;
      if (cell.blind) {
        ctx.fillStyle = hexToRgba(cell.color, 0.35);
        ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
      }
    }
  }, width, height, { smooth: true, repeat: true });
  return { map, emissiveMap };
}

/**
 * Rez-de-chaussée commerçants : quatre devantures par ville, chacune large de
 * 4 unités (vitrine éclairée, porte, store, enseigne).
 */
export function makeShopAtlas(theme) {
  const cell = 256;
  const height = 128;
  const shops = theme.shops;
  // Devantures sombres la nuit, murs de stuc clair en plein jour (Vice City).
  const wallColor = theme.shopWall || '#2a2a3a';
  const trimColor = theme.shopTrim || '#1b1c28';
  const doorColor = theme.shopDoor || '#121420';
  const texture = makeCanvasTexture((ctx) => {
    shops.forEach((shop, index) => {
      const x0 = index * cell;
      // Mur et plinthe.
      ctx.fillStyle = wallColor;
      ctx.fillRect(x0, 0, cell, height);
      ctx.fillStyle = trimColor;
      ctx.fillRect(x0, height - 10, cell, 10);
      // Vitrine éclairée.
      ctx.fillStyle = hexToRgba(shop.color, 0.22);
      ctx.fillRect(x0 + 14, 44, 150, 72);
      ctx.fillStyle = hexToRgba(shop.color, 0.55);
      ctx.fillRect(x0 + 18, 48, 142, 64);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x0 + 18, 48, 40, 64);
      // Objets en vitrine.
      ctx.fillStyle = 'rgba(15, 18, 32, .75)';
      for (let item = 0; item < 4; item += 1) ctx.fillRect(x0 + 30 + item * 32, 82 + (item % 2) * 8, 18, 22 - (item % 2) * 8);
      // Porte.
      ctx.fillStyle = doorColor;
      ctx.fillRect(x0 + 180, 50, 56, 68);
      ctx.fillStyle = hexToRgba(shop.color, 0.5);
      ctx.fillRect(x0 + 186, 56, 44, 40);
      ctx.fillStyle = '#d8d8e0';
      ctx.fillRect(x0 + 222, 88, 6, 6);
      // Store rayé.
      ctx.fillStyle = shop.awning;
      ctx.fillRect(x0 + 6, 30, 166, 16);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let stripe = x0 + 12; stripe < x0 + 172; stripe += 20) ctx.fillRect(stripe, 30, 8, 16);
      // Bandeau d'enseigne.
      ctx.fillStyle = '#0c0f1c';
      ctx.fillRect(x0 + 4, 4, cell - 8, 26);
      const size = Math.min(19, 300 / Math.max(5, shop.text.length));
      neonText(ctx, shop.text, x0 + cell / 2, 18, `900 ${size}px "Orbitron", Arial, sans-serif`, shop.color, 10);
    });
  }, cell * shops.length, height, { smooth: true });
  return { texture, count: shops.length };
}

export function makeRoadTexture(theme, random) {
  // Un carreau = 13.4 unités de large sur 26.8 de long, répété le long de la route.
  const width = 512;
  const height = 1024;
  const base = new THREE.Color(theme.roadTint);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    // Grain du bitume.
    for (let index = 0; index < 2600; index += 1) {
      const shade = 0.55 + random() * 0.9;
      ctx.fillStyle = `rgba(${Math.round(base.r * 255 * shade + 18)}, ${Math.round(base.g * 255 * shade + 18)}, ${Math.round(base.b * 255 * shade + 22)}, ${0.18 + random() * 0.25})`;
      ctx.fillRect(random() * width, random() * height, 2 + random() * 5, 2 + random() * 5);
    }
    // Traces de pneus sur les voies.
    ctx.fillStyle = 'rgba(0, 0, 0, .14)';
    for (const laneCenter of [-3.15, -1.05, 1.05, 3.15]) {
      const px = width / 2 + (laneCenter / 13.4) * width;
      ctx.fillRect(px - 26, 0, 14, height);
      ctx.fillRect(px + 12, 0, 14, height);
    }
    // Lignes de séparation discontinues et bandes de rive.
    const dashLength = height / 8;
    ctx.fillStyle = theme.laneColor;
    for (const separator of [-2.1, 0, 2.1]) {
      const px = width / 2 + (separator / 13.4) * width;
      for (let y = 0; y < height; y += dashLength) ctx.fillRect(px - 2, y + dashLength * 0.12, 4, dashLength * 0.4);
    }
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillRect(width * 0.012, 0, 4, height);
    ctx.fillRect(width * 0.988 - 4, 0, 4, height);
    // Flèches de voie au sol, une par carreau.
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    for (const laneCenter of [-3.15, -1.05, 1.05, 3.15]) {
      const px = width / 2 + (laneCenter / 13.4) * width;
      ctx.beginPath();
      ctx.moveTo(px, 120);
      ctx.lineTo(px + 14, 170);
      ctx.lineTo(px + 5, 170);
      ctx.lineTo(px + 5, 230);
      ctx.lineTo(px - 5, 230);
      ctx.lineTo(px - 5, 170);
      ctx.lineTo(px - 14, 170);
      ctx.closePath();
      ctx.fill();
    }
  }, width, height, { smooth: true, repeat: true, anisotropy: 8 });
}

export function makeSidewalkTexture(theme, random) {
  const width = 128;
  const height = 512;
  const base = new THREE.Color(theme.sidewalkTint);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(width / 2 + 0.5, 0);
    ctx.lineTo(width / 2 + 0.5, height);
    ctx.stroke();
    for (let index = 0; index < 400; index += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + random() * 0.06})`;
      ctx.fillRect(random() * width, random() * height, 2 + random() * 4, 2 + random() * 4);
    }
  }, width, height, { smooth: true, repeat: true });
}

/**
 * Silhouette lointaine de la ville, peinte avec ses monuments signature :
 * un seul plan au fond du décor, derrière la rangée d'immeubles 3D.
 */
export function makeSkylineTexture(city, theme, random) {
  const width = 2048;
  const height = 512;
  const style = city.style;
  // Silhouette presque noire et fenêtres allumées la nuit ; en plein jour
  // (Vice City) les tours lointaines virent au pastel bleuté de la brume marine.
  const skyline = theme.skyline || {};
  const base = skyline.base || [12, 14, 34];
  const dayWindow = skyline.window;
  const clamp255 = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return makeCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, width, height);
    const horizon = height - 40;
    const silhouette = (shade) => `rgba(${clamp255(base[0] + shade)}, ${clamp255(base[1] + shade)}, ${clamp255(base[2] + shade)}, 1)`;
    const windows = (x, y, w, h, density, color) => {
      ctx.fillStyle = color;
      for (let wy = y + 8; wy < y + h - 6; wy += 11) {
        for (let wx = x + 5; wx < x + w - 5; wx += 9) {
          if (random() < density) ctx.fillRect(wx, wy, 4, 6);
        }
      }
    };
    const tower = (x, w, h, shade, options = {}) => {
      ctx.fillStyle = silhouette(shade);
      ctx.fillRect(x, horizon - h, w, h);
      if (options.spire) {
        ctx.beginPath();
        ctx.moveTo(x, horizon - h);
        ctx.lineTo(x + w / 2, horizon - h - options.spire);
        ctx.lineTo(x + w, horizon - h);
        ctx.closePath();
        ctx.fill();
      }
      if (options.crown) {
        ctx.fillStyle = options.crown;
        ctx.shadowColor = options.crown;
        ctx.shadowBlur = 14;
        ctx.fillRect(x + 2, horizon - h - 4, w - 4, 4);
        ctx.shadowBlur = 0;
      }
      windows(x, horizon - h, w, h, options.density ?? 0.3, options.windowColor || dayWindow || 'rgba(255, 220, 160, .55)');
    };

    // Rangée de fond, plus basse et plus sombre.
    for (let x = -20; x < width; x += 30 + random() * 40) {
      const h = (style === 'new-york' ? 150 : style === 'tokyo' ? 120 : style === 'paris' ? 55 : 80) + random() * (style === 'paris' || style === 'london' ? 45 : 140);
      tower(x, 24 + random() * 48, h, 4, { density: dayWindow ? 0.1 : 0.16, windowColor: dayWindow || 'rgba(255, 215, 160, .3)' });
    }
    // Rangée avant avec les monuments.
    const accent = city.accent;
    const secondary = city.secondary;
    for (let x = -10; x < width; x += 46 + random() * 70) {
      const h = (style === 'new-york' ? 190 : style === 'tokyo' ? 150 : style === 'paris' ? 70 : style === 'london' ? 90 : 120) + random() * (style === 'paris' ? 40 : style === 'london' ? 70 : 170);
      const w = 30 + random() * 60;
      const topGlow = random() < 0.35 ? (random() < 0.5 ? accent : secondary) : null;
      tower(x, w, h, 12, { density: dayWindow ? 0.18 : 0.32, crown: topGlow, spire: style === 'new-york' && random() < 0.3 ? 40 + random() * 50 : 0 });
    }

    ctx.fillStyle = silhouette(18);
    if (style === 'vice') {
      // Tours art déco à sommet néon et palmiers.
      for (const x of [420, 1180, 1660]) {
        tower(x, 70, 300, 18, { density: dayWindow ? 0.16 : 0.3, crown: accent });
        tower(x + 18, 34, 360, 22, { density: dayWindow ? 0.16 : 0.3, crown: secondary });
        ctx.fillStyle = silhouette(22);
        ctx.fillRect(x + 31, horizon - 420, 8, 60);
      }
      for (let x = 60; x < width; x += 140 + random() * 160) {
        ctx.strokeStyle = silhouette(10);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.quadraticCurveTo(x + 10, horizon - 60, x + 24, horizon - 90);
        ctx.stroke();
        for (let frond = 0; frond < 6; frond += 1) {
          const angle = -Math.PI / 2 + (frond - 2.5) * 0.45;
          ctx.beginPath();
          ctx.moveTo(x + 24, horizon - 90);
          ctx.lineTo(x + 24 + Math.cos(angle) * 44, horizon - 90 + Math.sin(angle) * 44 + 18);
          ctx.stroke();
        }
      }
    } else if (style === 'new-york') {
      tower(880, 70, 330, 20, { density: 0.4, spire: 90, crown: '#ffd27a' });
      tower(905, 20, 410, 24, { density: 0 });
      tower(1420, 56, 300, 20, { density: 0.42, spire: 70, crown: secondary });
      for (const x of [300, 1700]) tower(x, 90, 250, 16, { density: 0.4 });
    } else if (style === 'tokyo') {
      // Tokyo Tower rouge et Skytree.
      ctx.fillStyle = '#d9412f';
      ctx.beginPath();
      ctx.moveTo(1060, horizon);
      ctx.lineTo(1100, horizon - 330);
      ctx.lineTo(1110, horizon - 330);
      ctx.lineTo(1150, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4f0ea';
      for (const y of [80, 170]) ctx.fillRect(1082 + (y - 80) * 0.05, horizon - y - 60, 48 - (y - 80) * 0.1, 10);
      ctx.fillStyle = '#d9412f';
      ctx.fillRect(1102, horizon - 400, 6, 70);
      tower(380, 36, 420, 22, { density: 0.08, crown: secondary });
      tower(372, 52, 180, 20, { density: 0.1 });
      ctx.fillStyle = secondary;
      ctx.shadowColor = secondary;
      ctx.shadowBlur = 20;
      ctx.fillRect(390, horizon - 330, 16, 6);
      ctx.shadowBlur = 0;
    } else if (style === 'paris') {
      // Tour Eiffel, dôme du Sacré-Cœur et tour Montparnasse.
      const ex = 900;
      ctx.fillStyle = '#2a2436';
      ctx.beginPath();
      ctx.moveTo(ex - 90, horizon);
      ctx.lineTo(ex - 30, horizon - 180);
      ctx.lineTo(ex - 10, horizon - 380);
      ctx.lineTo(ex + 10, horizon - 380);
      ctx.lineTo(ex + 30, horizon - 180);
      ctx.lineTo(ex + 90, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(ex - 60, horizon - 130, 120, 10);
      ctx.fillRect(ex - 36, horizon - 230, 72, 8);
      ctx.fillRect(ex - 3, horizon - 420, 6, 44);
      ctx.fillStyle = 'rgba(255, 214, 150, .75)';
      ctx.shadowColor = '#ffd27a';
      ctx.shadowBlur = 14;
      for (let y = 20; y < 380; y += 22) {
        const halfWidth = 8 + (380 - y) * 0.2;
        ctx.fillRect(ex - halfWidth, horizon - y, 3, 3);
        ctx.fillRect(ex + halfWidth, horizon - y, 3, 3);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = silhouette(20);
      ctx.beginPath();
      ctx.arc(1500, horizon - 90, 60, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(1440, horizon - 90, 120, 90);
      ctx.fillRect(1494, horizon - 170, 12, 30);
      tower(330, 60, 240, 14, { density: 0.3 });
    } else if (style === 'london') {
      // Big Ben, London Eye, Shard et Gherkin.
      tower(560, 40, 300, 18, { density: 0.1, spire: 60 });
      ctx.fillStyle = '#ffe7b0';
      ctx.shadowColor = '#ffd98d';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(580, horizon - 250, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(112, 203, 209, .8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(1320, horizon - 150, 130, 0, Math.PI * 2);
      ctx.stroke();
      for (let spoke = 0; spoke < 16; spoke += 1) {
        const angle = (spoke / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(1320, horizon - 150);
        ctx.lineTo(1320 + Math.cos(angle) * 130, horizon - 150 + Math.sin(angle) * 130);
        ctx.stroke();
      }
      ctx.fillStyle = silhouette(16);
      ctx.beginPath();
      ctx.moveTo(1700, horizon);
      ctx.lineTo(1735, horizon - 400);
      ctx.lineTo(1770, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(260, horizon - 120, 34, 130, 0, 0, Math.PI * 2);
      ctx.fill();
      windows(230, horizon - 240, 60, 200, 0.25, 'rgba(112, 203, 209, .5)');
    }
    // Brume de sol lumineuse.
    const haze = ctx.createLinearGradient(0, horizon - 120, 0, height);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(1, hexToRgba(theme.sky.haze, 0.28));
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 120, width, 160);
  }, width, height, { smooth: true });
}

export function makeCheckerTexture(columns = 24, rows = 4) {
  return makeCanvasTexture((ctx, width, height) => {
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        ctx.fillStyle = (row + column) % 2 ? '#f6f6f2' : '#101420';
        ctx.fillRect(column * cellWidth, row * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }
  }, 768, 128, { smooth: true });
}

export function makeGantrySignTexture(city, theme) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0a0d1c';
    ctx.fillRect(0, 0, width, height);
    const cell = 32;
    for (let column = 0; column < width / cell; column += 1) {
      for (let row = 0; row < 2; row += 1) {
        ctx.fillStyle = (row + column) % 2 ? '#f3f3ef' : '#0a0d1c';
        ctx.fillRect(column * cell, row * cell, cell, cell);
        ctx.fillRect(column * cell, height - (row + 1) * cell, cell, cell);
      }
    }
    ctx.fillStyle = city.accent;
    ctx.fillRect(0, cell * 2, width, 6);
    ctx.fillRect(0, height - cell * 2 - 6, width, 6);
    neonText(ctx, 'DÉPART · ARRIVÉE', width / 2, height * 0.42, '900 92px "Orbitron", Arial, sans-serif', city.accent, 26);
    neonText(ctx, `${city.name} · ${theme.gantryText}`, width / 2, height * 0.68, '800 44px "Orbitron", Arial, sans-serif', city.secondary, 14);
  }, 1536, 320, { smooth: true });
}

export function makeStartGroundTexture(text = 'DÉPART') {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '900 150px "Orbitron", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.fillText(text, width / 2, height / 2 + 6);
  }, 1024, 200, { smooth: true });
}

/**
 * Tableau de tour du portique : redessiné quand le tour change (3 fois par
 * course), donc le coût d'un canvas dynamique est négligeable.
 */
export function makeLapBoard(city) {
  const texture = makeCanvasTexture(() => {}, 512, 160, { smooth: true });
  const canvas = texture.userData.canvas;
  const ctx = canvas.getContext('2d');
  const draw = (title, subtitle, accent = city.accent) => {
    if (!ctx) return;
    ctx.fillStyle = '#07091a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    neonText(ctx, title, canvas.width / 2, 62, '900 72px "Orbitron", Arial, sans-serif', accent, 20);
    if (subtitle) neonText(ctx, subtitle, canvas.width / 2, 124, '800 30px "Orbitron", Arial, sans-serif', '#fff3cc', 8);
    texture.needsUpdate = true;
  };
  return { texture, draw };
}

export function makeCarPlateTexture(profile, number) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#f6f3ea';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = profile.accent;
    ctx.fillRect(0, 0, width, 14);
    ctx.font = '900 70px "Orbitron", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111522';
    ctx.fillText(`${String(number).padStart(2, '0')}`, width * 0.24, height * 0.58);
    ctx.font = '800 30px "Orbitron", Arial, sans-serif';
    ctx.fillText(profile.name.split(' ')[0], width * 0.66, height * 0.58);
  }, 256, 112, { smooth: true });
}

export function makeRacingNumberTexture(profile, number) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f6f0';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = profile.accent;
    ctx.stroke();
    ctx.font = '900 110px "Orbitron", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#121626';
    ctx.fillText(String(number), width / 2, height / 2 + 6);
  }, 192, 192, { smooth: true });
}

export function makeTrafficDecalAtlas() {
  // 4 cases : POLICE, AMBULANCE, croix rouge, sigle de la voirie.
  const cell = 256;
  const height = 96;
  const texture = makeCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, cell * 4, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 54px "Orbitron", Arial, sans-serif';
    ctx.fillStyle = '#142947';
    ctx.fillText('POLICE', cell * 0.5, height / 2 + 2);
    ctx.fillStyle = '#e64a50';
    ctx.font = '900 40px "Orbitron", Arial, sans-serif';
    ctx.fillText('AMBULANCE', cell * 1.5, height / 2 + 2);
    ctx.fillStyle = '#e64a50';
    ctx.fillRect(cell * 2.5 - 14, 12, 28, 72);
    ctx.fillRect(cell * 2.5 - 36, 34, 72, 28);
    ctx.fillStyle = '#f5e6a3';
    ctx.font = '900 34px "Orbitron", Arial, sans-serif';
    ctx.fillText('CITY WASTE', cell * 3.5, height / 2 + 2);
  }, cell * 4, height, { smooth: true });
  const uv = (index) => [index / 4 + 0.004, 0.02, (index + 1) / 4 - 0.004, 0.98];
  return { texture, uv };
}

export function makePickupMaterial(type, color) {
  const texture = makeCanvasTexture((ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.fillStyle = `${color}2a`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 69, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'cash') {
      ctx.fillStyle = color;
      ctx.fillRect(31, 44, 194, 104);
      ctx.strokeStyle = '#f3fff7';
      ctx.lineWidth = 5;
      ctx.strokeRect(42, 55, 172, 82);
      ctx.beginPath();
      ctx.arc(128, 96, 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f3fff7';
      ctx.font = '900 53px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 128, 97);
    } else if (type === 'oil') {
      ctx.beginPath();
      ctx.moveTo(75, 149);
      ctx.lineTo(151, 72);
      ctx.lineTo(171, 91);
      ctx.lineTo(95, 169);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(144, 55);
      ctx.arc(177, 49, 31, Math.PI * 0.78, Math.PI * 1.85, true);
      ctx.lineTo(185, 64);
      ctx.lineTo(165, 83);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(177, 49, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(83, 158, 17, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'pistol') {
      ctx.beginPath();
      ctx.moveTo(49, 70);
      ctx.lineTo(183, 70);
      ctx.lineTo(205, 88);
      ctx.lineTo(175, 105);
      ctx.lineTo(132, 105);
      ctx.lineTo(124, 148);
      ctx.lineTo(93, 148);
      ctx.lineTo(96, 105);
      ctx.lineTo(54, 105);
      ctx.closePath();
      ctx.fill();
      ctx.clearRect(151, 74, 37, 12);
      ctx.fillStyle = color;
      ctx.fillRect(162, 75, 44, 8);
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(96, 51);
      ctx.lineTo(112, 24);
      ctx.lineTo(149, 24);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(74, 48, 108, 129, 16);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(93, 70, 70, 39);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 138, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(158, 120, 9, 36);
    }
  }, 256, 256);
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}

export function makeSmokeTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 4, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,.9)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, 64, 64, { smooth: true });
}
