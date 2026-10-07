// Textures procédurales de Vice City Rush : façades fenêtrées, boutiques de
// rez-de-chaussée, bitume, trottoirs, silhouette lointaine, damier d'arrivée,
// panneaux du portique et décalcomanies des voitures. Tout est dessiné sur
// canvas au chargement : aucune image externe.
import * as THREE from 'three';
import { CITY_RUSH_LANE_X, CITY_RUSH_ROAD_WIDTH } from './cityRushRules.js';
import { makeCanvasTexture, neonText } from './cityRushBuilder.js';
import { cityRushThemeDriveSide } from './cityRushThemes.js';

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
  const columns = style === 'dense' ? 6 : style === 'haussmann' ? 4 : style === 'deco' ? (variant === 1 ? 3 : 4) : style === 'adobe' ? 3 : 4;
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
    if (style === 'adobe') return [x + columnPx * 0.3, y + floorPx * 0.2, columnPx * 0.4, floorPx * 0.55];
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
    } else if (style === 'adobe') {
      // Enduit d'adobe bosselé : quelques taches ocres plus sombres et un
      // chaulage irrégulier suggèrent les murs en torchis des ranchos.
      ctx.fillStyle = 'rgba(120, 80, 50, .14)';
      for (let y = 0; y < height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        for (let x = 0; x <= width; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.05 + y * 0.1) * 3);
        ctx.strokeStyle = 'rgba(120, 80, 50, .12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 240, 210, .08)';
      for (let i = 0; i < 40; i += 1) ctx.fillRect(random() * width, random() * height, 8 + random() * 20, 4 + random() * 8);
    }
    // Bandeaux d'étage.
    ctx.fillStyle = style === 'haussmann' ? 'rgba(60, 50, 45, .4)' : style === 'adobe' ? 'rgba(120, 75, 45, .3)' : 'rgba(40, 40, 55, .35)';
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
  // Le carreau garde la largeur réelle de la chaussée et se répète en longueur.
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
    const laneToPixel = (laneX) => width / 2 + (laneX / CITY_RUSH_ROAD_WIDTH) * width;
    // Traces de pneus dans les six voies.
    ctx.fillStyle = 'rgba(0, 0, 0, .14)';
    for (const laneCenter of CITY_RUSH_LANE_X) {
      const px = laneToPixel(laneCenter);
      ctx.fillRect(px - 26, 0, 14, height);
      ctx.fillRect(px + 12, 0, 14, height);
    }
    // Séparations discontinues dans chaque sens ; la ligne jaune continue
    // au milieu distingue les trois voies venant en face.
    const dashLength = height / 8;
    ctx.fillStyle = theme.laneColor;
    const separators = CITY_RUSH_LANE_X.slice(1)
      .map((laneCenter, index) => (CITY_RUSH_LANE_X[index] + laneCenter) / 2)
      .filter((separator) => Math.abs(separator) > 1e-9);
    // La simulation conserve ses voies de dépassement, mais l'habillage de la
    // Mother Road (Route 66) et des routes de campagne mexicaines ne dessine
    // que la ligne centrale : une route rurale ne ressemble pas à une
    // autoroute urbaine à six couloirs.
    const ruralRoad = Boolean(theme.route66 || theme.countryside);
    if (!ruralRoad) {
      for (const separator of separators) {
        const px = laneToPixel(separator);
        for (let y = 0; y < height; y += dashLength) ctx.fillRect(px - 2, y + dashLength * 0.12, 4, dashLength * 0.4);
      }
    }
    ctx.fillStyle = theme.centerLineColor || '#f5b81e';
    ctx.fillRect(width / 2 - 4, 0, 8, height);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillRect(width * 0.012, 0, 4, height);
    ctx.fillRect(width * 0.988 - 4, 0, 4, height);
    // Flèches de voie au sol, une par carreau. Le carreau se répète en
    // longueur et le ruban défile vers le joueur : le **haut** du dessin est
    // donc le sens de la course (voir `makeCanvasTexture` : le canvas est
    // retourné à l'upload, v = 1 en haut, et le ruban avance avec v). Une
    // flèche de voie de course pointe vers le haut ; une flèche de contresens
    // pointe vers le bas, c'est-à-dire vers le joueur. Le côté du contresens
    // suit le pays : à gauche en conduite à droite, à droite à Londres.
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    const leftHand = cityRushThemeDriveSide(theme) === 'left';
    for (const laneCenter of CITY_RUSH_LANE_X) {
      const px = laneToPixel(laneCenter);
      const oncoming = leftHand ? laneCenter > 0 : laneCenter < 0;
      ctx.beginPath();
      if (oncoming) {
        ctx.moveTo(px, 230);
        ctx.lineTo(px + 14, 180);
        ctx.lineTo(px + 5, 180);
        ctx.lineTo(px + 5, 120);
        ctx.lineTo(px - 5, 120);
        ctx.lineTo(px - 5, 180);
        ctx.lineTo(px - 14, 180);
      } else {
        ctx.moveTo(px, 120);
        ctx.lineTo(px + 14, 170);
        ctx.lineTo(px + 5, 170);
        ctx.lineTo(px + 5, 230);
        ctx.lineTo(px - 5, 230);
        ctx.lineTo(px - 5, 170);
        ctx.lineTo(px - 14, 170);
      }
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
      const h = (style === 'new-york' ? 150 : style === 'shuto' ? 132 : style === 'paris' ? 55 : 80) + random() * (style === 'paris' || style === 'london' ? 45 : 140);
      tower(x, 24 + random() * 48, h, 4, { density: dayWindow ? 0.1 : 0.16, windowColor: dayWindow || 'rgba(255, 215, 160, .3)' });
    }
    // Rangée avant avec les monuments.
    const accent = city.accent;
    const secondary = city.secondary;
    for (let x = -10; x < width; x += 46 + random() * 70) {
      const h = (style === 'new-york' ? 190 : style === 'shuto' ? 168 : style === 'paris' ? 70 : style === 'london' ? 90 : 120) + random() * (style === 'paris' ? 40 : style === 'london' ? 70 : 170);
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
    } else if (style === 'shuto') {
      // Depuis le viaduc de la C1 : la Tokyo Tower au-dessus de Shiba, la
      // Skytree de l'autre côté de la Sumida, le Rainbow Bridge vers la baie
      // et la Wangan, les tours de Shiodome et de Shinjuku, et la masse sombre
      // du palais impérial qui reste au centre de l'anneau.
      const towerX = 1080;
      ctx.fillStyle = '#d9412f';
      ctx.beginPath();
      ctx.moveTo(towerX - 46, horizon);
      ctx.lineTo(towerX - 8, horizon - 330);
      ctx.lineTo(towerX + 8, horizon - 330);
      ctx.lineTo(towerX + 46, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4f0ea';
      for (const y of [86, 178]) ctx.fillRect(towerX - 26 + (y - 86) * 0.06, horizon - y - 62, 52 - (y - 86) * 0.12, 11);
      ctx.fillStyle = '#d9412f';
      ctx.fillRect(towerX - 3, horizon - 404, 6, 74);
      ctx.fillStyle = 'rgba(255, 190, 120, .85)';
      ctx.shadowColor = '#ffb46b';
      ctx.shadowBlur = 18;
      for (let y = 24; y < 320; y += 26) {
        const halfWidth = 6 + (320 - y) * 0.13;
        ctx.fillRect(towerX - halfWidth, horizon - y, 3, 3);
        ctx.fillRect(towerX + halfWidth - 3, horizon - y, 3, 3);
      }
      ctx.shadowBlur = 0;

      // Skytree : fût blanc et deux observatoires, balise rouge au sommet.
      const skytreeX = 372;
      ctx.fillStyle = '#cfd8e6';
      ctx.beginPath();
      ctx.moveTo(skytreeX - 26, horizon);
      ctx.lineTo(skytreeX - 6, horizon - 430);
      ctx.lineTo(skytreeX + 6, horizon - 430);
      ctx.lineTo(skytreeX + 26, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 26, 44, .85)';
      ctx.fillRect(skytreeX - 20, horizon - 150, 40, 8);
      ctx.fillRect(skytreeX - 14, horizon - 290, 28, 7);
      ctx.fillStyle = secondary;
      ctx.shadowColor = secondary;
      ctx.shadowBlur = 22;
      ctx.fillRect(skytreeX - 12, horizon - 176, 24, 24);
      ctx.fillRect(skytreeX - 8, horizon - 312, 16, 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(skytreeX - 2, horizon - 452, 4, 22);
      tower(skytreeX - 60, 44, 190, 20, { density: 0.1 });

      // Rainbow Bridge : deux pylônes, la travée suspendue et les câbles.
      const bridgeX = 1620;
      ctx.strokeStyle = 'rgba(226, 236, 246, .78)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(bridgeX - 210, horizon - 26);
      ctx.quadraticCurveTo(bridgeX, horizon - 96, bridgeX + 210, horizon - 26);
      ctx.stroke();
      for (const pylonX of [bridgeX - 108, bridgeX + 108]) {
        ctx.fillStyle = '#e6ecf4';
        ctx.fillRect(pylonX - 9, horizon - 196, 18, 172);
        ctx.fillRect(pylonX - 24, horizon - 150, 48, 12);
        ctx.strokeStyle = 'rgba(255, 214, 140, .55)';
        ctx.lineWidth = 2;
        for (const [sx, sy] of [[-210, -26], [0, -96], [210, -26]]) {
          ctx.beginPath();
          ctx.moveTo(pylonX, horizon - 190);
          ctx.lineTo(bridgeX + sx, horizon + sy);
          ctx.stroke();
        }
        for (let hanger = -90; hanger <= 90; hanger += 22) {
          ctx.beginPath();
          ctx.moveTo(pylonX + hanger, horizon - 176);
          ctx.lineTo(pylonX + hanger, horizon - 44);
          ctx.stroke();
        }
      }
      // L'eau de la baie sous le pont.
      const bay = ctx.createLinearGradient(0, horizon - 30, 0, height);
      bay.addColorStop(0, 'rgba(12, 26, 48, .9)');
      bay.addColorStop(1, 'rgba(6, 12, 24, 0)');
      ctx.fillStyle = bay;
      ctx.fillRect(bridgeX - 240, horizon - 30, 480, 60);
      ctx.fillStyle = 'rgba(255, 206, 140, .3)';
      for (let sparkle = 0; sparkle < 90; sparkle += 1) ctx.fillRect(bridgeX - 230 + random() * 460, horizon - 24 + random() * 34, 3 + random() * 8, 2);

      // Shiodome / Shinjuku : dalles de verre et tours jumelles du Tocho.
      tower(700, 62, 300, 20, { density: 0.36, crown: secondary });
      tower(760, 44, 250, 18, { density: 0.3 });
      tower(1320, 54, 320, 20, { density: 0.34, crown: accent });
      tower(1378, 40, 240, 18, { density: 0.3 });
      // Roppongi Hills et sa balise aviation.
      tower(1900, 52, 380, 22, { density: 0.3, crown: '#ff5b5b' });
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(1924, horizon - 396, 4, 16);

      // Le palais impérial : une masse basse et sombre au cœur de l'anneau.
      ctx.fillStyle = 'rgba(8, 18, 14, .96)';
      ctx.beginPath();
      ctx.moveTo(60, horizon);
      ctx.quadraticCurveTo(200, horizon - 74, 340, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(14, 32, 24, .95)';
      for (let treeX = 70; treeX < 330; treeX += 16 + random() * 14) {
        ctx.beginPath();
        ctx.arc(treeX, horizon - 20 - random() * 34, 9 + random() * 9, Math.PI, 0);
        ctx.fill();
      }
      // Les douves : un liseré d'eau sombre au pied des arbres.
      ctx.fillStyle = 'rgba(20, 34, 52, .8)';
      ctx.fillRect(60, horizon - 12, 290, 12);
    } else if (style === 'route66') {
      // Horizon de la Mother Road : silos, château d'eau, mesas et
      // montagnes lointaines remplacent la skyline de gratte-ciel.
      ctx.fillStyle = 'rgba(108, 78, 61, .46)';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let x = 0; x <= width; x += 34) {
        const peak = horizon - 18 - Math.abs(Math.sin(x * 0.008)) * 48 - random() * 13;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(width, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(76, 73, 56, .7)';
      for (const siloX of [230, 1580]) {
        ctx.fillRect(siloX, horizon - 120, 22, 120);
        ctx.beginPath();
        ctx.arc(siloX + 11, horizon - 120, 11, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(siloX - 18, horizon - 10, 58, 10);
      }
      ctx.strokeStyle = 'rgba(75, 61, 44, .75)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(1130, horizon - 170);
      ctx.lineTo(1130, horizon - 12);
      ctx.moveTo(1080, horizon - 105);
      ctx.lineTo(1180, horizon - 105);
      ctx.stroke();
      ctx.fillStyle = 'rgba(121, 76, 52, .7)';
      ctx.beginPath();
      ctx.moveTo(360, horizon);
      ctx.lineTo(450, horizon - 115);
      ctx.lineTo(550, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1430, horizon);
      ctx.lineTo(1530, horizon - 88);
      ctx.lineTo(1650, horizon);
      ctx.closePath();
      ctx.fill();
      // Petites silhouettes de cactus sur la ligne d'horizon.
      ctx.strokeStyle = 'rgba(70, 82, 49, .78)';
      ctx.lineWidth = 5;
      for (const cactusX of [90, 740, 1880]) {
        ctx.beginPath();
        ctx.moveTo(cactusX, horizon);
        ctx.lineTo(cactusX, horizon - 48);
        ctx.moveTo(cactusX, horizon - 28);
        ctx.lineTo(cactusX - 15, horizon - 28);
        ctx.lineTo(cactusX - 15, horizon - 8);
        ctx.moveTo(cactusX, horizon - 36);
        ctx.lineTo(cactusX + 14, horizon - 36);
        ctx.lineTo(cactusX + 14, horizon - 17);
        ctx.stroke();
      }
    } else if (style === 'mexico') {
      // Horizon mexicain : montagnes ocres du Bajío, silhouette d'église
      // coloniale avec son campanile, champs d'agaves lointains.
      ctx.fillStyle = 'rgba(128, 92, 58, .55)';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let x = 0; x <= width; x += 28) {
        const peak = horizon - 38 - Math.abs(Math.sin(x * 0.0055 + 1.3)) * 78 - random() * 10;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(width, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(104, 71, 48, .78)';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let x = 0; x <= width; x += 46) {
        ctx.lineTo(x, horizon - 12 - Math.abs(Math.sin(x * 0.011 + 0.7)) * 56 - random() * 14);
      }
      ctx.lineTo(width, horizon);
      ctx.closePath();
      ctx.fill();
      // Silhouette de pueblo et son église.
      const churchX = 1080;
      ctx.fillStyle = 'rgba(220, 195, 156, .88)';
      ctx.fillRect(churchX - 38, horizon - 80, 76, 80);
      ctx.beginPath();
      ctx.moveTo(churchX - 44, horizon - 80);
      ctx.lineTo(churchX, horizon - 115);
      ctx.lineTo(churchX + 44, horizon - 80);
      ctx.closePath();
      ctx.fill();
      // Campanile.
      ctx.fillRect(churchX + 46, horizon - 100, 22, 100);
      ctx.beginPath();
      ctx.moveTo(churchX + 46, horizon - 100);
      ctx.lineTo(churchX + 57, horizon - 120);
      ctx.lineTo(churchX + 68, horizon - 100);
      ctx.closePath();
      ctx.fill();
      // Petits toits de pueblo autour.
      for (const hx of [700, 820, 1280, 1420, 1560]) {
        const h = 28 + Math.floor(random() * 24);
        ctx.fillRect(hx, horizon - h, 40 + random() * 30, h);
        ctx.beginPath();
        ctx.moveTo(hx - 4, horizon - h);
        ctx.lineTo(hx + 20, horizon - h - 16);
        ctx.lineTo(hx + 46, horizon - h);
        ctx.closePath();
        ctx.fill();
      }
      // Agaves lointains.
      ctx.strokeStyle = 'rgba(74, 94, 66, .7)';
      ctx.lineWidth = 3;
      for (const ax of [180, 340, 610, 1750, 1900]) {
        for (let leaf = 0; leaf < 6; leaf += 1) {
          const a = (leaf / 6) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(ax, horizon);
          ctx.lineTo(ax + Math.cos(a) * 14, horizon - 18 - Math.abs(Math.sin(a)) * 14);
          ctx.stroke();
        }
      }
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
  // Le départ de la C1 se prend au-dessus de 日本橋, kilomètre zéro du réseau
  // routier japonais : le portique porte un panneau vert de la Shuto, avec la
  // pastille C1, le sens de circulation et les lignes qui s'en détachent.
  if (theme.expressway) {
    const route = theme.expressway.route || {};
    return makeCanvasTexture((ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0c7446');
      gradient.addColorStop(1, '#064a2c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f4f8f1';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, width - 28, height - 28);
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);
      // Damier d'arrivée réduit à un liseré : la ligne reste une ligne de course.
      const cell = 22;
      for (let column = 0; column < width / cell; column += 1) {
        ctx.fillStyle = column % 2 ? '#f3f3ef' : '#0a0d1c';
        ctx.fillRect(column * cell, 0, cell, cell);
        ctx.fillRect(column * cell, height - cell, cell, cell);
      }
      // Pastille de route C1 et sens 内回り.
      const badgeR = 62;
      const badgeX = 150;
      const badgeY = height * 0.52;
      ctx.strokeStyle = '#f4f8f1';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, Math.PI * 0.35, Math.PI * 2.05);
      ctx.stroke();
      ctx.fillStyle = '#f4f8f1';
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeR * 0.9, badgeY - 20);
      ctx.lineTo(badgeX + badgeR * 0.1, badgeY - 46);
      ctx.lineTo(badgeX + badgeR * 0.2, badgeY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.font = '900 56px "Orbitron", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(route.marker || 'C1', badgeX, badgeY + 4);
      ctx.textAlign = 'left';
      const textX = badgeX + badgeR + 54;
      neonText(ctx, 'DÉPART · ARRIVÉE', textX + 250, height * 0.36, '900 76px "Orbitron", Arial, sans-serif', '#f7fbf5', 0, 'center');
      neonText(ctx, `${route.origin?.name || city.name} ${route.origin?.romaji || ''} · km 0 · ${route.direction || ''}`, textX + 250, height * 0.56, '800 40px "Orbitron", Arial, sans-serif', '#ffe6a8', 0, 'center');
      neonText(ctx, `${city.name} · ${theme.gantryText}`, textX + 250, height * 0.75, '700 34px "Orbitron", Arial, sans-serif', '#bdf3d2', 0, 'center');
      // Bandeau de lignes connectées, à droite du panneau.
      ctx.textAlign = 'right';
      neonText(ctx, (route.signExits || []).join('  ·  '), width - 70, height * 0.5, '800 34px "Orbitron", Arial, sans-serif', '#f4f8f1', 0, 'right');
    }, 1536, 320, { smooth: true });
  }
  // Start-Ziel-Anlage du Nürburgring : le portique historique porte un panneau
  // noir et blanc, la pastille de la route NS et les noms réels du circuit —
  // en allemand, comme sur place.
  if (theme.raceway) {
    const route = city.route || {};
    return makeCanvasTexture((ctx, width, height) => {
      ctx.fillStyle = '#0b0d10';
      ctx.fillRect(0, 0, width, height);
      const cell = 32;
      for (let column = 0; column < width / cell; column += 1) {
        for (let row = 0; row < 2; row += 1) {
          ctx.fillStyle = (row + column) % 2 ? '#f3f3ef' : '#0b0d10';
          ctx.fillRect(column * cell, row * cell, cell, cell);
          ctx.fillRect(column * cell, height - (row + 1) * cell, cell, cell);
        }
      }
      ctx.fillStyle = city.accent;
      ctx.fillRect(0, cell * 2, width, 6);
      ctx.fillRect(0, height - cell * 2 - 6, width, 6);
      neonText(ctx, 'START · ZIEL', width * 0.5, height * 0.4, '900 88px "Orbitron", Arial, sans-serif', '#f6f4ec', 22);
      neonText(ctx, `${route.origin?.name || 'ANTONIUSBUCHE'} · KM 0 · ${route.direction || 'SENS HORAIRE'}`, width * 0.5, height * 0.66, '800 40px "Orbitron", Arial, sans-serif', city.accent, 12);
      neonText(ctx, `${route.name || city.name} · ${theme.gantryText || 'GRÜNE HÖLLE'}`, width * 0.5, height * 0.85, '700 34px "Orbitron", Arial, sans-serif', '#b9c9a8', 0);
    }, 1536, 320, { smooth: true });
  }
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
  // 5 cases : POLICE, AMBULANCE, croix rouge, sigle de la voirie, TAXI.
  const cell = 256;
  const height = 96;
  const texture = makeCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, cell * 5, height);
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
    // Le taxi porte le jaune de la ville sur un cartouche sombre : la plaque
    // reste lisible sur une carrosserie dorée.
    ctx.fillStyle = '#191a20';
    ctx.fillRect(cell * 4 + 16, 12, cell - 32, height - 24);
    ctx.fillStyle = '#f7c22c';
    ctx.font = '900 52px "Orbitron", Arial, sans-serif';
    ctx.fillText('TAXI', cell * 4.5, height / 2 + 2);
  }, cell * 5, height, { smooth: true });
  const uv = (index) => [index / 5 + 0.003, 0.02, (index + 1) / 5 - 0.003, 0.98];
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

    if (type === 'health') {
      // Trousse de soin : croix rouge bien distincte du « + » bleu de l'ancien tir.
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(57, 57, 142, 142, 25);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(108, 75, 40, 106, 12);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(75, 108, 106, 40, 12);
      ctx.fill();
    } else if (type === 'blue-shot') {
      // Bonus bleu « + » : une seule icône recharge immédiatement un tir droit.
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(108, 40, 40, 176, 13);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(40, 108, 176, 40, 13);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 'pistol') {
      // AK-47 de profil : crosse, garde-main, chargeur recourbé, canon et mire.
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-0.18);
      ctx.translate(-centerX, -centerY);
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      // Crosse
      ctx.moveTo(38, 108);
      ctx.lineTo(86, 118);
      ctx.lineTo(86, 148);
      ctx.lineTo(40, 162);
      ctx.closePath();
      // Boîtier
      ctx.moveTo(84, 114);
      ctx.lineTo(148, 114);
      ctx.lineTo(148, 150);
      ctx.lineTo(84, 150);
      ctx.closePath();
      // Garde-main
      ctx.moveTo(146, 118);
      ctx.lineTo(186, 118);
      ctx.lineTo(186, 146);
      ctx.lineTo(146, 146);
      ctx.closePath();
      // Canon
      ctx.moveTo(184, 124);
      ctx.lineTo(236, 124);
      ctx.lineTo(236, 136);
      ctx.lineTo(184, 136);
      ctx.closePath();
      // Poignée pistolet
      ctx.moveTo(104, 148);
      ctx.lineTo(92, 204);
      ctx.lineTo(118, 204);
      ctx.lineTo(128, 148);
      ctx.closePath();
      // Chargeur recourbé
      ctx.moveTo(132, 148);
      ctx.quadraticCurveTo(168, 176, 154, 214);
      ctx.quadraticCurveTo(132, 222, 122, 198);
      ctx.quadraticCurveTo(128, 168, 132, 148);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Tube de gaz
      ctx.fillRect(148, 104, 72, 12);
      // Mire avant
      ctx.fillRect(214, 86, 10, 40);
      // Cache-flamme
      ctx.fillRect(234, 120, 16, 20);
      ctx.restore();
    } else if (type === 'boost') {
      // Turbo : l'éclair blanc du bonus vert, celui qui flotte au-dessus de la
      // chaussée, cerclé de son anneau (l'ancien pad posé au sol a disparu).
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(154, 36);
      ctx.lineTo(86, 148);
      ctx.lineTo(124, 148);
      ctx.lineTo(102, 220);
      ctx.lineTo(172, 104);
      ctx.lineTo(132, 104);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
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

// ─── Shuto Expressway Route 1 · textures de la C1 ───────────────────────────
// Tout ce que la voie rapide japonaise a de spécifique : le tablier (chaussée,
// bandes d'arrêt d'urgence, marquages interdits), la rue treize mètres plus bas,
// les parois de tunnel, les murs antibruit et le béton du viaduc.

/** Tablier de la C1 : chaussée, bandes d'arrêt d'urgence et trottoir de service. */
export function makeExpresswayDeckTexture(theme, random, { halfWidth = 10.6 } = {}) {
  const width = 1024;
  const height = 1024;
  const base = new THREE.Color(theme.roadTint);
  const shoulder = new THREE.Color(theme.roadTint).multiplyScalar(0.86);
  const service = new THREE.Color(theme.sidewalkTint);
  const carriagewayHalf = CITY_RUSH_ROAD_WIDTH / 2;
  const toPixel = (x) => width / 2 + (x / halfWidth) * (width / 2);
  const metersToPx = (meters) => (meters / halfWidth) * (width / 2);
  const rgb = (color, alpha = 1) => `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
  return makeCanvasTexture((ctx) => {
    // Bande de service (béton) puis chaussée et bandes d'arrêt d'urgence.
    ctx.fillStyle = rgb(service);
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = rgb(shoulder);
    ctx.fillRect(toPixel(-halfWidth + 1.2), 0, metersToPx(halfWidth - 1.2 - carriagewayHalf - 0.2), height);
    ctx.fillRect(toPixel(carriagewayHalf + 0.2), 0, metersToPx(halfWidth - 1.2 - carriagewayHalf - 0.2), height);
    ctx.fillStyle = rgb(base);
    ctx.fillRect(toPixel(-carriagewayHalf), 0, metersToPx(carriagewayHalf * 2), height);
    ctx.fillRect(toPixel(-carriagewayHalf - 0.2), 0, metersToPx(0.2), height);
    ctx.fillRect(toPixel(carriagewayHalf), 0, metersToPx(0.2), height);

    // Enrobé drainant : grain fin et taches d'hydrocarbures le long des voies.
    for (let index = 0; index < 5200; index += 1) {
      const shade = 0.5 + random() * 1.05;
      ctx.fillStyle = `rgba(${Math.round(base.r * 255 * shade + 14)}, ${Math.round(base.g * 255 * shade + 15)}, ${Math.round(base.b * 255 * shade + 18)}, ${0.14 + random() * 0.24})`;
      const x = toPixel(-carriagewayHalf) + random() * metersToPx(carriagewayHalf * 2);
      ctx.fillRect(x, random() * height, 1 + random() * 4, 1 + random() * 4);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, .16)';
    for (const laneCenter of CITY_RUSH_LANE_X) {
      const px = toPixel(laneCenter);
      ctx.fillRect(px - metersToPx(0.42), 0, metersToPx(0.3), height);
      ctx.fillRect(px + metersToPx(0.12), 0, metersToPx(0.3), height);
    }
    // Traces de pluie et de pneus plus sombres sous les joints de tablier.
    for (let index = 0; index < 26; index += 1) {
      const x = toPixel(-carriagewayHalf) + random() * metersToPx(carriagewayHalf * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + random() * 0.07})`;
      ctx.fillRect(x, random() * height, metersToPx(0.6 + random() * 1.2), 40 + random() * 220);
    }

    // Lignes blanches continues en bordure de chaussée (0,15 m).
    ctx.fillStyle = theme.laneColor || '#eef4ff';
    for (const side of [-1, 1]) {
      ctx.fillRect(toPixel(side * (carriagewayHalf - 0.18)) - metersToPx(0.075), 0, metersToPx(0.15), height);
    }
    // Hachures des bandes d'arrêt d'urgence : interdites au roulage.
    ctx.strokeStyle = 'rgba(238, 244, 255, .34)';
    ctx.lineWidth = Math.max(2, metersToPx(0.09));
    for (let index = -12; index < 26; index += 1) {
      for (const side of [-1, 1]) {
        const inner = side * (carriagewayHalf + 0.22);
        const outer = side * (halfWidth - 1.3);
        ctx.beginPath();
        ctx.moveTo(toPixel(inner), index * (height / 12));
        ctx.lineTo(toPixel(outer), index * (height / 12) + (outer - inner) * metersToPx(1) * 1.6);
        ctx.stroke();
      }
    }

    // Séparations de voies : pointillés blancs dans chaque sens, et ligne
    // jaune continue là où le changement de voie est interdit (très fréquent
    // sur la C1, avant chaque sortie).
    const dash = height / 6;
    for (const separator of [-4.2, -2.1, 2.1, 4.2]) {
      const px = toPixel(separator);
      const prohibited = Math.abs(separator) > 3;
      if (prohibited) {
        // Zone interdite sur la seconde moitié du carreau : la ligne blanche
        // se change en jaune continu, comme avant une sortie de la C1.
        ctx.fillStyle = theme.laneColor || '#eef4ff';
        for (let y = 0; y < height / 2; y += dash) ctx.fillRect(px - metersToPx(0.06), y + dash * 0.14, metersToPx(0.12), dash * 0.42);
        ctx.fillStyle = theme.centerLineColor || '#f5b81e';
        ctx.fillRect(px - metersToPx(0.075), height / 2, metersToPx(0.15), height / 2);
      } else {
        ctx.fillStyle = theme.laneColor || '#eef4ff';
        for (let y = 0; y < height; y += dash) ctx.fillRect(px - metersToPx(0.06), y + dash * 0.14, metersToPx(0.12), dash * 0.42);
      }
    }
    // Double ligne jaune au milieu : les deux sens sont séparés, dépassement
    // et changement de voie interdits (aucun terre-plein franchissable).
    ctx.fillStyle = theme.centerLineColor || '#f5b81e';
    ctx.fillRect(toPixel(-0.13), 0, metersToPx(0.12), height);
    ctx.fillRect(toPixel(0.01), 0, metersToPx(0.12), height);

    // Flèches de voie japonaises : longues et fines, une par carreau. Le haut
    // du carreau est le sens de la course (le ruban défile vers le joueur, voir
    // `makeRoadTexture`) : une flèche de voie de course pointe vers le haut,
    // une flèche de contresens pointe vers le bas, vers le joueur. Le Japon
    // roule à gauche : sur la C1, les trois voies de course sont donc à gauche
    // de l'axe jaune et le contresens à droite.
    ctx.fillStyle = 'rgba(238, 244, 255, .22)';
    const leftHand = cityRushThemeDriveSide(theme) === 'left';
    for (const laneCenter of CITY_RUSH_LANE_X) {
      const px = toPixel(laneCenter);
      const oncoming = leftHand ? laneCenter > 0 : laneCenter < 0;
      const tip = oncoming ? height * 0.8 : height * 0.2;
      const tail = oncoming ? height * 0.28 : height * 0.72;
      const head = oncoming ? height * 0.68 : height * 0.32;
      ctx.beginPath();
      ctx.moveTo(px, tip);
      ctx.lineTo(px + metersToPx(0.34), head);
      ctx.lineTo(px + metersToPx(0.1), head);
      ctx.lineTo(px + metersToPx(0.1), tail);
      ctx.lineTo(px - metersToPx(0.1), tail);
      ctx.lineTo(px - metersToPx(0.1), head);
      ctx.lineTo(px - metersToPx(0.34), head);
      ctx.closePath();
      ctx.fill();
    }
    // Joints de dilatation du tablier, en haut et en bas du carreau.
    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
    ctx.fillRect(0, 0, width, 5);
    ctx.fillRect(0, height - 5, width, 5);
    ctx.fillStyle = 'rgba(190, 200, 214, .18)';
    ctx.fillRect(0, 5, width, 3);
    ctx.fillRect(0, height - 8, width, 3);
  }, width, height, { smooth: true, repeat: true, anisotropy: 8 });
}

/** Rue treize mètres sous le viaduc : îlots, feux, rivières et passages piétons. */
export function makeCityBelowTexture(theme, random, { river = true } = {}) {
  const width = 1024;
  const height = 1024;
  const below = theme.expressway?.below || {};
  const ground = new THREE.Color(below.ground ?? 0x0a0c16);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(ground.r * 255)}, ${Math.round(ground.g * 255)}, ${Math.round(ground.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    // Îlots sombres, alignés sur une trame de rues.
    const block = 128;
    for (let row = 0; row < width / block; row += 1) {
      for (let column = 0; column < height / block; column += 1) {
        const inset = 10 + random() * 8;
        const shade = 0.55 + random() * 0.5;
        ctx.fillStyle = `rgba(${Math.round(ground.r * 255 * shade + 22)}, ${Math.round(ground.g * 255 * shade + 24)}, ${Math.round(ground.b * 255 * shade + 30)}, .92)`;
        ctx.fillRect(row * block + inset, column * block + inset, block - inset * 2, block - inset * 2);
        // Toits : unités de climatisation et cages d'escalier.
        for (let roof = 0; roof < 3; roof += 1) {
          ctx.fillStyle = 'rgba(180, 194, 214, .07)';
          ctx.fillRect(row * block + inset + random() * (block - inset * 3), column * block + inset + random() * (block - inset * 3), 8 + random() * 16, 8 + random() * 16);
        }
      }
    }
    // Rues : chaussée, marquage axial et feux de croisement.
    ctx.strokeStyle = 'rgba(120, 132, 158, .18)';
    ctx.lineWidth = 22;
    for (let line = 0; line <= width; line += block) {
      ctx.beginPath();
      ctx.moveTo(line, 0);
      ctx.lineTo(line, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, line);
      ctx.lineTo(width, line);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(240, 226, 170, .16)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    for (let line = 0; line <= width; line += block) {
      ctx.beginPath();
      ctx.moveTo(line, 0);
      ctx.lineTo(line, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, line);
      ctx.lineTo(width, line);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Phares et feux arrière du trafic de surface : minuscules points chauds.
    for (let index = 0; index < 420; index += 1) {
      const onVertical = random() < 0.5;
      const lane = Math.round(random() * (width / block)) * block + (random() < 0.5 ? -6 : 6);
      const along = random() * height;
      const warm = random() < 0.62;
      ctx.fillStyle = warm ? `rgba(255, 226, 170, ${0.24 + random() * 0.4})` : `rgba(255, 96, 92, ${0.2 + random() * 0.34})`;
      if (onVertical) ctx.fillRect(lane, along, 3, 7);
      else ctx.fillRect(along, lane, 7, 3);
    }
    // Néons de rez-de-chaussée vus d'en haut.
    for (let index = 0; index < 150; index += 1) {
      const neon = random() < 0.5 ? below.neonA ?? '#ff5b9a' : below.neonB ?? '#42e6ff';
      ctx.fillStyle = neon;
      ctx.globalAlpha = 0.12 + random() * 0.22;
      ctx.fillRect(random() * width, random() * height, 3 + random() * 10, 3 + random() * 10);
      ctx.globalAlpha = 1;
    }
    if (river) {
      // La Kanda et le pont de Nihonbashi passent sous l'anneau : une bande
      // d'eau noire avec le reflet des quais.
      const riverX = width * (0.18 + random() * 0.08);
      ctx.fillStyle = 'rgba(6, 12, 24, .96)';
      ctx.fillRect(riverX, 0, 74, height);
      ctx.fillStyle = 'rgba(120, 190, 220, .1)';
      for (let y = 0; y < height; y += 26) ctx.fillRect(riverX + 6 + random() * 58, y, 4 + random() * 12, 3);
      ctx.strokeStyle = 'rgba(150, 168, 190, .22)';
      ctx.lineWidth = 3;
      ctx.strokeRect(riverX - 3, 0, 80, height);
    }
  }, width, height, { smooth: true, repeat: true, anisotropy: 4 });
}

/** Paroi de tunnel : carreaux clairs, câbles, niche de secours et reflet humide. */
export function makeTunnelWallTexture(theme, random, { tiles = 6 } = {}) {
  const width = 1024;
  const height = 512;
  return makeCanvasTexture((ctx) => {
    const wall = new THREE.Color(theme.expressway?.tunnel?.wall ?? 0x2a2d36);
    ctx.fillStyle = `rgb(${Math.round(wall.r * 255)}, ${Math.round(wall.g * 255)}, ${Math.round(wall.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    // Carreaux de faïence : la bande claire réfléchit les phares.
    const tileWidth = width / tiles;
    for (let column = 0; column < tiles; column += 1) {
      const shade = 0.86 + random() * 0.28;
      ctx.fillStyle = `rgba(${Math.round(wall.r * 255 * shade + 42)}, ${Math.round(wall.g * 255 * shade + 44)}, ${Math.round(wall.b * 255 * shade + 46)}, 1)`;
      ctx.fillRect(column * tileWidth + 3, height * 0.34, tileWidth - 6, height * 0.34);
      ctx.fillStyle = 'rgba(0, 0, 0, .3)';
      ctx.fillRect(column * tileWidth, 0, 3, height);
    }
    // Chemin de câbles en haut, caniveau en bas.
    ctx.fillStyle = 'rgba(16, 18, 26, .92)';
    ctx.fillRect(0, height * 0.1, width, height * 0.1);
    ctx.fillStyle = 'rgba(120, 132, 152, .3)';
    for (let cable = 0; cable < 5; cable += 1) ctx.fillRect(0, height * 0.115 + cable * 12, width, 3);
    ctx.fillStyle = 'rgba(10, 12, 18, .95)';
    ctx.fillRect(0, height * 0.82, width, height * 0.18);
    // Niches de sécurité et extincteurs, tous les deux carreaux.
    for (let column = 0; column < tiles; column += 2) {
      ctx.fillStyle = 'rgba(18, 22, 30, .95)';
      ctx.fillRect(column * tileWidth + tileWidth * 0.3, height * 0.42, tileWidth * 0.4, height * 0.2);
      ctx.fillStyle = '#e0453c';
      ctx.fillRect(column * tileWidth + tileWidth * 0.34, height * 0.46, tileWidth * 0.08, height * 0.1);
      ctx.fillStyle = 'rgba(240, 244, 236, .82)';
      ctx.fillRect(column * tileWidth + tileWidth * 0.46, height * 0.47, tileWidth * 0.2, height * 0.045);
    }
    // Traces d'humidité et de suie.
    for (let index = 0; index < 260; index += 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + random() * 0.09})`;
      ctx.fillRect(random() * width, random() * height, 3 + random() * 26, 6 + random() * 60);
    }
  }, width, height, { smooth: true, repeat: true, anisotropy: 4 });
}

/** Mur antibruit : panneaux translucides verts et montants d'acier. */
export function makeSoundWallTexture(theme, random) {
  const width = 512;
  const height = 512;
  return makeCanvasTexture((ctx) => {
    const glass = new THREE.Color(theme.expressway?.soundWall?.panel ?? 0x2c4a3c);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${Math.round(glass.r * 255)}, ${Math.round(glass.g * 255)}, ${Math.round(glass.b * 255)}, .82)`;
    ctx.fillRect(0, 0, width, height);
    // Montants en H tous les deux mètres, traverses et joint de silicone.
    ctx.fillStyle = 'rgba(150, 162, 176, .55)';
    for (let post = 0; post <= width; post += 128) ctx.fillRect(post - 7, 0, 14, height);
    ctx.fillStyle = 'rgba(120, 132, 146, .3)';
    ctx.fillRect(0, height * 0.5 - 5, width, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, .1)';
    for (let panel = 0; panel < width; panel += 128) ctx.fillRect(panel + 12, 14, 26, height - 28);
    // Reflets de néons et poussière.
    for (let index = 0; index < 120; index += 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + random() * 0.06})`;
      ctx.fillRect(random() * width, random() * height, 2 + random() * 12, 4 + random() * 60);
    }
    ctx.fillStyle = 'rgba(10, 12, 18, .35)';
    ctx.fillRect(0, height - 26, width, 26);
  }, width, height, { smooth: true, repeat: true, anisotropy: 4 });
}

/** Béton du viaduc : voussoirs, coulures et socle des glissières. */
export function makeViaductTexture(theme, random) {
  const width = 512;
  const height = 512;
  const concrete = new THREE.Color(theme.expressway?.materials?.concrete ?? 0x5c6270);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(concrete.r * 255)}, ${Math.round(concrete.g * 255)}, ${Math.round(concrete.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    // Voussoirs préfabriqués : joints verticaux tous les 4 m.
    ctx.fillStyle = 'rgba(0, 0, 0, .26)';
    for (let joint = 0; joint <= width; joint += 128) ctx.fillRect(joint - 2, 0, 4, height);
    ctx.fillStyle = 'rgba(255, 255, 255, .06)';
    for (let joint = 0; joint <= width; joint += 128) ctx.fillRect(joint + 3, 0, 3, height);
    // Coulures de rouille et traces de pluie sous le garde-corps.
    for (let index = 0; index < 90; index += 1) {
      const x = random() * width;
      const length = 30 + random() * 220;
      ctx.fillStyle = `rgba(${random() < 0.4 ? '120, 78, 48' : '18, 20, 28'}, ${0.05 + random() * 0.16})`;
      ctx.fillRect(x, random() * (height - length), 2 + random() * 7, length);
    }
    // Granulat et reprises de coffrage.
    for (let index = 0; index < 900; index += 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + random() * 0.05})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, .3)';
    ctx.fillRect(0, height - 18, width, 18);
  }, width, height, { smooth: true, repeat: true, anisotropy: 4 });
}
