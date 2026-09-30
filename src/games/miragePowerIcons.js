import { POWER_UPS } from './mirageRules.js';

const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
  ? import.meta.env.BASE_URL
  : '/';
const asset = (name) => `${baseUrl}icons/mirage-rush/${name}.svg`;

/**
 * Définition des 4 icônes d’objets spéciaux de Mirage Rush :
 * - Bouclier (diamants bleus, Q/A)
 * - Lasso (diamants jaunes, W/Z)
 * - Turbo (diamants verts, E)
 * - Pistolet (diamants rouges, R)
 */
export const MIRAGE_POWER_ICONS = Object.freeze({
  [POWER_UPS.SHIELD]: Object.freeze({
    id: POWER_UPS.SHIELD,
    label: 'Bouclier',
    gemColor: 'blue',
    accent: '#4ce9df',
    src: asset('shield'),
    alt: 'Icône de Bouclier astral serti d’un diamant bleu',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.LASSO]: Object.freeze({
    id: POWER_UPS.LASSO,
    label: 'Lasso',
    gemColor: 'yellow',
    accent: '#ffd15c',
    src: asset('lasso'),
    alt: 'Icône de Lasso western tressé et diamant jaune',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.BOOST]: Object.freeze({
    id: POWER_UPS.BOOST,
    label: 'Turbo',
    gemColor: 'green',
    accent: '#52eda0',
    src: asset('boost'),
    alt: 'Icône de Turbo émeraude à éclair et fer ailé',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.PISTOL]: Object.freeze({
    id: POWER_UPS.PISTOL,
    label: 'Pistolet',
    gemColor: 'red',
    accent: '#ff6e66',
    src: asset('pistol'),
    alt: 'Icône de Revolver six-coups western et détonation écarlate',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
});

export function miragePowerIcon(type) {
  return MIRAGE_POWER_ICONS[type] || MIRAGE_POWER_ICONS[POWER_UPS.SHIELD];
}
